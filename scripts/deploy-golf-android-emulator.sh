#!/bin/bash
#
# Build + launch the Golf Sparks variant on an Android emulator.
# Debug build, no signing required.
#
# Fire-and-forget: tries the fast incremental path first; on failure auto-
# retries with `expo prebuild --clean` (full regen + fresh gradle cache).
#
# Manual --clean: pass --clean as the first arg to skip the fast path and
# go straight to the full reset.
#
# Sister scripts:
#   - deploy-ios-simulator.sh          (Debug simulator, full Sparks)
#   - deploy-ios-device.sh             (Release device,  full Sparks)
#   - deploy-android.sh                (Release device,  full Sparks)
#   - deploy-golf-ios-simulator.sh     (Debug simulator, Golf Sparks)
#   - deploy-golf-ios-device.sh        (Release device,  Golf Sparks)
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

# --- Resolve Android SDK tooling -------------------------------------------
#
# adb usually winds up in PATH via macOS app launchers; emulator typically
# does not. Fall back to the standard SDK install path.

ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"

ADB="$(command -v adb || true)"
[[ -z "$ADB" && -x "$ANDROID_SDK/platform-tools/adb" ]] && ADB="$ANDROID_SDK/platform-tools/adb"
if [[ -z "$ADB" ]]; then
  echo "❌ adb not found. Install Android Studio or set ANDROID_HOME."
  exit 1
fi

EMULATOR_BIN="$(command -v emulator || true)"
[[ -z "$EMULATOR_BIN" && -x "$ANDROID_SDK/emulator/emulator" ]] && EMULATOR_BIN="$ANDROID_SDK/emulator/emulator"

# --- Kill any running Metro on 8081 -----------------------------------------
#
# Same reason as the iOS variants: Metro inlines EXPO_PUBLIC_* env vars at
# bundle time, so a stale Metro will serve a JS bundle built without
# EXPO_PUBLIC_APP_VARIANT=golf and the running app will look like Sparks.

if lsof -ti:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> Killing Metro on :8081 (pid $(lsof -ti:8081 -sTCP:LISTEN | tr '\n' ' '))..."
  lsof -ti:8081 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# --- Boot an emulator if none is running -----------------------------------

EMULATOR_RUNNING=$("$ADB" devices | awk 'NR>1 && /emulator-/ && /\tdevice$/' | head -1)

if [[ -z "$EMULATOR_RUNNING" ]]; then
  if [[ -z "$EMULATOR_BIN" ]]; then
    echo "❌ No emulator running and 'emulator' binary not found."
    echo "   Open Android Studio → Device Manager and start an AVD, then re-run."
    exit 1
  fi

  AVDS=$("$EMULATOR_BIN" -list-avds 2>/dev/null)
  if [[ -z "$AVDS" ]]; then
    echo "❌ No AVDs configured. Create one in Android Studio → Device Manager."
    exit 1
  fi

  # Prefer a Pixel AVD if one exists; otherwise take the first.
  AVD=$(echo "$AVDS" | grep -i "Pixel" | head -1)
  [[ -z "$AVD" ]] && AVD=$(echo "$AVDS" | head -1)

  echo "==> No emulator running — booting AVD '$AVD'..."
  ( "$EMULATOR_BIN" "@$AVD" -no-snapshot-save >/dev/null 2>&1 & )

  echo "==> Waiting for emulator to come online..."
  "$ADB" wait-for-device
  # Wait until boot is complete (sys.boot_completed=1)
  for _ in $(seq 1 60); do
    if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
      break
    fi
    sleep 2
  done
  echo "==> Emulator booted."
fi

# --- Optionally uninstall the previous golf install on the emulator -------
#
# Avoids signature mismatch errors when switching between Debug builds, and
# also clears AsyncStorage so the My Sparks default-seed re-applies.

PKG="com.dyor.golfsparks"
if "$ADB" shell pm list packages 2>/dev/null | grep -qx "package:$PKG"; then
  echo "==> Existing $PKG install detected; uninstalling for a clean run..."
  "$ADB" uninstall "$PKG" >/dev/null 2>&1 || true
fi

# --- Proactive checks for known-bad states ---------------------------------

needs_clean() {
  [[ ! -d "$PROJECT_DIR/android" ]] && { echo "   • android/ missing"; return 0; }
  [[ ! -f "$PROJECT_DIR/android/gradlew" ]] && { echo "   • android/gradlew missing"; return 0; }
  return 1
}

if [[ $FORCE_CLEAN -eq 0 ]]; then
  echo "==> Checking for known bad states..."
  if needs_clean; then
    echo "   → switching to --clean build"
    FORCE_CLEAN=1
  fi
fi

# --- The actual build steps, wrapped so we can retry ----------------------

run_build() {
  local clean="$1"
  if [[ -n "$clean" ]]; then
    echo "==> Running prebuild --clean for android (full regen; slow)..."
    npx expo prebuild --platform android --clean
  else
    echo "==> Running prebuild for android (incremental)..."
    npx expo prebuild --platform android
  fi

  # Metro transform cache can retain stale EXPO_PUBLIC_* inlining across
  # variant switches. Start with a fresh cache on every run.
  export EXPO_NO_CACHE=1

  echo "==> Building and launching Golf Sparks on emulator..."
  npx expo run:android
}

# --- Attempt 1 -------------------------------------------------------------

if [[ $FORCE_CLEAN -eq 1 ]]; then
  run_build --clean
  exit 0
fi

if run_build; then
  exit 0
fi

# --- Attempt 2 (auto-retry with --clean) ----------------------------------

echo ""
echo "============================================================"
echo "  First build attempt failed."
echo "  Retrying with --clean (full prebuild regeneration)."
echo "  This takes ~1-3 minutes extra."
echo "============================================================"
echo ""

run_build --clean
