import {
  User,
  SparkFeedback,
  AnalyticsEvent,
  FeatureFlag,
  AggregatedRating,
  AnalyticsData,
  SessionData
} from '../types/analytics';

// Mock implementation for Expo Go development
export class MockFirebaseService {
  private static mockData = {
    users: new Map<string, User>(),
    feedback: new Map<string, SparkFeedback>(),
    analytics: new Map<string, AnalyticsEvent>(),
    featureFlags: new Map<string, FeatureFlag>(),
    sessions: new Map<string, SessionData>(),
  };

  // User Management
  static async createUser(userData: Partial<User>): Promise<string> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id: userId,
      deviceId: userData.deviceId || 'mock-device',
      platform: userData.platform || 'ios',
      appVersion: userData.appVersion || '1.0.0',
      createdAt: new Date() as any,
      lastActiveAt: new Date() as any,
      preferences: {
        allowsAnalytics: true,
        allowsFeedback: true,
        notificationsEnabled: true,
        ...userData.preferences,
      },
      demographics: userData.demographics,
    };

    this.mockData.users.set(userId, user);
    console.log('Mock: Created user', userId);
    return userId;
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const user = this.mockData.users.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates, lastActiveAt: new Date() as any };
      this.mockData.users.set(userId, updatedUser);
      console.log('Mock: Updated user', userId);
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    const user = this.mockData.users.get(userId);
    console.log('Mock: Retrieved user', userId, !!user);
    return user || null;
  }

  // Feedback Management
  static async submitFeedback(feedback: Omit<SparkFeedback, 'id' | 'timestamp'>): Promise<void> {
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullFeedback: SparkFeedback = {
      id: feedbackId,
      ...feedback,
      timestamp: new Date() as any,
    };

    this.mockData.feedback.set(feedbackId, fullFeedback);
    console.log('Mock: Submitted feedback', feedbackId, feedback.rating, feedback.sparkId);
  }

  static async getFeedbackForSpark(sparkId: string): Promise<SparkFeedback[]> {
    const feedbacks = Array.from(this.mockData.feedback.values())
      .filter(feedback => feedback.sparkId === sparkId)
      .sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
        return timeB - timeA;
      });

    console.log('Mock: Retrieved feedback for spark', sparkId, feedbacks.length);
    return feedbacks;
  }

  static async getUserFeedback(userId: string, sparkId: string): Promise<SparkFeedback[]> {
    const feedbacks = Array.from(this.mockData.feedback.values())
      .filter(feedback => feedback.userId === userId && feedback.sparkId === sparkId)
      .sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
        return timeB - timeA;
      });

    console.log('Mock: Retrieved user feedback for spark', sparkId, feedbacks.length);
    return feedbacks;
  }

  static async getAggregatedRatings(sparkId: string): Promise<AggregatedRating> {
    const feedbacks = Array.from(this.mockData.feedback.values())
      .filter(feedback => feedback.sparkId === sparkId);

    if (feedbacks.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRatings = feedbacks.length;
    const sum = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
    const averageRating = sum / totalRatings;

    const ratingDistribution = feedbacks.reduce((acc, feedback) => {
      acc[feedback.rating] = (acc[feedback.rating] || 0) + 1;
      return acc;
    }, {} as { [rating: number]: number });

    const result = {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      ratingDistribution
    };

    console.log('Mock: Aggregated ratings for spark', sparkId, result);
    return result;
  }

  // Analytics Events
  static async logAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: AnalyticsEvent = {
      id: eventId,
      ...event,
      timestamp: new Date() as any,
    };

    this.mockData.analytics.set(eventId, fullEvent);
    console.log('Mock: Logged event', eventId, event.eventType, event.sparkId);
  }

  static async getAnalytics(
    sparkId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsData> {
    let events = Array.from(this.mockData.analytics.values());

    if (sparkId) {
      events = events.filter(e => e.sparkId === sparkId);
    }

    if (dateRange) {
      events = events.filter(e => {
        const eventDate = e.timestamp;
        return eventDate >= dateRange.start && eventDate <= dateRange.end;
      });
    }

    const totalSessions = events.filter(e => e.eventType === 'spark_opened').length;
    const completedSessions = events.filter(e => e.eventType === 'spark_completed').length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const errorEvents = events.filter(e => e.eventType === 'error_occurred');
    const errorRate = totalSessions > 0 ? (errorEvents.length / totalSessions) * 100 : 0;

    const sessionDurations = events
      .filter(e => e.eventData.duration)
      .map(e => e.eventData.duration);
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((acc, duration) => acc + duration, 0) / sessionDurations.length
      : 0;

    const result = {
      sparkId,
      dateRange,
      metrics: {
        totalSessions,
        averageSessionDuration: Math.round(averageSessionDuration),
        completionRate: Math.round(completionRate * 100) / 100,
        userRetention: 0,
        errorRate: Math.round(errorRate * 100) / 100,
      }
    };

    console.log('Mock: Analytics data', result);
    return result;
  }

  // Feature Flags
  static async getFeatureFlags(userId: string): Promise<FeatureFlag[]> {
    // Return some mock feature flags
    const mockFlags: FeatureFlag[] = [
      {
        id: 'flag_1',
        name: 'enhanced_feedback',
        description: 'Enhanced feedback collection',
        enabled: true,
        rolloutPercentage: 100,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      },
      {
        id: 'flag_2',
        name: 'analytics_v2',
        description: 'New analytics system',
        enabled: false,
        rolloutPercentage: 50,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      }
    ];

    console.log('Mock: Feature flags for user', userId, mockFlags.length);
    return mockFlags;
  }

  static async isFeatureEnabled(flagName: string, userId: string): Promise<boolean> {
    const flags = await this.getFeatureFlags(userId);
    const flag = flags.find(f => f.name === flagName);

    if (!flag) return false;

    // Mock rollout logic
    const userHash = this.hashUserId(userId);
    const rolloutThreshold = flag.rolloutPercentage;

    const enabled = flag.enabled && (userHash % 100) < rolloutThreshold;
    console.log('Mock: Feature flag', flagName, 'for user', userId, enabled);
    return enabled;
  }

  // Session Management
  static async createSession(sessionData: Omit<SessionData, 'id'>): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: SessionData = {
      ...sessionData,
      startTime: new Date() as any,
    };

    this.mockData.sessions.set(sessionId, session);
    console.log('Mock: Created session', sessionId);
    return sessionId;
  }

  static async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const session = this.mockData.sessions.get(sessionId);
    if (session) {
      const updatedSession = { ...session, ...updates, endTime: new Date() as any };
      this.mockData.sessions.set(sessionId, updatedSession);
      console.log('Mock: Updated session', sessionId);
    }
  }

  // Batch Operations
  static async batchLogEvents(events: Omit<AnalyticsEvent, 'id' | 'timestamp'>[]): Promise<void> {
    for (const event of events) {
      await this.logAnalyticsEvent(event);
    }
    console.log('Mock: Batch logged events', events.length);
  }

  // Privacy Controls
  static async deleteUserData(userId: string): Promise<void> {
    // Delete user
    this.mockData.users.delete(userId);

    // Delete all feedback from this user
    for (const [id, feedback] of this.mockData.feedback.entries()) {
      if (feedback.userId === userId) {
        this.mockData.feedback.delete(id);
      }
    }

    // Delete all analytics events from this user
    for (const [id, event] of this.mockData.analytics.entries()) {
      if (event.userId === userId) {
        this.mockData.analytics.delete(id);
      }
    }

    // Delete all sessions from this user
    for (const [id, session] of this.mockData.sessions.entries()) {
      if (session.userId === userId) {
        this.mockData.sessions.delete(id);
      }
    }

    console.log('Mock: Deleted all data for user', userId);
  }

  // Helper Methods
  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  static isInitialized(): boolean {
    // Mock service is always "initialized"
    return true;
  }

  static async getGlobalAnalytics(days: number = 14): Promise<AnalyticsEvent[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allEvents = Array.from(this.mockData.analytics.values());
    const filteredEvents = allEvents.filter(event => {
      if (!event.timestamp) return false;
      const eventDate = (event.timestamp as any).toDate ?
        (event.timestamp as any).toDate() :
        new Date(event.timestamp as any);
      return eventDate >= startDate;
    });

    console.log(`Mock: Returning ${filteredEvents.length} analytics events for last ${days} days`);
    return filteredEvents;
  }

  // Development helpers
  static getMockData() {
    return {
      users: Array.from(this.mockData.users.values()),
      feedback: Array.from(this.mockData.feedback.values()),
      analytics: Array.from(this.mockData.analytics.values()),
      sessions: Array.from(this.mockData.sessions.values()),
    };
  }

  static clearMockData() {
    this.mockData.users.clear();
    this.mockData.feedback.clear();
    this.mockData.analytics.clear();
    this.mockData.sessions.clear();
    console.log('Mock: Cleared all mock data');
  }
}
