# Authentication Setup Guide

## Phase 1 Implementation Complete ✅

All code for Phase 1 authentication has been implemented. Here's what was added:

### Files Created
1. **`src/services/AuthService.ts`** - Main authentication service with Google Sign-In
2. **`src/store/authStore.ts`** - Zustand store for auth state management
3. **`src/components/AuthComponents.tsx`** - Reusable auth UI components
4. **`src/components/AccountSettingsSection.tsx`** - Account settings section component

### Files Modified
1. **`src/screens/SettingsScreen.tsx`** - Added Account section
2. **`App.tsx`** - Added AuthService initialization and auth state listener

## Required Configuration

### 1. Firebase Console Setup

1. **Enable Google Sign-In Provider**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to your project: `sparkopedia-330f6`
   - Go to **Authentication** > **Sign-in method**
   - Click on **Google** provider
   - Enable it and save

2. **Get OAuth Client IDs**
   - The app uses `EXPO_PUBLIC_FIREBASE_APP_ID` as the Web Client ID (already configured)
   - Alternatively, you can set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` if you have a separate OAuth Client ID
   - The app will use `EXPO_PUBLIC_FIREBASE_APP_ID` by default if `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set

### 2. Environment Variables

The app will use `EXPO_PUBLIC_FIREBASE_APP_ID` (which should already be set) as the Web Client ID for Google Sign-In.

If you want to use a separate OAuth Client ID, you can optionally set:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
```

**Note:** The app will automatically use `EXPO_PUBLIC_FIREBASE_APP_ID` if `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set, so no additional configuration is required if you already have `EXPO_PUBLIC_FIREBASE_APP_ID` configured.

### 3. iOS Configuration (if needed)

The Google Sign-In package should work with Expo, but if you encounter issues:

1. Ensure `GoogleService-Info.plist` is properly configured (already done)
2. The package should automatically handle iOS configuration

### 4. Android Configuration (if needed)

1. Ensure `google-services.json` is properly configured (already done)
2. The package should automatically handle Android configuration

## Testing

1. **Start the app** and navigate to Settings
2. You should see the **Account** section after the Feedback section
3. Click **"Sign in with Google"**
4. Complete the Google Sign-In flow
5. Your profile should appear with your name and email
6. Test **Sign Out** functionality

## Current Features

✅ Google Sign-In integration
✅ User profile display
✅ Sign out functionality
✅ Auth state persistence (survives app restarts)
✅ Role system structure (standard, spark-admin, app-admin)
✅ User profile creation in Firestore

## Next Steps (Future Phases)

- **Phase 2**: Role management UI for assigning spark-admin and app-admin roles
- **Phase 3**: Enhanced profile management features

## Troubleshooting

### "Sign-in was cancelled"
- This is normal if the user cancels the Google Sign-In flow
- No error is shown to the user

### "Failed to get ID token from Google Sign-In"
- Check that `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set correctly
- Verify Google Sign-In is enabled in Firebase Console

### "Firebase Auth not available"
- Ensure Firebase is properly initialized
- Check that Firebase config environment variables are set

### Sign-in works but user profile doesn't show
- Check Firestore security rules allow creating documents in `users/{userId}`
- Check browser/app console for errors

## Security Notes

- User roles are stored in Firestore `users/{userId}` collection
- Default role is `'standard'` for all new users
- Roles can be manually updated in Firebase Console for now
- Future: Admin UI for role management

## Firestore Structure

```
users/{userId}
  - uid: string
  - email: string
  - displayName: string
  - role: 'standard' | 'spark-admin' | 'app-admin'
  - sparkAdminRoles: string[] (array of spark IDs)
  - createdAt: Timestamp
  - lastLoginAt: Timestamp
```
