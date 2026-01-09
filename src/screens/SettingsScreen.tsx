import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, RefreshControl, Linking, Platform, Clipboard, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSparkStore, useAppStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { NotificationService } from '../utils/notifications';
import { SettingsFeedbackSection, SettingsScrollView } from '../components/SettingsComponents';
import { AdminFeedbackManager } from '../components/AdminFeedbackManager';
import { AdminReviewsManager } from '../components/AdminReviewsManager';
import { AdminSubmissionsManager } from '../components/AdminSubmissionsManager';
import { NotificationBadge } from '../components/NotificationBadge';
import { AccountSettingsSection } from '../components/AccountSettingsSection';
import { AdminResponseService } from '../services/AdminResponseService';
import { FeedbackNotificationService } from '../services/FeedbackNotificationService';
import { SparkSubmissionAdminService } from '../services/SparkSubmissionAdminService';
import { ServiceFactory } from '../services/ServiceFactory';
import { FeedbackService } from '../services/FeedbackService';
import { getSparkById } from '../components/SparkRegistry';
import { GeminiService } from '../services/GeminiService';

export const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    sparkData,
    sparkProgress,
    userSparkIds,
    favoriteSparkIds,
    reorderUserSparks,
    removeSparkFromUser
  } = useSparkStore();

  const {
    preferences,
    setPreferences
  } = useAppStore();

  // Admin and initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAdminFeedback, setShowAdminFeedback] = useState(false);
  const [showAdminReviews, setShowAdminReviews] = useState(false);
  const [showAdminSubmissions, setShowAdminSubmissions] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [unreadReviewsCount, setUnreadReviewsCount] = useState(0);
  const [unreadSubmissionsCount, setUnreadSubmissionsCount] = useState(0);

  // Refresh unread counts periodically for admins
  useEffect(() => {
    if (!isAdmin) return;

    const refreshUnreadCounts = async () => {
      try {
        const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
        const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
        const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
        setUnreadFeedbackCount(feedbackCount);
        setUnreadReviewsCount(reviewsCount);
        setUnreadSubmissionsCount(submissionsCount);

        // Update app icon badge when admin counts change
        await FeedbackNotificationService.updateAppIconBadge();
      } catch (error) {
        console.error('Error refreshing unread counts:', error);
      }
    };

    // Refresh immediately
    refreshUnreadCounts();

    // Refresh every 5 seconds
    const interval = setInterval(refreshUnreadCounts, 5000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  // Spark management state
  const [isReordering, setIsReordering] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Debug state
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  // Gemini API Key state
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const CUSTOM_API_KEY_STORAGE_KEY = 'sparks_custom_gemini_api_key';

  // Initialize analytics service
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        console.log('🚀 SettingsScreen: Starting analytics initialization...');
        await ServiceFactory.ensureAnalyticsInitialized();
        await ServiceFactory.ensureFirebaseInitialized();
        setIsInitialized(true);
        console.log('✅ SettingsScreen: Analytics initialized successfully');

        // Track settings access
        const AnalyticsService = ServiceFactory.getAnalyticsService();
        if (AnalyticsService.trackSettingsAccess) {
          AnalyticsService.trackSettingsAccess();
        }

        // Check if current device is admin
        const adminStatus = await AdminResponseService.isAdmin();
        setIsAdmin(adminStatus);
        console.log('🔑 Admin status:', adminStatus);

        // Load unread counts for admin
        if (adminStatus) {
          const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
          const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
          const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
          setUnreadFeedbackCount(feedbackCount);
          setUnreadReviewsCount(reviewsCount);
          setUnreadSubmissionsCount(submissionsCount);
        }

        // Debug: Show current device ID
        const sessionInfo = AnalyticsService.getSessionInfo();
        console.log('🔍 Current device ID:', sessionInfo.userId);
        console.log('🔍 Session ID:', sessionInfo.sessionId);
        console.log('🔍 Analytics initialized:', sessionInfo.isInitialized);
        console.log('🔍 Analytics service type:', AnalyticsService.constructor.name);
      } catch (error) {
        console.error('❌ SettingsScreen: Analytics initialization failed:', error);
      }
    };

    initializeAnalytics();
  }, [isAdmin]);

  // Load custom API key
  useEffect(() => {
    const loadCustomApiKey = async () => {
      try {
        const key = await AsyncStorage.getItem(CUSTOM_API_KEY_STORAGE_KEY);
        setCustomApiKey(key || '');
      } catch (error) {
        console.error('Error loading custom API key:', error);
      } finally {
        setIsLoadingApiKey(false);
      }
    };
    loadCustomApiKey();
  }, []);






  const handleResetAllData = () => {
    Alert.alert(
      "Reset All Data",
      "This will permanently delete all your spark progress, scores, and preferences. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            // Clear all spark data
            Object.keys(sparkData).forEach(sparkId => {
              useSparkStore.getState().setSparkData(sparkId, {});
            });

            // Clear all progress
            useSparkStore.setState({ sparkProgress: {} });

            // Reset settings
            setPreferences({
              theme: 'system',
              soundEnabled: true,
              hapticsEnabled: true,
              dailyNotificationsEnabled: false
            });

            Alert.alert("Success", "All data has been reset.");
          }
        }
      ]
    );
  };


  // Spark management functions
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderUserSparks(index, index - 1);
      HapticFeedback.light();
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < userSparkIds.length - 1) {
      reorderUserSparks(index, index + 1);
      HapticFeedback.light();
    }
  };

  const handleRemoveSpark = (sparkId: string, sparkName: string) => {
    Alert.alert(
      'Remove Spark',
      `Are you sure you want to remove "${sparkName}" from your collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeSparkFromUser(sparkId);
            HapticFeedback.medium();
          }
        }
      ]
    );
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 SettingsScreen: Starting refresh...');

      // Refresh analytics initialization
      const AnalyticsService = ServiceFactory.getAnalyticsService();
      await AnalyticsService.initialize();

      // Refresh admin status
      const adminStatus = await AdminResponseService.isAdmin();
      setIsAdmin(adminStatus);

      // Refresh feedback data (this will be handled by SettingsFeedbackSection)
      console.log('✅ SettingsScreen: Refresh completed');

      HapticFeedback.light();
    } catch (error) {
      console.error('❌ SettingsScreen: Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getDataStats = () => {
    const totalSparks = userSparkIds.length;
    const totalProgress = Object.keys(sparkProgress).length;
    const totalFavorites = favoriteSparkIds.length;
    const totalSessions = Object.values(sparkProgress).reduce((sum, progress) => sum + progress.timesPlayed, 0);

    return { totalSparks, totalProgress, totalFavorites, totalSessions };
  };

  const checkAdminStatus = async () => {
    if (isAdmin) {
      const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
      const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
      const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
      setUnreadFeedbackCount(feedbackCount);
      setUnreadReviewsCount(reviewsCount);
      setUnreadSubmissionsCount(submissionsCount);
      await FeedbackNotificationService.updateAppIconBadge();
    }
  };

  const styles = createStyles(colors, insets);

  return (
    <View style={styles.container}>
      <SettingsScrollView onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>
            Customize your Sparks experience • v{Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </View>

        <View style={styles.feedbackSection}>
          <SettingsFeedbackSection sparkName="Sparks App" />
        </View>

        {/* Account Section */}
        <AccountSettingsSection />

        {/* Gemini API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Settings</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Some Sparks use AI powered by Google's Gemini. You can use your own API key for better control and usage limits.
          </Text>

          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => Linking.openURL('https://aistudio.google.com/app/api-keys')}
          >
            <Text style={[styles.linkButtonText, { color: colors.primary }]}>
              🔗 Create Your Own API Key
            </Text>
          </TouchableOpacity>

          <View style={styles.apiKeyContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Custom Gemini API Key (Optional)</Text>
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Leave empty to use the default key. Your custom key takes priority.
            </Text>
            {isLoadingApiKey ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
            ) : (
              <TextInput
                style={[styles.apiKeyInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter your Gemini API key"
                placeholderTextColor={colors.textSecondary}
                value={customApiKey}
                onChangeText={setCustomApiKey}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            <View style={styles.apiKeyActions}>
              <TouchableOpacity
                style={[styles.apiKeyButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    if (customApiKey.trim()) {
                      await AsyncStorage.setItem(CUSTOM_API_KEY_STORAGE_KEY, customApiKey.trim());
                      HapticFeedback.success();
                      Alert.alert('Success', 'API key saved successfully!');
                    } else {
                      await AsyncStorage.removeItem(CUSTOM_API_KEY_STORAGE_KEY);
                      HapticFeedback.success();
                      Alert.alert('Success', 'API key removed. Using default key.');
                    }
                  } catch (error) {
                    HapticFeedback.error();
                    Alert.alert('Error', 'Failed to save API key.');
                  }
                }}
              >
                <Text style={styles.apiKeyButtonText}>Save</Text>
              </TouchableOpacity>
              {customApiKey && (
                <TouchableOpacity
                  style={[styles.apiKeyButton, { backgroundColor: colors.error }]}
                  onPress={async () => {
                    Alert.alert(
                      'Remove API Key',
                      'Are you sure you want to remove your custom API key?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await AsyncStorage.removeItem(CUSTOM_API_KEY_STORAGE_KEY);
                              setCustomApiKey('');
                              HapticFeedback.success();
                              Alert.alert('Success', 'API key removed.');
                            } catch (error) {
                              HapticFeedback.error();
                              Alert.alert('Error', 'Failed to remove API key.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.apiKeyButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Debug Section - Remove after testing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Debug Info</Text>
          <Text style={styles.debugText}>Admin Status: {isAdmin ? '✅ Admin' : '❌ Not Admin'}</Text>
          {/* <Text style={styles.debugText}>Device ID: {currentDeviceId || 'Loading...'}</Text> */}
          {/* <Text style={styles.debugText}>Analytics Initialized: {isInitialized ? '✅ Yes' : '❌ No'}</Text> */}
          <Text style={styles.debugText}>Expected Device ID: device_1761186342237_3wfem84rw</Text>

          <TouchableOpacity
            style={[styles.debugButton, { marginTop: 8, marginBottom: 4, backgroundColor: '#ff6b6b' }]}
            onPress={async () => {
              try {
                // Check build type
                const Constants = await import('expo-constants');
                const env = Constants.default?.executionEnvironment || 'unknown';
                const hasNativeModules = typeof (global as any).nativeCallSyncHook !== 'undefined';

                Alert.alert(
                  'Build Type Check',
                  `Execution Environment: ${env}\nHas Native Modules: ${hasNativeModules}\n\n⚠️ If this shows "expoGo" or no native modules, scheduled notifications won't work properly!`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.debugButtonText}>🔍 Check Build Type</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.debugButton, { marginTop: 8, marginBottom: 4 }]}
            onPress={async () => {
              try {
                const { NotificationService } = await import('../utils/notifications');

                // Cancel any existing test notification
                const NotificationsModule = await import('expo-notifications');
                const Notifications = NotificationsModule.default || NotificationsModule;
                await Notifications.cancelScheduledNotificationAsync('test-notification');

                // Schedule test notification using the simplified API
                const delaySeconds = 60;
                const notificationId = await NotificationService.scheduleNotification(
                  'Test Notification',
                  `This is a test notification scheduled ${delaySeconds} seconds from now`,
                  delaySeconds,
                  'test-spark',
                  'test-notification'
                );

                if (notificationId) {
                  Alert.alert(
                    'Test Notification Scheduled',
                    `Scheduled for 1 minute from now.\n\nPut app in background to test.\n\nID: ${notificationId}`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('Error', 'Failed to schedule test notification');
                }
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.debugButtonText}>🔔 Test Notifications (1 min)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.debugButton, { marginTop: 4, marginBottom: 4 }]}
            onPress={async () => {
              try {
                const NotificationsModule = await import('expo-notifications');
                const Notifications = NotificationsModule.default || NotificationsModule;

                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                const now = new Date();

                const scheduledList = scheduled.map((n: any) => {
                  const trigger = n.trigger;
                  let triggerTime = 'unknown';
                  let isFuture = false;

                  if (trigger?.date) {
                    const date = new Date(trigger.date);
                    triggerTime = date.toLocaleString();
                    isFuture = date.getTime() > now.getTime();
                  } else if (trigger?.seconds) {
                    const futureTime = new Date(now.getTime() + trigger.seconds * 1000);
                    triggerTime = futureTime.toLocaleString();
                    isFuture = trigger.seconds > 0;
                  }

                  return {
                    id: n.identifier,
                    title: n.content?.title,
                    triggerTime,
                    isFuture,
                    trigger: JSON.stringify(trigger),
                  };
                });

                const futureCount = scheduledList.filter((n: any) => n.isFuture).length;

                Alert.alert(
                  'Scheduled Notifications',
                  `Total: ${scheduled.length}\nFuture: ${futureCount}\n\n${scheduledList.slice(0, 5).map((n: any) =>
                    `${n.title}\n  ${n.triggerTime} ${n.isFuture ? '✅' : '❌'}`
                  ).join('\n\n')}${scheduled.length > 5 ? '\n\n...' : ''}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.debugButtonText}>Check Scheduled Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.debugButton, { marginTop: 4, marginBottom: 4 }]}
            onPress={async () => {
              try {
                const NotificationsModule = await import('expo-notifications');
                const Notifications = NotificationsModule.default || NotificationsModule;

                // Get current count
                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                const count = scheduled.length;

                if (count === 0) {
                  Alert.alert('No Notifications', 'There are no scheduled notifications to clear.');
                  return;
                }

                // Confirm before clearing
                Alert.alert(
                  'Clear All Notifications',
                  `This will cancel all ${count} scheduled notification${count !== 1 ? 's' : ''}. This action cannot be undone.\n\nAre you sure?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await Notifications.cancelAllScheduledNotificationsAsync();
                          Alert.alert(
                            'Success',
                            `Cleared ${count} scheduled notification${count !== 1 ? 's' : ''}.`,
                            [{ text: 'OK' }]
                          );
                        } catch (error) {
                          Alert.alert(
                            'Error',
                            `Failed to clear notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
              }
            }}
          >
            <Text style={styles.debugButtonText}>🗑️ Clear All Scheduled Notifications</Text>
          </TouchableOpacity>

          {currentDeviceId && !isAdmin && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                Alert.alert(
                  'Add Device to Admin List',
                  `Add this device ID to the admin list?\n\n${currentDeviceId}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Add',
                      onPress: async () => {
                        // Open email client with device ID
                        const subject = encodeURIComponent('DEVICE_IDS');
                        const body = encodeURIComponent(currentDeviceId);
                        const mailtoUrl = `mailto:matt@dyor.com?subject=${subject}&body=${body}`;

                        try {
                          // Try to open email client
                          const canOpen = await Linking.canOpenURL(mailtoUrl);
                          if (canOpen) {
                            Linking.openURL(mailtoUrl).catch((err) => {
                              console.error('Error opening email client:', err);
                              // Fallback: Copy device ID to clipboard
                              Clipboard.setString(currentDeviceId || '');
                              Alert.alert(
                                'Email Client Not Available',
                                `Could not open email client. Your device ID has been copied to clipboard.\n\nPlease send an email to matt@dyor.com with:\nSubject: DEVICE_IDS\nBody: ${currentDeviceId}\n\nOr paste the device ID from your clipboard.`,
                                [{ text: 'OK' }]
                              );
                            });
                          } else {
                            // Email client not available - copy to clipboard instead
                            Clipboard.setString(currentDeviceId || '');
                            Alert.alert(
                              'Email Client Not Available',
                              `No email client detected. Your device ID has been copied to clipboard.\n\nPlease send an email to matt@dyor.com with:\nSubject: DEVICE_IDS\nBody: ${currentDeviceId}\n\nOr paste the device ID from your clipboard.`,
                              [{ text: 'OK' }]
                            );
                          }
                        } catch (error) {
                          // Fallback: Copy device ID to clipboard
                          Clipboard.setString(currentDeviceId || '');
                          Alert.alert(
                            'Email Client Not Available',
                            `Could not open email client. Your device ID has been copied to clipboard.\n\nPlease send an email to matt@dyor.com with:\nSubject: DEVICE_IDS\nBody: ${currentDeviceId}\n\nOr paste the device ID from your clipboard.`,
                            [{ text: 'OK' }]
                          );
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.debugButtonText}>Add This Device to Admin List</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔑 Admin Tools</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                setShowAdminFeedback(true);
                // Refresh unread counts when opening
                const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
                const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
                const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
                setUnreadFeedbackCount(feedbackCount);
                setUnreadReviewsCount(reviewsCount);
                setUnreadSubmissionsCount(submissionsCount);
              }}
            >
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonText}>📢 Manage Feedback</Text>
                {unreadFeedbackCount > 0 && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>
                      {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                setShowAdminReviews(true);
                // Refresh unread counts when opening
                const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
                const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
                const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
                setUnreadFeedbackCount(feedbackCount);
                setUnreadReviewsCount(reviewsCount);
                setUnreadSubmissionsCount(submissionsCount);
              }}
            >
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonText}>⭐ View Recent Reviews</Text>
                {unreadReviewsCount > 0 && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>
                      {unreadReviewsCount > 99 ? '99+' : unreadReviewsCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                setShowAdminSubmissions(true);
                // Refresh unread counts when opening
                const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
                const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
                const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
                setUnreadFeedbackCount(feedbackCount);
                setUnreadReviewsCount(reviewsCount);
                setUnreadSubmissionsCount(submissionsCount);
              }}
            >
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonText}>💡 Spark Submissions</Text>
                {unreadSubmissionsCount > 0 && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>
                      {unreadSubmissionsCount > 99 ? '99+' : unreadSubmissionsCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Feel vibrations on interactions</Text>
            </View>
            <Switch
              value={preferences.hapticsEnabled}
              onValueChange={(value) => {
                HapticFeedback.light();
                setPreferences({ hapticsEnabled: value });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={preferences.hapticsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingDescription}>Play audio feedback</Text>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={(value) => {
                HapticFeedback.light();
                setPreferences({ soundEnabled: value });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={preferences.soundEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

        </View>

        {/* Spark Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Sparks</Text>
            {userSparkIds.length > 1 && (
              <TouchableOpacity
                style={[styles.reorderButton, { backgroundColor: isReordering ? colors.primary : colors.secondary }]}
                onPress={() => setIsReordering(!isReordering)}
              >
                <Text style={[styles.reorderButtonText, { color: colors.background }]}>
                  {isReordering ? 'Done' : 'Reorder'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {userSparkIds.length === 0 ? (
            <Text style={styles.emptyText}>No sparks in your collection yet</Text>
          ) : (
            <View style={styles.sparkList}>
              {userSparkIds.map((sparkId, index) => {
                const spark = getSparkById(sparkId);
                if (!spark) return null;

                return (
                  <View key={sparkId} style={styles.sparkCard}>
                    <View style={styles.sparkCardContent}>
                      <View style={styles.sparkIconContainer}>
                        <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                        <NotificationBadge sparkId={sparkId} size="small" />
                      </View>
                      <View style={styles.sparkInfo}>
                        <Text style={styles.sparkTitle}>{spark.metadata.title}</Text>
                        <Text style={styles.sparkDescription}>{spark.metadata.description}</Text>
                      </View>
                    </View>

                    <View style={styles.sparkActions}>
                      {isReordering && (
                        <View style={styles.reorderControls}>
                          <TouchableOpacity
                            style={[styles.reorderButton, { opacity: index > 0 ? 1 : 0.3 }]}
                            onPress={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <Text style={styles.reorderButtonText}>↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.reorderButton, { opacity: index < userSparkIds.length - 1 ? 1 : 0.3 }]}
                            onPress={() => handleMoveDown(index)}
                            disabled={index === userSparkIds.length - 1}
                          >
                            <Text style={styles.reorderButtonText}>↓</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: colors.error }]}
                        onPress={() => handleRemoveSpark(sparkId, spark.metadata.title)}
                      >
                        <Text style={[styles.removeButtonText, { color: colors.background }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleResetAllData}
          >
            <Text style={[styles.actionButtonText, styles.dangerText]}>🗑️ Reset All Data</Text>
          </TouchableOpacity>

          <Text style={styles.dangerWarning}>
            This will permanently delete all your progress, scores, and preferences.
          </Text>
        </View>

        {/* Admin Feedback Manager Modal */}
        <AdminFeedbackManager
          visible={showAdminFeedback}
          onClose={async () => {
            setShowAdminFeedback(false);
            // Refresh unread counts when closing
            if (isAdmin) {
              const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
              const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
              const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
              setUnreadFeedbackCount(feedbackCount);
              setUnreadReviewsCount(reviewsCount);
              setUnreadSubmissionsCount(submissionsCount);
              // Update app icon badge
              await FeedbackNotificationService.updateAppIconBadge();
            }
          }}
        />

        {/* Admin Reviews Manager Modal */}
        <AdminReviewsManager
          visible={showAdminReviews}
          onClose={async () => {
            setShowAdminReviews(false);
            // Refresh unread counts when closing
            if (isAdmin) {
              const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
              const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
              const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
              setUnreadFeedbackCount(feedbackCount);
              setUnreadReviewsCount(reviewsCount);
              setUnreadSubmissionsCount(submissionsCount);
              // Update app icon badge
              await FeedbackNotificationService.updateAppIconBadge();
            }
          }}
        />

        {/* Admin Submissions Manager Modal */}
        <AdminSubmissionsManager
          visible={showAdminSubmissions}
          onClose={async () => {
            setShowAdminSubmissions(false);
            // Refresh unread counts when closing
            if (isAdmin) {
              const feedbackCount = await AdminResponseService.getUnreadFeedbackCount();
              const reviewsCount = await AdminResponseService.getUnreadReviewsCount();
              const submissionsCount = await SparkSubmissionAdminService.getUnreadSubmissionsCount();
              setUnreadFeedbackCount(feedbackCount);
              setUnreadReviewsCount(reviewsCount);
              setUnreadSubmissionsCount(submissionsCount);
              // Update app icon badge
              await FeedbackNotificationService.updateAppIconBadge();
            }
          }}
        />
      </SettingsScrollView>
    </View>
  );
};

const createStyles = (colors: any, insets: { top: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: Math.max(insets.top + 20, 40),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: colors.error || '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
  dangerText: {
    color: '#fff',
  },
  dangerWarning: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Spark management styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reorderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  sparkList: {
    gap: 12,
  },
  sparkCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sparkCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sparkIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  sparkIcon: {
    fontSize: 24,
  },
  sparkInfo: {
    flex: 1,
  },
  sparkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sparkDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sparkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reorderControls: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  debugButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  linkButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  apiKeyContainer: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 14,
    padding: 12,
    textAlign: 'center',
  },
  apiKeyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  apiKeyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  apiKeyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});