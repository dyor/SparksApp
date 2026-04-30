#!/bin/bash
#
# Build + launch the Golf Sparks variant on the iOS simulator.
# V1 development path — no Apple Developer Console setup required.
#
# Fire-and-forget: the script tries the fast incremental path first, and if
# that fails (stale pbxproj, missing RN codegen headers, pod install drift,
# etc.) automatically falls back to a full `expo prebuild --clean` + pod
# install + build.
#
# Manual --clean: pass --clean as the first arg to skip the fast path and go
# straight to the full reset (useful when you already know things are hosed).
#
# Sister script to deploy-ios.sh (Release device build of Sparks).
#
set -e

PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found: $PROJECT_DIR"; exit 1; }

export EXPO_PUBLIC_APP_VARIANT=golf
echo "==> EXPO_PUBLIC_APP_VARIANT=$EXPO_PUBLIC_APP_VARIANT"

FORCE_CLEAN=0
if [[ "$1" == "--clean" ]]; then
  FORCE_CLEAN=1
fi

# --- Kill any running Metro on 8081 -----------------------------------------
#
# Critical for variants: Metro bundles EXPO_PUBLIC_* env vars into the JS
# bundle at eval time. If a Metro is already running from an earlier session
# (e.g. a previous full-variant build), `expo run:ios` reuses it instead of
# spawning a fresh one — and the running app picks up a bundle built with
# the old env. Symptoms: Golf Sparks variant shows all sparks and doesn't
# seed My Sparks. Fix: start from a clean Metro every time.

if lsof -ti:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> Killing Metro on :8081 (pid $(lsof -ti:8081 -sTCP:LISTEN | tr '\n' ' '))..."
  lsof -ti:8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
  # give the port a moment to free
  sleep 1
fi

# --- Boot a simulator if nothing is booted ----------------------------------

if ! xcrun simctl list devices booted 2>/dev/null | grep -qE "iPhone|iPad"; then
  echo "==> No simulator booted — booting iPhone 15..."
  xcrun simctl boot "iPhone 15" || {
    echo "   Failed to boot 'iPhone 15'. Pick a simulator manually from"
    echo "   Xcode > Open Developer Tool > Simulator, then re-run."
    exit 1
  }
  open -a Simulator
fi

# --- Proactive checks for known-bad states ---------------------------------
#
# These are state conditions where we know an incremental build is doomed;
# promote to --clean upfront to save the wasted first attempt.
#
needs_clean() {
  # ios/ doesn't exist yet
  [[ ! -d "$PROJECT_DIR/ios" ]] && { echo "   • ios/ missing"; return 0; }
  # Podfile.lock missing → pods never installed
  [[ ! -f "$PROJECT_DIR/ios/Podfile.lock" ]] && { echo "   • ios/Podfile.lock missing"; return 0; }
  # Pods/ never materialized
  [[ ! -d "$PROJECT_DIR/ios/Pods" ]] && { echo "   • ios/Pods missing"; return 0; }
  return 1
}

if [[ $FORCE_CLEAN -eq 0 ]]; then
  echo "==> Checking for known bad states..."
  if needs_clean; then
    echo "   → switching to --clean build"
    FORCE_CLEAN=1
  fi
fi

# --- The actual build steps, wrapped so we can retry ------------------------

run_build() {
  local clean="$1"
  if [[ -n "$clean" ]]; then
    echo "==> Running prebuild --clean (full regeneration; slow)..."
    npx expo prebuild --platform ios --clean
  else
    echo "==> Running prebuild (incremental)..."
    npx expo prebuild --platform ios
  fi

  echo "==> Installing CocoaPods..."
  ( cd ios && pod install )

  # Metro transform cache can retain stale EXPO_PUBLIC_* inlining across
  # variant switches. Start with a fresh cache on every run; Metro caches
  # the source transforms anyway so the real cost is ~1-2 seconds.
  export EXPO_NO_CACHE=1

  echo "==> Building and launching Golf Sparks on simulator..."
  npx expo run:ios
}

# --- Attempt 1 --------------------------------------------------------------

if [[ $FORCE_CLEAN -eq 1 ]]; then
  run_build --clean
  exit 0
fi

# run_build called inside an `if` guard → `set -e` does not propagate its
# failure, we can inspect and retry.
if run_build; then
  exit 0
fi

# --- Attempt 2 (auto-retry with --clean) ------------------------------------

echo ""
echo "============================================================"
echo "  First build attempt failed."
echo "  Retrying with --clean (full prebuild regeneration + fresh pod install)."
echo "  This takes ~1-2 minutes extra."
echo "============================================================"
echo ""

run_build --clean
