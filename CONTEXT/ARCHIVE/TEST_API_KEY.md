# Testing API Key Configuration

## How to Verify Your API Key is Set

### Method 1: Check EAS Environment Variables

```bash
# List all project-level environment variables
npx eas env:list --scope project

# Check a specific variable
npx eas env:get --scope project --name EXPO_PUBLIC_GEMINI_API_KEY
```

### Method 2: Test in the App

The app uses a three-tier key resolution system. Here's how to check which key is being used:

#### Check Console Logs

When the app makes an API call, it logs which key source is being used:

- `🔑 Using custom Gemini API key` - User's custom key from Settings
- `🔑 Using Remote Config Gemini API key` - Firebase Remote Config key
- `🔑 Using environment variable Gemini API key` - EAS environment variable

#### Steps to Test:

1. **Remove any custom key** (if set):
   - Open app → Settings → AI Settings
   - Remove custom API key if one is set
   - This ensures EAS env var or Remote Config is used

2. **Test an AI feature**:
   - Try RecAIpe: Create a recipe
   - Try Dream Catcher: Record a dream
   - Try Speak Spark: Use voice command
   - Try Buzzy Bingo: Generate a word set

3. **Check the logs**:
   - Look for the key source log message
   - If you see "Using environment variable", the EAS env var is working

### Method 3: Test API Key Directly

You can test if the API key works by making a direct API call:

```bash
# Replace YOUR_API_KEY with your actual key
curl -X POST \
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Say hello"
      }]
    }]
  }'
```

If successful, you'll get a JSON response with generated content.

### Method 4: Check Build Configuration

EAS environment variables are injected at build time. To verify:

1. **Check your build logs**:
   - When building with EAS, check the build logs
   - Environment variables should be listed (but values are masked)

2. **Check if variable is accessible**:
   - In your app code, you can temporarily log:
   ```typescript
   console.log('API Key present:', !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
   console.log('API Key length:', process.env.EXPO_PUBLIC_GEMINI_API_KEY?.length);
   ```
   - Don't log the actual key value!

### Method 5: Verify Firebase Remote Config

If you've set up Firebase Remote Config:

1. **Check Firebase Console**:
   - Go to Firebase Console → Remote Config
   - Verify `gemini_api_key` parameter exists and has a value

2. **Check app logs**:
   - Look for: `✅ Remote Config fetched and activated`
   - Look for: `🔑 Using Remote Config Gemini API key`

## Troubleshooting

### If EAS env var isn't working:

1. **Verify the variable name**:
   - Must be exactly: `EXPO_PUBLIC_GEMINI_API_KEY`
   - Must have `EXPO_PUBLIC_` prefix for web/client access

2. **Check build profile**:
   - EAS env vars are scoped to build profiles
   - Make sure you're using the correct profile (production/preview/development)

3. **Rebuild the app**:
   - EAS env vars are injected at build time
   - You need to rebuild for changes to take effect:
   ```bash
   eas build --platform android --profile production
   ```

### If Remote Config isn't working:

1. **Check initialization**:
   - Look for: `✅ Remote Config initialized` in logs
   - If missing, Remote Config may not be initialized

2. **Check fetch status**:
   - Look for: `🔄 Fetching Remote Config...`
   - Then: `✅ Remote Config fetched and activated`

3. **Force refresh**:
   - The app fetches Remote Config on startup
   - Or wait up to 1 hour for automatic fetch

## Quick Test Checklist

- [ ] EAS env var exists: `npx eas env:list --scope project`
- [ ] No custom key set in Settings
- [ ] Firebase Remote Config parameter exists (if using)
- [ ] App logs show which key source is used
- [ ] AI feature works (recipe generation, dream interpretation, etc.)
- [ ] No API errors in console

## Expected Behavior

When everything is configured correctly:

1. **User has custom key**: Uses custom key (highest priority)
2. **No custom key, Remote Config set**: Uses Remote Config key
3. **No custom key, no Remote Config, EAS env var set**: Uses EAS env var
4. **None of the above**: Shows error "No Gemini API key available"

The key resolution happens in `src/services/GeminiService.ts` in the `getApiKey()` function.

