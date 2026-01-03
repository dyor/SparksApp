import { getFirestore, collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import AuthService from './AuthService';

const SHARED_ITEMS_COLLECTION = 'sharedItems';

export interface SharedItem {
    id: string;
    originalId: string;
    sharedFromId: string;
    sharedByUserId: string;
    sharedByUserName: string;
    sharedAt: Timestamp;
    sparkId: string;
    sharedWithUserId: string;
    status: 'pending' | 'accepted' | 'rejected';
    itemData: any;
}

class SharedItemsService {
    /**
     * Get Firebase app instance
     */
    private static async getFirebaseApp() {
        const { getFirebaseApp } = require('./firebaseConfig');
        return getFirebaseApp();
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
     * Get pending shared items for current user
     */
    static async getPendingSharedItems(sparkId: string): Promise<SharedItem[]> {
        const user = AuthService.getCurrentUser();
        if (!user) {
            return [];
        }

        const db = await this.getFirestore();

        const q = query(
            collection(db, SHARED_ITEMS_COLLECTION),
            where('sharedWithUserId', '==', user.uid),
            where('sparkId', '==', sparkId),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        const items: SharedItem[] = [];

        snapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data(),
            } as SharedItem);
        });

        return items;
    }

    /**
     * Accept a shared item (moves it to accepted status)
     */
    static async acceptSharedItem(sharedItemId: string): Promise<void> {
        const user = AuthService.getCurrentUser();
        if (!user) {
            throw new Error('User must be authenticated to accept shared items');
        }

        const db = await this.getFirestore();
        const itemRef = doc(db, SHARED_ITEMS_COLLECTION, sharedItemId);
        
        await updateDoc(itemRef, {
            status: 'accepted',
        });

        console.log(`✅ Accepted shared item ${sharedItemId}`);
    }

    /**
     * Reject a shared item
     */
    static async rejectSharedItem(sharedItemId: string): Promise<void> {
        const user = AuthService.getCurrentUser();
        if (!user) {
            throw new Error('User must be authenticated to reject shared items');
        }

        const db = await this.getFirestore();
        const itemRef = doc(db, SHARED_ITEMS_COLLECTION, sharedItemId);
        
        await updateDoc(itemRef, {
            status: 'rejected',
        });

        console.log(`✅ Rejected shared item ${sharedItemId}`);
    }

    /**
     * Get accepted shared items for current user
     */
    static async getAcceptedSharedItems(sparkId: string): Promise<SharedItem[]> {
        const user = AuthService.getCurrentUser();
        if (!user) {
            return [];
        }

        const db = await this.getFirestore();

        const q = query(
            collection(db, SHARED_ITEMS_COLLECTION),
            where('sharedWithUserId', '==', user.uid),
            where('sparkId', '==', sparkId),
            where('status', '==', 'accepted')
        );

        const snapshot = await getDocs(q);
        const items: SharedItem[] = [];

        snapshot.forEach((doc) => {
            items.push({
                id: doc.id,
                ...doc.data(),
            } as SharedItem);
        });

        return items;
    }
}

export default SharedItemsService;
