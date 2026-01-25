import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';

interface AISettingsNoteProps {
  sparkName: string;
}

export const AISettingsNote: React.FC<AISettingsNoteProps> = ({ sparkName }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dismissed = useAppStore((state) => state.preferences.dismissedAISettingsNote);
  const setPreferences = useAppStore((state) => state.setPreferences);

  if (dismissed) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🤖 AI-Powered</Text>
        <TouchableOpacity
          onPress={() => setPreferences({ dismissedAISettingsNote: true })}
          style={styles.dismissButton}
        >
          <Text style={[styles.dismissText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {sparkName} uses AI powered by Google's Gemini. You can set your own API key in Settings for better control and usage limits.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => {
          // Navigate to Settings screen
          (navigation as any).navigate('Settings');
        }}
      >
        <Text style={styles.buttonText}>Go to Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

