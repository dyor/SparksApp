# Local iOS Production Build Guide - MONEY

## Understanding the Build Process

### Key Concepts

1. **Development Build** (`npx expo run:ios`):
   - Creates a dev client that connects to Metro bundler
   - Always looks for a development server
   - **Not suitable for TestFlight or standalone use**

2. **Production Build**:
   - Bundles JavaScript into the app
   - No development server needed
   - Works offline and can be distributed via TestFlight

### Your Issues Explained

#### Issue 1: Changes Not Appearing
When you run `npx expo run:ios`, it creates a **development build** that expects a development server. The JavaScript code is loaded at runtime from Metro. However, when you Archive in Xcode, it's still using the old bundled JavaScript from when you last ran the build.

**Solution:** You need to ensure the JavaScript is bundled into the app before archiving.

#### Issue 2: "No development servers found"
This happens because `npx expo run:ios` creates a **development build** by default, which requires Metro bundler to be running.

## Solution: Create a Production Build

### Step 1: Clean Build
```bash
cd /Users/mattdyor/SparksApp
rm -rf ios/build
cd ios && pod install && cd ..
```

### Step 2: Create Production Build in Xcode
**Do NOT use `npx expo run:ios` for production builds!**

Instead:

1. **Open Xcode:**
   ```bash
   open ios/Sparks.xcworkspace
   ```

2. **Create a Production Scheme:**
   - In Xcode, go to Product → Scheme → Edit Scheme
   - Select "Run" on the left
   - Change "Build Configuration" to **"Release"**
   - Close the dialog

3. **Bundle the JavaScript:**
   ```bash
   npx expo export --platform ios
   npx expo export --platform ios --output-dir dist
   <!-- need to have a usb connected iphone -->
   npx expo run:ios --device --configuration Release
   npx expo run:ios --device "Matt's iPhone (2)" --configuration Release
   ```
   
   This creates the optimized JS bundle in `dist/` folder

4. **Configure Bundle Path in Xcode:**
   - Select your project target
   - Go to Build Settings
   - Search for "Bundle React Native code and images"
   - Ensure it's set to build the bundle on each build
   - Or add this to your Xcode build phases:
     ```bash
     # Add to "Bundle React Native code and images" build phase
     cd ${SRCROOT}/../
     ../node_modules/react-native/scripts/react-native-xcode.sh
     ```

### Step 3: Build and Archive
1. In Xcode, select your device
2. Product → Archive
3. This will create a production build with bundled JavaScript

### Alternative: EAS Build (Easier Method)

If you want an easier way without dealing with Xcode configuration:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build production iOS
eas build --platform ios --profile production

# Download and install the build
```

## Quick Reference: When to Use Each Command

| Command | Use Case | Output |
|---------|----------|--------|
| `npx expo run:ios` | Development/testing | Dev client (needs Metro) |
| `npx expo run:ios --device --configuration Release` | Production dev client | Standalone app on device |
| Xcode Archive | Production build | App Store/TestFlight ready |
| `eas build --profile production` | Cloud production build | TestFlight ready |

## Most Reliable Method for Local Production Build

If you want to build locally without EAS:

```bash
# 1. Clean everything
cd /Users/mattdyor/SparksApp
rm -rf ios/build ios/DerivedData

# 2. Install pods
cd ios && pod install && cd ..

# 3. Build for a specific device
# First, list available devices:
xcrun devicectl list devices

# Then build for your device:
npx expo run:ios --device "Your Device Name" --configuration Release

# Or just let it prompt you interactively:
npx expo run:ios --configuration Release

# 4. Once it successfully builds on your device, open Xcode
open ios/Sparks.xcworkspace

# 5. In Xcode:
# - Select your device in the scheme selector
# - Product → Archive
# - This will create a production build ready for TestFlight
```

## Key Difference: Development vs Production

### Development Build (`npx expo run:ios`)
- Fast refresh enabled
- Requires Metro bundler running
- Loads JS at runtime
- Can connect to dev server

### Production Build (Archive in Xcode)
- No dev server needed
- JS is bundled in the app
- Optimized and minified
- Suitable for TestFlight

## Troubleshooting

### "No development servers found"
**Solution:** Don't use `npx expo run:ios` for production. Use the Archive method above.

### Changes not appearing after Archive
**Solution:** You need to rebuild the entire app, not just the JavaScript. The JavaScript bundle is created at build time.

### How to verify it's a production build
Run this in your terminal after the app starts:
```bash
# If Metro bundler doesn't need to be running, it's a production build
```

## Recommended Workflow

1. **For development:** Use `npx expo run:ios` or Expo Go
2. **For local production testing:** Use the Archive method in Xcode
3. **For TestFlight distribution:** Use EAS Build (easiest)

