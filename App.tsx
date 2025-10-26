import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useAppStore } from './src/store';
import { NotificationService } from './src/utils/notifications';
import { FeedbackNotificationService } from './src/services/FeedbackNotificationService';
import { ServiceFactory } from './src/services/ServiceFactory';

// Initialize Firebase
let firebaseApp: any = null;
try {
  const firebase = require('@react-native-firebase/app');
  firebaseApp = firebase.default;
  
  // Initialize Firebase app if not already initialized
  if (!firebaseApp.apps.length) {
    firebaseApp.initializeApp();
    console.log('✅ Firebase app initialized');
  } else {
    console.log('✅ Firebase app already initialized');
  }
} catch (error) {
  console.log('⚠️ Firebase not available:', error.message);
}

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
      
      // Initialize feedback notification service
      await FeedbackNotificationService.initialize();
      
      // Register background task for notifications
      await NotificationService.registerBackgroundTask();
      
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

    // Start listening for new feedback responses in real-time
    let feedbackListenerCleanup: (() => void) | null = null;
    const startFeedbackListener = async () => {
      try {
        const AnalyticsService = ServiceFactory.getAnalyticsService();
        const sessionInfo = AnalyticsService.getSessionInfo();
        const deviceId = sessionInfo.userId || sessionInfo.sessionId || 'anonymous';
        
        console.log('👂 Starting feedback response listener for device:', deviceId);
        feedbackListenerCleanup = FeedbackNotificationService.startListeningForNewResponses(deviceId);
      } catch (error) {
        console.error('❌ Error starting feedback listener:', error);
      }
    };
    
    // Start the listener after a short delay to ensure Firebase is initialized
    const listenerTimeout = setTimeout(startFeedbackListener, 2000);
    startFeedbackListener();

    return () => {
      subscription?.remove();
      if (feedbackListenerCleanup) {
        feedbackListenerCleanup();
      }
      clearTimeout(listenerTimeout);
    };
  }, [preferences.dailyNotificationsEnabled]);
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}