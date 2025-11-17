import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


// Dynamic import for expo-notifications to handle cases where it's not available
let Notifications: any = null;
let isNotificationsAvailable = false;

try {
  const notificationsModule = require('expo-notifications');
  Notifications = notificationsModule.default || notificationsModule;
  isNotificationsAvailable = true;
  console.log('✅ Expo Notifications available');
} catch (error) {
  console.log('⚠️ Expo Notifications not available:', (error as Error).message);
  isNotificationsAvailable = false;
}

interface PendingResponse {
  feedbackId: string;
  sparkId: string;
  sparkName: string;
  timestamp: number;
  read: boolean;
}

interface AdminDevice {
  deviceId: string;
  name: string;
  isActive: boolean;
}

export class FeedbackNotificationService {
  private static readonly PENDING_RESPONSES_KEY = 'pending_feedback_responses';
  private static readonly ADMIN_DEVICES_KEY = 'admin_devices';
  private static readonly NOTIFICATION_CHANNEL_ID = 'feedback-responses';

  /**
   * Get the persistent device ID from AsyncStorage
   * This ID persists across app sessions and device restarts (until app is uninstalled)
   * This is the most reliable way to get a consistent device identifier without login
   */
  static async getPersistentDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('analytics_device_id');
      if (!deviceId) {
        // If no device ID exists, create one (this should rarely happen)
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_device_id', deviceId);
        console.log('✅ Created new persistent device ID:', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting persistent device ID:', error);
      // Fallback to a session-based ID if AsyncStorage fails
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Admin device IDs - you can add your device IDs here
  private static readonly ADMIN_DEVICE_IDS = [
    'device_1761188124738_43laovhht', // Replace with your actual device ID
    'device_1761108969148_hwegb6ecb', // Add more if needed
    'device_1761438183470_ss39iv0t6',
    'device_1761186342237_3wfem84rw', // Added current simulator device ID
    'device_1761517171849_ux8n12sm7'
  ];

  /**
   * Initialize the notification service
   */
  static async initialize(): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping initialization');
        return;
      }

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Notification permission not granted');
        return;
      }

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(this.NOTIFICATION_CHANNEL_ID, {
          name: 'Feedback Responses',
          description: 'Notifications for feedback responses',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('✅ FeedbackNotificationService initialized');
    } catch (error) {
      console.error('❌ Error initializing FeedbackNotificationService:', error);
      // Don't throw - just log the error and continue without notifications
    }
  }

  /**
   * Start listening for new feedback responses in real-time
   */
  static startListeningForNewResponses(deviceId: string): () => void {
    try {
      // Import WebFirebaseService dynamically to avoid circular dependencies
      const WebFirebaseService = require('./WebFirebaseService').WebFirebaseService;
      
      // Only start listener if Firebase is initialized
      if (!WebFirebaseService.isInitialized()) {
        console.log('⚠️ Firebase not initialized, cannot start feedback listener');
        return () => {};
      }

      // Set up the real-time listener
      const unsubscribe = WebFirebaseService.startFeedbackResponseListener(
        deviceId,
        (feedbackId: string, sparkId: string, sparkName: string) => {
          console.log('📬 Real-time feedback response received:', { feedbackId, sparkId, sparkName });
          
          // Add as pending response (which will send a notification)
          this.addPendingResponse(deviceId, feedbackId, sparkId, sparkName);
        }
      );

      console.log('✅ Started real-time feedback response listener');
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error starting feedback response listener:', error);
      return () => {};
    }
  }

  /**
   * Check if a device is an admin device
   */
  static isAdminDevice(deviceId: string): boolean {
    return this.ADMIN_DEVICE_IDS.includes(deviceId);
  }

  /**
   * Get pending responses for a user (public for debugging)
   */
  static async getPendingResponses(deviceId: string): Promise<PendingResponse[]> {
    try {
      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending responses:', error);
      return [];
    }
  }

  /**
   * Mark a response as read (now uses Firebase directly)
   */
  static async markResponseAsRead(deviceId: string, feedbackId: string): Promise<void> {
    try {
      const { ServiceFactory } = await import('./ServiceFactory');
      const FirebaseService = ServiceFactory.getFirebaseService();
      
      // Mark as read in Firebase
      await (FirebaseService as any).markFeedbackAsReadByUser(feedbackId);
      
      // Update app icon badge with aggregated counts
      await this.updateAppIconBadge();
    } catch (error) {
      console.error('Error marking response as read:', error);
    }
  }

  /**
   * Mark all responses as read for a spark (now uses Firebase directly)
   */
  static async markAllResponsesAsRead(deviceId: string, sparkId: string): Promise<void> {
    try {
      const { ServiceFactory } = await import('./ServiceFactory');
      const FirebaseService = ServiceFactory.getFirebaseService();
      
      // Get all unread feedback for this spark
      const unreadCount = await (FirebaseService as any).getUnreadFeedbackCount(deviceId, sparkId);
      
      if (unreadCount > 0) {
        // Get all feedback items for this user/spark
        const { FeedbackService } = await import('./FeedbackService');
        const allFeedback = await FeedbackService.getUserFeedback(deviceId, sparkId);
        
        // Find feedback items with responses that haven't been read
        const unreadFeedbackIds = allFeedback
          .filter(f => f.response && f.response.trim() && f.readByUser !== true)
          .map(f => f.id)
          .filter(Boolean) as string[];
        
        if (unreadFeedbackIds.length > 0) {
          // Mark all as read in Firebase
          await (FirebaseService as any).markMultipleFeedbackAsReadByUser(unreadFeedbackIds);
        }
      }
      
      // Update app icon badge with aggregated counts
      await this.updateAppIconBadge();
    } catch (error) {
      console.error('Error marking all responses as read:', error);
    }
  }

  /**
   * Add a pending response notification
   */
  static async addPendingResponse(
    deviceId: string, 
    feedbackId: string, 
    sparkId: string, 
    sparkName: string
  ): Promise<void> {
    try {
      console.log('🔔 FeedbackNotificationService.addPendingResponse called:', {
        deviceId,
        feedbackId,
        sparkId,
        sparkName
      });
      
      const responses = await this.getPendingResponses(deviceId);
      console.log('🔔 Existing pending responses for device:', deviceId, 'count:', responses.length);
      
      const newResponse: PendingResponse = {
        feedbackId,
        sparkId,
        sparkName,
        timestamp: Date.now(),
        read: false,
      };

      // Check if this response already exists
      const existingIndex = responses.findIndex(r => r.feedbackId === feedbackId);
      if (existingIndex >= 0) {
        console.log('🔔 Updating existing response at index:', existingIndex);
        responses[existingIndex] = newResponse;
      } else {
        console.log('🔔 Adding new response to list');
        responses.push(newResponse);
      }

      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      await AsyncStorage.setItem(key, JSON.stringify(responses));
      console.log('🔔 Saved pending responses to AsyncStorage:', key, 'total:', responses.length);

      // Send notification
      await this.sendResponseNotification(sparkName, feedbackId);
      
      // Update badge count (internal method for individual spark)
      await this.updateBadgeCount(deviceId);
      
      // Update app icon badge with aggregated counts
      await this.updateAppIconBadge();
      
      console.log('✅ Pending response added successfully');
    } catch (error) {
      console.error('❌ Error adding pending response:', error);
    }
  }

  /**
   * Send a notification for a new response
   */
  private static async sendResponseNotification(sparkName: string, feedbackId: string): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping response notification');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ New Response!',
          body: `You have a new response to your ${sparkName} feedback`,
          data: { feedbackId, type: 'feedback_response' },
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending response notification:', error);
    }
  }

  /**
   * Update the app badge count (for individual spark - used internally)
   */
  private static async updateBadgeCount(deviceId: string): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping badge update');
        return;
      }

      const responses = await this.getPendingResponses(deviceId);
      const unreadCount = responses.filter(r => !r.read).length;
      
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Update app icon badge with aggregated unread counts
   * For non-admin users: counts unread replies across all sparks
   * For admin users: counts unread replies + unread feedback
   */
  static async updateAppIconBadge(): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping app icon badge update');
        return;
      }

      const deviceId = await this.getPersistentDeviceId();
      
      // Get total unread replies across all sparks
      const totalUnreadReplies = await this.getUnreadCount(deviceId);
      
      // Check if user is admin and get unread feedback count
      let totalUnreadFeedback = 0;
      try {
        const { AdminResponseService } = await import('./AdminResponseService');
        const isAdmin = await AdminResponseService.isAdmin();
        if (isAdmin) {
          // For admins, count both feedback (with comments) and reviews (ratings only)
          totalUnreadFeedback = await AdminResponseService.getTotalUnreadCount();
        }
      } catch (error) {
        // If admin check fails, assume not admin
        console.log('Admin check failed, assuming not admin:', error);
      }
      
      // Aggregate total unread count
      const totalUnread = totalUnreadReplies + totalUnreadFeedback;
      
      // Update app icon badge
      await Notifications.setBadgeCountAsync(totalUnread);
    } catch (error) {
      console.error('Error updating app icon badge:', error);
    }
  }

  /**
   * Get unread response count for a specific spark
   * Now uses Firebase directly - checks for feedback with response that hasn't been read
   */
  static async getUnreadCount(deviceId: string, sparkId?: string): Promise<number> {
    try {
      const { ServiceFactory } = await import('./ServiceFactory');
      const FirebaseService = ServiceFactory.getFirebaseService();
      
      // Use Firebase to get unread count directly
      const count = await (FirebaseService as any).getUnreadFeedbackCount(deviceId, sparkId);
      
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Send admin notification for new feedback
   */
  static async sendAdminNotification(
    sparkName: string, 
    feedbackText: string, 
    rating: number
  ): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping admin notification');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 New Feedback Received',
          body: `${sparkName}: ${rating}/5 stars - ${feedbackText.substring(0, 50)}...`,
          data: { type: 'new_feedback', sparkName },
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  /**
   * Clear all pending responses (for testing)
   */
  static async clearAllPendingResponses(deviceId: string): Promise<void> {
    try {
      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      await AsyncStorage.removeItem(key);
      await this.updateBadgeCount(deviceId);
    } catch (error) {
      console.error('Error clearing pending responses:', error);
    }
  }

  /**
   * Check if user has unread responses for a specific spark
   */
  static async hasUnreadResponse(userId: string, sparkId: string): Promise<boolean> {
    try {
      const { ServiceFactory } = await import('./ServiceFactory');
      const FirebaseService = ServiceFactory.getFirebaseService();
      
      // Check if Firebase is initialized with proper error handling
      try {
        if (!(FirebaseService as any).isInitialized()) {
          console.log('Firebase not initialized, returning false for unread check');
          return false;
        }
      } catch (initError) {
        console.log('Firebase initialization check failed, returning false for unread check');
        return false;
      }

      const responses = await (FirebaseService as any).getUserFeedbackResponses(userId, sparkId);
      const unreadResponses = responses.filter((response: any) => !response.isRead);
      
      console.log(`📩 Checking unread responses for ${sparkId}: ${unreadResponses.length} unread`);
      return unreadResponses.length > 0;
    } catch (error) {
      console.error('Error checking unread responses:', error);
      return false;
    }
  }
}
