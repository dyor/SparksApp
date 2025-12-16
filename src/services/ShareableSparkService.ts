import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, Timestamp, setDoc } from 'firebase/firestore';
import AuthService from './AuthService';

const SHARED_ITEMS_COLLECTION = 'sharedItems';

export interface ShareableItem {
    id: string; // Original item ID (must be preserved)
    title: string;
    description?: string;
    preview?: string; // Preview text/image URL
    sparkId: string;
    data?: any; // Full item data for copy model
}

export interface SharedItemCopy {
    id: string; // New ID for the copy
    originalId: string; // Original item ID (for reference)
    sharedFromId: string; // Original item ID (same as originalId)
    sharedByUserId: string;
    sharedByUserName: string;
    sharedAt: Timestamp;
    sparkId: string;
    itemData: any; // The actual item data (copy)
}

export type SharingModel = 'copy' | 'shared';

export interface ShareableSpark {
    sparkId: string;
    sharingModel: SharingModel;
    getShareableItems: () => Promise<ShareableItem[]>;
    onShareItem: (itemId: string, friendId: string) => Promise<void>;
}

class ShareableSparkService {
    private static shareableSparks: Map<string, ShareableSpark> = new Map();

    /**
     * Register a spark as shareable
     */
    static registerSpark(spark: ShareableSpark): void {
        this.shareableSparks.set(spark.sparkId, spark);
        console.log(`✅ Registered shareable spark: ${spark.sparkId} (model: ${spark.sharingModel})`);
    }

    /**
     * Get all registered shareable sparks
     */
    static getShareableSparks(): ShareableSpark[] {
        return Array.from(this.shareableSparks.values());
    }

    /**
     * Get a specific shareable spark
     */
    static getShareableSpark(sparkId: string): ShareableSpark | undefined {
        return this.shareableSparks.get(sparkId);
    }

    /**
     * Check if a spark is shareable
     */
    static isShareable(sparkId: string): boolean {
        return this.shareableSparks.has(sparkId);
    }

    /**
     * Share an item using copy model (one-time push)
     */
    static async shareItemCopy(
        sparkId: string,
        itemId: string,
        friendId: string,
        itemData: any
    ): Promise<void> {
        const user = AuthService.getCurrentUser();
        if (!user) {
            throw new Error('User must be authenticated to share items');
        }

        const db = await this.getFirestore();

        // Create shared item copy
        const sharedItem: Omit<SharedItemCopy, 'id'> = {
            originalId: itemId,
            sharedFromId: itemId,
            sharedByUserId: user.uid,
            sharedByUserName: user.displayName || 'Unknown',
            sharedAt: Timestamp.now(),
            sparkId,
            itemData,
        };

        // Store in sharedItems collection with friend's userId
        const docRef = doc(collection(db, SHARED_ITEMS_COLLECTION));
        await setDoc(docRef, {
            ...sharedItem,
            sharedWithUserId: friendId,
            status: 'pending', // Friend can accept/reject
        });

        console.log(`✅ Shared item ${itemId} from ${sparkId} with friend ${friendId}`);
    }

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
}

export default ShareableSparkService;
