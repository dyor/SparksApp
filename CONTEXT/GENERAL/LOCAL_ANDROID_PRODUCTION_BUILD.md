for Android...
android/app/build.gradle - increase version code by 1

cd /Users/mattdyor/SparksApp && rm -rf node_modules && npm install 
npx expo prebuild --clean
cd /Users/mattdyor/SparksApp/android && ./gradlew clean
cd /Users/mattdyor/SparksApp
npx expo run:android --variant release

If you just wanna install the app that was built already...
adb install /Users/mattdyor/SparksApp/android/app/build/outputs/apk/release/app-release.apk

Run android emulator without studio
~/Library/Android/sdk/emulator/emulator -avd $(~/Library/Android/sdk/tools/emulator -list-avds | head -n 1)



Random hacking to get android to build
npx expo install --check
cd android && ./gradlew clean && cd ..

adb logcat -d | 
grep -E "AndroidRuntime|ReferenceError|FATAL EXCEPTION|
E/React"


