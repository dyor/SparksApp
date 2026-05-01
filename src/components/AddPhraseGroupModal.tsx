import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { CommonModal } from './CommonModal';
import { GeminiService } from '../services/GeminiService';

// Shape used by FlashcardsSpark. Kept inline-light here so this file doesn't
// depend on the spark — the spark wires the saved cards into its TranslationCard
// schema (adding id/correctCount/etc).
export interface PhrasePairDraft {
  english: string;
  spanish: string;
}

export interface AddedPhraseGroup {
  name: string;
  prompt: string;
  cards: PhrasePairDraft[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (group: AddedPhraseGroup) => void;
}

const buildPrompt = (name: string, prompt: string): string => `
Create an English-and-Spanish set of phrases that relate to the topic below. Generate between 10 and 15 phrase pairs. Choose phrases that a learner would actually say or hear in context — natural, idiomatic, and varied (not just direct word translations).

If the topic looks like song lyrics, preserve the order of the lines. Otherwise, order pairs from simplest to most useful in context.

Topic name: ${name.trim()}
Details: ${prompt.trim()}

Return as a JSON array. Each element must have exactly two string fields:
- "english": the English phrase
- "spanish": the Spanish translation

Example shape:
[
  { "english": "I'd like the check, please.", "spanish": "La cuenta, por favor." },
  { "english": "How spicy is it?", "spanish": "¿Qué tan picante es?" }
]
`;

export const AddPhraseGroupModal: React.FC<Props> = ({ visible, onClose, onSave }) => {
  const { colors } = useTheme();

  const [stage, setStage] = useState<'input' | 'preview'>('input');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [draftCards, setDraftCards] = useState<PhrasePairDraft[]>([]);

  const reset = () => {
    setStage('input');
    setName('');
    setPrompt('');
    setGenerating(false);
    setDraftCards([]);
  };

  const handleClose = () => {
    if (generating) return; // don't let user dismiss mid-call
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedName || !trimmedPrompt) {
      Alert.alert('Missing fields', 'Please enter both a group name and a prompt.');
      return;
    }
    setGenerating(true);
    try {
      const result = await GeminiService.generateJSON<PhrasePairDraft[]>(
        buildPrompt(trimmedName, trimmedPrompt)
      );
      const cleaned = (Array.isArray(result) ? result : [])
        .map((p) => ({
          english: String(p?.english ?? '').trim(),
          spanish: String(p?.spanish ?? '').trim(),
        }))
        .filter((p) => p.english && p.spanish);
      if (cleaned.length === 0) {
        Alert.alert(
          'No phrases',
          'The AI didn\'t return usable phrases. Try a different prompt.'
        );
        return;
      }
      setDraftCards(cleaned);
      setStage('preview');
      HapticFeedback.light();
    } catch (err: any) {
      console.error('AddPhraseGroupModal: generate failed', err);
      Alert.alert(
        'Could not generate',
        err?.message || 'Failed to reach the AI service. Check your connection and try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (index: number, field: 'english' | 'spanish', value: string) => {
    setDraftCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const dropDraft = (index: number) => {
    setDraftCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const cleaned = draftCards
      .map((c) => ({ english: c.english.trim(), spanish: c.spanish.trim() }))
      .filter((c) => c.english && c.spanish);
    if (cleaned.length === 0) {
      Alert.alert('Empty group', 'Add at least one phrase before saving.');
      return;
    }
    onSave({ name: name.trim(), prompt: prompt.trim(), cards: cleaned });
    HapticFeedback.success();
    reset();
    onClose();
  };

  const styles = StyleSheet.create({
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: 14,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    secondaryButton: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    secondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 15 },
    cardRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
      alignItems: 'flex-start',
    },
    cardCol: { flex: 1 },
    cardField: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
      marginBottom: 4,
    },
    cardFieldLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    dropButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
    },
    dropText: { color: colors.error || '#d92d20', fontWeight: '700', fontSize: 16 },
    countLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginVertical: 8,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    flex: { flex: 1 },
    dismissKeyboardLink: {
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: -6,
      marginBottom: 4,
    },
    dismissKeyboardText: {
      fontSize: 12,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });

  const modalTitle = stage === 'input' ? 'Add Phrase Group' : 'Review Phrases';

  return (
    <CommonModal visible={visible} onClose={handleClose} title={modalTitle}>
      {stage === 'input' && (
        // Tapping empty space dismisses the keyboard so the Generate / Cancel
        // buttons are reachable on iOS when the multiline prompt is focused.
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <Text style={styles.subtitle}>
              AI will generate 10–15 English/Spanish phrase pairs from your prompt.
            </Text>

            <Text style={styles.label}>Group name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cooking Expressions"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <Text style={styles.label}>Prompt</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                'Describe the topic, or paste lyrics, dialogue, etc.\n\nExamples:\n• Phrases for ordering at a Mexican restaurant\n• [paste song lyrics]\n• Travel small talk for a bus ride'
              }
              placeholderTextColor={colors.textSecondary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />

            <TouchableOpacity
              style={styles.dismissKeyboardLink}
              onPress={Keyboard.dismiss}
            >
              <Text style={styles.dismissKeyboardText}>Tap here to close keyboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, generating && { opacity: 0.6 }]}
              onPress={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Generate Phrases</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClose}
              disabled={generating}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}

      {stage === 'preview' && (
        <View>
          <Text style={styles.subtitle}>
            Edit any pair, drop ones you don't like, then save. You can always edit individual cards later.
          </Text>

          <Text style={styles.label}>Group name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <Text style={styles.countLabel}>{draftCards.length} phrase pair{draftCards.length === 1 ? '' : 's'}</Text>

          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            {draftCards.map((card, idx) => (
              <View key={idx} style={styles.cardRow}>
                <View style={styles.cardCol}>
                  <Text style={styles.cardFieldLabel}>English</Text>
                  <TextInput
                    style={styles.cardField}
                    value={card.english}
                    onChangeText={(v) => updateDraft(idx, 'english', v)}
                    multiline
                  />
                  <Text style={styles.cardFieldLabel}>Spanish</Text>
                  <TextInput
                    style={styles.cardField}
                    value={card.spanish}
                    onChangeText={(v) => updateDraft(idx, 'spanish', v)}
                    multiline
                  />
                </View>
                <TouchableOpacity
                  style={styles.dropButton}
                  onPress={() => dropDraft(idx)}
                  accessibilityLabel="Drop this pair"
                >
                  <Text style={styles.dropText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.dismissKeyboardLink}
            onPress={Keyboard.dismiss}
          >
            <Text style={styles.dismissKeyboardText}>Tap here to close keyboard</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.flex, { marginTop: 0 }]}
              onPress={() => setStage('input')}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.flex, { marginTop: 0 }]}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Save Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </CommonModal>
  );
};

export default AddPhraseGroupModal;
