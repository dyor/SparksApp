import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { TranslationService } from '../utils/translation';
import { CommonModal } from './CommonModal';
import { createCommonStyles } from '../styles/CommonStyles';
import { StyleTokens } from '../styles/StyleTokens';

export interface Phrase {
  id: string;
  spanish: string;
  english: string;
  speaker: 'friend1' | 'friend2';
}

interface AddPhraseModalProps {
  visible: boolean;
  onClose: () => void;
  onAddPhrase: (phrase: Omit<Phrase, 'id'>) => void;
  initialSpeaker?: 'friend1' | 'friend2';
  showSpeakerSelection?: boolean;
}

const AddPhraseModal: React.FC<AddPhraseModalProps> = ({
  visible,
  onClose,
  onAddPhrase,
  initialSpeaker = 'friend1',
  showSpeakerSelection = true
}) => {
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);
  const [spanishText, setSpanishText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [speaker, setSpeaker] = useState<'friend1' | 'friend2'>(initialSpeaker);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Check network connectivity on mount
  useEffect(() => {
    const checkNetwork = async () => {
      const isOnline = await TranslationService.isNetworkAvailable();
      setIsNetworkAvailable(isOnline);
    };
    checkNetwork();
  }, []);

  const handleAddPhrase = () => {
    if (!spanishText.trim() || !englishText.trim()) {
      Alert.alert('Error', 'Please enter both Spanish and English text.');
      return;
    }

    onAddPhrase({
      spanish: spanishText.trim(),
      english: englishText.trim(),
      speaker
    });

    // Reset form
    setSpanishText('');
    setEnglishText('');
    setSpeaker(initialSpeaker);

    HapticFeedback.success();
    onClose();
  };

  const handleCancel = () => {
    setSpanishText('');
    setEnglishText('');
    setSpeaker(initialSpeaker);
    onClose();
  };

  const handleLookUp = async () => {
    if (!isNetworkAvailable) {
      Alert.alert('No Internet', 'Translation requires an internet connection.');
      return;
    }

    setIsTranslating(true);

    try {
      let result;

      // Determine translation direction based on which field has text
      if (spanishText.trim() && !englishText.trim()) {
        // Spanish to English
        result = await TranslationService.translateSpanishToEnglish(spanishText.trim());
        if (result.success && result.translatedText) {
          setEnglishText(result.translatedText);
        } else {
          Alert.alert('Translation Error', result.error || 'Failed to translate Spanish to English');
        }
      } else if (englishText.trim() && !spanishText.trim()) {
        // English to Spanish
        result = await TranslationService.translateEnglishToSpanish(englishText.trim());
        if (result.success && result.translatedText) {
          setSpanishText(result.translatedText);
        } else {
          Alert.alert('Translation Error', result.error || 'Failed to translate English to Spanish');
        }
      }
    } catch (error) {
      Alert.alert('Translation Error', 'An unexpected error occurred during translation.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Button state logic
  const canAddPhrase = spanishText.trim() && englishText.trim();
  const canLookUp = isNetworkAvailable && (
    (spanishText.trim() && !englishText.trim()) ||
    (!spanishText.trim() && englishText.trim())
  );

  const styles = StyleSheet.create({
    ...commonStyles,
    fieldLabel: {
      fontSize: StyleTokens.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: StyleTokens.spacing.sm,
    },
    textInput: {
      ...commonStyles.input,
      marginBottom: StyleTokens.spacing.md,
    },
    speakerContainer: {
      flexDirection: 'row',
      marginBottom: StyleTokens.spacing.md,
    },
    speakerButton: {
      flex: 1,
      padding: StyleTokens.spacing.sm,
      borderRadius: StyleTokens.borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    speakerButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    speakerButtonText: {
      fontSize: StyleTokens.fontSize.sm,
      fontWeight: '600',
      color: colors.text,
    },
    speakerButtonTextActive: {
      color: colors.background,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: StyleTokens.spacing.xs,
    },
    button: {
      flex: 1,
      padding: StyleTokens.spacing.sm,
      borderRadius: StyleTokens.borderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lookUpButton: {
      backgroundColor: colors.secondary || colors.primary,
    },
    addButton: {
      backgroundColor: colors.primary,
    },
    disabledButton: {
      backgroundColor: colors.border,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: StyleTokens.fontSize.md,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    lookUpButtonText: {
      color: colors.background,
    },
    addButtonText: {
      color: colors.background,
    },
  });

  return (
    <CommonModal
      visible={visible}
      title="Add New Phrase"
      onClose={handleCancel}
    >
      <Text style={styles.fieldLabel}>Spanish phrase</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter Spanish phrase..."
        placeholderTextColor={colors.textSecondary}
        value={spanishText}
        onChangeText={setSpanishText}
        multiline
        autoFocus
      />

      <Text style={styles.fieldLabel}>English translation</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter English translation..."
        placeholderTextColor={colors.textSecondary}
        value={englishText}
        onChangeText={setEnglishText}
        multiline
      />

      {showSpeakerSelection && (
        <>
          <Text style={styles.fieldLabel}>Speaker</Text>
          <View style={styles.speakerContainer}>
            <TouchableOpacity
              style={[
                styles.speakerButton,
                speaker === 'friend1' && styles.speakerButtonActive
              ]}
              onPress={() => setSpeaker('friend1')}
            >
              <Text style={[
                styles.speakerButtonText,
                speaker === 'friend1' && styles.speakerButtonTextActive
              ]}>
                Friend 1
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.speakerButton,
                speaker === 'friend2' && styles.speakerButtonActive
              ]}
              onPress={() => setSpeaker('friend2')}
            >
              <Text style={[
                styles.speakerButtonText,
                speaker === 'friend2' && styles.speakerButtonTextActive
              ]}>
                Friend 2
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
        >
          <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.lookUpButton, !canLookUp && styles.disabledButton]}
          onPress={handleLookUp}
          disabled={!canLookUp || isTranslating}
        >
          {isTranslating ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.buttonText, styles.lookUpButtonText]}>Look Up</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.addButton, !canAddPhrase && styles.disabledButton]}
          onPress={handleAddPhrase}
          disabled={!canAddPhrase}
        >
          <Text style={[styles.buttonText, styles.addButtonText]}>Add Phrase</Text>
        </TouchableOpacity>
      </View>
    </CommonModal>
  );
};

export default AddPhraseModal;
