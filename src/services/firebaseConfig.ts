import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
// Side-effect import MUST come before other firestore imports to ensure component registration
import "firebase/firestore";
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { RemoteConfigService } from "./RemoteConfigService";

/**
 * Shared Firebase configuration object (Build-time defaults)
 */
const firebaseConfigDefaults = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Gets the effective Firebase configuration, checking Remote Config first
 */
export function getEffectiveFirebaseConfig(): any {
  // Try individual overrides from Remote Config
  const config = {
    apiKey: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_API_KEY') || firebaseConfigDefaults.apiKey,
    authDomain: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || firebaseConfigDefaults.authDomain,
    projectId: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_PROJECT_ID') || firebaseConfigDefaults.projectId,
    storageBucket: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || firebaseConfigDefaults.storageBucket,
    messagingSenderId: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || firebaseConfigDefaults.messagingSenderId,
    appId: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_APP_ID') || firebaseConfigDefaults.appId,
    measurementId: RemoteConfigService.getString('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID') || firebaseConfigDefaults.measurementId,
  };

  return config;
}

/**
 * Validates Firebase configuration
 * @returns true if config is valid, false otherwise
 */
export function validateFirebaseConfig(config: any): boolean {
  if (!config || !config.apiKey || !config.projectId) {
    return false;
  }
  return true;
}

/**
 * Gets or initializes the Firebase app instance asynchronously
 * Ensures Remote Config is fetched before initialization
 * @returns Firebase app instance or undefined if initialization fails
 */
export async function getFirebaseApp(): Promise<FirebaseApp | undefined> {
  // Check if already initialized (fast path)
  const existingApp = getFirebaseAppSync();
  if (existingApp) {
    return existingApp;
  }

  try {
    // Ensure Remote Config is initialized and fetched before we try to use it
    await RemoteConfigService.ensureInitialized();
    await RemoteConfigService.fetchAndActivate();

    // 1. Try full JSON config from Remote Config
    const remoteConfigJson = RemoteConfigService.getWebFirebaseConfig();
    if (remoteConfigJson && validateFirebaseConfig(remoteConfigJson)) {
      console.log("🔥 Initializing Firebase with Remote Config JSON");
      return initializeApp(remoteConfigJson);
    }

    // 2. Try individual overrides or env variables
    const effectiveConfig = getEffectiveFirebaseConfig();
    if (validateFirebaseConfig(effectiveConfig)) {
      console.log("🔥 Initializing Firebase with effective configuration (Remote Overrides + Env)");
      return initializeApp(effectiveConfig);
    }

    console.warn(
      "⚠️ Firebase configuration is missing. Web SDK features will be disabled."
    );
    return undefined;
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    return undefined;
  }
}

/**
 * Synchronous version of getFirebaseApp
 * Returns the app only if it's already been initialized
 */
export function getFirebaseAppSync(): FirebaseApp | undefined {
  if (getApps().length > 0) {
    return getApp();
  }
  return undefined;
}

// Track Firestore instance to avoid multiple initialization attempts
let firestoreInstance: Firestore | null = null;

/**
 * Gets or initializes Firestore database instance
 * @returns Firestore instance or null if initialization fails
 */
export async function getFirestoreDb(): Promise<Firestore | null> {
  // If already initialized, return the instance
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const app = await getFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    // Try to initialize with persistence for offline support
    console.log("🔥 [firebaseConfig] Initializing Firestore with persistence...");
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    });
    console.log("✅ [firebaseConfig] Firestore initialized with persistence");
    return firestoreInstance;
  } catch (error: any) {
    // If already initialized, get existing instance
    if (error.code === 'failed-precondition' || error.message?.includes('already initialized')) {
      console.log("🔥 [firebaseConfig] Firestore already initialized, fetching existing instance");
      firestoreInstance = getFirestore(app);
      return firestoreInstance;
    }

    console.warn("⚠️ [firebaseConfig] Could not use persistence, falling back to default:", error.message);

    try {
      firestoreInstance = getFirestore(app);
      console.log("✅ [firebaseConfig] Firestore initialized (no persistence)");
      return firestoreInstance;
    } catch (fallbackError: any) {
      console.error("❌ [firebaseConfig] FATAL: Failed to initialize Firestore:", fallbackError);
      return null;
    }
  }
}

// Legacy export for backward compatibility
export let db: Firestore | null = null;

// Initialize the legacy db export asynchronously safely
export async function initializeLegacyDb() {
  db = await getFirestoreDb();
}

// Do not auto-initialize at top level as it can cause race conditions
// with WebFirebaseService. instead, let the first caller trigger it.

