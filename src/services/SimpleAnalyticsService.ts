import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple analytics service that just logs to Firestore
export class SimpleAnalyticsService {
  private static db: any = null;
  private static deviceId: string | null = null;
  private static userId: string | null = null;
  private static isInitialized: boolean = false;
  private static isNative: boolean = false;

  static async initialize(firestoreDb: any, isNative: boolean = false): Promise<void> {
    console.log(`🚀 SimpleAnalyticsService.initialize() called (Native: ${isNative})`);

    try {
      this.db = firestoreDb;
      this.isNative = isNative;
      this.deviceId = await this.getOrCreateDeviceId();
      this.isInitialized = true;
      console.log('✅ Simple Analytics initialized with deviceId:', this.deviceId);
    } catch (error) {
      console.error('❌ Failed to initialize Simple Analytics:', error);
      throw error;
    }
  }

  private static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('analytics_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      return `temp_device_${Date.now()}`;
    }
  }

  static setUserId(userId: string | null): void {
    this.userId = userId;
    console.log('👤 User ID set:', userId);
  }

  private static async logEvent(eventType: string, sparkId: string, sparkName?: string, additionalData?: any): Promise<void> {
    if (!this.isInitialized || !this.db) {
      console.log('⚠️ Analytics not initialized, skipping event:', eventType);
      return;
    }

    try {
      const eventData: any = {
        eventType,
        sparkId,
        sparkName: sparkName || sparkId,
        deviceId: this.deviceId,
        userId: this.userId,
        ...additionalData
      };

      // Always use Web Firestore for analytics to avoid gRPC issues with native Firestore
      const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
      await addDoc(collection(this.db, 'analytics'), {
        ...eventData,
        timestamp: serverTimestamp()
      });
      
      console.log(`📊 [Analytics] ${eventType}: ${sparkName || sparkId}`);
    } catch (error) {
      console.error(`❌ Error logging ${eventType}:`, error);
    }
  }

  // Track when a spark is opened
  static async trackSparkOpen(sparkId: string, sparkName?: string): Promise<void> {
    await this.logEvent('spark_opened', sparkId, sparkName);
  }

  // Track when a spark is added to "My Sparks"
  static async trackSparkAdded(sparkId: string, sparkName?: string): Promise<void> {
    await this.logEvent('spark_added', sparkId, sparkName);
  }

  // Track when a spark is removed from "My Sparks"
  static async trackSparkRemoved(sparkId: string, sparkName?: string): Promise<void> {
    await this.logEvent('spark_removed', sparkId, sparkName);
  }

  // Track when a spark is completed
  static async trackSparkComplete(sparkId: string, sparkName?: string, duration?: number): Promise<void> {
    await this.logEvent('spark_completed', sparkId, sparkName, { duration });
  }

  // Track when settings are accessed
  static async trackSettingsAccess(): Promise<void> {
    await this.logEvent('settings_accessed', 'app', 'Settings');
  }

  // Track when feedback is submitted
  static async trackFeedbackSubmitted(sparkId: string, sparkName?: string, hasRating?: boolean, hasText?: boolean): Promise<void> {
    await this.logEvent('feedback_submitted', sparkId, sparkName, { hasRating, hasText });
  }

  // Track when app is launched
  static async trackAppLaunch(): Promise<void> {
    await this.logEvent('app_launched', 'app', 'App');
  }

  static getDeviceId(): string | null {
    return this.deviceId;
  }

  static getUserId(): string | null {
    return this.userId;
  }

  static isReady(): boolean {
    return this.isInitialized;
  }

  // Compatibility method for existing code
  static getSessionInfo(): { sessionId: string; userId: string | null; isInitialized: boolean } {
    return {
      sessionId: this.deviceId || 'unknown',
      userId: this.userId,
      isInitialized: this.isInitialized,
    };
  }

  // Additional compatibility methods
  // Additional compatibility methods
  // static async initialize(): Promise<void> {
  //   // This method is called by existing code, but we need the Firestore DB
  //   // The actual initialization happens in ServiceFactory.ensureAnalyticsInitialized()
  //   console.log('⚠️ SimpleAnalyticsService.initialize() called without Firestore DB - using fallback');

  //   // Fallback initialization without Firestore
  //   this.deviceId = await this.getOrCreateDeviceId();
  //   this.isInitialized = true;
  //   console.log('✅ Simple Analytics fallback initialized with deviceId:', this.deviceId);
  // }

  static async trackFeatureUsage(feature: string, sparkId: string = 'app', sparkName?: string, properties?: object): Promise<void> {
    await this.logEvent('feature_usage', sparkId, sparkName, { feature, ...properties });
  }

  static async trackUserEngagement(action: string, sparkId?: string): Promise<void> {
    await this.logEvent('user_engagement', sparkId || 'app', undefined, { action });
  }

  static async trackError(error: Error, context: string): Promise<void> {
    await this.logEvent('error', 'app', 'App', {
      errorMessage: error.message,
      errorStack: error.stack,
      context
    });
  }

  static async trackPerformance(metric: string, value: number, context?: string): Promise<void> {
    await this.logEvent('performance', 'app', 'App', { metric, value, context });
  }

  static async trackCrash(error: Error, errorInfo: any): Promise<void> {
    await this.logEvent('crash', 'app', 'App', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorInfo: JSON.stringify(errorInfo)
    });
  }

  static async flushEvents(): Promise<void> {
    // Simple analytics don't need flushing - they're sent immediately
    console.log('[Simple Analytics] Events are sent immediately to Firestore');
  }

  static async endSession(): Promise<void> {
    console.log('[Simple Analytics] Session ended');
  }

  static setUserProperties(properties: object): void {
    console.log('[Simple Analytics] User properties set:', properties);
  }
}
