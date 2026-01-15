import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { RemoteConfigService } from "./RemoteConfigService";

/**
 * Shared Firebase configuration object
 * All Firebase services should import and use this config instead of duplicating it
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates Firebase configuration
 * @returns true if config is valid, false otherwise
 */
export function validateFirebaseConfig(config: any = firebaseConfig): boolean {
  if (!config.apiKey || !config.projectId) {
    return false;
  }
  return true;
}

/**
 * Gets or initializes the Firebase app instance
 * Ensures Firebase is only initialized once
 * @returns Firebase app instance or undefined if initialization fails
 */
export function getFirebaseApp(): FirebaseApp | undefined {
  try {
    if (getApps().length > 0) {
      return getApp();
    }

    // 1. Try Remote Config first (allows overriding broken/stale build-time env vars)
    const remoteConfig = RemoteConfigService.getWebFirebaseConfig();
    if (remoteConfig && validateFirebaseConfig(remoteConfig)) {
      console.log("🔥 Initializing Firebase with Remote Config (Primary)");
      return initializeApp(remoteConfig);
    }

    // 2. Fallback to environment variables (standard build-time config)
    if (validateFirebaseConfig(firebaseConfig)) {
      console.log("🔥 Initializing Firebase with env variables (Fallback)");
      return initializeApp(firebaseConfig);
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
 * Gets or initializes Firestore database instance
 * @returns Firestore instance or null if initialization fails
 */
export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
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

// Legacy export for backward compatibility (if anything was using the old db export)
export const db = getFirestoreDb() || (null as unknown as Firestore);

