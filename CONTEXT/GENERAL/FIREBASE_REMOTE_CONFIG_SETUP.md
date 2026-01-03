# Firebase Remote Config - Gemini API Key Setup

## Overview

This guide explains how to set and update the Gemini API key using Firebase Remote Config. The app uses a three-tier key resolution system:

1. **User's custom key** (from Settings - highest priority)
2. **Firebase Remote Config key** (managed remotely)
3. **Environment variable** (fallback)

## Prerequisites

- Access to Firebase Console for your project
- Firebase project configured with Remote Config enabled
- Admin access to set Remote Config values

## Step-by-Step Instructions

### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Sparks App** (or your project name)
3. In the left sidebar, navigate to **Build** → **Remote Config**

### Step 2: Create/Update the Remote Config Parameter

1. **If the parameter doesn't exist:**
   - Click **"Add parameter"** or **"Create parameter"**
   - Parameter key: `gemini_api_key`
   - Default value: Enter your Gemini API key (or leave empty to use environment variable fallback)
   - Description (optional): "Gemini API key for AI-powered Sparks"

2. **If the parameter already exists:**
   - Find `gemini_api_key` in the parameter list
   - Click on it to edit
   - Update the value with your new API key

### Step 3: Set Parameter Value

1. In the parameter editor:
   - **Parameter key**: `gemini_api_key`
   - **Default value**: Enter your Gemini API key
     - Example: `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567`
   - **Value type**: String

2. **Important**: The value should be the full API key string, no quotes or extra formatting

### Step 4: Add Conditions (Optional)

You can add conditions to target specific app versions, user segments, etc.:

1. Click **"Add condition"** if needed
2. Common use cases:
   - **App version**: Target specific app versions
   - **User properties**: Target specific user groups
   - **Random percentile**: Gradual rollout

For most cases, you can leave it as the default value (applies to all users).

### Step 5: Publish Changes

1. Click **"Publish changes"** button (usually in the top right)
2. Review the changes in the confirmation dialog
3. Click **"Publish"** to activate

### Step 6: Verify the Update

The app will fetch the new value:
- **Immediately**: If the app calls `RemoteConfigService.forceRefresh()`
- **Within 1 hour**: Automatic fetch interval (configured in `RemoteConfigService.ts`)
- **On next app launch**: If Remote Config hasn't been initialized yet

## How It Works in the App

### Key Resolution Order

When the app needs a Gemini API key, it checks in this order:

1. **User's Custom Key** (from Settings)
   - Stored in AsyncStorage: `sparks_custom_gemini_api_key`
   - User can set this in Settings → AI Settings
   - Takes highest priority

2. **Firebase Remote Config Key**
   - Parameter name: `gemini_api_key`
   - Fetched from Firebase Remote Config
   - Updates automatically without app update

3. **Environment Variable** (Fallback)
   - `EXPO_PUBLIC_GEMINI_API_KEY`
   - Used if Remote Config is unavailable or empty

### Code Reference

The key resolution is implemented in:
- `src/services/GeminiService.ts` - `getApiKey()` function
- `src/services/RemoteConfigService.ts` - Remote Config fetching

## Troubleshooting

### Key Not Updating

1. **Check Firebase Console:**
   - Verify the parameter is published (not just saved as draft)
   - Check the parameter key matches exactly: `gemini_api_key`

2. **Check App Logs:**
   - Look for Remote Config logs:
     - `✅ Remote Config fetched and activated`
     - `🔑 Using Remote Config Gemini API key`
   - If you see errors, check the console output

3. **Force Refresh:**
   - The app fetches Remote Config on startup
   - You can also call `RemoteConfigService.forceRefresh()` to force an immediate fetch

### Testing the Update

1. **Remove user's custom key** (if set):
   - Go to Settings → AI Settings
   - Remove custom API key
   - This allows Remote Config key to be used

2. **Check which key is being used:**
   - Look for console logs:
     - `🔑 Using Remote Config Gemini API key` - Remote Config is working
     - `🔑 Using environment variable Gemini API key` - Remote Config not available/empty

3. **Test an AI feature:**
   - Try RecAIpe, Dream Catcher, Speak Spark, or Buzzy Bingo
   - If it works, the key is being used correctly

## Security Best Practices

1. **Don't expose keys in code:**
   - Never commit API keys to git
   - Use environment variables or Remote Config

2. **Rotate keys regularly:**
   - If a key is leaked, update it in Firebase Console immediately
   - No app update needed - changes take effect within 1 hour

3. **Monitor usage:**
   - Check Google AI Studio for API usage
   - Set up alerts for unusual activity

4. **Use conditions for gradual rollout:**
   - Test new keys with a small user segment first
   - Gradually increase to 100% if stable

## Quick Reference

### Firebase Console Path
```
Firebase Console → Your Project → Build → Remote Config
```

### Parameter Details
- **Key**: `gemini_api_key`
- **Type**: String
- **Default Value**: Your Gemini API key

### App Code Locations
- Remote Config Service: `src/services/RemoteConfigService.ts`
- Gemini Service: `src/services/GeminiService.ts`
- Settings UI: `src/screens/SettingsScreen.tsx`

## Example: Rotating a Leaked Key

If your API key is leaked (like shown in the error message):

1. **Generate new key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/api-keys)
   - Create a new API key
   - Copy the new key

2. **Update in Firebase:**
   - Firebase Console → Remote Config
   - Find `gemini_api_key`
   - Update value with new key
   - Publish changes

3. **Revoke old key:**
   - In Google AI Studio, delete/revoke the leaked key

4. **Verify:**
   - Wait up to 1 hour for app to fetch new key
   - Or restart the app to force immediate fetch
   - Test an AI feature to confirm it works

**No app update required!** The new key will be available to all users within 1 hour.

