import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

const STORAGE_KEY = 'spanish_friend_user_name';

interface SpanishFriendSettingsProps {
  conversationMode: '1-friend' | '2-friends';
  userName: string;
  onSave: (conversationMode: '1-friend' | '2-friends', userName: string) => void;
  onClose: () => void;
}

const SpanishFriendSettings: React.FC<SpanishFriendSettingsProps> = ({
  conversationMode,
  userName,
  onSave,
  onClose
}) => {
  const { colors } = useTheme();
  const [editingMode, setEditingMode] = useState<'1-friend' | '2-friends'>(conversationMode);
  const [editingName, setEditingName] = useState(userName);

  const handleSave = async () => {
    const name = editingName.trim();
    if (name) {
      onSave(editingMode, name);
      onClose();
    }
  };

  const settingsStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    scrollContent: {
      flex: 1,
    },
    settingSection: {
      marginBottom: 32,
    },
    settingLabel: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    modeButton: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
    },
    modeButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    modeButtonInactive: {
      borderColor: colors.border,
    },
    modeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    nameInput: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 18,
    },
    voiceInfo: {
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'center',
      marginTop: 16,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 20,
      paddingBottom: 20,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
  });

  return (
    <View style={settingsStyles.container}>
      <View style={settingsStyles.header}>
        <Text style={settingsStyles.title}>Spanish Friend Settings</Text>
        <Text style={settingsStyles.subtitle}>Customize your conversation experience</Text>
      </View>

      <ScrollView style={settingsStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={settingsStyles.settingSection}>
          <Text style={settingsStyles.settingLabel}>Conversation Mode</Text>
          <TouchableOpacity
            style={[
              settingsStyles.modeButton,
              editingMode === '1-friend' ? settingsStyles.modeButtonActive : settingsStyles.modeButtonInactive
            ]}
            onPress={() => setEditingMode('1-friend')}
          >
            <Text style={[settingsStyles.modeButtonText, { color: editingMode === '1-friend' ? colors.primary : colors.text }]}>
              1 Amigo - Tú hablas, Ana responde
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              settingsStyles.modeButton,
              editingMode === '2-friends' ? settingsStyles.modeButtonActive : settingsStyles.modeButtonInactive
            ]}
            onPress={() => setEditingMode('2-friends')}
          >
            <Text style={[settingsStyles.modeButtonText, { color: editingMode === '2-friends' ? colors.primary : colors.text }]}>
              2 Amigos - Ana y Miguel hablan
            </Text>
          </TouchableOpacity>
        </View>

        <View style={settingsStyles.settingSection}>
          <Text style={settingsStyles.settingLabel}>Your Name</Text>
          <TextInput
            style={settingsStyles.nameInput}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={settingsStyles.settingSection}>
          <Text style={settingsStyles.settingLabel}>Voice Configuration</Text>
          <Text style={settingsStyles.voiceInfo}>
            Ana: 🇪🇸 España (Femenina){editingMode === '2-friends' ? `\n${editingName || 'Miguel'}: 🇲🇽 México (Masculina)` : ''}
          </Text>
        </View>
      </ScrollView>

      <View style={settingsStyles.buttons}>
        <TouchableOpacity style={settingsStyles.cancelButton} onPress={onClose}>
          <Text style={settingsStyles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={settingsStyles.saveButton} onPress={handleSave}>
          <Text style={settingsStyles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface SpanishFriendSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const SpanishFriendSpark: React.FC<SpanishFriendSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
}) => {
  const { colors } = useTheme();
  const [audioSessionSet, setAudioSessionSet] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [conversationMode, setConversationMode] = useState<'1-friend' | '2-friends'>('1-friend');
  const [userName, setUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInputText, setNameInputText] = useState('');

  // Storage functions for user name
  const loadStoredName = async () => {
    try {
      const storedName = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedName) {
        setUserName(storedName);
      }
    } catch (error) {
      console.error('Error loading stored name:', error);
    }
  };

  const saveNameToStorage = async (name: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, name);
    } catch (error) {
      console.error('Error saving name to storage:', error);
    }
  };

  // Beach planning conversation - function to get conversation with dynamic name
  const getConversation = () => [
    { spanish: `¡Hola ${userName || 'Miguel'}! ¿Qué tal tu día?`, english: `Hi ${userName || 'Miguel'}! How's your day?`, speaker: 'friend1' },
    { spanish: "¡Muy bien! Hace mucho calor hoy.", english: "Very good! It's so hot today.", speaker: 'friend2' },
    { spanish: "¡Exacto! ¿Te apetece ir a la playa?", english: "Exactly! Do you feel like going to the beach?", speaker: 'friend1' },
    { spanish: "¡Me encanta la idea! ¿A qué hora vamos?", english: "I love the idea! What time should we go?", speaker: 'friend2' },
    { spanish: "¿Qué tal a las dos? Así evitamos las multitudes.", english: "How about at two? That way we avoid the crowds.", speaker: 'friend1' },
    { spanish: "Perfecto. ¿Traigo algo de comer?", english: "Perfect. Should I bring something to eat?", speaker: 'friend2' },
    { spanish: "Sí, yo llevo las bebidas y el protector solar.", english: "Yes, I'll bring the drinks and sunscreen.", speaker: 'friend1' },
    { spanish: "Genial. ¿Vamos a nadar o solo a relajarnos?", english: "Great. Are we going to swim or just relax?", speaker: 'friend2' },
    { spanish: "¡Las dos cosas! El agua está perfecta.", english: "Both! The water is perfect.", speaker: 'friend1' },
    { spanish: "¡Perfecto! Nos vemos en la playa entonces.", english: "Perfect! See you at the beach then.", speaker: 'friend2' }
  ];

  const getCurrentPhrase = () => getConversation()[currentPhraseIndex];

  const setupAudioSession = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true, // This is key for iOS silent mode
      });
      setAudioSessionSet(true);
    } catch (error) {
      console.error('Audio session setup failed:', error);
    }
  };

  const speakSpanish = async (text: string, speaker: 'friend1' | 'friend2' = 'friend1') => {
    try {
      // Ensure audio session is set up
      if (!audioSessionSet) {
        await setupAudioSession();
      }

      // Stop any current speech first
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        Speech.stop();
      }

      // Ana (friend1) uses female voice (Spain Spanish), Miguel (friend2) uses male voice (Mexico Spanish)
      const voiceSettings = speaker === 'friend1'
        ? { language: 'es-ES', pitch: 1.1, rate: 0.7 } // Female - Spain Spanish, higher pitch
        : { language: 'es-MX', pitch: 0.8, rate: 0.7 }; // Male - Mexico Spanish, lower pitch

      Speech.speak(text, {
        language: voiceSettings.language,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: 1.0,
        onStart: () => {
          HapticFeedback.light();
        },
        onDone: () => {
          HapticFeedback.light();
        },
        onError: (error) => {
          console.error('Speech error:', error);
        },
      });
    } catch (error) {
      console.error('Error in speakSpanish:', error);
    }
  };

  // Set up audio session and load stored name when component loads
  useEffect(() => {
    setupAudioSession();
    loadStoredName();
  }, []);

  // Check for name and play first phrase on component load
  useEffect(() => {
    if (!userName) {
      setShowNameInput(true);
    } else {
      // Auto-play first phrase when component loads and name is set
      setTimeout(() => {
        const firstPhrase = getConversation()[0];
        if (conversationMode === '2-friends' || firstPhrase.speaker === 'friend1') {
          speakSpanish(firstPhrase.spanish, firstPhrase.speaker as 'friend1' | 'friend2');
        }
      }, 500);
    }
  }, [userName]);

  const handleContinue = () => {
    const conversation = getConversation();
    const nextIndex = (currentPhraseIndex + 1) % conversation.length;
    setCurrentPhraseIndex(nextIndex);
    const nextPhrase = conversation[nextIndex];

    if (conversationMode === '2-friends') {
      // In 2-friends mode, phone speaks with different voices for each character
      speakSpanish(nextPhrase.spanish, nextPhrase.speaker as 'friend1' | 'friend2');
    }
    // In 1-friend mode, only phone speaks for friend1 (Ana), user speaks for friend2 (Miguel)
    else if (nextPhrase.speaker === 'friend1') {
      speakSpanish(nextPhrase.spanish, 'friend1');
    }

    HapticFeedback.light();
  };

  const handleRepeat = () => {
    const currentPhrase = getCurrentPhrase();
    if (conversationMode === '2-friends') {
      speakSpanish(currentPhrase.spanish, currentPhrase.speaker as 'friend1' | 'friend2');
    } else if (currentPhrase.speaker === 'friend1') {
      speakSpanish(currentPhrase.spanish, 'friend1');
    }
  };



  const getCurrentSpeakerInfo = () => {
    const currentPhrase = getCurrentPhrase();
    const displayName = userName || 'Miguel';
    if (conversationMode === '1-friend') {
      return currentPhrase.speaker === 'friend1' ? 'Ana (Phone)' : `${displayName} (Tú)`;
    } else {
      return currentPhrase.speaker === 'friend1' ? 'Ana' : displayName;
    }
  };

  const shouldShowRepeatButton = () => {
    if (conversationMode === '2-friends') return true;
    const currentPhrase = getCurrentPhrase();
    return currentPhrase.speaker === 'friend1'; // Only show repeat for phone's phrases in 1-friend mode
  };

  const handleNameSubmit = async () => {
    if (nameInputText.trim()) {
      const newName = nameInputText.trim();
      setUserName(newName);
      await saveNameToStorage(newName);
      setShowNameInput(false);
      setNameInputText('');
    }
  };

  const handleSettingsSave = async (newMode: '1-friend' | '2-friends', newName: string) => {
    setConversationMode(newMode);
    setUserName(newName);
    await saveNameToStorage(newName);
  };


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    greetingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 40,
      marginBottom: 40,
    },
    spanishText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    englishText: {
      fontSize: 24,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    buttonContainer: {
      paddingBottom: 20,
    },
    repeatButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      alignItems: 'center',
    },
    repeatButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    speakerInfo: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    statusText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressText: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 14,
      color: colors.textSecondary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    continueButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    nameInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    nameInput: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
    },
    nameSubmitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    nameSubmitText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    nameInputModal: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 30,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    modalNameInput: {
      width: '100%',
      backgroundColor: colors.background,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalSubmitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
    },
    modalSubmitText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <SpanishFriendSettings
        conversationMode={conversationMode}
        userName={userName}
        onSave={handleSettingsSave}
        onClose={onCloseSettings || (() => {})}
      />
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Spanish Friend</Text>
        <Text style={styles.subtitle}>Ana y Miguel planean ir a la playa</Text>
      </View>

      <View style={styles.greetingContainer}>
        <Text style={styles.spanishText}>{getCurrentPhrase().spanish}</Text>
        <Text style={styles.englishText}>{getCurrentPhrase().english}</Text>
        <Text style={styles.speakerInfo}>{getCurrentSpeakerInfo()}</Text>
      </View>

      <Text style={styles.progressText}>
        Phrase {currentPhraseIndex + 1} of {getConversation().length}
      </Text>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
          {shouldShowRepeatButton() && (
            <TouchableOpacity style={styles.repeatButton} onPress={handleRepeat}>
              <Text style={styles.repeatButtonText}>Repetir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Name Input Modal for First Visit */}
      <Modal visible={showNameInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.nameInputModal}>
            <Text style={styles.modalTitle}>¡Bienvenido!</Text>
            <Text style={styles.modalSubtitle}>Para personalizar tu experiencia, ¿cuál es tu nombre?</Text>
            <TextInput
              style={styles.modalNameInput}
              value={nameInputText}
              onChangeText={setNameInputText}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onSubmitEditing={handleNameSubmit}
            />
            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleNameSubmit}>
              <Text style={styles.modalSubmitText}>Comenzar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};