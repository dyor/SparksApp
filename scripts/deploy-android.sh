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
    read -p "🗑 Uninstall existing app to avoid signature conflicts? (y/N): " SHOULD_UNINSTALL
    if [[ "$SHOULD_UNINSTALL" =~ ^[Yy]$ ]]; then
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
echo "Deploying to connected Android device in Release mode..."
npx expo run:android --variant release
