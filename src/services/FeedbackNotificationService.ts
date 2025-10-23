import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamic import for expo-notifications to handle cases where it's not available
let Notifications: any = null;
let isNotificationsAvailable = false;

try {
  const notificationsModule = require('expo-notifications');
  Notifications = notificationsModule.Notifications;
  isNotificationsAvailable = true;
  console.log('✅ Expo Notifications available');
} catch (error) {
  console.log('⚠️ Expo Notifications not available:', error.message);
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

  // Admin device IDs - you can add your device IDs here
  private static readonly ADMIN_DEVICE_IDS = [
    'device_1761188124738_43laovhht', // Replace with your actual device ID
    'device_1761108969148_hwegb6ecb', // Add more if needed
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
   * Check if a device is an admin device
   */
  static isAdminDevice(deviceId: string): boolean {
    return this.ADMIN_DEVICE_IDS.includes(deviceId);
  }

  /**
   * Get pending responses for a user
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
   * Mark a response as read
   */
  static async markResponseAsRead(deviceId: string, feedbackId: string): Promise<void> {
    try {
      const responses = await this.getPendingResponses(deviceId);
      const updatedResponses = responses.map(response => 
        response.feedbackId === feedbackId 
          ? { ...response, read: true }
          : response
      );
      
      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedResponses));
      
      // Update badge count
      await this.updateBadgeCount(deviceId);
    } catch (error) {
      console.error('Error marking response as read:', error);
    }
  }

  /**
   * Mark all responses as read for a spark
   */
  static async markAllResponsesAsRead(deviceId: string, sparkId: string): Promise<void> {
    try {
      const responses = await this.getPendingResponses(deviceId);
      const updatedResponses = responses.map(response => 
        response.sparkId === sparkId 
          ? { ...response, read: true }
          : response
      );
      
      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedResponses));
      
      // Update badge count
      await this.updateBadgeCount(deviceId);
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
      const responses = await this.getPendingResponses(deviceId);
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
        responses[existingIndex] = newResponse;
      } else {
        responses.push(newResponse);
      }

      const key = `${this.PENDING_RESPONSES_KEY}_${deviceId}`;
      await AsyncStorage.setItem(key, JSON.stringify(responses));

      // Send notification
      await this.sendResponseNotification(sparkName, feedbackId);
      
      // Update badge count
      await this.updateBadgeCount(deviceId);
    } catch (error) {
      console.error('Error adding pending response:', error);
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
          title: '📬 New Response!',
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
   * Update the app badge count
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
   * Get unread response count for a specific spark
   */
  static async getUnreadCount(deviceId: string, sparkId?: string): Promise<number> {
    try {
      const responses = await this.getPendingResponses(deviceId);
      if (sparkId) {
        return responses.filter(r => r.sparkId === sparkId && !r.read).length;
      }
      return responses.filter(r => !r.read).length;
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
}
