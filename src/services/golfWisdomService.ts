import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, Timestamp, addDoc, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WisdomQuote } from '../sparks/GolfWisdomSpark/wisdomData';
import { getFirebaseApp } from './firebaseConfig';

const COLLECTION_NAME = 'golfWisdom';
const CACHE_KEY = 'golfWisdom_cachedPages';
const TIMESTAMP_KEY = 'golfWisdom_lastUpdated';

export interface FirestoreWisdomPage {
    content: string;
    order: number;
    updatedAt: Timestamp;
    contributor?: string;
    createdAt?: Timestamp;
    status?: string; // "Suggested", "Approved", "Rejected", etc.
}

/**
 * Fetch all wisdom pages from Firestore
 */
export const fetchWisdomPages = async (): Promise<WisdomQuote[]> => {
    try {
        console.log('🔍 Starting fetchWisdomPages...');
        const { getFirestore } = require('firebase/firestore');
        const { getAuth, signInAnonymously } = require('firebase/auth');

        // Get or initialize Firebase app
        const app = getFirebaseApp();
        if (!app) {
            throw new Error('Failed to initialize Firebase app');
        }

        // Sign in anonymously if not already signed in
        const auth = getAuth(app);
        if (!auth.currentUser) {
            console.log('🔐 Signing in anonymously...');
            await signInAnonymously(auth);
            console.log('✅ Signed in anonymously for Golf Wisdom');
        } else {
            console.log('✅ Already signed in:', auth.currentUser.uid);
        }

        const db = getFirestore(app);
        console.log('📚 Fetching from golfWisdom collection...');

        const pagesCollection = collection(db, COLLECTION_NAME);
        const q = query(pagesCollection, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);

        console.log(`📄 Found ${querySnapshot.size} documents in Firestore`);

        const pages: WisdomQuote[] = [];
        querySnapshot.forEach((doc) => {
            if (doc.id !== '_metadata') {
                const data = doc.data() as FirestoreWisdomPage;
                // Only include approved items or items with no status (for backward compatibility)
                // Exclude "Suggested" and "Rejected" items
                const status = data.status;
                if (!status || status === 'Approved') {
                    console.log(`  - Document ${doc.id}: order=${data.order}, content="${data.content.substring(0, 30)}...", contributor=${data.contributor}, status=${status || 'none'}`);
                    pages.push({
                        id: data.order, // Use order as the id for display
                        content: data.content,
                        contributor: data.contributor || 'Tam O\'Shanter',
                    });
                } else {
                    console.log(`  - Skipping document ${doc.id} with status: ${status}`);
                }
            }
        });

        console.log(`✅ Successfully fetched ${pages.length} wisdom pages from Firebase`);
        return pages;
    } catch (error) {
        console.error('❌ Error fetching wisdom pages from Firestore:', error);
        throw error;
    }
};

/**
 * Check if there are updates available in Firestore
 */
export const checkForUpdates = async (): Promise<boolean> => {
    try {
        const cachedTimestamp = await AsyncStorage.getItem(TIMESTAMP_KEY);

        if (!cachedTimestamp) {
            return true; // No cache, need to fetch
        }

        const { getFirestore } = require('firebase/firestore');
        const { getAuth, signInAnonymously } = require('firebase/auth');

        // Get or initialize Firebase app
        const app = getFirebaseApp();
        if (!app) {
            throw new Error('Failed to initialize Firebase app');
        }

        // Sign in anonymously if not already signed in
        const auth = getAuth(app);
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        const db = getFirestore(app);

        // Check metadata document for last update time
        const metadataDoc = doc(db, COLLECTION_NAME, '_metadata');
        const metadataSnap = await getDoc(metadataDoc);

        if (!metadataSnap.exists()) {
            return true; // No metadata, fetch anyway
        }

        const metadata = metadataSnap.data();
        const remoteTimestamp = metadata.lastUpdated?.toMillis() || 0;
        const localTimestamp = parseInt(cachedTimestamp, 10);

        return remoteTimestamp > localTimestamp;
    } catch (error) {
        console.error('Error checking for updates:', error);
        return false; // On error, use cache
    }
};

/**
 * Cache wisdom pages to AsyncStorage
 */
export const cachePages = async (pages: WisdomQuote[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pages));
        await AsyncStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
        console.error('Error caching pages:', error);
    }
};

/**
 * Get cached wisdom pages from AsyncStorage
 */
export const getCachedPages = async (): Promise<WisdomQuote[] | null> => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error getting cached pages:', error);
        return null;
    }
};

/**
 * Load wisdom pages with cache-first strategy
 * Returns cached data immediately if available, then syncs in background
 */
export const loadWisdomPages = async (): Promise<{
    pages: WisdomQuote[];
    fromCache: boolean;
}> => {
    // Try to get cached pages first
    const cachedPages = await getCachedPages();

    if (cachedPages && cachedPages.length > 0) {
        // Return cached data immediately
        // Check for updates in background
        checkForUpdates().then(async (hasUpdates) => {
            if (hasUpdates) {
                try {
                    const freshPages = await fetchWisdomPages();
                    await cachePages(freshPages);
                } catch (error) {
                    console.log('Background sync failed, using cache');
                }
            }
        });

        return { pages: cachedPages, fromCache: true };
    }

    // No cache, fetch from Firestore
    try {
        const pages = await fetchWisdomPages();
        await cachePages(pages);
        return { pages, fromCache: false };
    } catch (error) {
        console.error('Error loading wisdom pages:', error);
        // Return empty array if both cache and fetch fail
        return { pages: [], fromCache: false };
    }
};

/**
 * Submit a wisdom suggestion to Firestore
 */
export const submitWisdomSuggestion = async (suggestion: {
    content: string;
    contributor: string;
}): Promise<void> => {
    try {
        console.log('📝 Submitting wisdom suggestion...');
        const { getFirestore } = require('firebase/firestore');
        const { getAuth, signInAnonymously } = require('firebase/auth');

        // Get or initialize Firebase app
        const app = getFirebaseApp();
        if (!app) {
            throw new Error('Failed to initialize Firebase app');
        }

        // Sign in anonymously if not already signed in
        const auth = getAuth(app);
        if (!auth.currentUser) {
            console.log('🔐 Signing in anonymously for suggestion...');
            await signInAnonymously(auth);
        }

        const db = getFirestore(app);

        // Get the highest order value
        const pagesCollection = collection(db, COLLECTION_NAME);
        const orderQuery = query(pagesCollection, orderBy('order', 'desc'), limit(1));
        const orderSnapshot = await getDocs(orderQuery);

        let nextOrder = 1;
        if (!orderSnapshot.empty) {
            const highestDoc = orderSnapshot.docs[0];
            const data = highestDoc.data() as FirestoreWisdomPage;
            nextOrder = (data.order || 0) + 1;
        }

        // Create the suggestion document
        const suggestionData = {
            content: suggestion.content,
            contributor: suggestion.contributor,
            order: nextOrder,
            status: 'Suggested',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, COLLECTION_NAME), suggestionData);

        console.log(`✅ Successfully submitted wisdom suggestion with order ${nextOrder}`);
    } catch (error) {
        console.error('❌ Error submitting wisdom suggestion:', error);
        throw error;
    }
};
