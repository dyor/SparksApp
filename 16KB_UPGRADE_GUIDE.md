# 16KB Page Size Support - Upgrade Guide

## Issue
Google Play requires apps to support 16KB memory page sizes for Android 15+ devices. Your app is currently on Expo SDK 52, which may not fully support this requirement.

## Solution Options

### Option 1: Upgrade to Expo SDK 53+ (Recommended)

Expo SDK 53.0.14+ includes native support for 16KB page sizes. This is the most reliable solution.

**Steps:**
```bash
# 1. Upgrade Expo SDK
npx expo install expo@^53.0.22 --fix

# 2. Update all dependencies
npx expo install --fix

# 3. Rebuild with EAS
eas build --platform android --profile production
```

**Note:** This is a major version upgrade and may require:
- Testing all features
- Updating any deprecated APIs
- Checking for breaking changes in your dependencies

### Option 2: Try Current Configuration First (Current Setup)

I've updated your `expo-build-properties` plugin to explicitly set:
- NDK version: 27.0.12077973
- targetSdkVersion: 35
- compileSdkVersion: 35

**Try building now:**
```bash
eas build --platform android --profile production
```

If this still doesn't work, you'll need to upgrade to SDK 53.

## Current Configuration

✅ Config plugin `./withAndroid16KBSupport` is active
✅ `expo-build-properties` configured with NDK 27+
✅ `extractNativeLibs="false"` in AndroidManifest
✅ `android.bundle.enableUncompressedNativeLibs=true` in gradle.properties
✅ targetSdkVersion: 35

## Why SDK 53+ is Needed

The native libraries (`.so` files) bundled with Expo SDK 52 may not be built with 16KB page alignment. Expo SDK 53+ includes native libraries that are properly aligned for 16KB pages, which is required by Google Play.

## Testing After Upgrade

1. Build the app: `eas build --platform android --profile production`
2. Upload to Google Play Console
3. Check that the 16KB page size error is resolved
4. Test on a device with 16KB pages (if available)

## References

- [Expo SDK 53 Release Notes](https://expo.dev/changelog/2025/01-16-sdk-53)
- [Google Play 16KB Requirements](https://developer.android.com/guide/practices/page-sizes)
- [Expo Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)

