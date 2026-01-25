import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { navigationRef } from '../navigation/navigationRef';
import { useAppStore } from '../store/appStore';
import { Ionicons } from '@expo/vector-icons';

interface AISettingsNoteProps {
  sparkName: string;
}

export const AISettingsNote: React.FC<AISettingsNoteProps> = ({ sparkName }) => {
  const { colors } = useTheme();
  const { preferences, setPreferences } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const accents = [
    { id: 'default', label: 'Default', icon: '👤' },
    { id: 'british', label: 'British', icon: '🇬🇧' },
    { id: 'texan', label: 'Texan', icon: '🤠' },
    { id: 'canadian', label: 'Canadian', icon: '🇨🇦' },
    { id: 'east-indian', label: 'Indian', icon: '🇮🇳' },
    { id: 'australian', label: 'Aussie', icon: '🇦🇺' },
    { id: 'scottish', label: 'Scottish', icon: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    { id: 'southern-blues-male', label: 'Blues (Male)', icon: '👴🎸' },
    { id: 'southern-blues-female', label: 'Blues (Female)', icon: '👵🎙️' },
    { id: 'chipmunk', label: 'Chipmunk', icon: '🐿️' },
    { id: 'crooner', label: 'Crooner', icon: '🍸🎙️' },
    { id: 'neil-young', label: 'Neil Young', icon: '🌲🎸' },
    { id: 'stevie-nicks', label: 'Stevie Nicks', icon: '🕊️🌙' },
    { id: 'bob-dylan', label: 'Bob Dylan', icon: ' harmonica 🎶' },
    { id: 'patsy-cline', label: 'Patsy Cline', icon: '👗🎵' },
    { id: 'hank-williams', label: 'Hank Williams', icon: '🤠🎸' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 12 : 0 }}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
          🤖 AI Accents & Settings {preferences.aiVoiceAccent !== 'default' && `(${accents.find(a => a.id === preferences.aiVoiceAccent)?.label})`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              if (navigationRef.isReady()) {
                navigationRef.navigate('Settings' as any);
              }
            }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Choose the accent for AI-generated songs and voices.
          </Text>

          <View style={styles.accentList}>
            {accents.map((accent) => (
              <TouchableOpacity
                key={accent.id}
                style={[
                  styles.accentItem,
                  { borderColor: colors.border },
                  preferences.aiVoiceAccent === accent.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setPreferences({ aiVoiceAccent: accent.id })}
              >
                <Text style={styles.accentIcon}>{accent.icon}</Text>
                <Text style={[
                  styles.accentLabel,
                  { color: colors.textSecondary },
                  preferences.aiVoiceAccent === accent.id && { color: '#fff', fontWeight: 'bold' }
                ]}>
                  {accent.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </>
      )}
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    opacity: 0.8,
  },
  accentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  accentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  accentIcon: {
    fontSize: 14,
  },
  accentLabel: {
    fontSize: 12,
  },
});

