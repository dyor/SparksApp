import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
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
    // 1. Check for valid environment defaults as immediate fallback
    const effectiveConfig = getEffectiveFirebaseConfig();
    if (validateFirebaseConfig(effectiveConfig)) {
      console.log("🔥 Initializing Firebase with effective configuration (Remote Overrides + Env)");
      return initializeApp(effectiveConfig);
    }

    // 2. If env defaults are missing, try Remote Config (which may be circular)
    // Non-blocking initialization of Remote Config
    RemoteConfigService.ensureInitialized().catch(e => console.log("RemoteConfig init wait:", e.message));

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

/**
 * Gets or initializes Firestore database instance
 * @returns Firestore instance or null if initialization fails
 */
export async function getFirestoreDb(): Promise<Firestore | null> {
  const app = await getFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    return getFirestore(app);
  } catch (error) {
    console.error("❌ Error getting Firestore:", error);
    return null;
  }
}

// Legacy export for backward compatibility
export let db: Firestore | null = null;

// Initialize the legacy db export asynchronously
getFirestoreDb().then(database => {
  db = database;
});

