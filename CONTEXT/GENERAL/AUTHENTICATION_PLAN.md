# Authentication Implementation Plan

## Overview
This plan outlines the implementation of Google authentication for the Sparks app, with support for future role-based access control (spark-admin and app-admin).

## Apple Sign-In Requirement
**Answer: Apple Sign-In is NOT required for iOS apps.**

As of January 2024, Apple updated their App Store guidelines. Apps offering third-party login services (like Google) can use any login service that meets privacy criteria:
- Limits data collection to name and email
- Allows users to keep email private during setup
- Doesn't track users as they interact with the app

Google Sign-In meets these criteria, so we can proceed with Google authentication only.

## Architecture Overview

### 1. Authentication Service Layer
Create a new `AuthService` that:
- Handles Google Sign-In
- Manages authentication state
- Provides user information
- Handles sign-out
- Integrates with Firebase Auth

### 2. User Roles System
- **Standard User**: Default role for all new sign-ups
- **Spark Admin**: Admin for a specific spark (e.g., "golfWisdom-admin")
- **App Admin**: Admin for the entire app

### 3. Firebase Integration
- Use Firebase Auth for authentication
- Store user roles in Firestore (`users/{userId}` collection)
- Use Firebase custom claims for role checking (optional, for performance)

## Implementation Steps

### Phase 1: Core Authentication Setup

#### Step 1.1: Install Dependencies
```bash
# Google Sign-In for React Native
npm install @react-native-google-signin/google-signin

# Firebase Auth (already installed, verify version)
# Check: firebase package includes auth
```

#### Step 1.2: Firebase Console Setup
1. Enable Google Sign-In provider in Firebase Console
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Configure OAuth consent screen (if needed)
2. Get OAuth client IDs:
   - iOS: Get from Firebase Console > Project Settings > Your apps > iOS app
   - Android: Get from Firebase Console > Project Settings > Your apps > Android app
   - Web: Get from Firebase Console > Project Settings > Your apps > Web app

#### Step 1.3: Create AuthService
**File**: `src/services/AuthService.ts`

Responsibilities:
- Initialize Google Sign-In
- Handle sign-in flow
- Handle sign-out
- Get current user
- Listen to auth state changes
- Check user roles

Key methods:
```typescript
class AuthService {
  static async initialize(): Promise<void>
  static async signInWithGoogle(): Promise<User | null>
  static async signOut(): Promise<void>
  static getCurrentUser(): User | null
  static onAuthStateChanged(callback: (user: User | null) => void): () => void
  static async getUserRole(): Promise<'standard' | 'spark-admin' | 'app-admin'>
  static async getSparkAdminRoles(): Promise<string[]> // Returns array of spark IDs user is admin for
  static isAppAdmin(): Promise<boolean>
  static isSparkAdmin(sparkId: string): Promise<boolean>
}
```

#### Step 1.4: Create User Store (Zustand)
**File**: `src/store/authStore.ts`

Store:
- Current user state
- User role
- Spark admin roles
- Loading states

#### Step 1.5: Update Settings Screen
**File**: `src/screens/SettingsScreen.tsx`

Add new "Account" section:
- Show user info (name, email) if signed in
- "Sign In with Google" button if not signed in
- "Sign Out" button if signed in
- Display user role (for debugging/admin visibility)

Placement: After Feedback section, before other sections (following SETTINGSDESIGN.md)

### Phase 2: Firebase Configuration

#### Step 2.1: Update Firebase Service
- Ensure Firebase Auth is initialized
- Update `WebFirebaseService` to use authenticated user instead of anonymous
- Update `FirebaseService` (React Native Firebase) similarly

#### Step 2.2: Create Users Collection Structure
**Firestore Structure**:
```
users/{userId}
  - email: string
  - displayName: string
  - role: 'standard' | 'spark-admin' | 'app-admin'
  - sparkAdminRoles: string[] (array of spark IDs)
  - createdAt: Timestamp
  - lastLoginAt: Timestamp
```

#### Step 2.3: Update Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAppAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'app-admin';
    }
    
    function isSparkAdmin(sparkId) {
      return isAuthenticated() && (
        isAppAdmin() ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.sparkAdminRoles.hasAny([sparkId])
      );
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (
        request.auth.uid == userId || // User can update their own data
        isAppAdmin() // App admin can update any user
      );
    }
    
    // Golf Wisdom collection (example for spark-admin)
    match /golfWisdom/{documentId} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update: if isAuthenticated() && (
        isAppAdmin() ||
        isSparkAdmin('golfWisdom')
      );
      allow delete: if isAppAdmin() || isSparkAdmin('golfWisdom');
    }
    
    // Other collections...
  }
}
```

### Phase 3: UI Components

#### Step 3.1: Create Auth Components
**File**: `src/components/AuthComponents.tsx`

Components:
- `SignInButton`: Google Sign-In button with proper styling
- `UserProfile`: Display user info
- `SignOutButton`: Sign out button

#### Step 3.2: Create Account Settings Section
**File**: `src/components/AccountSettingsSection.tsx`

Reusable component for account management:
- Shows user info when signed in
- Shows sign-in button when not signed in
- Handles sign-in/sign-out flow
- Displays role information (for admins)

### Phase 4: Integration Points

#### Step 4.1: Update App Initialization
**File**: `App.tsx`

- Initialize AuthService on app start
- Listen to auth state changes
- Update user store when auth state changes

#### Step 4.2: Update Analytics
- Use authenticated user ID instead of device ID when available
- Still support anonymous users (fallback to device ID)

#### Step 4.3: Update Feedback Service
- Associate feedback with authenticated user when available
- Fallback to device ID for anonymous users

### Phase 5: Testing

#### Step 5.1: Manual Testing Checklist
- [ ] Sign in with Google (iOS)
- [ ] Sign in with Google (Android)
- [ ] Sign in with Google (Web)
- [ ] Sign out
- [ ] User info displays correctly
- [ ] Auth state persists across app restarts
- [ ] Role checking works correctly
- [ ] Firestore rules enforce permissions correctly

#### Step 5.2: Edge Cases
- [ ] Network errors during sign-in
- [ ] User cancels Google Sign-In
- [ ] Token expiration handling
- [ ] Multiple devices with same account

## Future Enhancements (Not in Initial Implementation)

### Role Management
- Admin UI to assign spark-admin roles
- Admin UI to assign app-admin role
- Role management in Firebase Console (manual)

### Additional Auth Providers
- Email/Password (if needed)
- Apple Sign-In (optional, not required)

### User Profile Management
- Edit display name
- Profile picture
- Account deletion

## File Structure

```
src/
  services/
    AuthService.ts          # Main auth service
  components/
    AuthComponents.tsx      # Auth UI components
    AccountSettingsSection.tsx  # Account settings section
  store/
    authStore.ts            # Auth state management
  screens/
    SettingsScreen.tsx      # Updated with account section
```

## Dependencies

### Required Packages
- `@react-native-google-signin/google-signin` - Google Sign-In
- `firebase` (already installed) - Firebase Auth
- `@react-native-firebase/app` (already installed) - For native Firebase

### Configuration Files Needed
- iOS: Update `Info.plist` with Google Sign-In URL scheme
- Android: Update `AndroidManifest.xml` with Google Sign-In configuration
- Both: OAuth client IDs from Firebase Console

## Security Considerations

1. **OAuth Client IDs**: Store securely, don't commit to git
2. **Firestore Rules**: Enforce role-based access at database level
3. **Token Management**: Let Firebase handle token refresh
4. **User Data**: Only store necessary user data in Firestore
5. **Role Assignment**: Only allow app-admins to assign roles (via Firebase Console initially)

## Rollout Strategy

1. **Phase 1**: Core authentication (this plan)
   - Google Sign-In only
   - Basic user management
   - Role structure in place (but no UI for role assignment yet)

2. **Phase 2**: Role Management UI (future)
   - Admin interface for assigning roles
   - Spark-specific admin features

3. **Phase 3**: Enhanced Features (future)
   - Profile management
   - Additional auth providers if needed

## Notes

- Authentication is **optional** - users can still use the app anonymously
- When authenticated, user gets better experience (personalized data, admin features)
- Roles are stored in Firestore for flexibility
- Custom claims can be added later for performance optimization if needed
