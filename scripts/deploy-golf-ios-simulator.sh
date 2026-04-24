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

# 2. Clean stale build artifacts (keeps the ios/ Xcode project tree).
echo "==> Cleaning ios/build..."
rm -rf ios/build

# 3. Prebuild with the golf variant so Xcode project bundle IDs, icons, and
#    app.config overrides are in sync. This also runs `pod install` for us.
#    Without this step, switching variants leaves the pbxproj on whatever the
#    last prebuild set — which causes the "embedded binary's bundle identifier
#    is not prefixed with the parent app's bundle identifier" error on a mixed
#    main-target + BroadcastExtension.
echo "==> Running prebuild for golf variant..."
npx expo prebuild --platform ios

# 4. Build + launch on simulator. Debug config — simulator doesn't codesign
#    so we sidestep the App Group / Sign-In-with-Apple / Push Notifications
#    entitlement errors that block device Release builds for com.dyor.golfsparks
#    until Apple Developer Console setup (Plan Phase 4) is done.
echo "==> Building and launching Golf Sparks on simulator..."
npx expo run:ios
