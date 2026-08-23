#!/bin/bash
#
# Build + launch Sparks on the iOS simulator.
#
# Fire-and-forget: tries the fast incremental path first, and if it fails
# (stale pbxproj, missing RN codegen headers, pod install drift, etc.)
# automatically falls back to a full `expo prebuild --clean` + pod install + build.
#
# Manual --clean: pass --clean as the first arg to skip the fast path and
# go straight to the full reset.
#
# Sister scripts:
#   - deploy-ios-device.sh             (Release device build)
#
set -e

PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found: $PROJECT_DIR"; exit 1; }

FORCE_CLEAN=0
if [[ "$1" == "--clean" ]]; then
  FORCE_CLEAN=1
fi

# --- Kill any running Metro on 8081 -----------------------------------------
#
# Metro can reuse a stale JS bundle from an earlier session. Start from a
# clean Metro every time so env/config changes are picked up.

if lsof -ti:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> Killing Metro on :8081 (pid $(lsof -ti:8081 -sTCP:LISTEN | tr '\n' ' '))..."
  lsof -ti:8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
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

needs_clean() {
  [[ ! -d "$PROJECT_DIR/ios" ]] && { echo "   • ios/ missing"; return 0; }
  [[ ! -f "$PROJECT_DIR/ios/Podfile.lock" ]] && { echo "   • ios/Podfile.lock missing"; return 0; }
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

  # Start with a fresh Metro transform cache on every run.
  export EXPO_NO_CACHE=1

  echo "==> Building and launching Sparks on simulator..."
  npx expo run:ios
}

# --- Attempt 1 --------------------------------------------------------------

if [[ $FORCE_CLEAN -eq 1 ]]; then
  run_build --clean
  exit 0
fi

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
