#!/bin/bash

# 1. Navigate to the project directory
PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found"; exit 1; }

# 2. Increment versionCode in app.json and build.gradle
echo "📊 Incrementing versionCode..."
if command -v jq >/dev/null 2>&1; then
  # Read current versionCode, add 1, and update app.json
  NEW_VERSION_CODE=$(jq '.expo.android.versionCode + 1' app.json)
  jq ".expo.android.versionCode = $NEW_VERSION_CODE" app.json > app.json.tmp && mv app.json.tmp app.json
  
  # Also sync to android/app/build.gradle
  sed -i '' "s/versionCode [0-9]*/versionCode $NEW_VERSION_CODE/" android/app/build.gradle
  
  echo "✅ New versionCode: $NEW_VERSION_CODE (Synced to app.json & build.gradle)"
else
  echo "⚠️ jq not found, skipping auto-increment."
fi

# 3. Clean up old builds (Android)
echo "Cleaning old builds..."
rm -rf android/app/build

# 4. Handle existing installation
echo "🔍 Checking for existing installation..."
IS_INSTALLED=$(adb shell pm list packages com.mattdyor.sparks 2>/dev/null | grep -x "package:com.mattdyor.sparks")

if [[ ! -z "$IS_INSTALLED" ]]; then
  echo "⚠️ App 'com.mattdyor.sparks' is already installed."
  # If we're in an interactive shell, ask the user
  if [[ -t 0 ]]; then
    # Attempt to reset terminal state in case adb messed it up
    stty sane 2>/dev/null
    
    printf "🗑 Uninstall existing app to avoid signature conflicts? (y/N): "
    read -r SHOULD_UNINSTALL
    # Remove possible carriage return (fix for ^M issue)
    SHOULD_UNINSTALL=${SHOULD_UNINSTALL//$'\r'/}
    
    if [[ "$SHOULD_UNINSTALL" =~ ^[Yy] ]]; then
      echo "🗑 Uninstalling..."
      adb uninstall com.mattdyor.sparks
    else
      echo "⏭ Skipping uninstall. Note: Deployment might fail if signatures don't match."
    fi
  else
    echo "⏭ Non-interactive mode: Skipping uninstall."
  fi
else
  echo "✅ App is not installed. Skipping uninstall."
fi

# 5. Run on physical device (assumes connected via ADB)
# 5. Run on physical device detection
echo "🔍 Scanning for physical Android devices..."
# List devices, filter out emulators and 'List of devices attached' header, ensures valid 'device' state
PHYSICAL_DEVICE_ID=$(adb devices | grep -v "List of devices attached" | grep -v "emulator" | grep -w "device" | head -n 1 | awk '{print $1}')

if [[ -n "$PHYSICAL_DEVICE_ID" ]]; then
  echo "✅ Found physical device: $PHYSICAL_DEVICE_ID"
  echo "🚀 Building Release APK with Gradle..."
  
  # Build the APK directly using Gradle wrapper
  cd android
  ./gradlew assembleRelease
  cd ..
  
  APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
  
  if [[ -f "$APK_PATH" ]]; then
    echo "📦 Installing APK to device ($PHYSICAL_DEVICE_ID)..."
    adb -s "$PHYSICAL_DEVICE_ID" install -r "$APK_PATH"
    
    echo "🚀 Launching app..."
    # Use monkey to launch the main activity without knowing the specific activity name
    adb -s "$PHYSICAL_DEVICE_ID" shell monkey -p com.mattdyor.sparks -c android.intent.category.LAUNCHER 1
    
    echo "✅ Deployment complete!"
  else
    echo "❌ Build failed - APK not found at $APK_PATH"
    exit 1
  fi
else
  echo "❌ No physical Android device detected!"
  echo "Please ensure:"
  echo "  1. Your Android device is connected via USB"
  echo "  2. USB Debugging is enabled on the device"
  echo "  3. 'adb devices' shows your device listed as 'device' (not 'unauthorized')"
  echo ""
  echo "Available devices (adb devices):"
  adb devices
  exit 1
fi
