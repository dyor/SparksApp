import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSparkStore, useAppStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { NotificationService } from '../utils/notifications';
import { SettingsFeedbackSection } from '../components/SettingsComponents';

export const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  
  const { 
    sparkData, 
    sparkProgress, 
    userSparkIds, 
    favoriteSparkIds 
  } = useSparkStore();
  
  const {
    preferences,
    setPreferences
  } = useAppStore();

  // Handle daily notification toggle
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      await NotificationService.scheduleDailyNotification();
    } else {
      await NotificationService.cancelDailyNotification();
    }
    setPreferences({ dailyNotificationsEnabled: enabled });
    HapticFeedback.light();
  };

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

  const handleExportData = () => {
    const exportData = {
      sparkData,
      sparkProgress,
      userSparkIds,
      favoriteSparkIds,
      settings: preferences,
      exportedAt: new Date().toISOString(),
      version: "1.0.0"
    };

    Alert.alert(
      "Data Export",
      `Your data has been prepared for export. In a full app, this would be saved to your device or shared.\n\nData size: ${JSON.stringify(exportData).length} characters`,
      [{ text: "OK" }]
    );
  };

  const getDataStats = () => {
    const totalSparks = userSparkIds.length;
    const totalProgress = Object.keys(sparkProgress).length;
    const totalFavorites = favoriteSparkIds.length;
    const totalSessions = Object.values(sparkProgress).reduce((sum, progress) => sum + progress.timesPlayed, 0);

    return { totalSparks, totalProgress, totalFavorites, totalSessions };
  };

  const stats = getDataStats();

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>Customize your Sparks experience</Text>
      </View>

      <View style={styles.feedbackSection}>
        <SettingsFeedbackSection sparkName="Sparks App" />
      </View>

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

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Daily Spark Reminders</Text>
            <Text style={styles.settingDescription}>Get notified at 8 AM to explore new sparks</Text>
          </View>
          <Switch
            value={preferences.dailyNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={preferences.dailyNotificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalSparks}</Text>
            <Text style={styles.statLabel}>My Sparks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalFavorites}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalProgress}</Text>
            <Text style={styles.statLabel}>With Progress</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
          <Text style={styles.actionButtonText}>📤 Export Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.warning || '#FF9500' }]} 
          onPress={async () => {
            await NotificationService.sendTestNotification();
            Alert.alert('Test Sent', 'Check for the test notification in a few seconds!');
          }}
        >
          <Text style={styles.actionButtonText}>🔔 Test Notification</Text>
        </TouchableOpacity>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Built with</Text>
          <Text style={styles.aboutValue}>React Native & Expo</Text>
        </View>
        
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Storage</Text>
          <Text style={styles.aboutValue}>AsyncStorage (Local)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
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
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutLabel: {
    fontSize: 16,
    color: '#666',
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});