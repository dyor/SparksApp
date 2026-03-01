import React, { useEffect } from "react";
import { useSparkStore } from "./src/store";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SystemBars } from "react-native-edge-to-edge";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { useAppStore } from "./src/store";
import { useAuthStore } from "./src/store/authStore";
import { NotificationService } from "./src/utils/notifications";
import { FeedbackNotificationService } from "./src/services/FeedbackNotificationService";
import { ServiceFactory } from "./src/services/ServiceFactory";
import AuthService from "./src/services/AuthService";
import { RemoteConfigService } from "./src/services/RemoteConfigService";
import { navigationRef } from "./src/navigation/navigationRef";
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { ScreenRecordingHUD } from "./src/components/ScreenRecordingHUD";
import { ScreenRecorder } from "./src/services/ScreenRecorderService";
import { HapticFeedback } from "./src/utils/haptics";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

console.log("🚀 [App.tsx] JS Bundle executing...");

// Initialize Firebase
try {
  // Use native Firebase if available, otherwise fallback to web/mock
  let firebase;
  try {
    firebase = require("@react-native-firebase/app").default;
  } catch (e) {
    // If native firebase is not available, we'll let ServiceFactory handle it
    console.log(
      "ℹ️ Native Firebase not available, relying on web SDK fallback"
    );
  }

  if (firebase && !firebase.apps.length) {
    firebase.initializeApp();
    console.log("✅ Native Firebase initialized");
  }
} catch (error) {
  console.log("⚠️ Firebase initialization status:", (error as Error).message);
}

import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const preferences = useAppStore(state => state.preferences);
  const setUser = useAuthStore(state => state.setUser);
  const setRole = useAuthStore(state => state.setRole);
  const setSparkAdminRoles = useAuthStore(state => state.setSparkAdminRoles);

  // Initialize Remote Config and authentication when app starts
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Remote Config first (non-blocking)
        console.log("🚀 App: Initializing Remote Config...");
        RemoteConfigService.initialize().catch((error) => {
          console.warn("⚠️ App: Remote Config initialization failed:", error);
        });

        console.log("🚀 App: Initializing AuthService...");
        await AuthService.initialize();

        // Set up auth state listener
        const unsubscribe = AuthService.onAuthStateChanged(async (user) => {
          console.log(
            "🔐 App: Auth state changed",
            user ? user.email : "signed out"
          );
          setUser(user);

          if (user) {
            // Load user roles
            try {
              const role = await AuthService.getUserRole();
              const sparkAdminRoles = await AuthService.getSparkAdminRoles();
              setRole(role);
              setSparkAdminRoles(sparkAdminRoles);
              console.log("✅ App: User roles loaded", {
                role,
                sparkAdminRoles,
              });
            } catch (error) {
              console.error("❌ App: Error loading user roles", error);
            }
          } else {
            // Clear roles when signed out
            setRole("standard");
            setSparkAdminRoles([]);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error("❌ App: Failed to initialize AuthService", error);
      }
    };

    const unsubscribePromise = initializeServices();

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  // Initialize analytics when app starts
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        console.log("🚀 App: Initializing Analytics...");
        await ServiceFactory.ensureAnalyticsInitialized();
        console.log("✅ App: Analytics initialized");

        // Track app launch
        const AnalyticsService = ServiceFactory.getAnalyticsService();
        await AnalyticsService.trackAppLaunch();
        console.log("📊 App: Launch tracked");
      } catch (error) {
        console.error("❌ App: Failed to initialize Analytics", error);
      }
    };

    initializeAnalytics();
  }, []);

  // Hide splash screen when the root view has mounted
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Short delay to ensure render
        await SplashScreen.hideAsync();
        console.log("✅ [App.tsx] Splash screen hidden");
      } catch (e) {
        console.warn("⚠️ [App.tsx] Error hiding splash screen:", e);
      }
    };
    hideSplash();
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
    const subscription = NotificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;

        // Use navigation ref from standalone file to avoid circular dependencies
        if (navigationRef.isReady()) {
          if (data?.type === "spark-notification" && data?.sparkId) {
            // Navigate to the specific spark
            // First navigate to MySparks stack, then to the Spark screen
            (navigationRef as any).navigate("MySparks", {
              screen: "Spark",
              params: { sparkId: data.sparkId },
            });
            console.log(
              `✅ Navigated to spark ${data.sparkId} from notification`
            );
          } else if (data?.type === "activity-start" && data?.sparkId) {
            // Legacy activity notifications - navigate to spark
            (navigationRef as any).navigate("MySparks", {
              screen: "Spark",
              params: { sparkId: data.sparkId },
            });
            console.log(
              `✅ Navigated to spark ${data.sparkId} from activity notification`
            );
          }
        } else {
          console.log("⚠️ Navigation not ready yet, cannot navigate");
        }
      }
    );

    // Start listening for new feedback responses in real-time
    let feedbackListenerCleanup: (() => void) | null = null;
    const startFeedbackListener = async () => {
      try {
        const AnalyticsService = ServiceFactory.getAnalyticsService();
        const sessionInfo = AnalyticsService.getSessionInfo();
        const deviceId =
          sessionInfo.userId || sessionInfo.sessionId || "anonymous";

        console.log(
          "👂 Starting feedback response listener for device:",
          deviceId
        );
        feedbackListenerCleanup =
          FeedbackNotificationService.startListeningForNewResponses(deviceId);
      } catch (error) {
        console.error("❌ Error starting feedback listener:", error);
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
        console.error("Error updating app icon badge:", error);
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

  // Global error handlers - surface uncaught exceptions in web dev
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      const onError = (event: any) => {
        console.error(
          "Global error captured:",
          event?.error || event?.message || event
        );
      };
      const onRejection = (event: any) => {
        console.error("Unhandled promise rejection:", event?.reason || event);
      };
      window.addEventListener("error", onError);
      window.addEventListener("unhandledrejection", onRejection);
      return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
      };
    }
  }, []);

  // Global Screen Recording Listener
  useEffect(() => {
    const handleGlobalRecordingStatus = async (status: any, rawUri?: string | null) => {
      if (status === 'idle' && rawUri) {
        console.log('🎬 Recording finished, raw path:', rawUri);

        try {
          // 1. Ensure MediaLibrary permissions
          const { status: libStatus } = await MediaLibrary.requestPermissionsAsync();
          if (libStatus !== 'granted') {
            console.warn('⚠️ Media Library permission denied, keeping temporary URI.');
          }

          // 2. Persist to App Documents (so links don't break when cache clears)
          const filename = `SparkVideo_${Date.now()}.mp4`;
          const persistentUri = FileSystem.documentDirectory + filename;
          await FileSystem.copyAsync({ from: rawUri, to: persistentUri });
          console.log('✅ Video persisted to:', persistentUri);

          // 3. Finalize entry in spark store
          const { getSparkData, setSparkData, videoCapture } = useSparkStore.getState();
          const currentData = getSparkData('video');
          const videos = currentData?.videos || [];

          const newVideo = {
            id: Date.now().toString(),
            uri: persistentUri,
            source: videoCapture.isOverlayProcess ? 'overlay' : 'screen',
            script: videoCapture.script,
            status: 'editing',
            countdownSeconds: videoCapture.countdownSeconds,
            durationSeconds: videoCapture.durationSeconds,
            timestamp: Date.now(),
          };

          setSparkData('video', { videos: [newVideo, ...videos] });
          HapticFeedback.success();
        } catch (e) {
          console.error('❌ Failed to persist video:', e);
        }
      }
    };

    ScreenRecorder.addListener(handleGlobalRecordingStatus);
    return () => ScreenRecorder.removeListener(handleGlobalRecordingStatus);
  }, []);

  return (
    <>
      <AppNavigator />
      <ScreenRecordingHUD />
      <SystemBars style={preferences.theme === "dark" ? "light" : "dark"} />
    </>
  );
}
