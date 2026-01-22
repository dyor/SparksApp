import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { useSparkStore } from '../store';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsInput,
  SaveCancelButtons,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';
import { CelebrationOverlay, CelebrationOverlayRef } from '../components/CelebrationOverlay';

interface SpanishFriendData {
  conversationMode: '1-friend' | '2-friends';
  userName: string;
}

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

  const handleSave = () => {
    onSave(editingMode, editingName.trim());
    onClose();
  };

  const styles = StyleSheet.create({
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
  });

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Spanish Friend Settings"
          subtitle="Customize your conversation experience"
        />

        <SettingsFeedbackSection sparkName="Spanish Friend" sparkId="spanish-friend" />

        <SettingsSection title="Conversation Mode">
          <TouchableOpacity
            style={[
              styles.modeButton,
              editingMode === '1-friend' ? styles.modeButtonActive : styles.modeButtonInactive
            ]}
            onPress={() => setEditingMode('1-friend')}
          >
            <Text style={[styles.modeButtonText, { color: editingMode === '1-friend' ? colors.primary : colors.text }]}>
              1 Amigo - Tú hablas, Avery responde
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              editingMode === '2-friends' ? styles.modeButtonActive : styles.modeButtonInactive
            ]}
            onPress={() => setEditingMode('2-friends')}
          >
            <Text style={[styles.modeButtonText, { color: editingMode === '2-friends' ? colors.primary : colors.text }]}>
              2 Amigos - Avery y Isaac hablan
            </Text>
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title="Your Name">
          <SettingsInput
            placeholder="Enter your name"
            value={editingName}
            onChangeText={setEditingName}
          />
        </SettingsSection>

        <SettingsSection title="Voice Configuration">
          <Text style={styles.voiceInfo}>
            Avery: 🇪🇸 España (Femenina){editingMode === '2-friends' ? `\n${editingName || 'Isaac'}: 🇲🇽 México (Masculina)` : ''}
          </Text>
        </SettingsSection>

        <SaveCancelButtons onSave={handleSave} onCancel={onClose} />
      </SettingsScrollView>
    </SettingsContainer>
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
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData, isHydrated } = useSparkStore();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [audioSessionSet, setAudioSessionSet] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const greetingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [conversationMode, setConversationMode] = useState<'1-friend' | '2-friends'>('1-friend');
  const [userName, setUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInputText, setNameInputText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const celebrationRef = React.useRef<CelebrationOverlayRef>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Load data from useSparkStore
  useEffect(() => {
    if (isHydrated && !dataLoaded) {
      const storedData = getSparkData<SpanishFriendData>('spanish-friend');
      if (storedData) {
        if (storedData.conversationMode) setConversationMode(storedData.conversationMode);
        if (storedData.userName) setUserName(storedData.userName);
      }
      setDataLoaded(true);
    }
  }, [isHydrated, dataLoaded]);

  // Save data to useSparkStore
  useEffect(() => {
    if (!dataLoaded) return;
    setSparkData('spanish-friend', {
      conversationMode,
      userName
    });
  }, [conversationMode, userName, dataLoaded]);


  // Beach planning conversation - function to get conversation with dynamic name
  const getConversation = () => [
    { spanish: `¡Hola ${userName || 'Isaac'}! ¿Qué tal tu día?`, english: `Hi ${userName || 'Isaac'}! How's your day?`, speaker: 'friend1' },
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

      // Avery (friend1) uses female voice (Spain Spanish), Isaac (friend2) uses male voice (Mexico Spanish)
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

  // Set up audio session when component loads
  useEffect(() => {
    setupAudioSession();

    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current);
      }
      Speech.stop();
    };
  }, []);

  // Check for name and play first phrase after loading is complete
  useEffect(() => {
    if (dataLoaded) {
      if (!userName) {
        setShowNameInput(true);
      } else {
        // Auto-play first phrase when component loads and name is set
        if (greetingTimerRef.current) {
          clearTimeout(greetingTimerRef.current);
        }
        greetingTimerRef.current = setTimeout(() => {
          const firstPhrase = getConversation()[0];
          if (conversationMode === '2-friends' || firstPhrase.speaker === 'friend1') {
            speakSpanish(firstPhrase.spanish, firstPhrase.speaker as 'friend1' | 'friend2');
          }
          greetingTimerRef.current = null;
        }, 500);
      }
    }
  }, [userName, conversationMode, dataLoaded]);

  useEffect(() => {
    if (isFinished) {
      celebrationRef.current?.triggerConfetti();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      HapticFeedback.success();
    }
  }, [isFinished]);

  const handleContinue = () => {
    const conversation = getConversation();
    if (currentPhraseIndex === conversation.length - 1) {
      setIsFinished(true);
      return;
    }

    const nextIndex = currentPhraseIndex + 1;
    setCurrentPhraseIndex(nextIndex);
    const nextPhrase = conversation[nextIndex];

    if (conversationMode === '2-friends') {
      // In 2-friends mode, phone speaks with different voices for each character
      speakSpanish(nextPhrase.spanish, nextPhrase.speaker as 'friend1' | 'friend2');
    }
    // In 1-friend mode, only phone speaks for friend1 (Avery), user speaks for friend2 (Isaac)
    else if (nextPhrase.speaker === 'friend1') {
      speakSpanish(nextPhrase.spanish, 'friend1');
    }

    HapticFeedback.light();
  };

  const handleRestart = () => {
    setCurrentPhraseIndex(0);
    setIsFinished(false);
    fadeAnim.setValue(0);
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
    const displayName = userName || 'Isaac';
    if (conversationMode === '1-friend') {
      return currentPhrase.speaker === 'friend1' ? 'Avery (Phone)' : `${displayName} (Tú)`;
    } else {
      return currentPhrase.speaker === 'friend1' ? 'Avery' : displayName;
    }
  };

  const shouldShowRepeatButton = () => {
    if (conversationMode === '2-friends') return true;
    const currentPhrase = getCurrentPhrase();
    return currentPhrase.speaker === 'friend1'; // Only show repeat for phone's phrases in 1-friend mode
  };

  const handleNameSubmit = () => {
    if (nameInputText.trim()) {
      const newName = nameInputText.trim();
      setUserName(newName);
      setShowNameInput(false);
      setNameInputText('');
      HapticFeedback.success();
    }
  };

  const handleSettingsSave = (newMode: '1-friend' | '2-friends', newName: string) => {
    setConversationMode(newMode);
    setUserName(newName);
    HapticFeedback.success();
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
    },
    modalScrollContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      minHeight: '100%',
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
    modalCloseButton: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      marginTop: 12,
    },
    modalCloseText: {
      fontSize: 16,
      fontWeight: '500',
    },
    celebrationOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface + 'F0',
      zIndex: 100,
      padding: 40,
    },
    celebrationTitle: {
      fontSize: 42,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 16,
    },
    celebrationText: {
      fontSize: 20,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 28,
    },
    restartButton: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 40,
      borderRadius: 16,
      width: '100%',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    restartButtonText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
  });

  if (showSettings) {
    return (
      <SpanishFriendSettings
        conversationMode={conversationMode}
        userName={userName}
        onSave={handleSettingsSave}
        onClose={onCloseSettings || (() => { })}
      />
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Spanish Friend</Text>
        <Text style={styles.subtitle}>Avery y Isaac planean ir a la playa</Text>
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.modalSubmitButton} onPress={handleNameSubmit}>
                <Text style={styles.modalSubmitText}>Comenzar</Text>
              </TouchableOpacity>
              {onCloseSettings && (
                <TouchableOpacity
                  style={[styles.modalCloseButton, { borderColor: colors.border }]}
                  onPress={() => {
                    HapticFeedback.light();
                    onCloseSettings();
                  }}
                >
                  <Text style={[styles.modalCloseText, { color: colors.text }]}>Close Spark</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {isFinished && (
        <Animated.View style={[styles.celebrationOverlay, { opacity: fadeAnim }]}>
          <Text style={styles.celebrationTitle}>¡Enhorabuena!</Text>
          <Text style={styles.celebrationText}>
            Has completado la conversación. {"\n"}
            ¡Buen trabajo practicando tu español!
          </Text>
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartButtonText}>Volver a empezar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <CelebrationOverlay ref={celebrationRef} />
    </View>
  );
};