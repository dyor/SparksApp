#!/bin/bash
#
# Build + launch the Golf Sparks variant on the iOS simulator.
# V1 development path — no Apple Developer Console setup required.
#
# Sister script to deploy-ios.sh (which does a Release device build of Sparks).
#
set -e

PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found: $PROJECT_DIR"; exit 1; }

# Pass --clean as the first arg to do a full Expo prebuild reset.
# Use when the Xcode project gets stuck (codegen header missing, pbxproj
# desync, etc.). Slow (rebuilds pods from scratch) but reliably recovers.
CLEAN_FLAG=""
if [[ "$1" == "--clean" ]]; then
  CLEAN_FLAG="--clean"
  echo "==> Running with --clean (full ios/ regeneration)"
fi

# Pin the app variant for every subsequent step (prebuild, Metro, bundling).
export EXPO_PUBLIC_APP_VARIANT=golf
echo "==> EXPO_PUBLIC_APP_VARIANT=$EXPO_PUBLIC_APP_VARIANT"

# 1. Make sure a simulator is booted. Without one, `expo run:ios` prompts or
#    fails; pick iPhone 15 if nothing is booted.
if ! xcrun simctl list devices booted 2>/dev/null | grep -qE "iPhone|iPad"; then
  echo "==> No simulator booted — booting iPhone 15..."
  xcrun simctl boot "iPhone 15" || {
    echo "   Failed to boot 'iPhone 15'. Pick one manually from"
    echo "   Xcode > Open Developer Tool > Simulator, then re-run."
    exit 1
  }
  open -a Simulator
fi

# 2. Prebuild with the golf variant so Xcode project bundle IDs, icons, and
#    app.config overrides are in sync. Without this, switching variants
#    leaves the pbxproj on whatever the last prebuild set — which causes
#    "embedded binary's bundle identifier is not prefixed with the parent
#    app's bundle identifier" on a mixed main-target + BroadcastExtension.
echo "==> Running prebuild for golf variant..."
npx expo prebuild --platform ios $CLEAN_FLAG

# 3. Ensure Pods are installed / regenerated. Prebuild runs pod install only
#    when it detects Podfile changes, so re-run it explicitly. This is also
#    what regenerates the RN codegen scripts that populate
#    ios/build/generated/ios/RCTAppDependencyProvider.h during xcodebuild.
#    Do NOT `rm -rf ios/build` — codegen writes into that tree and deleting
#    it without a fresh pod install leaves the Pods project referencing
#    headers that aren't recreated in time.
echo "==> Installing CocoaPods..."
( cd ios && pod install )

# 4. Build + launch on simulator. Debug config — simulator doesn't codesign
#    so we sidestep the App Group / Sign-In-with-Apple / Push Notifications
#    entitlement errors that block device Release builds for com.dyor.golfsparks
#    until Apple Developer Console setup (Plan Phase 4) is done.
echo "==> Building and launching Golf Sparks on simulator..."
npx expo run:ios
