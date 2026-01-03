import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getFirebaseApp } from './firebaseConfig';

export class WebAnalyticsService {
  private static sessionId: string = WebAnalyticsService.generateSessionId();
  private static userId: string | null = null;
  private static isInitialized: boolean = false;
  private static analytics: any = null;
  private static auth: any = null;
  private static db: any = null;

  static async initialize(): Promise<void> {
    console.log('🚀 WebAnalyticsService.initialize() called');

    try {
      // Check if we're in a web environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('⚠️ Not in a web environment, skipping Firebase Analytics initialization');
        this.isInitialized = true;
        this.userId = await this.getOrCreateDeviceId();
        console.log('✅ Mock Analytics initialized for React Native with userId:', this.userId);
        return;
      }

      // Initialize Firebase if not already initialized
      const app = getFirebaseApp();
      if (!app) {
        throw new Error("Failed to initialize Firebase app");
      }

      // Initialize Analytics only in web environment
      try {
        this.analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      } catch (analyticsError: any) {
        console.log('⚠️ Firebase Analytics not available, continuing without analytics:', analyticsError.message);
        this.analytics = null;
      }

      // Initialize Firestore
      this.db = getFirestore(app);

      // Get or create user ID
      this.userId = await this.getOrCreateDeviceId();

      // Try to initialize Auth (optional for analytics)
      try {
        this.auth = getAuth(app);
        await signInAnonymously(this.auth);
        console.log('✅ Firebase Auth initialized');
      } catch (authError: any) {
        console.log('⚠️ Firebase Auth not available, continuing without auth:', authError.message);
        // Continue without auth - analytics will still work
      }

      // Set user ID for analytics
      if (this.analytics && this.userId) {
        setUserId(this.analytics, this.userId);
      }

      this.isInitialized = true;
      console.log('✅ Web Analytics initialized with userId:', this.userId);

      // Track app open
      await this.trackSparkOpen('app', 'Sparks App');
    } catch (error: any) {
      console.error('❌ Failed to initialize Web Analytics:', error);
      // Don't throw error, just log it and continue
      this.isInitialized = true;
      this.userId = await this.getOrCreateDeviceId();
      console.log('✅ Fallback Analytics initialized with userId:', this.userId);
    }
  }

  private static async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('analytics_device_id');
    if (!deviceId) {
      deviceId = `web_device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('analytics_device_id', deviceId);
    }
    return deviceId;
  }

  static async trackSparkOpen(sparkId: string, sparkName?: string): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ Analytics not initialized, skipping trackSparkOpen');
      return;
    }

    this.safeLogEvent('spark_open', {
      spark_id: sparkId,
      spark_name: sparkName || sparkId,
      platform: Platform.OS,
      timestamp: new Date().toISOString()
    });
    console.log(`[Web Analytics] Spark Opened: ${sparkName || sparkId}`);
  }

  static async trackSparkComplete(sparkId: string, sparkName: string, duration: number, actions: string[]): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      console.log('⚠️ Analytics not initialized, skipping trackSparkComplete');
      return;
    }

    try {
      logEvent(this.analytics, 'spark_complete', {
        spark_id: sparkId,
        spark_name: sparkName,
        duration_ms: duration,
        action_count: actions.length,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
      console.log(`[Web Analytics] Spark Completed: ${sparkName} (Duration: ${duration}ms, Actions: ${actions.length})`);
    } catch (error) {
      console.error('Error tracking spark complete:', error);
    }
  }

  static async trackError(error: Error, context: string): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      console.log('⚠️ Analytics not initialized, skipping trackError');
      return;
    }

    try {
      logEvent(this.analytics, 'error', {
        error_message: error.message,
        error_stack: error.stack,
        context: context,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
      console.error(`[Web Analytics] Error: ${error.message} in ${context}`, error.stack);
    } catch (err) {
      console.error('Error tracking error:', err);
    }
  }

  static async trackFeatureUsage(feature: string, sparkId: string = 'app', sparkName?: string, properties?: object): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      console.log('⚠️ Analytics not initialized, skipping trackFeatureUsage');
      return;
    }

    try {
      logEvent(this.analytics, 'feature_usage', {
        feature: feature,
        spark_id: sparkId,
        spark_name: sparkName || sparkId,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        ...properties
      });
      console.log(`[Web Analytics] Feature Used: ${feature} (Spark: ${sparkName || sparkId}, Props: ${JSON.stringify(properties)})`);
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }

  static async trackSettingsAccess(): Promise<void> {
    await this.trackFeatureUsage('settings_access', 'app', 'Settings');
  }

  static async trackSparkAdded(sparkId: string, sparkName: string): Promise<void> {
    await this.trackFeatureUsage('spark_added', sparkId, sparkName);
  }

  static async trackSparkRemoved(sparkId: string, sparkName: string): Promise<void> {
    await this.trackFeatureUsage('spark_removed', sparkId, sparkName);
  }

  static async trackUserEngagement(action: string, sparkId?: string): Promise<void> {
    await this.trackFeatureUsage('user_engagement', sparkId || 'app', undefined, { action });
  }

  static setUserProperties(properties: object): void {
    if (!this.isInitialized || !this.analytics) {
      console.log('⚠️ Analytics not initialized, skipping setUserProperties');
      return;
    }

    try {
      setUserProperties(this.analytics, properties as any);
      console.log(`[Web Analytics] User Properties Set: ${JSON.stringify(properties)}`);
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }

  static async flushEvents(): Promise<void> {
    // Firebase Web SDK automatically flushes events
    console.log('[Web Analytics] Flushing events (automatic in Web SDK)');
  }

  static async endSession(): Promise<void> {
    console.log('[Web Analytics] Session Ended');
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = WebAnalyticsService.generateSessionId();
  }

  static async trackPerformance(metric: string, value: number, context?: string): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      console.log('⚠️ Analytics not initialized, skipping trackPerformance');
      return;
    }

    try {
      logEvent(this.analytics, 'performance_metric', {
        metric: metric,
        value: value,
        context: context || 'unknown',
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
      console.log(`[Web Analytics] Performance Metric: ${metric} = ${value} (Context: ${context})`);
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }

  static async trackCrash(error: Error, errorInfo: any): Promise<void> {
    await this.trackError(error, 'crash');
  }

  static getSessionInfo(): { sessionId: string; userId: string | null; isInitialized: boolean } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      isInitialized: this.isInitialized,
    };
  }

  static getUserId(): string | null {
    return this.userId;
  }

  static getSessionId(): string {
    return this.sessionId;
  }

  private static generateSessionId(): string {
    return `web_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async safeLogEvent(eventName: string, params: any): Promise<void> {
    if (this.analytics) {
      try {
        await logEvent(this.analytics, eventName, params as any);
      } catch (error) {
        console.error(`Error logging event ${eventName}:`, error);
      }
    }
  }
}
