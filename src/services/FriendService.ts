import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import AuthService, { User } from './AuthService';

const INVITATIONS_COLLECTION = 'friendInvitations';
const FRIENDSHIPS_COLLECTION = 'friendships';

export interface FriendInvitation {
    id: string;
    fromUserId: string;
    fromUserEmail: string;
    fromUserName: string;
    toEmail: string;
    toUserId?: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
    respondedAt?: Timestamp;
}

export interface Friendship {
    id: string;
    userId1: string; // Always lower userId
    userId2: string; // Always higher userId
    user1Email: string;
    user2Email: string;
    user1Name: string;
    user2Name: string;
    createdAt: Timestamp;
}

export interface Friend {
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    friendshipId: string;
}

export class FriendService {
    /**
     * Get Firebase app instance
     */
    private static async getFirebaseApp() {
        const { initializeApp, getApps } = require('firebase/app');
        const firebaseConfig = {
            apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
            measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
        };

        if (getApps().length === 0) {
            return initializeApp(firebaseConfig);
        }
        return getApps()[0];
    }

    /**
     * Get Firestore instance
     */
    private static async getFirestore() {
        const { getFirestore } = require('firebase/firestore');
        const app = await this.getFirebaseApp();
        return getFirestore(app);
    }

    /**
     * Ensure user is authenticated
     */
    private static ensureAuthenticated(): User {
        const user = AuthService.getCurrentUser();
        if (!user) {
            throw new Error('User must be authenticated to use Friend Spark');
        }
        return user;
    }

    /**
     * Normalize user IDs for friendship storage (always store lower ID first)
     */
    private static normalizeUserIds(userId1: string, userId2: string): [string, string] {
        return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    }

    /**
     * Create a friend invitation
     */
    static async createInvitation(toEmail: string): Promise<string> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            throw new Error('Invalid email address');
        }

        // Don't allow self-invitation
        if (toEmail.toLowerCase() === user.email?.toLowerCase()) {
            throw new Error('You cannot invite yourself');
        }

        // Check if invitation already exists
        const existingQuery = query(
            collection(db, INVITATIONS_COLLECTION),
            where('fromUserId', '==', user.uid),
            where('toEmail', '==', toEmail.toLowerCase()),
            where('status', '==', 'pending')
        );
        const existingSnapshot = await getDocs(existingQuery);
        if (!existingSnapshot.empty) {
            throw new Error('You have already sent an invitation to this email');
        }

        // Check if already friends
        const isFriend = await this.isFriendByEmail(toEmail);
        if (isFriend) {
            throw new Error('You are already friends with this user');
        }

        // Create invitation
        const invitationData = {
            fromUserId: user.uid,
            fromUserEmail: user.email || '',
            fromUserName: user.displayName || 'Unknown',
            toEmail: toEmail.toLowerCase(),
            status: 'pending' as const,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, INVITATIONS_COLLECTION), invitationData);
        console.log(`✅ Created invitation ${docRef.id} to ${toEmail}`);

        // TODO: Send email notification (Phase 2)
        // TODO: Create in-app notification (Phase 2)

        return docRef.id;
    }

    /**
     * Get pending invitations for current user
     */
    static async getPendingInvitations(): Promise<FriendInvitation[]> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        // Get invitations where user is the recipient
        const q = query(
            collection(db, INVITATIONS_COLLECTION),
            where('toEmail', '==', user.email?.toLowerCase() || ''),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        const invitations: FriendInvitation[] = [];

        snapshot.forEach((doc) => {
            invitations.push({
                id: doc.id,
                ...doc.data(),
            } as FriendInvitation);
        });

        // Sort by creation date (newest first)
        invitations.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        return invitations;
    }

    /**
     * Accept a friend invitation
     */
    static async acceptInvitation(invitationId: string): Promise<void> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
        const invitationDoc = await getDoc(invitationRef);

        if (!invitationDoc.exists()) {
            throw new Error('Invitation not found');
        }

        const invitation = invitationDoc.data() as FriendInvitation;

        // Verify this invitation is for the current user
        if (invitation.toEmail.toLowerCase() !== user.email?.toLowerCase()) {
            throw new Error('This invitation is not for you');
        }

        if (invitation.status !== 'pending') {
            throw new Error('This invitation has already been responded to');
        }

        // Update invitation status
        await updateDoc(invitationRef, {
            status: 'accepted',
            toUserId: user.uid,
            respondedAt: Timestamp.now(),
        });

        // Create mutual friendship relationship
        const [userId1, userId2] = this.normalizeUserIds(invitation.fromUserId, user.uid);

        // Check if friendship already exists
        const friendshipQuery = query(
            collection(db, FRIENDSHIPS_COLLECTION),
            where('userId1', '==', userId1),
            where('userId2', '==', userId2)
        );
        const existingFriendship = await getDocs(friendshipQuery);

        if (existingFriendship.empty) {
            // Get user profiles for names
            const fromUserProfile = await this.getUserProfile(invitation.fromUserId);
            const toUserProfile = await this.getUserProfile(user.uid);

            // Create friendship document
            const friendshipData: Omit<Friendship, 'id'> = {
                userId1,
                userId2,
                user1Email: userId1 === invitation.fromUserId ? invitation.fromUserEmail : user.email || '',
                user2Email: userId2 === user.uid ? user.email || '' : invitation.fromUserEmail,
                user1Name: userId1 === invitation.fromUserId ? invitation.fromUserName : (toUserProfile?.displayName || 'Unknown'),
                user2Name: userId2 === user.uid ? (toUserProfile?.displayName || 'Unknown') : invitation.fromUserName,
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, FRIENDSHIPS_COLLECTION), friendshipData);
            console.log(`✅ Created friendship between ${userId1} and ${userId2}`);
        }

        // TODO: Clear notification (Phase 2)
    }

    /**
     * Reject a friend invitation
     */
    static async rejectInvitation(invitationId: string): Promise<void> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
        const invitationDoc = await getDoc(invitationRef);

        if (!invitationDoc.exists()) {
            throw new Error('Invitation not found');
        }

        const invitation = invitationDoc.data() as FriendInvitation;

        // Verify this invitation is for the current user
        if (invitation.toEmail.toLowerCase() !== user.email?.toLowerCase()) {
            throw new Error('This invitation is not for you');
        }

        if (invitation.status !== 'pending') {
            throw new Error('This invitation has already been responded to');
        }

        // Update invitation status
        await updateDoc(invitationRef, {
            status: 'rejected',
            toUserId: user.uid,
            respondedAt: Timestamp.now(),
        });

        // TODO: Clear notification (Phase 2)
    }

    /**
     * Get all friends for current user
     */
    static async getFriends(): Promise<Friend[]> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        // Query friendships where user is userId1 or userId2
        const q1 = query(
            collection(db, FRIENDSHIPS_COLLECTION),
            where('userId1', '==', user.uid)
        );
        const q2 = query(
            collection(db, FRIENDSHIPS_COLLECTION),
            where('userId2', '==', user.uid)
        );

        const [snapshot1, snapshot2] = await Promise.all([
            getDocs(q1),
            getDocs(q2),
        ]);

        const friends: Friend[] = [];

        // Process friendships where user is userId1
        snapshot1.forEach((doc) => {
            const friendship = doc.data() as Friendship;
            friends.push({
                userId: friendship.userId2,
                email: friendship.user2Email,
                displayName: friendship.user2Name,
                friendshipId: doc.id,
            });
        });

        // Process friendships where user is userId2
        snapshot2.forEach((doc) => {
            const friendship = doc.data() as Friendship;
            friends.push({
                userId: friendship.userId1,
                email: friendship.user1Email,
                displayName: friendship.user1Name,
                friendshipId: doc.id,
            });
        });

        // Get user profiles for photo URLs
        const friendsWithPhotos = await Promise.all(
            friends.map(async (friend) => {
                const profile = await this.getUserProfile(friend.userId);
                return {
                    ...friend,
                    photoURL: profile?.photoURL,
                };
            })
        );

        // Sort by name
        friendsWithPhotos.sort((a, b) => a.displayName.localeCompare(b.displayName));

        return friendsWithPhotos;
    }

    /**
     * Remove a friend
     */
    static async removeFriend(friendId: string): Promise<void> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        // Find the friendship
        const [userId1, userId2] = this.normalizeUserIds(user.uid, friendId);

        const q = query(
            collection(db, FRIENDSHIPS_COLLECTION),
            where('userId1', '==', userId1),
            where('userId2', '==', userId2)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('Friendship not found');
        }

        // Delete the friendship
        const friendshipDoc = snapshot.docs[0];
        await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, friendshipDoc.id));

        console.log(`✅ Removed friendship between ${user.uid} and ${friendId}`);
    }

    /**
     * Check if user is friends with another user by email
     */
    static async isFriendByEmail(email: string): Promise<boolean> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        // Get user profile by email
        const userProfile = await this.getUserProfileByEmail(email);
        if (!userProfile) {
            // User doesn't exist yet, so can't be friends
            return false;
        }

        // Check if friendship exists
        const [userId1, userId2] = this.normalizeUserIds(user.uid, userProfile.uid);

        const q = query(
            collection(db, FRIENDSHIPS_COLLECTION),
            where('userId1', '==', userId1),
            where('userId2', '==', userId2)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    /**
     * Get sent invitations for current user
     */
    static async getSentInvitations(): Promise<FriendInvitation[]> {
        const user = this.ensureAuthenticated();
        const db = await this.getFirestore();

        const q = query(
            collection(db, INVITATIONS_COLLECTION),
            where('fromUserId', '==', user.uid)
        );

        const snapshot = await getDocs(q);
        const invitations: FriendInvitation[] = [];

        snapshot.forEach((doc) => {
            invitations.push({
                id: doc.id,
                ...doc.data(),
            } as FriendInvitation);
        });

        // Sort by creation date (newest first)
        invitations.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        return invitations;
    }

    /**
     * Get user profile from Firestore
     */
    private static async getUserProfile(uid: string): Promise<{ displayName: string; email: string; photoURL?: string } | null> {
        try {
            const db = await this.getFirestore();
            const userDoc = await getDoc(doc(db, 'users', uid));

            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    displayName: data.displayName || 'Unknown',
                    email: data.email || '',
                    photoURL: data.photoURL,
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Get user profile by email
     */
    private static async getUserProfileByEmail(email: string): Promise<{ uid: string; displayName: string; email: string } | null> {
        try {
            const db = await this.getFirestore();
            const q = query(
                collection(db, 'users'),
                where('email', '==', email.toLowerCase())
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const data = userDoc.data();
                return {
                    uid: userDoc.id,
                    displayName: data.displayName || 'Unknown',
                    email: data.email || '',
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting user profile by email:', error);
            return null;
        }
    }
}

export default FriendService;
