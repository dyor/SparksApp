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

// Check if Firebase is available
let firestore: any = null;
let isFirebaseAvailable = false;

// NOTE: We do not use @react-native-firebase/firestore to avoid gRPC dependency issues.
// All Firestore operations use the Firebase Web SDK.
const loadFirestore = () => {
  isFirebaseAvailable = false;
  return false;
};

// Initial load attempt
loadFirestore();

export class FirebaseService {
  private static db: any = null;
  private static _initialized = false;

  static async initialize(): Promise<void> {
    console.log('🔥 FirebaseService.initialize() called');
    
    // Try to load again if not already available (might have been missing at load time)
    if (!isFirebaseAvailable) {
      loadFirestore();
    }

    console.log('🔥 Firebase available:', isFirebaseAvailable);

    if (isFirebaseAvailable) {
      try {
        if (!this.db) {
          this.db = firestore();
        }
        this._initialized = true;
        console.log('✅ Native Firebase initialized and database instance created');
      } catch (dbError) {
        console.error('❌ Failed to initialize Native Firebase database:', dbError);
        this._initialized = false;
        throw dbError;
      }
    } else {
      console.log('⚠️ Native Firebase NOT available, will fallback to other services');
      // Don't throw here, ServiceFactory will handle the fallback
    }
  }

  static isInitialized(): boolean {
    return this._initialized;
  }

  static isModuleAvailable(): boolean {
    return isFirebaseAvailable;
  }

  static async getCurrentUser(): Promise<any | null> {
    // Native Firebase Auth usually handled elsewhere, but we can return null for parity
    return null;
  }

  // User Management
  static async createUser(userData: Partial<User>): Promise<string> {
    if (!isFirebaseAvailable) {
      return MockFirebaseService.createUser(userData);
    }

    try {
      const docRef = await this.db.collection('users').add({
        ...userData,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      await this.db.collection('users').doc(userId).update({
        ...updates,
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Feedback Management
  static async submitFeedback(feedback: Omit<SparkFeedback, 'id' | 'timestamp'>): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error('Native Firebase not initialized. Database connection missing.');
    }
    try {
      const cleanedFeedback = this.cleanObject(feedback);
      await this.db.collection('feedback').add({
        ...cleanedFeedback,
        timestamp: firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  static async getFeedbackForSpark(sparkId: string): Promise<SparkFeedback[]> {
    try {
      const snapshot = await this.db
        .collection('feedback')
        .where('sparkId', '==', sparkId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      } as SparkFeedback));
    } catch (error) {
      console.error('Error getting feedback for spark:', error);
      throw error;
    }
  }

  static async getUserFeedback(userId: string, sparkId: string): Promise<SparkFeedback[]> {
    try {
      const snapshot = await this.db
        .collection('feedback')
        .where('userId', '==', userId)
        .where('sparkId', '==', sparkId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      } as SparkFeedback));
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw error;
    }
  }

  static async getAggregatedRatings(sparkId: string): Promise<AggregatedRating> {
    try {
      const snapshot = await this.db
        .collection('feedback')
        .where('sparkId', '==', sparkId)
        .get();

      const feedbacks = snapshot.docs.map((doc: any) => doc.data() as SparkFeedback);

      if (feedbacks.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }

      const totalRatings = feedbacks.length;
      const sum = feedbacks.reduce((acc: number, feedback: any) => acc + feedback.rating, 0);
      const averageRating = sum / totalRatings;

      const ratingDistribution = feedbacks.reduce((acc: any, feedback: any) => {
        acc[feedback.rating] = (acc[feedback.rating] || 0) + 1;
        return acc;
      }, {} as { [rating: number]: number });

      return {
        averageRating: Math.round(averageRating * 100) / 100,
        totalRatings,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error getting aggregated ratings:', error);
      throw error;
    }
  }

  // Analytics Events
  static async logAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!isFirebaseAvailable || !this.db) {
      console.log('⚠️ Firebase not available, skipping logAnalyticsEvent');
      return;
    }
    try {
      const cleanedEvent = this.cleanObject(event);
      await this.db.collection('analytics').add({
        ...cleanedEvent,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging analytics event:', error);
      throw error;
    }
  }

  static async getGlobalAnalytics(days: number = 14): Promise<AnalyticsEvent[]> {
    console.log(`🔥 getGlobalAnalytics: Starting query for last ${days} days`);
    console.log(`🔥 Database available:`, !!this.db);

    if (!this.db) {
      console.log('⚠️ Firebase not available, returning empty analytics');
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      console.log(`🔥 Query start date:`, startDate.toISOString());
      console.log(`🔥 Querying collection: 'analytics'`);
      console.log(`🔥 Query condition: timestamp >= ${startDate.toISOString()}`);

      const snapshot = await this.db
        .collection('analytics')
        .where('timestamp', '>=', firestore.Timestamp.fromDate(startDate))
        .get();

      console.log(`🔥 Query completed. Documents found: ${snapshot.docs.length}`);

      if (snapshot.docs.length > 0) {
        console.log(`🔥 Sample document (first):`, snapshot.docs[0].data());
      } else {
        console.log(`🔥 No documents found in 'analytics' collection`);
      }

      const events = snapshot.docs.map((doc: any) => doc.data() as AnalyticsEvent);
      console.log(`🔥 Returning ${events.length} analytics events`);

      return events;
    } catch (error) {
      console.error('❌ Error getting global analytics:', error);
      console.error('❌ Error details:', (error as any).message, (error as any).code);
      return [];
    }
  }

  static async getAnalytics(
    sparkId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsData> {
    try {
      let query = this.db.collection('analytics');

      if (sparkId) {
        query = query.where('sparkId', '==', sparkId);
      }

      if (dateRange) {
        query = query
          .where('timestamp', '>=', firestore.Timestamp.fromDate(dateRange.start))
          .where('timestamp', '<=', firestore.Timestamp.fromDate(dateRange.end));
      }

      const snapshot = await query.get();
      const events = snapshot.docs.map((doc: any) => doc.data() as AnalyticsEvent);

      // Calculate metrics
      const totalSessions = events.filter((e: any) => e.eventType === 'spark_opened').length;
      const completedSessions = events.filter((e: any) => e.eventType === 'spark_completed').length;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      const errorEvents = events.filter((e: any) => e.eventType === 'error_occurred');
      const errorRate = totalSessions > 0 ? (errorEvents.length / totalSessions) * 100 : 0;

      // Calculate average session duration
      const sessionDurations = events
        .filter((e: any) => e.eventData.duration)
        .map((e: any) => e.eventData.duration);
      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((acc: number, duration: number) => acc + duration, 0) / sessionDurations.length
        : 0;

      return {
        sparkId,
        dateRange,
        metrics: {
          totalSessions,
          averageSessionDuration: Math.round(averageSessionDuration),
          completionRate: Math.round(completionRate * 100) / 100,
          userRetention: 0, // TODO: Implement retention calculation
          errorRate: Math.round(errorRate * 100) / 100,
        }
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  // Admin Response Management
  static async updateFeedbackResponse(feedbackId: string, response: string): Promise<void> {
    try {
      await this.db.collection('feedback').doc(feedbackId).update({
        response,
        responseTimestamp: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating feedback response:', error);
      throw error;
    }
  }

  static async markFeedbackAsViewedByAdmin(feedbackId: string): Promise<void> {
    try {
      await this.db.collection('feedback').doc(feedbackId).update({
        viewedByAdmin: true,
        viewedByAdminAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking feedback as viewed by admin:', error);
      throw error;
    }
  }

  /**
   * Get count of unread feedback responses for a user
   * Unread = has response AND (readByUser is false/undefined)
   */
  static async getUnreadFeedbackCount(userId: string, sparkId?: string): Promise<number> {
    try {
      // Firestore doesn't support != null, so we query all feedback for this user
      // and filter in code
      let query = this.db.collection('feedback').where('userId', '==', userId);

      if (sparkId) {
        query = query.where('sparkId', '==', sparkId);
      }

      const snapshot = await query.get();

      // Filter for: has response AND not read
      const unreadCount = snapshot.docs.filter((doc: any) => {
        const data = doc.data();
        const hasResponse = data.response && data.response.trim() !== '';
        const isUnread = data.readByUser !== true;
        return hasResponse && isUnread;
      }).length;

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread feedback count:', error);
      return 0;
    }
  }

  /**
   * Mark feedback as read by user
   */
  static async markFeedbackAsReadByUser(feedbackId: string): Promise<void> {
    try {
      await this.db.collection('feedback').doc(feedbackId).update({
        readByUser: true,
        readByUserAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking feedback as read by user:', error);
      throw error;
    }
  }

  /**
   * Mark multiple feedback items as read by user
   */
  static async markMultipleFeedbackAsReadByUser(feedbackIds: string[]): Promise<void> {
    if (!feedbackIds || feedbackIds.length === 0) {
      console.log('⚠️ markMultipleFeedbackAsReadByUser: No feedback IDs provided');
      return;
    }

    try {
      console.log(`🔍 markMultipleFeedbackAsReadByUser: Marking ${feedbackIds.length} feedback items as read:`, feedbackIds);
      const batch = this.db.batch();
      feedbackIds.forEach(feedbackId => {
        if (!feedbackId) {
          console.warn('⚠️ Skipping empty feedback ID');
          return;
        }
        const ref = this.db.collection('feedback').doc(feedbackId);
        batch.update(ref, {
          readByUser: true,
          readByUserAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Added update to batch for feedback ID: ${feedbackId}`);
      });
      await batch.commit();
      console.log(`✅ Successfully marked ${feedbackIds.length} feedback items as read by user`);
    } catch (error) {
      console.error('❌ Error marking multiple feedback as read by user:', error);
      throw error;
    }
  }

  static async getFeedbackById(feedbackId: string): Promise<SparkFeedback | null> {
    try {
      const doc = await this.db.collection('feedback').doc(feedbackId).get();
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()?.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        } as SparkFeedback;
      }
      return null;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw error;
    }
  }

  static async getAllFeedback(): Promise<SparkFeedback[]> {
    try {
      const snapshot = await this.db
        .collection('feedback')
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      } as SparkFeedback));
    } catch (error) {
      console.error('Error getting all feedback:', error);
      throw error;
    }
  }

  static async getFeedbackBySpark(sparkId: string): Promise<SparkFeedback[]> {
    try {
      const snapshot = await this.db
        .collection('feedback')
        .where('sparkId', '==', sparkId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      } as SparkFeedback));
    } catch (error) {
      console.error('Error getting feedback by spark:', error);
      throw error;
    }
  }

  // Feature Flags
  static async getFeatureFlags(userId: string): Promise<FeatureFlag[]> {
    try {
      const snapshot = await this.db.collection('featureFlags').get();
      const flags = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as FeatureFlag));

      // Filter flags based on user eligibility
      return flags.filter((flag: any) => this.isUserEligibleForFlag(flag, userId));
    } catch (error) {
      console.error('Error getting feature flags:', error);
      throw error;
    }
  }

  static async isFeatureEnabled(flagName: string, userId: string): Promise<boolean> {
    try {
      const flags = await this.getFeatureFlags(userId);
      const flag = flags.find(f => f.name === flagName);

      if (!flag) return false;

      // Check rollout percentage
      const userHash = this.hashUserId(userId);
      const rolloutThreshold = flag.rolloutPercentage;

      return flag.enabled && (userHash % 100) < rolloutThreshold;
    } catch (error) {
      console.error('Error checking feature flag:', error);
      return false;
    }
  }

  // Session Management
  static async createSession(sessionData: Omit<SessionData, 'id'>): Promise<string> {
    try {
      const docRef = await this.db.collection('sessions').add({
        ...sessionData,
        startTime: firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  static async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      await this.db.collection('sessions').doc(sessionId).update({
        ...updates,
        endTime: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  // Helper Methods
  private static isUserEligibleForFlag(flag: FeatureFlag, userId: string): boolean {
    if (!flag.targetAudience) return true;

    const { platforms, appVersions, userSegments } = flag.targetAudience;

    // TODO: Implement platform, app version, and user segment checks
    // For now, just return true
    return true;
  }

  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Helper function to remove undefined values
  private static cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.cleanObject(item));

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = this.cleanObject(value);
      }
    }
    return cleaned;
  }

  // Batch Operations
  static async batchLogEvents(events: Omit<AnalyticsEvent, 'id' | 'timestamp'>[]): Promise<void> {
    console.log('🔥 FirebaseService.batchLogEvents called with', events.length, 'events');
    console.log('🔥 Events:', events);
    console.log('🔥 Database available:', !!this.db);
    console.log('🔥 Firebase available:', isFirebaseAvailable);

    if (!isFirebaseAvailable || !this.db) {
      console.log('⚠️ Firebase not available, using mock service');
      return MockFirebaseService.batchLogEvents(events);
    }

    try {
      const batch = this.db.batch();

      events.forEach(event => {
        const docRef = this.db.collection('analytics').doc();
        const cleanedEvent = this.cleanObject(event);
        batch.set(docRef, {
          ...cleanedEvent,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log('🔥 Committing batch to Firestore...');
      await batch.commit();
      console.log('✅ Batch committed successfully to Firestore');
    } catch (error) {
      console.error('❌ Error batch logging events:', error);
      throw error;
    }
  }

  // Privacy Controls
  static async deleteUserData(userId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      // Delete user document
      batch.delete(this.db.collection('users').doc(userId));

      // Delete all feedback from this user
      const feedbackSnapshot = await this.db
        .collection('feedback')
        .where('userId', '==', userId)
        .get();
      feedbackSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));

      // Delete all analytics events from this user
      const analyticsSnapshot = await this.db
        .collection('analytics')
        .where('userId', '==', userId)
        .get();
      analyticsSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));

      // Delete all sessions from this user
      const sessionsSnapshot = await this.db
        .collection('sessions')
        .where('userId', '==', userId)
        .get();
      sessionsSnapshot.docs.forEach((doc: any) => batch.delete(doc.ref));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
}
