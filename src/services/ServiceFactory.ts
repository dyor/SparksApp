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
import { SimpleAnalyticsService } from './SimpleAnalyticsService';

// Check if Firebase Web SDK is available
let isFirebaseAvailable = false;

try {
  // Try to import Firebase Web SDK
  require('firebase/app');
  require('firebase/analytics');
  require('firebase/auth');
  require('firebase/firestore');
  isFirebaseAvailable = true;
} catch (error) {
  isFirebaseAvailable = false;
}

// Service factory that uses real Firebase in development builds, falls back to mock if needed
export class ServiceFactory {
  private static firebaseServiceInitialized = false;
  private static analyticsServiceInitialized = false;

  static getFirebaseService() {
    if (isFirebaseAvailable) {
      return WebFirebaseService;
    }
    return MockFirebaseService;
  }

  static getAnalyticsService() {
    if (isFirebaseAvailable) {
      return SimpleAnalyticsService;
    }
    return MockAnalyticsService;
  }

  static async ensureFirebaseInitialized() {
    if (isFirebaseAvailable && !this.firebaseServiceInitialized) {
      try {
        await WebFirebaseService.initialize();
        this.firebaseServiceInitialized = true;

        // Wait a bit to ensure Firebase is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Failed to initialize Firebase service:', error);
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
      }
    }
  }

  static isUsingMock() {
    return !isFirebaseAvailable;
  }
}

// Export the FirebaseService directly
export const FirebaseService = ServiceFactory.getFirebaseService();
