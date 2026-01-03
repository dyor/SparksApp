# Firebase Setup Guide

## Overview

The feedback and analytics system is designed to work in both development (Expo Go) and production environments. In development, it uses a mock service. In production, it uses real Firebase services.

## Development (Expo Go)

The system automatically detects when Firebase is not available and uses a mock service. No additional setup is required for development.

### Mock Service Features

- ✅ All analytics events are logged to console
- ✅ Feedback is stored in memory
- ✅ Feature flags work with mock data
- ✅ Session tracking works
- ✅ Privacy controls work

## Production Setup

For production builds, you'll need to set up Firebase:

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Set up authentication (optional)

### 2. Configure React Native Firebase

#### For Expo Development Build:

```bash
# Install Firebase dependencies
npm install @react-native-firebase/app @react-native-firebase/firestore

# Configure Firebase
npx expo install @react-native-firebase/app @react-native-firebase/firestore
```

#### For Bare React Native:

```bash
# Install Firebase dependencies
npm install @react-native-firebase/app @react-native-firebase/firestore

# iOS setup
cd ios && pod install
```

### 3. Firebase Configuration Files

#### iOS (ios/GoogleService-Info.plist)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Add your Firebase configuration here -->
</dict>
</plist>
```

#### Android (android/app/google-services.json)
```json
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "project_id": "YOUR_PROJECT_ID"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "YOUR_APP_ID"
      }
    }
  ]
}
```

### 4. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Feedback is write-only for users, read-only for admins
    match /feedback/{feedbackId} {
      allow create: if request.auth != null;
      allow read: if hasAdminRole();
    }

    // Analytics events are write-only
    match /analytics/{eventId} {
      allow create: if request.auth != null;
      allow read: if hasAdminRole();
    }

    // Feature flags are read-only for users
    match /featureFlags/{flagId} {
      allow read: if request.auth != null;
      allow write: if hasAdminRole();
    }

    // Sessions are user-specific
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. Environment Configuration

The app uses environment variables for Firebase configuration. These must be prefixed with `EXPO_PUBLIC_` to be available at runtime.

#### For Local Development

1. Create a `.env` file in the project root:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

2. Get these values from Firebase Console:
   - Go to Firebase Console > Project Settings > General
   - Scroll to "Your apps" section
   - Click on your Web app (or create one if it doesn't exist)
   - Copy the config values

3. Restart your Expo dev server after creating/updating `.env`:
```bash
npx expo start --clear
```

#### For EAS Builds (Production/Preview/Development)

**Option 1: Using EAS Secrets (Recommended)**

Set secrets using EAS CLI:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_api_key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your_auth_domain"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your_project_id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your_storage_bucket"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your_sender_id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your_app_id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "your_measurement_id"
```

**Option 2: Using eas.json (Less Secure)**

You can also set them directly in `eas.json` under the build profile's `env` section, but this is less secure as the values will be visible in your repository.

**Important Notes:**
- Environment variables MUST use the `EXPO_PUBLIC_` prefix to be available at runtime
- For web builds, these are embedded at build time
- For native builds, they're injected during the EAS build process
- Never commit your `.env` file to version control (it should be in `.gitignore`)

## Testing

### Development Testing

1. Run the app in Expo Go
2. Check console logs for mock service activity
3. Test feedback submission
4. Test analytics tracking
5. Test privacy controls

### Production Testing

1. Build a development build with Firebase
2. Test real Firebase integration
3. Verify data is stored in Firestore
4. Test security rules
5. Test analytics dashboard

## Monitoring

### Analytics Dashboard

The system provides analytics data through:

- **User Engagement**: Session duration, completion rates
- **Feature Usage**: Most/least used features
- **Error Tracking**: Crash reports and error rates
- **Feedback Analysis**: User ratings and comments

### Admin Dashboard

For production, consider building an admin dashboard to:

- View real-time analytics
- Manage feature flags
- Review user feedback
- Monitor system health

## Troubleshooting

### Common Issues

1. **"Native module not found" error**
   - Solution: Use mock service in development
   - For production: Ensure Firebase is properly linked

2. **Firestore permission denied**
   - Solution: Check security rules
   - Ensure user authentication is working

3. **Analytics not tracking**
   - Solution: Check if analytics are enabled in settings
   - Verify Firebase configuration

### Debug Mode

Enable debug logging:

```typescript
// In your app initialization
if (__DEV__) {
  console.log('Analytics Service Status:', AnalyticsService.getSessionInfo());
  console.log('Firebase Service Status:', ServiceFactory.isUsingMock() ? 'Mock' : 'Real');
}
```

## Migration from Mock to Real Firebase

When moving from development to production:

1. Set up Firebase project
2. Configure security rules
3. Test with development build
4. Deploy to production
5. Monitor data flow

The system is designed to be seamless - no code changes are required when switching from mock to real Firebase services.
