import {
  User,
  SparkFeedback,
  AnalyticsEvent,
  FeatureFlag,
  AggregatedRating,
  AnalyticsData,
  SessionData
} from '../types/analytics';
import { MockFirebaseService } from './MockFirebaseService';
import { MockAnalyticsService } from './MockAnalyticsService';
import { WebAnalyticsService } from './WebAnalyticsService';
import { WebFirebaseService } from './WebFirebaseService';
import { FirebaseService as NativeFirebaseService } from './FirebaseService';
import { SimpleAnalyticsService } from './SimpleAnalyticsService';
import { Platform } from 'react-native';
import { isExpoGo } from '../utils/expoGoDetection';

// Detect available Firebase implementations
let isWebFirebaseAvailable = false;
let isNativeFirebaseAvailable = false;

try {
  // Check Web SDK
  require('firebase/app');
  isWebFirebaseAvailable = true;
} catch (error) {
  isWebFirebaseAvailable = false;
}

// NOTE: We do not use @react-native-firebase/firestore to avoid gRPC dependency issues.
// All Firestore operations use the Firebase Web SDK.
isNativeFirebaseAvailable = false;

const isFirebaseAvailable = isWebFirebaseAvailable;
const useNativeFirebase = false;

// Service factory that uses real Firebase in development builds, falls back to mock if needed
export class ServiceFactory {
  private static firebaseServiceInitialized = false;
  private static analyticsServiceInitialized = false;

  static getFirebaseService() {
    if (useNativeFirebase) {
      console.log('📱 Using Native Firebase Service');
      return NativeFirebaseService;
    }
    if (isWebFirebaseAvailable) {
      console.log('🌐 Using Web Firebase Service');
      return WebFirebaseService;
    }
    console.log('⚠️ Using Mock Firebase Service');
    return MockFirebaseService;
  }

  static getAnalyticsService() {
    if (isFirebaseAvailable) {
      return SimpleAnalyticsService;
    }
    return MockAnalyticsService;
  }

  static async ensureFirebaseInitialized() {
    if (useNativeFirebase) {
      await NativeFirebaseService.initialize();
      this.firebaseServiceInitialized = true;
      return;
    }

    if (isWebFirebaseAvailable && !this.firebaseServiceInitialized) {
      try {
        await WebFirebaseService.initialize();
        this.firebaseServiceInitialized = true;

        // Wait a bit to ensure Firebase is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Failed to initialize Web Firebase service:', error);
        throw error; // Rethrow to inform the caller
      }
    }
  }

  static async ensureAnalyticsInitialized() {
    if (isFirebaseAvailable && !this.analyticsServiceInitialized) {
      try {
        // First ensure Firebase is initialized
        await this.ensureFirebaseInitialized();

        if (useNativeFirebase) {
          // If using Native Firebase, use the native db for SimpleAnalyticsService
          const nativeDb = (NativeFirebaseService as any).db;
          if (nativeDb) {
            await SimpleAnalyticsService.initialize(nativeDb, true);
            this.analyticsServiceInitialized = true;
            console.log('✅ Analytics initialized with Native Firebase');
            return;
          }
        }

        // Fallback to Web SDK if Native is not available or not initialized
        if (isWebFirebaseAvailable) {
          const { getFirebaseApp } = require('./firebaseConfig');
          const app = getFirebaseApp();
          
          if (app) {
            const { getFirestore } = require('firebase/firestore');
            const db = getFirestore(app);
            await SimpleAnalyticsService.initialize(db, false);
            this.analyticsServiceInitialized = true;
            console.log('✅ Analytics initialized with Web Firebase');
          } else {
            console.warn('⚠️ Analytics initialization skipped: Web Firebase app not available');
            // Don't throw here to avoid blocking other services
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize Analytics service:', error);
        // Don't rethrow for analytics to prevent blocking core app functionality
        // throw error; 
      }
    }
  }

  static isUsingMock() {
    return !isFirebaseAvailable;
  }
}

// Export the FirebaseService directly
export const FirebaseService = ServiceFactory.getFirebaseService();
