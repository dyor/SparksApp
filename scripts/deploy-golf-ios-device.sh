#!/bin/bash
#
# Deploy Golf Sparks to a physical iPhone in Release configuration.
# Standalone build — JS is bundled into the binary, no Metro/dev server
# needed. Use after the Apple Developer Console + App Store Connect setup
# from CONTEXT/GENERAL/GOLFSPARKSPLAN.md Phase 4.
#
# Sister scripts:
#   - deploy-ios-simulator.sh          (Debug simulator, full Sparks)
#   - deploy-ios-device.sh             (Release device,  full Sparks)
#   - deploy-golf-ios-simulator.sh     (Debug simulator, Golf Sparks)
#
# Usage:
#   ./scripts/deploy-golf-ios-device.sh                       # auto-pick device
#   ./scripts/deploy-golf-ios-device.sh "Matt's iPhone (2)"   # explicit name
#   ./scripts/deploy-golf-ios-device.sh --clean               # full regen
#
set -e

PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found: $PROJECT_DIR"; exit 1; }

export EXPO_PUBLIC_APP_VARIANT=golf
echo "==> EXPO_PUBLIC_APP_VARIANT=$EXPO_PUBLIC_APP_VARIANT"

# Parse args
CLEAN_FLAG=""
DEVICE_ARG=""
for arg in "$@"; do
  if [[ "$arg" == "--clean" ]]; then
    CLEAN_FLAG="--clean"
  else
    DEVICE_ARG="$arg"
  fi
done

if [[ -n "$CLEAN_FLAG" ]]; then
  echo "==> --clean requested (full regeneration)"
fi

# Proactive sanity: same checks as the simulator script.
needs_clean() {
  [[ ! -d "$PROJECT_DIR/ios" ]] && { echo "   • ios/ missing"; return 0; }
  [[ ! -f "$PROJECT_DIR/ios/Podfile.lock" ]] && { echo "   • ios/Podfile.lock missing"; return 0; }
  [[ ! -d "$PROJECT_DIR/ios/Pods" ]] && { echo "   • ios/Pods missing"; return 0; }
  return 1
}

if [[ -z "$CLEAN_FLAG" ]]; then
  echo "==> Checking for known bad states..."
  if needs_clean; then
    echo "   → switching to --clean build"
    CLEAN_FLAG="--clean"
  fi
fi

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

  if [[ -n "$DEVICE_ARG" ]]; then
    echo "==> Building Release on device: $DEVICE_ARG..."
    npx expo run:ios --device "$DEVICE_ARG" --configuration Release
  else
    echo "==> Building Release on auto-detected device..."
    npx expo run:ios --device --configuration Release
  fi
}

# Attempt 1
if [[ -n "$CLEAN_FLAG" ]]; then
  run_build --clean
  exit 0
fi

if run_build; then
  exit 0
fi

# Attempt 2 — auto-retry with --clean
echo ""
echo "============================================================"
echo "  First build attempt failed. Retrying with --clean."
echo "  This rebuilds Pods from scratch (~1-2 min extra)."
echo "============================================================"
echo ""
run_build --clean
