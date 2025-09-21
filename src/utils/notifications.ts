import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAILY_NOTIFICATION_IDENTIFIER = 'daily-sparks-reminder';

export class NotificationService {
  // Request permissions for notifications
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // For Android, ensure we can schedule exact alarms
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E86AB',
        sound: 'default',
        enableVibrate: true,
      });
    }

    return true;
  }

  // Schedule daily notification at 8 AM
  static async scheduleDailyNotification(): Promise<void> {
    try {
      // Cancel any existing daily notification
      await this.cancelDailyNotification();

      // Request permissions first
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Notification permissions not granted');
        return;
      }

      // Schedule the daily notification
      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_NOTIFICATION_IDENTIFIER,
        content: {
          title: '✨ New Sparks Await!',
          body: 'Discover something new today - check out the latest sparks in the marketplace!',
          data: { 
            screen: 'Marketplace',
            type: 'daily-reminder'
          },
        },
        trigger: {
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Daily notification scheduled for 8:00 AM');
    } catch (error) {
      console.error('Error scheduling daily notification:', error);
    }
  }

  // Cancel the daily notification
  static async cancelDailyNotification(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_IDENTIFIER);
      console.log('Daily notification cancelled');
    } catch (error) {
      console.error('Error cancelling daily notification:', error);
    }
  }

  // Check if daily notifications are scheduled
  static async isDailyNotificationScheduled(): Promise<boolean> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      return scheduledNotifications.some(
        notification => notification.identifier === DAILY_NOTIFICATION_IDENTIFIER
      );
    } catch (error) {
      console.error('Error checking scheduled notifications:', error);
      return false;
    }
  }

  // Handle notification response (when user taps notification)
  static addNotificationResponseListener(callback: (response: any) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Test notification (for debugging)
  static async sendTestNotification(): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Notification permissions not granted');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify everything works!',
          data: { type: 'test' },
        },
        trigger: {
          seconds: 1,
        },
      });

      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}