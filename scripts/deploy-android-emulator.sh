#!/bin/bash
#
# Build + launch Sparks on an Android emulator.
# Debug build, no signing required.
#
# Default path runs NO prebuild: android/ is committed and carries hand-edits
# that `prebuild --clean` would destroy (see "Why no auto --clean" below).
# `expo run:android` only prebuilds when android/ is absent, so it is safe.
#
#   (no args)    fast path — build, install, launch, start Metro
#   --prebuild   re-run config plugins first (non-destructive: an existing
#                android/ is reused, only plugin mods re-apply). Use this
#                after changing app.json permissions/plugins.
#   --clean      full regen. DESTRUCTIVE — see below. Prompts before running.
#
# Why no auto --clean:
#   `expo prebuild --clean` does `fs.rm(android/, {recursive: true})`, which
#   deletes android/app/build.gradle — including the hand-written
#   "[ANTIGRAVITY] Nuclear Manifest Stripper" afterEvaluate block that strips
#   foreground-service nodes from the merged manifest. No config plugin
#   reproduces that block, so an automatic --clean retry would silently
#   reintroduce the Play Store foreground-service rejections. This script
#   backs the file up and makes you opt in instead.
#
# Sister scripts:
#   - deploy-ios-simulator.sh          (Debug simulator)
#   - deploy-ios-device.sh             (Release device)
#   - deploy-android.sh                (Release device)
#
set -e

PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found: $PROJECT_DIR"; exit 1; }

PKG="com.mattdyor.sparks"

MODE="fast"
case "$1" in
  --prebuild) MODE="prebuild" ;;
  --clean)    MODE="clean" ;;
  "")         ;;
  *) echo "Unknown option: $1"; echo "Usage: $0 [--prebuild | --clean]"; exit 1 ;;
esac

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

# Gradle reads these; a shell without them set fails with "SDK location not found".
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"

# --- Kill any running Metro on 8081 -----------------------------------------
#
# Metro inlines EXPO_PUBLIC_* env vars at bundle time, so a stale Metro can
# serve an outdated JS bundle. Kill it before each deploy.

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
else
  echo "==> Using running emulator: $(echo "$EMULATOR_RUNNING" | awk '{print $1}')"
fi

# --- Uninstall the previous install on the emulator ------------------------
#
# Avoids signature mismatch errors when switching between Debug builds, and
# also clears AsyncStorage so the My Sparks default-seed re-applies.

if "$ADB" shell pm list packages 2>/dev/null | grep -qx "package:$PKG"; then
  echo "==> Existing $PKG install detected; uninstalling for a clean run..."
  "$ADB" uninstall "$PKG" >/dev/null 2>&1 || true
fi

# --- Guard the hand-edited native files ------------------------------------

backup_native_edits() {
  local stamp backup_dir
  stamp=$(date +%Y%m%d-%H%M%S)
  backup_dir="$PROJECT_DIR/.native-backups/$stamp"
  mkdir -p "$backup_dir"
  cp android/app/build.gradle "$backup_dir/build.gradle" 2>/dev/null || true
  cp android/gradle.properties "$backup_dir/gradle.properties" 2>/dev/null || true
  cp android/app/src/main/AndroidManifest.xml "$backup_dir/AndroidManifest.xml" 2>/dev/null || true
  echo "$backup_dir"
}

# --- Build -----------------------------------------------------------------

case "$MODE" in
  clean)
    echo ""
    echo "============================================================"
    echo "  ⚠️  --clean DELETES android/ and regenerates it."
    echo ""
    echo "  You will lose the hand-written manifest stripper block in"
    echo "  android/app/build.gradle. No config plugin recreates it."
    echo "  Without it, FOREGROUND_SERVICE permissions come back and"
    echo "  Play will reject the build."
    echo "============================================================"
    echo ""
    BACKUP=$(backup_native_edits)
    echo "==> Backed up native files to: $BACKUP"
    if [[ -t 0 ]]; then
      printf "Continue with --clean? (y/N): "
      read -r CONFIRM
      CONFIRM=${CONFIRM//$'\r'/}
      [[ "$CONFIRM" =~ ^[Yy] ]] || { echo "Aborted."; exit 1; }
    else
      echo "❌ Non-interactive shell: refusing to run --clean unattended."
      exit 1
    fi
    echo "==> Running prebuild --clean for android (full regen; slow)..."
    npx expo prebuild --platform android --clean
    echo ""
    echo "⚠️  REMINDER: re-apply the manifest stripper block from:"
    echo "    $BACKUP/build.gradle"
    echo "    (search for '[ANTIGRAVITY] Nuclear Manifest Stripper')"
    echo ""
    ;;
  prebuild)
    echo "==> Running prebuild for android (incremental; re-applies config plugins)..."
    npx expo prebuild --platform android
    ;;
  fast)
    echo "==> Skipping prebuild (android/ is committed; pass --prebuild to re-apply config plugins)."
    ;;
esac

# Start with a fresh Metro transform cache on every run.
export EXPO_NO_CACHE=1

echo "==> Building and launching Sparks on emulator..."
npx expo run:android

echo "✅ Deployment complete!"
