# Friend Spark Firestore Security Rules

## Updated Security Rules

Add these rules to your Firestore security rules in the Firebase Console. These rules should be added alongside your existing rules.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions (if not already defined)
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Friend Invitations Collection
    match /friendInvitations/{invitationId} {
      // Anyone authenticated can create an invitation
      allow create: if isAuthenticated() && 
                       request.resource.data.fromUserId == request.auth.uid;
      
      // Users can read invitations they sent or received
      allow read: if isAuthenticated() && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toUserId == request.auth.uid ||
        (resource.data.toEmail == request.auth.token.email && resource.data.toUserId == null)
      );
      
      // Recipients can update status to accepted/rejected
      allow update: if isAuthenticated() && 
                        resource.data.toEmail == request.auth.token.email &&
                        resource.data.status == 'pending' &&
                        request.resource.data.status in ['accepted', 'rejected'] &&
                        request.resource.data.toUserId == request.auth.uid;
    }
    
    // Friendships Collection
    match /friendships/{friendshipId} {
      // Users can read friendships they're part of
      allow read: if isAuthenticated() && (
        resource.data.userId1 == request.auth.uid ||
        resource.data.userId2 == request.auth.uid
      );
      
      // Users can create friendships (when accepting invitation)
      allow create: if isAuthenticated() && (
        request.resource.data.userId1 == request.auth.uid ||
        request.resource.data.userId2 == request.auth.uid
      );
      
      // Users can delete friendships (unfriend)
      allow delete: if isAuthenticated() && (
        resource.data.userId1 == request.auth.uid ||
        resource.data.userId2 == request.auth.uid
      );
      
      // No updates allowed (friendships are immutable)
      allow update: if false;
    }
    
    // Users Collection (for friend profiles)
    // This should already exist, but ensure users can read other users' basic profile info
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;
      
      // Users can read other users' basic profile (for friend list)
      allow read: if isAuthenticated();
      
      // Users can create/update their own profile
      allow create, update: if isAuthenticated() && request.auth.uid == userId;
    }
  }
}
```

## Important Notes

1. **Email Matching**: The rules use `request.auth.token.email` to match invitations by email. This requires that users sign in with an email provider (Google, Apple, etc.).

2. **Mutual Friendships**: When an invitation is accepted, the system creates a single friendship document with normalized user IDs (lower ID first). Both users can read this document.

3. **Invitation Status**: Invitations start as `'pending'` and can only be updated to `'accepted'` or `'rejected'` by the recipient.

4. **User Profiles**: The rules allow authenticated users to read other users' profiles (needed for friend lists). Users can only write their own profile.

## Testing

After updating the rules:

1. Test creating an invitation (should work if authenticated)
2. Test reading invitations (should only see your own)
3. Test accepting an invitation (should work if you're the recipient)
4. Test reading friendships (should only see your own)
5. Test deleting a friendship (should work if you're part of it)

## Future Rules (Phase 2)

When implementing shared items, you'll need additional rules for:
- `sharedItems` collection
- `shareRelationships` collection

These will be added in Phase 2 of the Friend Spark implementation.
