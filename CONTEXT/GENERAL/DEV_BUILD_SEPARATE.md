# Separate Development and Production Builds

## Problem

When you run `npx expo run:ios --device`, it uses the same bundle identifier (`com.mattdyor.sparks`) as your production app, which means it **overwrites** the production app on your iPhone.

## Solution: Use Different Bundle Identifiers

Configure your development build to use a different bundle identifier so both apps can coexist on your device.

## Configuration

### Option 1: Using app.config.js with Environment Variables (Recommended)

EAS doesn't allow `bundleIdentifier` and `package` in build profiles. Instead, use `app.config.js` to dynamically set these based on environment variables.

**Convert app.json to app.config.js:**

1. Rename `app.json` to `app.config.js`
2. Update it to read environment variables:

```javascript
const IS_DEV = process.env.EXPO_PUBLIC_BUILD_TYPE === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'Sparks Dev' : 'Sparks',
    slug: 'sparks-app',
    // ... all other config from app.json ...
    ios: {
      bundleIdentifier: IS_DEV ? 'com.mattdyor.sparks.dev' : 'com.mattdyor.sparks',
      // ... rest of iOS config ...
    },
    android: {
      package: IS_DEV ? 'com.mattdyor.sparks.dev' : 'com.mattdyor.sparks',
      // ... rest of Android config ...
    },
  },
};
```

**Build development version:**
```bash
eas build --platform ios --profile development --local
```

This creates a separate app called "Sparks Dev" that won't overwrite your production app.

### Option 2: Using app.json with Environment Variables

For local builds with `npx expo run:ios`, you can use environment variables to switch bundle identifiers.

**Update app.json:**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.mattdyor.sparks"
    },
    "android": {
      "package": "com.mattdyor.sparks"
    },
    "extra": {
      "eas": {
        "projectId": "18230acd-b45d-4f62-8406-6f3c8de209c7"
      }
    }
  }
}
```

**Create app.config.js** (instead of app.json) to dynamically set bundle identifier:

```javascript
const IS_DEV = process.env.EXPO_PUBLIC_BUILD_TYPE === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'Sparks Dev' : 'Sparks',
    slug: 'sparks-app',
    ios: {
      bundleIdentifier: IS_DEV ? 'com.mattdyor.sparks.dev' : 'com.mattdyor.sparks',
    },
    android: {
      package: IS_DEV ? 'com.mattdyor.sparks.dev' : 'com.mattdyor.sparks',
    },
    // ... rest of config
  },
};
```

**Run development build:**
```bash
EXPO_PUBLIC_BUILD_TYPE=development npx expo run:ios --device
```

### Option 3: Manual Xcode Configuration (Quick Fix)

If you just need a quick solution for local testing:

1. **Open Xcode:**
   ```bash
   open ios/Sparks.xcworkspace
   ```

2. **Change Bundle Identifier:**
   - Select your project in the navigator
   - Select the "Sparks" target
   - Go to "Signing & Capabilities"
   - Change "Bundle Identifier" to `com.mattdyor.sparks.dev`
   - Change "Display Name" to "Sparks Dev" (optional, to distinguish it)

3. **Build:**
   ```bash
   npx expo run:ios --device
   ```

**Note:** This change will be overwritten if you regenerate the iOS folder. Use Option 1 or 2 for a permanent solution.

## Recommended Approach

**For Development Testing:**
- Use `eas build --platform ios --profile development --local` 
- This creates "Sparks Dev" app that won't overwrite production
- Can test notifications, native features, etc.

**For Production:**
- Use `eas build --platform ios --profile production`
- Or use Xcode Archive with production bundle identifier
- This creates the production "Sparks" app

## Benefits

✅ Both apps can coexist on your device  
✅ Easy to distinguish between dev and production  
✅ Can test development features without affecting production app  
✅ Production app stays untouched during development  

## App Names

- **Production:** "Sparks" (bundle: `com.mattdyor.sparks`)
- **Development:** "Sparks Dev" (bundle: `com.mattdyor.sparks.dev`)

Both will appear as separate apps on your iPhone home screen.

