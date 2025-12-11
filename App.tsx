import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useAppStore } from './src/store';
import { useAuthStore } from './src/store/authStore';
import { NotificationService } from './src/utils/notifications';
import { FeedbackNotificationService } from './src/services/FeedbackNotificationService';
import { ServiceFactory } from './src/services/ServiceFactory';
import AuthService from './src/services/AuthService';

// Initialize Firebase
let firebaseApp: any = null;
try {
  // const firebase = require('@react-native-firebase/app');
  const firebase = { default: { apps: [] } }; // Mock for web
  firebaseApp = firebase.default;

  // Initialize Firebase app if not already initialized
  if (!firebaseApp.apps.length) {
    firebaseApp.initializeApp();
    console.log('✅ Firebase app initialized');
  } else {
    console.log('✅ Firebase app already initialized');
  }
} catch (error) {
  console.log('⚠️ Firebase not available:', (error as Error).message);
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
  const { setUser, setRole, setSparkAdminRoles } = useAuthStore();

  // Initialize authentication when app starts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🚀 App: Initializing AuthService...');
        await AuthService.initialize();

        // Set up auth state listener
        const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
          console.log('🔐 App: Auth state changed', user ? user.email : 'signed out');
          setUser(user);

          if (user) {
            // Load user roles
            try {
              const role = await AuthService.getUserRole();
              const sparkAdminRoles = await AuthService.getSparkAdminRoles();
              setRole(role);
              setSparkAdminRoles(sparkAdminRoles);
              console.log('✅ App: User roles loaded', { role, sparkAdminRoles });
            } catch (error) {
              console.error('❌ App: Error loading user roles', error);
            }
          } else {
            // Clear roles when signed out
            setRole('standard');
            setSparkAdminRoles([]);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('❌ App: Failed to initialize AuthService', error);
      }
    };

    const unsubscribePromise = initializeAuth();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  // Initialize analytics when app starts
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        console.log('🚀 App: Initializing Analytics...');
        await ServiceFactory.ensureAnalyticsInitialized();
        console.log('✅ App: Analytics initialized');

        // Track app launch
        const AnalyticsService = ServiceFactory.getAnalyticsService();
        await AnalyticsService.trackAppLaunch();
        console.log('📊 App: Launch tracked');
      } catch (error) {
        console.error('❌ App: Failed to initialize Analytics', error);
      }
    };

    initializeAnalytics();
  }, []);

  // Initialize notifications when app starts
  useEffect(() => {
    const initializeNotifications = async () => {
      // Set up notification handler
      await NotificationService.requestPermissions();

      // Initialize feedback notification service
      await FeedbackNotificationService.initialize();

      // Register background task for notifications
      await NotificationService.registerBackgroundTask();

      // Update app icon badge with aggregated unread counts
      await FeedbackNotificationService.updateAppIconBadge();

    };

    initializeNotifications();

    // Listen for notification responses (when user taps notification)
    const subscription = NotificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      // Import navigation ref dynamically to avoid circular dependencies
      import('./src/navigation/AppNavigator').then(({ navigationRef }) => {
        if (navigationRef.isReady()) {
          if (data?.type === 'spark-notification' && data?.sparkId) {
            // Navigate to the specific spark
            // First navigate to MySparks stack, then to the Spark screen
            (navigationRef as any).navigate('MySparks', {
              screen: 'Spark',
              params: { sparkId: data.sparkId },
            });
            console.log(`✅ Navigated to spark ${data.sparkId} from notification`);
          } else if (data?.type === 'activity-start' && data?.sparkId) {
            // Legacy activity notifications - navigate to spark
            (navigationRef as any).navigate('MySparks', {
              screen: 'Spark',
              params: { sparkId: data.sparkId },
            });
            console.log(`✅ Navigated to spark ${data.sparkId} from activity notification`);
          }
        } else {
          console.log('⚠️ Navigation not ready yet, cannot navigate');
        }
      }).catch((error) => {
        console.error('Error navigating from notification:', error);
      });
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

    // Periodically update app icon badge (every 30 seconds)
    const badgeUpdateInterval = setInterval(async () => {
      try {
        await FeedbackNotificationService.updateAppIconBadge();
      } catch (error) {
        console.error('Error updating app icon badge:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => {
      subscription?.remove();
      if (feedbackListenerCleanup) {
        feedbackListenerCleanup();
      }
      clearTimeout(listenerTimeout);
      clearInterval(badgeUpdateInterval);
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={preferences.theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}