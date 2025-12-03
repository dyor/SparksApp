import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseService } from './ServiceFactory';
import { AnalyticsEvent, User } from '../types/analytics';
import { HapticFeedback } from '../utils/haptics';

// Note: Using web Firebase SDK for analytics (via FirebaseService)
// Native @react-native-firebase/analytics removed due to compilation issues

export class AnalyticsService {
  private static sessionId: string = AnalyticsService.generateSessionId();
  private static userId: string | null = null;
  private static eventQueue: Omit<AnalyticsEvent, 'id' | 'timestamp'>[] = [];
  private static isInitialized: boolean = false;
  private static batchSize: number = 10;
  private static flushInterval: number = 30000; // 30 seconds
  private static flushTimer: NodeJS.Timeout | null = null;

  static async initialize(): Promise<void> {
    console.log('🚀 AnalyticsService.initialize() called');

    try {
      // Generate or get device ID
      this.userId = await this.getOrCreateDeviceId();
      console.log('✅ Device ID set:', this.userId);

      this.isInitialized = true;
      console.log('✅ Analytics initialized:', this.isInitialized);

      this.startBatchFlush();
      console.log('✅ Batch flush started');

      // Track app open
      await this.trackSparkOpen('app', 'Sparks App');
      console.log('✅ App open tracked');
    } catch (error) {
      console.error('❌ Error during analytics initialization:', error);
      throw error;
    }
  }

  private static async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('analytics_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_device_id', deviceId);
        console.log('✅ Created new device ID:', deviceId);
      } else {
        console.log('✅ Using existing device ID:', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  static async trackSparkOpen(sparkId: string, sparkName?: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'spark_opened',
      sparkId,
      eventData: {
        sparkName: sparkName || sparkId,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0', // TODO: Get from app config
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
    // Native Firebase Analytics removed - using web SDK via FirebaseService
  }

  static async trackSparkComplete(
    sparkId: string,
    sparkName: string,
    duration: number,
    actions: string[]
  ): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'spark_completed',
      sparkId,
      eventData: {
        sparkName,
        duration,
        actions,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);

    // Also send to Firebase Analytics
    if (firebaseAnalytics) {
      try {
        await firebaseAnalytics.logEvent('spark_completed', {
          spark_id: sparkId,
          spark_name: sparkName,
          duration,
          action_count: actions.length,
        });
        console.log('✅ Spark completed event sent to Firebase Analytics');
      } catch (error) {
        console.log('⚠️ Error sending spark_completed to Firebase Analytics:', (error as any).message);
      }
    }
  }

  static async trackError(error: Error, context: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'error_occurred',
      eventData: {
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
  }

  static async trackFeatureUsage(feature: string, sparkId: string = 'app', sparkName?: string, properties?: object): Promise<void> {
    console.log('🔍 AnalyticsService.trackFeatureUsage called:', { feature, sparkId, sparkName, properties });
    console.log('🔍 AnalyticsService state:', {
      isInitialized: this.isInitialized,
      userId: this.userId,
      sessionId: this.sessionId
    });

    if (!this.isInitialized || !this.userId) {
      console.log('❌ Analytics not initialized or no userId - attempting to initialize...');
      try {
        await this.initialize();
        console.log('✅ Analytics initialized on-demand');
      } catch (error) {
        console.error('❌ Failed to initialize analytics:', error);
        return;
      }
    }

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId || 'anonymous',
      eventType: 'feature_used',
      sparkId,
      eventData: {
        sparkName: sparkName || sparkId,
        feature,
        properties: properties || {},
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    console.log('🔍 Event to be queued:', event);
    await this.queueEvent(event);
    // Native Firebase Analytics removed - using web SDK via FirebaseService

    console.log('✅ Event queued successfully');
  }

  static async trackSettingsAccess(): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'settings_accessed',
      eventData: {
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
  }

  static async trackSparkAdded(sparkId: string, sparkName: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'spark_added',
      sparkId,
      eventData: {
        sparkName,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
    // Native Firebase Analytics removed - using web SDK via FirebaseService
  }

  static async trackSparkRemoved(sparkId: string, sparkName: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'spark_removed',
      sparkId,
      eventData: {
        sparkName,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
    // Native Firebase Analytics removed - using web SDK via FirebaseService
  }

  static async trackUserEngagement(action: string, sparkId?: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'user_engagement',
      sparkId: sparkId || 'app',
      eventData: {
        action,
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
  }

  static setUserProperties(properties: object): void {
    if (!this.isInitialized || !this.userId) return;

    // Update user properties in Firebase
    FirebaseService.updateUser(this.userId, {
      demographics: properties as any,
    }).catch(error => {
      console.error('Error updating user properties:', error);
    });
  }

  static async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      console.log('🔍 No events to flush');
      return;
    }

    console.log('🔍 Flushing events to Firebase:', this.eventQueue.length, 'events');
    console.log('🔍 Events to flush:', this.eventQueue);

    try {
      await FirebaseService.batchLogEvents([...this.eventQueue]);
      this.eventQueue = [];
      console.log('✅ Analytics events flushed successfully to Firebase');
    } catch (error) {
      console.error('❌ Error flushing analytics events:', error);
    }
  }

  static async endSession(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushEvents();
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = AnalyticsService.generateSessionId();
  }

  // Private Methods
  private static async queueEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    console.log('🔍 queueEvent called, adding to queue:', event);
    this.eventQueue.push(event);
    console.log('🔍 Event queue length:', this.eventQueue.length);

    // Flush immediately if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      console.log('🔍 Batch size reached, flushing events');
      await this.flushEvents();
    }
  }

  private static startBatchFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flushEvents();
      this.startBatchFlush();
    }, this.flushInterval);
  }

  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Performance Tracking
  static async trackPerformance(metric: string, value: number, context?: string): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'feature_used',
      eventData: {
        feature: 'performance_metric',
        metric,
        value,
        context: context || '',
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    await this.queueEvent(event);
  }



  // Error Boundary Integration
  static async trackCrash(error: Error, errorInfo: any): Promise<void> {
    if (!this.isInitialized || !this.userId) return;

    const event: Omit<AnalyticsEvent, 'id' | 'timestamp'> = {
      userId: this.userId,
      eventType: 'error_occurred',
      eventData: {
        errorMessage: error.message,
        errorStack: error.stack,
        errorInfo: JSON.stringify(errorInfo),
        context: 'crash',
        platform: Platform.OS,

      },
      sessionId: this.sessionId,
      appVersion: '1.0.0',
      platform: Platform.OS as 'ios' | 'android' | 'web',
    };

    // Flush immediately for crashes
    try {
      await FirebaseService.logEvent(event);
    } catch (error) {
      console.error('Error logging crash:', error);
    }
  }

  // Get current session info
  static getSessionInfo(): { sessionId: string; userId: string | null; isInitialized: boolean } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      isInitialized: this.isInitialized,
    };
  }

  // Helper methods for external access
  static getUserId(): string | null {
    return this.userId;
  }

  static getSessionId(): string {
    return this.sessionId;
  }


}
