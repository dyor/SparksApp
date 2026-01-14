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

try {
  // Check Native SDK module availability
  const { FirebaseService: native } = require('./FirebaseService');
  isNativeFirebaseAvailable = native.isModuleAvailable() && !isExpoGo();
  console.log('🔥 Native Firebase available:', isNativeFirebaseAvailable, '(isExpoGo:', isExpoGo(), ')');
} catch (error) {
  isNativeFirebaseAvailable = false;
}

const isFirebaseAvailable = isWebFirebaseAvailable || isNativeFirebaseAvailable;
const useNativeFirebase = (Platform.OS === 'android' || Platform.OS === 'ios') && isNativeFirebaseAvailable;

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

        // Get the Firestore database from WebFirebaseService
        const { getFirestore } = require('firebase/firestore');
        const { getFirebaseApp } = require('./firebaseConfig');

        // Initialize Firebase if not already done
        const app = getFirebaseApp();
        if (!app) {
          throw new Error('Failed to initialize Firebase app');
        }

        const db = getFirestore(app);
        await SimpleAnalyticsService.initialize(db);
        this.analyticsServiceInitialized = true;
      } catch (error) {
        console.error('❌ Failed to initialize Analytics service:', error);
        throw error; // Rethrow to inform the caller
      }
    }
  }

  static isUsingMock() {
    return !isFirebaseAvailable;
  }
}

// Export the FirebaseService directly
export const FirebaseService = ServiceFactory.getFirebaseService();
