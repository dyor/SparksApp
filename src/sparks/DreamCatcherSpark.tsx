import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { SparkProps } from '../types/spark';
import { HapticFeedback } from '../utils/haptics';
import { DreamRecordingService } from '../services/DreamRecordingService';
import { DreamStorageService, DreamEntry } from '../services/DreamStorageService';
import { AudioTranscriptionService } from '../services/AudioTranscriptionService';
import { GeminiService } from '../services/GeminiService';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SettingsButton,
} from '../components/SettingsComponents';
import { AISettingsNote } from '../components/AISettingsNote';

type RecordingState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'transcribed' | 'interpreting' | 'interpreted';

export const DreamCatcherSpark: React.FC<SparkProps> = ({ showSettings, onCloseSettings }) => {
  const { colors } = useTheme();

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  // Dream data
  const [transcription, setTranscription] = useState('');
  const [geminiInterpretation, setGeminiInterpretation] = useState<string | null>(null);
  const [currentDream, setCurrentDream] = useState<DreamEntry | null>(null);

  // History
  const [dreamHistory, setDreamHistory] = useState<DreamEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    loadDreamHistory();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Pulse animation for recording
  useEffect(() => {
    if (recordingState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recordingState]);

  const loadDreamHistory = async () => {
    try {
      const dreams = await DreamStorageService.getRecentDreams(30);
      setDreamHistory(dreams);
    } catch (error) {
      console.error('Failed to load dream history:', error);
    }
  };

  const startRecording = async () => {
    try {
      const hasPermissions = await DreamRecordingService.hasPermissions();
      if (!hasPermissions) {
        const granted = await DreamRecordingService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Needed',
            'Please enable microphone access in Settings to record your dreams.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await DreamRecordingService.startRecording(30);
      setRecordingState('recording');
      setRecordingDuration(0);
      setRecordedUri(null);
      setTranscription('');
      setGeminiInterpretation(null);
      HapticFeedback.medium();

      // Start duration timer
      durationTimerRef.current = setInterval(async () => {
        const status = await DreamRecordingService.getStatus();
        setRecordingDuration(status.duration);

        if (status.duration >= 30) {
          stopRecording();
        }
      }, 100);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', error.message || 'Failed to start recording');
      setRecordingState('idle');
    }
  };

  const stopRecording = async () => {
    try {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      const result = await DreamRecordingService.stopRecording();
      if (result) {
        setRecordedUri(result.uri);
        setRecordedDuration(result.duration);
        setRecordingState('recorded');
        HapticFeedback.success();
      }
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', error.message || 'Failed to stop recording');
      setRecordingState('idle');
    }
  };

  const playRecording = async () => {
    if (!recordedUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const newSound = await DreamRecordingService.playRecording(recordedUri);
      setSound(newSound);
      setIsPlaying(true);
      HapticFeedback.light();

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error: any) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', error.message || 'Failed to play recording');
    }
  };

  const transcribeRecording = async () => {
    if (!recordedUri) return;

    try {
      setRecordingState('transcribing');
      HapticFeedback.light();

      const transcribedText = await AudioTranscriptionService.transcribe(recordedUri);
      setTranscription(transcribedText);
      setRecordingState('transcribed');
      HapticFeedback.success();
    } catch (error: any) {
      console.error('Transcription failed:', error);
      Alert.alert(
        'Transcription Failed',
        error.message || 'Failed to transcribe your dream. You can enter it manually below.',
        [
          { text: 'Enter Manually', onPress: () => setRecordingState('transcribed') },
          { text: 'Cancel', onPress: () => setRecordingState('recorded'), style: 'cancel' },
        ]
      );
    }
  };

  const interpretWithGemini = async () => {
    if (!transcription.trim()) {
      Alert.alert('Error', 'Please transcribe your dream first.');
      return;
    }

    try {
      setRecordingState('interpreting');
      HapticFeedback.light();

      const interpretation = await GeminiService.interpretDream(transcription);
      setGeminiInterpretation(interpretation);
      setRecordingState('interpreted');
      HapticFeedback.success();
    } catch (error: any) {
      console.error('Interpretation failed:', error);
      Alert.alert('Error', error.message || 'Failed to interpret your dream. Please try again.');
      setRecordingState('transcribed');
    }
  };

  const saveDream = async () => {
    if (!recordedUri || !transcription.trim()) {
      Alert.alert('Error', 'Please record and transcribe your dream first.');
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `dream_${Date.now()}.m4a`;

      // Save recording to permanent storage
      const permanentUri = recordedUri.startsWith('file://') && !recordedUri.includes('dream-catcher')
        ? await DreamRecordingService.saveRecordingToStorage(recordedUri, filename)
        : recordedUri;

      if (currentDream) {
        // Update existing dream
        await DreamStorageService.updateDream(currentDream.id, {
          audioUri: permanentUri,
          transcription: transcription.trim(),
          geminiInterpretation: geminiInterpretation || undefined,
        });
      } else {
        // Save new dream entry
        const dream = await DreamStorageService.saveDream({
          timestamp: now.getTime(),
          date: dateStr,
          audioUri: permanentUri,
          transcription: transcription.trim(),
          geminiInterpretation: geminiInterpretation || undefined,
        });
        setCurrentDream(dream);
      }
      await loadDreamHistory();

      Alert.alert('Saved!', 'Your dream and its interpretation have been saved to your journal.', [
        { text: 'View History', onPress: () => { resetState(); setShowHistory(true); } },
        { text: 'OK', onPress: resetState }
      ]);
      HapticFeedback.success();
    } catch (error: any) {
      console.error('Failed to save dream:', error);
      Alert.alert('Error', error.message || 'Failed to save your dream');
    }
  };

  const resetState = () => {
    setRecordingState('idle');
    setRecordingDuration(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setTranscription('');
    setGeminiInterpretation(null);
    setCurrentDream(null);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Settings view
  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Dream Catcher Settings"
            subtitle="Record and interpret your dreams"
            icon="🌙"
            sparkId="dream-catcher"
          />

          <SettingsFeedbackSection sparkName="Dream Catcher" sparkId="dream-catcher" />

          <View style={{ padding: 20 }}>
            <AISettingsNote sparkName="Dream Catcher" />
          </View>

          <SettingsSection title="About">
            <View style={{ padding: 16 }}>
              <SettingsText variant="body">
                Dream Catcher helps you record and interpret your dreams. Record your dream
                recollection when you wake up, transcribe it, and get AI-powered insights.
              </SettingsText>
            </View>
          </SettingsSection>

          <SettingsSection title="Dream History">
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                {dreamHistory.length} dreams recorded
              </Text>
              <SettingsButton
                title="View All Dreams"
                onPress={() => {
                  setShowHistory(true);
                  onCloseSettings?.();
                }}
              />
            </View>
          </SettingsSection>

          <View style={{ padding: 20 }}>
            <SettingsButton
              title="Close"
              onPress={onCloseSettings || (() => { })}
              variant="secondary"
            />
          </View>
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  // History view
  if (showHistory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowHistory(false)}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dream History</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.historyScroll}>
          {dreamHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No dreams recorded yet.{'\n'}Start recording your dreams to see them here.
              </Text>
            </View>
          ) : (
            dreamHistory.map((dream) => (
              <TouchableOpacity
                key={dream.id}
                style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setCurrentDream(dream);
                  setRecordedUri(dream.audioUri);
                  setTranscription(dream.transcription);
                  setGeminiInterpretation(dream.geminiInterpretation || null);
                  if (dream.geminiInterpretation) {
                    setRecordingState('interpreted');
                  } else {
                    setRecordingState('transcribed');
                  }
                  setShowHistory(false);
                }}
              >
                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                  {formatDate(dream.timestamp)}
                </Text>
                <Text
                  style={[styles.historyPreview, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {dream.transcription || 'No transcription'}
                </Text>
                {dream.geminiInterpretation && (
                  <Text style={[styles.historyBadge, { color: colors.primary }]}>
                    ✨ Interpreted
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // Main recording view
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>🌙 Dream Catcher</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Record your dream when you wake up
          </Text>
        </View>

        {/* Recording Button */}
        {recordingState === 'idle' && (
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: colors.primary }]}
            onPress={startRecording}
          >
            <Text style={styles.recordButtonText}>🎤 Record Dream</Text>
          </TouchableOpacity>
        )}

        {/* Recording State */}
        {recordingState === 'recording' && (
          <View style={styles.recordingContainer}>
            <Animated.View
              style={[
                styles.recordingButton,
                { backgroundColor: colors.primary },
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.recordingButtonText}>●</Text>
            </Animated.View>
            <Text style={[styles.recordingText, { color: colors.text }]}>
              Recording... {formatDuration(recordingDuration)}
            </Text>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: '#FF4444' }]}
              onPress={stopRecording}
            >
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recorded State */}
        {recordingState === 'recorded' && recordedUri && (
          <View style={styles.recordedContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recording Complete ({formatDuration(recordedDuration)})
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={playRecording}
                disabled={isPlaying}
              >
                <Text style={styles.actionButtonText}>
                  {isPlaying ? '▶️ Playing...' : '▶️ Play'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={transcribeRecording}
              >
                <Text style={styles.actionButtonText}>📝 Transcribe</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={resetState}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Start Over
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transcribing State */}
        {recordingState === 'transcribing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.text }]}>
              Transcribing your dream...
            </Text>
          </View>
        )}

        {/* Transcribed State */}
        {recordingState === 'transcribed' && (
          <View style={styles.transcribedContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Dream</Text>
            <TextInput
              style={[
                styles.transcriptionInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              multiline
              value={transcription}
              onChangeText={setTranscription}
              placeholder="Your dream transcription will appear here..."
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={interpretWithGemini}
                disabled={!transcription.trim()}
              >
                <Text style={styles.actionButtonText}>
                  ✨ {geminiInterpretation ? 'Re-interpret' : 'Discuss with Gemini'}
                </Text>
              </TouchableOpacity>
              {geminiInterpretation && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => setRecordingState('interpreted')}
                >
                  <Text style={styles.actionButtonText}>👁️ View</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={saveDream}
                disabled={!transcription.trim()}
              >
                <Text style={styles.actionButtonText}>💾 Save Dream</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={resetState}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Interpreting State */}
        {recordingState === 'interpreting' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.text }]}>
              Analyzing your dream...
            </Text>
          </View>
        )}

        {/* Interpreted State */}
        {recordingState === 'interpreted' && geminiInterpretation && (
          <View style={styles.interpretedContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dream Interpretation
            </Text>
            <ScrollView
              style={[
                styles.interpretationBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              nestedScrollEnabled={true}
            >
              <Text style={[styles.interpretationText, { color: colors.text }]}>
                {geminiInterpretation}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={saveDream}
            >
              <Text style={styles.actionButtonText}>💾 Save Dream</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                setRecordingState('transcribed');
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Back to Edit
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History Button */}
        {dreamHistory.length > 0 && recordingState === 'idle' && (
          <TouchableOpacity
            style={[styles.historyButton, { borderColor: colors.border }]}
            onPress={() => setShowHistory(true)}
          >
            <Text style={[styles.historyButtonText, { color: colors.text }]}>
              📚 View Dream History ({dreamHistory.length})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  recordButton: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordingButtonText: {
    color: '#FFFFFF',
    fontSize: 40,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  stopButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordedContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 16,
    marginTop: 16,
  },
  transcribedContainer: {
    marginBottom: 20,
  },
  transcriptionInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  interpretedContainer: {
    marginBottom: 20,
  },
  interpretationBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
    marginBottom: 16,
  },
  interpretationText: {
    fontSize: 16,
    lineHeight: 24,
  },
  historyButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyScroll: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  historyItem: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  historyPreview: {
    fontSize: 16,
    marginBottom: 8,
  },
  historyBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});

