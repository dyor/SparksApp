# Firebase Remote Config Overwrites

This document outlines the values that can be dynamically updated in the Sparks app using Firebase Remote Config. These overrides allow you to fix configuration errors or rotate API keys without requiring a new app store submission.

## 🛠️ Essential Parameters
For most cases, you only need to set these **two** parameters in Remote Config to have a fully functional app:

| Parameter Key | Type | Description |
| :--- | :--- | :--- |
| `gemini_api_key` | String | The primary API key used for all Gemini AI features. |
| `web_firebase_config` | JSON | A JSON object containing the full Firebase Web SDK configuration. Used for Firestore, Analytics, and Google Sign-In. |

---

## 💎 Gemini API Key Overwrite
**Key**: `gemini_api_key`  
**Value**: `your-new-api-key-here`

### How it works:
The app follows a specific hierarchy to find the Gemini API key:
1. **User Override**: If the user has manually entered a key in the app's Settings page (highest priority).
2. **Remote Config**: If no user key exists, it checks this Remote Config value.
3. **Build-time Env**: Fallback to the `EXPO_PUBLIC_GEMINI_API_KEY` baked into the build.

---

## 🔥 Firebase Web SDK Overwrite (JSON)
**Key**: `web_firebase_config`  
**Value**: (JSON Object)

This allows you to completely override the Firebase credentials used for the app. The `appId` inside this JSON is also automatically used as the Client ID for **Google Sign-In**.

### JSON Format:
The value must be a valid JSON object. You can copy these values from the **Firebase Console > Project Settings > Your Apps > Web App**.

```json
{
  "apiKey": "AIza...",
  "authDomain": "sparks-app.firebaseapp.com",
  "projectId": "sparks-app",
  "storageBucket": "sparks-app.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef",
  "measurementId": "G-ABCDEF"
}
```

### How it works:
The app prioritizes this Remote Config JSON over any other source. If this JSON is valid, it will be used to initialize the Firebase Web SDK and configure Google Sign-In.

---

## 🔧 Individual Key Overwrites (Optional)
If you don't want to use the full JSON object, you can override keys individually using their environment variable names as Remote Config keys (e.g., `EXPO_PUBLIC_FIREBASE_APP_ID`).

**Priority Hierarchy for Firebase Config:**
1. `web_firebase_config` (Remote Config JSON)
2. Individual Remote Config overrides (e.g., `EXPO_PUBLIC_FIREBASE_API_KEY`)
3. Build-time environment variables (`.env`)

---

## 🚀 How to Set Values in Firebase Console

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project and go to **Run > Remote Config**.
3.  Click **Add Parameter**.
4.  Enter the **Parameter Key** (e.g., `gemini_api_key` or `web_firebase_config`).
5.  Set the **Value** (ensure `web_firebase_config` is set to the "JSON" type in the console if available).
6.  Click **Save**.
7.  **IMPORTANT**: Click the **Publish Changes** button at the top of the screen to make them live.

## ⏱️ Fetching & Caching
- The app fetches new values every **1 hour** by default.
- To see changes immediately during testing, you may need to force-close and restart the app.
