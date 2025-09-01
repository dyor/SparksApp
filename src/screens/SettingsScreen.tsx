import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useSparkStore } from '../store';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

export const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  
  const { 
    sparkData, 
    sparkProgress, 
    userSparkIds, 
    favoriteSparkIds 
  } = useSparkStore();
  
  const {
    hapticEnabled,
    soundEnabled,
    darkMode,
    animations,
    notifications,
    toggleHaptic,
    toggleSound,
    toggleDarkMode,
    toggleAnimations,
    toggleNotifications,
    resetAllSettings
  } = useSettingsStore();

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
            resetAllSettings();
            
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
      settings: {
        hapticEnabled,
        soundEnabled,
        darkMode,
        animations,
        notifications
      },
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Text style={styles.settingDescription}>Feel vibrations on interactions</Text>
          </View>
          <Switch
            value={hapticEnabled}
            onValueChange={() => {
              HapticFeedback.light();
              toggleHaptic();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={hapticEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <Text style={styles.settingDescription}>Play audio feedback</Text>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={() => {
              HapticFeedback.light();
              toggleSound();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Use dark theme</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={() => {
              HapticFeedback.medium();
              toggleDarkMode();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={darkMode ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Animations</Text>
            <Text style={styles.settingDescription}>Enable smooth transitions</Text>
          </View>
          <Switch
            value={animations}
            onValueChange={() => {
              HapticFeedback.light();
              toggleAnimations();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={animations ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>Receive app notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={() => {
              HapticFeedback.light();
              toggleNotifications();
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={notifications ? '#fff' : '#f4f3f4'}
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