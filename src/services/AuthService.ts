import { Platform } from 'react-native';
import { getAuth, signInWithCredential, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

// Gracefully handle GoogleSignin in Expo Go (where native modules aren't available)
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (error) {
  console.log('⚠️ Google Sign-In not available (running in Expo Go or module not installed)');
}

// Gracefully handle AppleAuthentication in Expo Go or non-iOS platforms
let AppleAuthentication: any = null;
let Crypto: any = null;
try {
  if (Platform.OS === 'ios') {
    const appleAuthModule = require('expo-apple-authentication');
    AppleAuthentication = appleAuthModule;
    const cryptoModule = require('expo-crypto');
    Crypto = cryptoModule;
  }
} catch (error) {
  console.log('⚠️ Apple Authentication not available (not iOS or module not installed)');
}

import { ServiceFactory } from './ServiceFactory';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type UserRole = 'standard' | 'spark-admin' | 'app-admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  sparkAdminRoles: string[]; // Array of spark IDs user is admin for
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

class AuthService {
  private static _initialized: boolean = false;
  private static authStateListeners: Array<(user: User | null) => void> = [];

  /**
   * Initialize Google Sign-In and Firebase Auth
   */
  static async initialize(): Promise<void> {
    if (this._initialized) {
      console.log('✅ AuthService already initialized');
      return;
    }

    try {
      console.log('🚀 AuthService: Initializing...');

      // Ensure Firebase is initialized
      await ServiceFactory.ensureFirebaseInitialized();

      // Configure Google Sign-In
      // Use EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID if set, otherwise fall back to EXPO_PUBLIC_FIREBASE_APP_ID
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

      if (!webClientId) {
        console.warn('⚠️ Neither EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID nor EXPO_PUBLIC_FIREBASE_APP_ID is set. Google Sign-In will not work.');
        console.warn('⚠️ Please set EXPO_PUBLIC_FIREBASE_APP_ID (or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) in your .env file or EAS secrets.');
        // Don't configure Google Sign-In if webClientId is missing
        this._initialized = true;
        return;
      }

      // Check if GoogleSignin is available (not in Expo Go)
      if (!GoogleSignin) {
        console.log('⚠️ Google Sign-In module not available. Skipping configuration (Expo Go).');
        this._initialized = true;
        return;
      }

      console.log('✅ AuthService: Configuring Google Sign-In with webClientId:', webClientId.substring(0, 20) + '...');

      GoogleSignin.configure({
        webClientId: webClientId, // Required for iOS and Android
        offlineAccess: true, // If you want to access Google API on behalf of the user
        scopes: ['profile', 'email'],
      });

      // Set up auth state listener
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

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);

      // Listen to auth state changes
      onAuthStateChanged(auth, async (firebaseUser) => {
        const user = firebaseUser ? this.convertFirebaseUser(firebaseUser) : null;
        this.notifyAuthStateListeners(user);
      });

      this._initialized = true;
      console.log('✅ AuthService initialized successfully');
    } catch (error) {
      console.error('❌ AuthService: Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<User | null> {
    if (!this._initialized) {
      throw new Error('AuthService not initialized. Please call initialize() first.');
    }

    // Check if GoogleSignin is available (not in Expo Go)
    if (!GoogleSignin) {
      throw new Error('Google Sign-In is not available in Expo Go. Please use a development build or production app.');
    }

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
    if (!webClientId) {
      throw new Error('Google Sign-In not configured. Please set EXPO_PUBLIC_FIREBASE_APP_ID (or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
    }

    try {
      console.log('🔐 AuthService: Starting Google Sign-In...');

      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      // Get the user's ID token from the sign-in response
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('Failed to get ID token from Google Sign-In');
      }

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with the Google credential
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

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const firebaseUser = userCredential.user;

      // Create or update user profile in Firestore
      await this.createOrUpdateUserProfile(firebaseUser);

      const user = this.convertFirebaseUser(firebaseUser);
      console.log('✅ AuthService: Sign-in successful', user.email);
      return user;
    } catch (error: any) {
      console.error('❌ AuthService: Sign-in failed', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign-in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign-in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error(error.message || 'Sign-in failed');
      }
    }
  }

  /**
   * Sign in with Apple
   */
  static async signInWithApple(): Promise<User | null> {
    if (!this._initialized) {
      throw new Error('AuthService not initialized. Please call initialize() first.');
    }

    // Check if AppleAuthentication is available (iOS only)
    if (!AppleAuthentication || Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS devices.');
    }

    try {
      console.log('🔐 AuthService: Starting Apple Sign-In...');

      // Check if Apple Sign-In is available on this device
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available. Please test on a physical iOS device (Sign in with Apple does not work in the iOS Simulator).');
      }

      // Generate a random nonce and hash it
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      // Request Apple authentication with hashed nonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      // Get the identity token from Apple
      const { identityToken } = credential;
      
      if (!identityToken) {
        throw new Error('Failed to get identity token from Apple Sign-In');
      }

      // Create a Firebase credential with Apple ID token and original nonce
      const appleProvider = new OAuthProvider('apple.com');
      const appleCredential = appleProvider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });

      // Sign in to Firebase with the Apple credential
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

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);
      const userCredential = await signInWithCredential(auth, appleCredential);
      const firebaseUser = userCredential.user;

      // If this is the first time signing in with Apple, update the user's display name
      // Apple only provides name on first sign-in
      if (credential.fullName && credential.fullName.givenName && credential.fullName.familyName) {
        const displayName = `${credential.fullName.givenName} ${credential.fullName.familyName}`;
        if (firebaseUser.displayName !== displayName) {
          await firebaseUser.updateProfile({ displayName });
        }
      }

      // Create or update user profile in Firestore
      await this.createOrUpdateUserProfile(firebaseUser);

      const user = this.convertFirebaseUser(firebaseUser);
      console.log('✅ AuthService: Apple Sign-in successful', user.email);
      return user;
    } catch (error: any) {
      console.error('❌ AuthService: Apple Sign-in failed', error);

      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Sign-in was cancelled');
      } else {
        throw new Error(error.message || 'Apple Sign-in failed');
      }
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      console.log('🔐 AuthService: Signing out...');

      // Sign out from Google (only if GoogleSignin is available and initialized)
      try {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
        if (webClientId && GoogleSignin && typeof GoogleSignin.isSignedIn === 'function') {
          const isSignedIn = await GoogleSignin.isSignedIn();
          if (isSignedIn && typeof GoogleSignin.signOut === 'function') {
            await GoogleSignin.signOut();
            console.log('✅ AuthService: Signed out from Google');
          }
        }
      } catch (googleError) {
        console.log('⚠️ AuthService: Google Sign-In not available or not signed in, skipping Google sign-out');
        // Continue with Firebase sign-out even if Google sign-out fails
      }

      // Sign out from Firebase
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

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);

      // Only sign out if there's a current user
      if (auth.currentUser) {
        await firebaseSignOut(auth);
        console.log('✅ AuthService: Signed out from Firebase');
      } else {
        console.log('⚠️ AuthService: No Firebase user to sign out');
      }

      console.log('✅ AuthService: Sign-out successful');
    } catch (error) {
      console.error('❌ AuthService: Sign-out failed', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    try {
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

      let app;
      if (getApps().length === 0) {
        return null;
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);
      const firebaseUser = auth.currentUser;
      return firebaseUser ? this.convertFirebaseUser(firebaseUser) : null;
    } catch (error) {
      console.error('❌ AuthService: Error getting current user', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Immediately call with current user
    const currentUser = this.getCurrentUser();
    callback(currentUser);

    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Get user role from Firestore
   */
  static async getUserRole(): Promise<UserRole> {
    const user = this.getCurrentUser();
    if (!user) {
      return 'standard';
    }

    try {
      const profile = await this.getUserProfile(user.uid);
      return profile?.role || 'standard';
    } catch (error) {
      console.error('❌ AuthService: Error getting user role', error);
      return 'standard';
    }
  }

  /**
   * Get spark admin roles for current user
   */
  static async getSparkAdminRoles(): Promise<string[]> {
    const user = this.getCurrentUser();
    if (!user) {
      return [];
    }

    try {
      const profile = await this.getUserProfile(user.uid);
      return profile?.sparkAdminRoles || [];
    } catch (error) {
      console.error('❌ AuthService: Error getting spark admin roles', error);
      return [];
    }
  }

  /**
   * Check if user is app admin
   */
  static async isAppAdmin(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'app-admin';
  }

  /**
   * Check if user is admin for a specific spark
   */
  static async isSparkAdmin(sparkId: string): Promise<boolean> {
    const isAppAdminUser = await this.isAppAdmin();
    if (isAppAdminUser) {
      return true;
    }

    const sparkAdminRoles = await this.getSparkAdminRoles();
    return sparkAdminRoles.includes(sparkId);
  }

  /**
   * Get user profile from Firestore
   */
  private static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const { initializeApp, getApps } = require('firebase/app');
      const { getFirestore } = require('firebase/firestore');

      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      };

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const db = getFirestore(app);
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('❌ AuthService: Error getting user profile', error);
      return null;
    }
  }

  /**
   * Create or update user profile in Firestore
   */
  private static async createOrUpdateUserProfile(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const { initializeApp, getApps } = require('firebase/app');
      const { getFirestore } = require('firebase/firestore');

      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      };

      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const db = getFirestore(app);
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      const now = Timestamp.now();
      const userData: Partial<UserProfile> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        lastLoginAt: now,
      };

      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(userRef, {
          ...userData,
          role: 'standard' as UserRole,
          sparkAdminRoles: [],
          createdAt: now,
        });
        console.log('✅ AuthService: Created new user profile');
      } else {
        // Update existing user profile
        await setDoc(userRef, userData, { merge: true });
        console.log('✅ AuthService: Updated user profile');
      }
    } catch (error) {
      console.error('❌ AuthService: Error creating/updating user profile', error);
      // Don't throw - profile creation is not critical for sign-in
    }
  }

  /**
   * Convert Firebase User to app User
   */
  private static convertFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
  }

  /**
   * Notify all auth state listeners
   */
  private static notifyAuthStateListeners(user: User | null): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('❌ AuthService: Error in auth state listener', error);
      }
    });
  }

  /**
   * Check if initialized
   */
  static isInitialized(): boolean {
    return this._initialized;
  }
}

export default AuthService;
