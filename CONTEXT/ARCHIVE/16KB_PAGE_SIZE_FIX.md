# 16KB Page Size Support Fix

## Issue
Google Play is rejecting the app because it doesn't support 16KB memory page sizes, which is required for Android 15+ and newer devices.

## Solution Applied

### ✅ Configuration Updates

1. **AndroidManifest.xml** ✅
   - `android:extractNativeLibs="false"` is set (required)

2. **gradle.properties** ✅
   - `android.bundle.enableUncompressedNativeLibs=true` is set (required)

3. **build.gradle** ✅
   - NDK version: `27.0.12077973` (required)
   - targetSdkVersion: `35` (required)
   - compileSdkVersion: `35` (required)
   - Added explicit NDK ABI filters

4. **app.json** ✅
   - Plugin `./withAndroid16KBSupport` is configured
   - targetSdkVersion: `35`
   - compileSdkVersion: `35`

## Next Steps

### For EAS Build (Recommended)

Since you're using EAS Build, the native project will be automatically regenerated with the correct configuration:

1. **Commit the changes**:
   ```bash
   git add .
   git commit -m "Add 16KB page size support for Android"
   ```

2. **Rebuild the app**:
   ```bash
   eas build --platform android --profile production
   ```

3. **Submit to Google Play**:
   ```bash
   eas submit --platform android --profile production
   ```

### For Local Builds

If building locally, regenerate the native project:

```bash
npx expo prebuild --clean
cd android
./gradlew clean
./gradlew assembleRelease
```

## Verification

After building, you can verify 16KB support by:

1. **Check the APK/AAB**:
   - The app should have `extractNativeLibs="false"` in AndroidManifest.xml
   - Native libraries should not be compressed

2. **Google Play Console**:
   - Upload the new build
   - The 16KB page size warning should be resolved

## Important Notes

- ✅ All required settings are in place
- ✅ The config plugin will apply settings automatically
- ⚠️ You must rebuild the app for changes to take effect
- ⚠️ Some third-party native libraries might not support 16KB pages - if issues persist, check dependencies

## Troubleshooting

If Google Play still rejects the app:

1. **Verify NDK version**: Ensure it's `27.0.12077973` or later
2. **Check dependencies**: Some native libraries might need updates
3. **Review build logs**: Look for any alignment warnings
4. **Test on 16KB device**: Use an emulator or device with 16KB pages

## References

- [Google Play 16KB Page Size Requirements](https://developer.android.com/guide/practices/page-sizes)
- [Android NDK 16KB Support](https://developer.android.com/ndk/guides/16kb-page-sizes)

