import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useAppStore } from './src/store';
import { NotificationService } from './src/utils/notifications';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { preferences } = useAppStore();
  
  // Initialize notifications when app starts
  useEffect(() => {
    const initializeNotifications = async () => {
      // Set up notification handler
      await NotificationService.requestPermissions();
      
      // If daily notifications are enabled, ensure they're scheduled
      if (preferences.dailyNotificationsEnabled) {
        const isScheduled = await NotificationService.isDailyNotificationScheduled();
        if (!isScheduled) {
          await NotificationService.scheduleDailyNotification();
        }
      }
    };

    initializeNotifications();

    // Listen for notification responses (when user taps notification)
    const subscription = NotificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'daily-reminder') {
        // Could navigate to marketplace here if needed
        console.log('Daily reminder notification tapped');
      }
    });

    return () => subscription?.remove();
  }, [preferences.dailyNotificationsEnabled]);
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}