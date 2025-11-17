import { Platform } from 'react-native';

// Dynamic imports for expo modules to handle cases where they're not available
let Notifications: any = null;
let TaskManager: any = null;
let isNotificationsAvailable = false;
let isTaskManagerAvailable = false;

try {
  // Use the same import pattern as App.tsx: import * as Notifications
  // When using require, the module namespace is the Notifications object
  const notificationsModule = require('expo-notifications');
  Notifications = notificationsModule.default || notificationsModule;
  isNotificationsAvailable = true;
  console.log('✅ Expo Notifications available');
} catch (error) {
  console.log('⚠️ Expo Notifications not available:', error instanceof Error ? error.message : String(error));
  isNotificationsAvailable = false;
}

try {
  const taskManagerModule = require('expo-task-manager');
  TaskManager = taskManagerModule.default;
  isTaskManagerAvailable = true;
  console.log('✅ Expo TaskManager available');
} catch (error) {
  console.log('⚠️ Expo TaskManager not available:', error instanceof Error ? error.message : String(error));
  isTaskManagerAvailable = false;
}

// Configure how notifications should be handled when the app is running
if (isNotificationsAvailable && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
      // The notification handler is only called when a notification is actually being displayed
      const now = new Date();
      const trigger = notification.request.trigger;
      
      // Extract trigger time for debugging
      let triggerTime = 'unknown';
      let isScheduledForFuture = false;
      
      if (trigger) {
        if (trigger.date) {
          const triggerDate = new Date(trigger.date);
          triggerTime = triggerDate.toLocaleString();
          isScheduledForFuture = triggerDate.getTime() > now.getTime();
        } else if (trigger.seconds) {
          const futureTime = new Date(now.getTime() + trigger.seconds * 1000);
          triggerTime = futureTime.toLocaleString();
          isScheduledForFuture = trigger.seconds > 0;
        }
      }
      
      // Log detailed info about when notification was supposed to fire
      console.log('📬 Notification handler called:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        currentTime: now.toLocaleString(),
        triggerTime: triggerTime,
        trigger: JSON.stringify(trigger),
        scheduledTime: notification.request.content.data?.scheduledTime,
        isScheduledForFuture: isScheduledForFuture,
        isPremature: isScheduledForFuture,
      });
      
      // CRITICAL: If notification is scheduled for the future, suppress it
      // Scheduled notifications should NOT trigger the handler until their scheduled time
      // If we're seeing this, iOS is incorrectly firing scheduled notifications immediately
      if (isScheduledForFuture) {
        console.error('🚨 ERROR: Scheduled notification is firing immediately!');
        console.error('🚨 This notification was scheduled for:', triggerTime);
        console.error('🚨 Current time is:', now.toLocaleString());
        console.error('🚨 Suppressing this notification - it should fire later');
        
        // Suppress the notification - it should fire at its scheduled time, not now
        return {
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
      
      // Show all notifications normally (even when app is in foreground)
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
  
  // Also listen for notifications when app is in background/killed
  Notifications.addNotificationReceivedListener((notification: any) => {
    // This listener is called when notifications are actually received/fired
    const now = new Date();
    const trigger = notification.request?.trigger || notification.trigger;
    
    // Log the FULL notification structure to see what we're getting
    console.log('🔍 FULL notification structure:', JSON.stringify(notification, null, 2));
    console.log('🔍 notification.request:', JSON.stringify(notification.request, null, 2));
    console.log('🔍 notification.request.trigger:', JSON.stringify(trigger, null, 2));
    
    // Extract trigger time for debugging
    let triggerTime = 'unknown';
    if (trigger) {
      if (trigger.date) {
        triggerTime = new Date(trigger.date).toLocaleString();
      } else if (trigger.seconds) {
        const futureTime = new Date(now.getTime() + trigger.seconds * 1000);
        triggerTime = futureTime.toLocaleString();
      }
    }
    
    console.log('📬 Notification received (background/killed state):', {
      title: notification.request?.content?.title || notification.content?.title,
      body: notification.request?.content?.body || notification.body,
      currentTime: now.toLocaleString(),
      triggerTime: triggerTime,
      trigger: JSON.stringify(trigger),
      scheduledTime: notification.request?.content?.data?.scheduledTime || notification.data?.scheduledTime,
      isPremature: trigger?.date ? new Date(trigger.date).getTime() > now.getTime() : 'unknown',
      data: notification.request?.content?.data || notification.data,
    });
  });
} else {
  console.log('⚠️ Notifications not available, skipping notification handler setup');
}

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Define background task for handling notifications
if (isTaskManagerAvailable && TaskManager) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }: { data: any; error: any; executionInfo: any }) => {
    console.log('Background notification task executed:', { data, error, executionInfo });
    
    if (error) {
      console.error('Background notification task error:', error);
      return;
    }
    
    if (data) {
      console.log('Background notification data:', data);
      // Handle the notification data here if needed
    }
  });
} else {
  console.log('⚠️ TaskManager not available, skipping background task definition');
}

export class NotificationService {
  // Register background task for notifications
  static async registerBackgroundTask(): Promise<void> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, skipping background task registration');
        return;
      }

      if (!isTaskManagerAvailable || !TaskManager) {
        console.log('⚠️ TaskManager not available, skipping background task registration');
        return;
      }

      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('Background notification task registered');
    } catch (error) {
      console.error('Error registering background task:', error);
    }
  }

  // Request permissions for notifications
  static async requestPermissions(): Promise<boolean> {
    try {
      if (!isNotificationsAvailable || !Notifications) {
        console.log('⚠️ Notifications not available, returning false');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted:', finalStatus);
      return false;
    }

    // For Android, ensure we can schedule exact alarms and create notification channels
    if (Platform.OS === 'android') {
      // Create default notification channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E86AB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

    }

    return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }


  // Handle notification response (when user taps notification)
  static addNotificationResponseListener(callback: (response: any) => void) {
    if (!isNotificationsAvailable || !Notifications) {
      console.log('⚠️ Notifications not available, cannot add response listener');
      return null;
    }
    
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Simplified notification scheduling - just pass title, body, seconds, sparkId, and optional icon
  static async scheduleNotification(
    title: string,
    body: string,
    seconds: number,
    sparkId: string,
    identifier?: string,
    icon?: string
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Notification permissions not granted');
        return null;
      }

      // Validate seconds is positive
      if (seconds <= 0) {
        console.log(`⏭️ Skipping notification - seconds must be positive (got ${seconds})`);
        return null;
      }

      // Use the correct trigger format with type field
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds,
        channelId: Platform.OS === 'android' ? 'default' : undefined,
      };

      // Use spark icon if provided, otherwise default to ✨
      const notificationTitle = icon 
        ? `${icon} ${title}`
        : (title.startsWith('✨') ? title : `✨ ${title}`);

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: identifier || `spark-${sparkId}-${Date.now()}`,
        content: {
          title: notificationTitle,
          body,
          data: {
            type: 'spark-notification',
            sparkId,
          },
          sound: 'default',
          badge: 1,
          ...(Platform.OS === 'android' && {
            channelId: 'default',
          }),
        },
        trigger: trigger as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Schedule activity start notification (backwards compatible wrapper)
  static async scheduleActivityNotification(
    activityName: string, 
    startTime: Date, 
    activityId: string, 
    sparkName?: string, 
    sparkId?: string,
    icon?: string
  ): Promise<void> {
    try {
      const now = new Date();
      const futureDate = new Date(startTime);
      
      // Validate that the date is in the future
      if (futureDate.getTime() <= now.getTime()) {
        console.log(`⏭️ Skipping notification for "${activityName}" - start time is in the past (${futureDate.toLocaleString()})`);
        return;
      }

      // Calculate seconds until start
      const secondsUntilStart = Math.floor((futureDate.getTime() - now.getTime()) / 1000);

      // Use the simplified scheduling method
      const title = sparkName || 'Activity Reminder';
      const body = `Time to start: ${activityName}`;
      
      const notificationId = await this.scheduleNotification(
        title,
        body,
        secondsUntilStart,
        sparkId || activityId,
        `activity-${activityId}`,
        icon
      );

      if (notificationId) {
        console.log(`✅ Activity notification scheduled for "${activityName}" (ID: ${notificationId})`);
      } else {
        console.warn(`⚠️ Failed to schedule notification for "${activityName}"`);
      }
      console.log(`   Scheduled time: ${futureDate.toLocaleString()}`);
      console.log(`   Will fire in: ${Math.floor(secondsUntilStart / 60)} minutes (${secondsUntilStart} seconds)`);
      console.log(`   Notification ID: ${notificationId}`);
    } catch (error) {
      console.error(`❌ Error scheduling activity notification for "${activityName}":`, error);
    }
  }

  // Cancel all activity notifications
  static async cancelAllActivityNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const activityNotifications = scheduledNotifications.filter(
        (notification: any) => notification.content.data?.type === 'activity-start'
      );
      
      for (const notification of activityNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log(`Cancelled ${activityNotifications.length} activity notifications`);
    } catch (error) {
      console.error('Error cancelling activity notifications:', error);
    }
  }

  // Send silent notification for better background handling
  static async sendSilentNotification(title: string, body: string, data: any, trigger: any): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Notification permissions not granted');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          // No title or body for silent notification
          data: {
            ...data,
            taskName: BACKGROUND_NOTIFICATION_TASK,
            silentTitle: title,
            silentBody: body
          },
          sound: false, // No sound for silent notification
          badge: 1,
        },
        trigger,
      });

      console.log(`Silent notification scheduled with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error sending silent notification:', error);
      return null;
    }
  }

  // Test notification (for debugging) - with Expo Go limitation explanation
  static async sendTestNotification(): Promise<void> {
    try {
      console.log('Starting test notification process...');
      
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Notification permissions not granted');
        return;
      }
      console.log('Notification permissions granted');

      // Check if we're running in Expo Go (which has limitations with scheduled notifications)
      const isExpoGo = __DEV__ && !(global as any).nativeCallSyncHook;
      
      if (isExpoGo) {
        console.log('⚠️  EXPO GO LIMITATION DETECTED');
        console.log('Expo Go has known limitations with scheduled notifications.');
        console.log('Scheduled notifications may fire immediately instead of at the scheduled time.');
        console.log('For proper notification testing, use a development build or standalone app.');
        console.log('See: https://docs.expo.dev/push-notifications/faq/');
      }

      // Test with immediate notification to verify basic functionality
      console.log('Testing immediate notification...');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Immediate Test',
          body: 'This should appear immediately!',
          data: { type: 'test-immediate' },
          sound: 'default',
        },
        trigger: {
          seconds: 1,
        },
      });

      // Test scheduled notification (may not work properly in Expo Go)
      console.log('Testing scheduled notification...');
      const futureTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      
      const scheduledId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Scheduled Test',
          body: `This should appear at ${futureTime.toLocaleTimeString()}!`,
          data: { type: 'test-scheduled' },
          sound: 'default',
        },
        trigger: {
          date: futureTime,
        },
      });

      console.log(`Scheduled notification ID: ${scheduledId}`);
      console.log(`Expected time: ${futureTime.toLocaleTimeString()}`);
      
      if (isExpoGo) {
        console.log('⚠️  Note: In Expo Go, scheduled notifications may fire immediately.');
        console.log('This is a known limitation and not a bug in your code.');
      }

      // Check scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Found ${scheduledNotifications.length} scheduled notifications`);
      
      if (scheduledNotifications.length === 0 && !isExpoGo) {
        console.log('WARNING: No notifications were scheduled! This might be a configuration issue.');
      }
      
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}