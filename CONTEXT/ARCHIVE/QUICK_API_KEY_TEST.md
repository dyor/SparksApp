# Quick API Key Test Guide

## The Permission Error

The error you're seeing is about writing to a log file, not about setting the variable. The variable might have been set successfully before the error occurred.

## Quick Ways to Test

### Option 1: Check EAS Dashboard (Easiest)

1. Go to [Expo Dashboard](https://expo.dev/accounts/[your-account]/projects/sparks-app)
2. Navigate to **Credentials** → **Environment Variables**
3. Look for `EXPO_PUBLIC_GEMINI_API_KEY`
4. If it's there, it's set!

### Option 2: Test in Your App (Most Reliable)

Since EAS env vars are injected at **build time**, you need to:

1. **Build a new version** with EAS:
   ```bash
   eas build --platform android --profile production
   ```

2. **Or test locally** by temporarily adding to `.env`:
   ```bash
   # Create/edit .env file
   # Replace YOUR_API_KEY_HERE with your actual Gemini API key
   echo "EXPO_PUBLIC_GEMINI_API_KEY=YOUR_API_KEY_HERE" >> .env
   ```

3. **Run the app** and test an AI feature:
   - Open RecAIpe
   - Try creating a recipe
   - Check console logs for: `🔑 Using environment variable Gemini API key`

### Option 3: Check Build Logs

When you build with EAS, check the build logs - environment variables are listed (but values are masked for security).

## Important: EAS Env Vars vs Firebase Remote Config

**EAS Environment Variables:**
- ✅ Set once, used in all builds
- ❌ Requires rebuild to update
- ❌ Takes days/weeks to reach users

**Firebase Remote Config:**
- ✅ Update instantly without rebuild
- ✅ Reaches users within 1 hour
- ✅ No app update needed

**Recommendation**: Use **Firebase Remote Config** for the API key since you can update it instantly when it's leaked, without rebuilding.

## Current Setup Status

Based on your code, you have:
1. ✅ Firebase Remote Config service (`RemoteConfigService.ts`)
2. ✅ Three-tier key resolution (`GeminiService.ts`)
3. ✅ Settings UI for custom keys

**Next Step**: Set the key in Firebase Remote Config (see `FIREBASE_REMOTE_CONFIG_SETUP.md`)

## Test Checklist

- [ ] Check Expo Dashboard for env var
- [ ] Set key in Firebase Remote Config (recommended)
- [ ] Test AI feature in app
- [ ] Check console logs for key source
- [ ] Verify no API errors

## If You Want to Use EAS Env Var

The permission error can be fixed, but you'll still need to rebuild. To fix the permission:

```bash
# Fix cache permissions
sudo chown -R $(whoami) /Users/mattdyor/Library/Caches/eas-cli

# Then try again
npx eas env:list --scope project
```

But remember: **Firebase Remote Config is better for API keys** because you can update them instantly without rebuilding!

