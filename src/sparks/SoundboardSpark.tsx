import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions, TextInput, Modal } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsButton,
  SettingsInput,
  SaveCancelButtons,
  SettingsItem,
  SettingsText,
  SettingsRemoveButton
} from '../components/SettingsComponents';

const { width: screenWidth } = Dimensions.get('window');
const CHIP_SIZE = (screenWidth - 80) / 3; // 3 columns with proper padding and gaps

interface SoundChip {
  id: string;
  name: string;
  displayName: string;
  category: string;
  duration: number;
  filePath: string;
  createdDate: string;
  lastPlayed?: string;
  playCount: number;
}

interface SoundboardData {
  soundChips: SoundChip[];
  categories: string[];
  lastUsed: string;
}

type RecordingState = 'ready' | 'countdown' | 'recording' | 'recorded';

const parseTaskText = (text: string): { category: string; displayText: string } => {
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1 && colonIndex < text.length - 1) {
    const category = text.substring(0, colonIndex).trim();
    const displayText = text.substring(colonIndex + 1).trim();
    return { category, displayText };
  }
  return { category: 'General', displayText: text.trim() };
};

const SoundboardSettings: React.FC<{
  soundChips: SoundChip[];
  onSave: (soundChips: SoundChip[]) => void;
  onClose: () => void;
}> = ({ soundChips, onSave, onClose }) => {
  const { colors } = useTheme();
  const [editingSoundChips, setEditingSoundChips] = useState<SoundChip[]>([...soundChips]);
  const [recordingState, setRecordingState] = useState<RecordingState>('ready');
  const [countdown, setCountdown] = useState(3);
  const [recordingCountdown, setRecordingCountdown] = useState(10);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [newSoundName, setNewSoundName] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recordingRef.current) clearInterval(recordingRef.current);
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
    };
  }, []);

  const setupAudioMode = async (forRecording = false) => {
    try {
      await Audio.requestPermissionsAsync();

      if (forRecording) {
        // Audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } else {
        // Audio mode for playback - fixes quiet volume issue
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false, // Critical for proper playback volume
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('Failed to setup audio mode:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Failed to cleanup existing recording:', error);
        }
        setRecording(null);
      }

      await setupAudioMode(true); // Setup for recording

      setRecordingState('countdown');
      setCountdown(3);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            beginRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      setRecordingState('ready');
    }
  };

  const beginRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Failed to cleanup existing recording:', error);
        }
        setRecording(null);
      }

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          numberOfChannels: 1, // Mono for better gain
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          numberOfChannels: 1, // Mono for better gain
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

      setRecording(newRecording);
      setRecordingState('recording');
      setRecordingCountdown(10);

      recordingRef.current = setInterval(() => {
        setRecordingCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to begin recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
      setRecordingState('ready');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingRef.current) {
        clearInterval(recordingRef.current);
      }

      if (recording) {
        // Get status BEFORE stopping to capture duration
        const status = await recording.getStatusAsync();
        const actualDuration = status.durationMillis ? status.durationMillis / 1000 : 0;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        console.log('Recording status:', status);
        console.log('Duration in ms:', status.durationMillis);
        console.log('Calculated duration:', actualDuration);

        setRecordedUri(uri);
        setRecordedDuration(actualDuration);
        setRecordingState('recorded');
        setRecording(null);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      setRecordingState('ready');
    }
  };

  const playRecordedSound = async () => {
    try {
      if (recordedUri) {
        // Setup audio mode for playback (fixes quiet volume)
        await setupAudioMode(false);

        if (sound) {
          await sound.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri });
        setSound(newSound);
        await newSound.playAsync();
        HapticFeedback.light();
      }
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  const saveRecording = async () => {
    if (!recordedUri || !newSoundName.trim()) {
      Alert.alert('Error', 'Please enter a name for your sound.');
      return;
    }

    try {
      const { category, displayText } = parseTaskText(newSoundName.trim());
      const id = Date.now().toString();
      const fileName = `sound_${Date.now()}_${id}.m4a`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: recordedUri,
        to: newPath,
      });

      const newSoundChip: SoundChip = {
        id,
        name: newSoundName.trim(),
        displayName: displayText,
        category,
        duration: recordedDuration,
        filePath: newPath,
        createdDate: new Date().toISOString(),
        playCount: 0,
      };

      setEditingSoundChips([...editingSoundChips, newSoundChip]);

      // Reset recording state
      setRecordingState('ready');
      setRecordedUri(null);
      setNewSoundName('');
      setRecordedDuration(0);

      HapticFeedback.success();
    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert('Error', 'Failed to save recording.');
    }
  };

  const discardRecording = () => {
    setRecordingState('ready');
    setRecordedUri(null);
    setNewSoundName('');
    setRecordedDuration(0);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
  };

  const reRecord = () => {
    discardRecording();
    startRecording();
  };

  const deleteSoundChip = async (id: string) => {
    const chipToDelete = editingSoundChips.find(chip => chip.id === id);
    if (chipToDelete) {
      Alert.alert(
        'Delete Sound',
        `Are you sure you want to delete "${chipToDelete.displayName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete the file
                await FileSystem.deleteAsync(chipToDelete.filePath, { idempotent: true });

                // Remove from array
                setEditingSoundChips(editingSoundChips.filter(chip => chip.id !== id));
                HapticFeedback.medium();
              } catch (error) {
                console.error('Failed to delete sound file:', error);
                // Still remove from array even if file deletion fails
                setEditingSoundChips(editingSoundChips.filter(chip => chip.id !== id));
                HapticFeedback.medium();
              }
            },
          },
        ]
      );
    }
  };

  const handleSave = () => {
    onSave(editingSoundChips);
    onClose();
  };

  const renderRecordingInterface = () => {
    const styles = StyleSheet.create({
      recordingContainer: {
        backgroundColor: colors.surface,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
      },
      recordButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginBottom: 20,
      },
      recordButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
      },
      countdownText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 10,
      },
      recordingIndicator: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginBottom: 10,
      },
      recordingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
      },
      stopButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 10,
      },
      stopButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
      },
      previewContainer: {
        alignItems: 'center',
      },
      previewText: {
        fontSize: 16,
        color: colors.text,
        marginBottom: 15,
        textAlign: 'center',
      },
      playbackControls: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
      },
      playButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
      },
      playButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
      },
      categoryHelpText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
        lineHeight: 16,
      },
      actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
      },
      actionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignItems: 'center',
      },
      saveButton: {
        backgroundColor: colors.success,
      },
      discardButton: {
        backgroundColor: colors.error,
      },
      reRecordButton: {
        flex: 1,
        backgroundColor: colors.border,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
      },
      actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
      },
      reRecordButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
      },
    });

    switch (recordingState) {
      case 'ready':
        return (
          <View style={styles.recordingContainer}>
            <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
              <Text style={styles.recordButtonText}>🎤 Record New Sound</Text>
            </TouchableOpacity>
          </View>
        );

      case 'countdown':
        return (
          <View style={styles.recordingContainer}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.previewText}>Get ready to record...</Text>
          </View>
        );

      case 'recording':
        return (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicator}>
              <Text style={styles.recordingText}>● Recording</Text>
            </View>
            <Text style={styles.countdownText}>{recordingCountdown}</Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        );

      case 'recorded':
        return (
          <View style={styles.recordingContainer}>
            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                Recording complete! Duration: {recordedDuration.toFixed(1)}s
              </Text>

              <View style={styles.playbackControls}>
                <TouchableOpacity style={styles.playButton} onPress={playRecordedSound}>
                  <Text style={styles.playButtonText}>▶ Play</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reRecordButton} onPress={reRecord}>
                  <Text style={styles.reRecordButtonText}>Re-record</Text>
                </TouchableOpacity>
              </View>

              <SettingsInput
                placeholder="Enter sound name (e.g., 'Golf: Get in your hole')"
                value={newSoundName}
                onChangeText={setNewSoundName}
              />

              <Text style={styles.categoryHelpText}>
                {newSoundName.trim() ? (
                  (() => {
                    const { category, displayText } = parseTaskText(newSoundName.trim());
                    return `Category: ${category} • Display: "${displayText}"`;
                  })()
                ) : (
                  "Use format 'Category: Sound Name' to organize sounds into categories"
                )}
              </Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.discardButton]} onPress={discardRecording}>
                  <Text style={styles.actionButtonText}>Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={saveRecording}>
                  <Text style={styles.actionButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Soundboard Settings"
          subtitle="Record and manage your sound collection"
          icon="🎛️"
        />

        <SettingsSection title="Record New Sound">
          {renderRecordingInterface()}
        </SettingsSection>

        <SettingsSection title={`Your Sounds (${editingSoundChips.length})`}>
          {editingSoundChips.length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <SettingsText variant="body">No sounds recorded yet</SettingsText>
            </View>
          ) : (
            editingSoundChips.map((chip) => (
              <SettingsItem key={chip.id}>
                <View style={{ flex: 1 }}>
                  <SettingsText variant="body">{chip.displayName}</SettingsText>
                  <SettingsText variant="caption">
                    {chip.category} • {chip.duration.toFixed(1)}s • {chip.playCount} plays
                  </SettingsText>
                </View>
                <SettingsRemoveButton onPress={() => deleteSoundChip(chip.id)} />
              </SettingsItem>
            ))
          )}
        </SettingsSection>

        <SettingsFeedbackSection sparkName="Soundboard" />

        <SaveCancelButtons onSave={handleSave} onCancel={onClose} />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

interface SoundboardSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const SoundboardSpark: React.FC<SoundboardSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [soundChips, setSoundChips] = useState<SoundChip[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('ready');
  const [countdown, setCountdown] = useState(3);
  const [recordingCountdown, setRecordingCountdown] = useState(10);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [newSoundName, setNewSoundName] = useState('');
  const [showRecordingModal, setShowRecordingModal] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recordingRef.current) clearInterval(recordingRef.current);
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
    };
  }, []);

  const setupAudioMode = async (forRecording = false) => {
    try {
      await Audio.requestPermissionsAsync();

      if (forRecording) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      console.error('Failed to setup audio mode:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Failed to cleanup existing recording:', error);
        }
        setRecording(null);
      }

      await setupAudioMode(true);
      setRecordingState('countdown');
      setCountdown(3);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            beginRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const beginRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Failed to cleanup existing recording:', error);
        }
        setRecording(null);
      }

      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      setRecordingState('recording');
      setRecordingCountdown(10);

      recordingRef.current = setInterval(() => {
        setRecordingCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to begin recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
      setRecordingState('ready');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingRef.current) {
        clearInterval(recordingRef.current);
      }

      if (recording) {
        const status = await recording.getStatusAsync();
        const actualDuration = status.durationMillis ? status.durationMillis / 1000 : 0;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        setRecordedUri(uri);
        setRecordedDuration(actualDuration);
        setRecordingState('recorded');
        setRecording(null);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
      setRecordingState('ready');
    }
  };

  const playRecordedSound = async () => {
    try {
      if (recordedUri) {
        await setupAudioMode(false);

        if (sound) {
          await sound.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordedUri });
        setSound(newSound);
        await newSound.playAsync();
        HapticFeedback.light();
      }
    } catch (error) {
      console.error('Failed to play recorded sound:', error);
      Alert.alert('Error', 'Failed to play recorded sound.');
    }
  };

  const saveRecording = async () => {
    if (!recordedUri || !newSoundName.trim()) {
      Alert.alert('Error', 'Please enter a name for your sound.');
      return;
    }

    try {
      const { category, displayText } = parseTaskText(newSoundName.trim());
      const id = Date.now().toString();
      const fileName = `sound_${Date.now()}_${id}.m4a`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: recordedUri,
        to: newPath,
      });

      const newSoundChip: SoundChip = {
        id,
        name: newSoundName.trim(),
        displayName: displayText,
        category,
        duration: recordedDuration,
        filePath: newPath,
        createdDate: new Date().toISOString(),
        playCount: 0,
      };

      setSoundChips([...soundChips, newSoundChip]);

      // Reset recording state
      setRecordingState('ready');
      setRecordedUri(null);
      setNewSoundName('');
      setRecordedDuration(0);
      setShowRecordingModal(false);

      HapticFeedback.success();
    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert('Error', 'Failed to save recording.');
    }
  };

  const discardRecording = () => {
    setRecordingState('ready');
    setRecordedUri(null);
    setNewSoundName('');
    setRecordedDuration(0);
    setShowRecordingModal(false);
    HapticFeedback.light();
  };

  const reRecord = () => {
    setRecordingState('ready');
    setRecordedUri(null);
    setRecordedDuration(0);
    HapticFeedback.light();
  };

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('soundboard') as SoundboardData;
    if (savedData?.soundChips) {
      setSoundChips(savedData.soundChips);
    }
  }, [getSparkData]);

  // Save data whenever soundChips change
  useEffect(() => {
    const categories = Array.from(new Set(soundChips.map(chip => chip.category)));
    const soundboardData: SoundboardData = {
      soundChips,
      categories,
      lastUsed: new Date().toISOString(),
    };
    setSparkData('soundboard', soundboardData);
    onStateChange?.({ soundCount: soundChips.length, categories: categories.length });
  }, [soundChips]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const setupPlaybackAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // Critical for proper playback volume
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to setup playback audio mode:', error);
    }
  };

  const playSound = async (chip: SoundChip) => {
    try {
      // Setup audio mode for playback (fixes quiet volume)
      await setupPlaybackAudioMode();

      // Stop any currently playing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(chip.filePath);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Sound file not found. It may have been deleted.');
        return;
      }

      setCurrentlyPlaying(chip.id);

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: chip.filePath });
      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentlyPlaying(null);
        }
      });

      await newSound.playAsync();

      // Update play count
      setSoundChips(prev => prev.map(c =>
        c.id === chip.id
          ? { ...c, playCount: c.playCount + 1, lastPlayed: new Date().toISOString() }
          : c
      ));

      HapticFeedback.light();
    } catch (error) {
      console.error('Failed to play sound:', error);
      setCurrentlyPlaying(null);
      Alert.alert('Error', 'Failed to play sound.');
    }
  };

  const saveSoundChips = (newSoundChips: SoundChip[]) => {
    setSoundChips(newSoundChips);
    HapticFeedback.success();
  };

  const getFilteredSoundChips = () => {
    if (!selectedCategory) {
      return soundChips;
    }
    return soundChips.filter(chip => chip.category === selectedCategory);
  };

  const getCategories = () => {
    const categories = Array.from(new Set(soundChips.map(chip => chip.category)));
    return categories.sort();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 20,
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
      marginBottom: 20,
    },
    categoryTabs: {
      flexDirection: 'row',
      marginBottom: 20,
      maxHeight: 40,
      flexGrow: 0,
      flexShrink: 0,
    },
    categoryTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      borderRadius: 16,
      backgroundColor: colors.border,
      minHeight: 32,
      justifyContent: 'center',
    },
    categoryTabActive: {
      backgroundColor: colors.primary,
    },
    categoryTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    categoryTabTextActive: {
      color: '#fff',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    soundChip: {
      width: CHIP_SIZE,
      height: CHIP_SIZE,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 10,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    soundChipPlaying: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    soundChipName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    soundChipDetails: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyStateButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    emptyStateButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    recordButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 25,
      borderRadius: 25,
      alignItems: 'center',
      marginTop: 10,
    },
    recordButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    emptyHelpText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseText: {
      fontSize: 18,
      color: colors.text,
    },
    modalTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    modalHeaderSpacer: {
      width: 40,
    },
    recordingContainer: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startRecordButton: {
      backgroundColor: colors.primary,
      paddingVertical: 20,
      paddingHorizontal: 40,
      borderRadius: 25,
      alignItems: 'center',
    },
    startRecordButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    countdownContainer: {
      alignItems: 'center',
    },
    countdownText: {
      fontSize: 18,
      color: colors.text,
      marginBottom: 10,
    },
    countdownNumber: {
      fontSize: 48,
      fontWeight: 'bold',
      color: colors.primary,
    },
    recordingActiveContainer: {
      alignItems: 'center',
    },
    recordingText: {
      fontSize: 20,
      color: colors.error,
      marginBottom: 10,
    },
    recordingCountdown: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
    },
    stopButton: {
      backgroundColor: colors.error,
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 20,
    },
    stopButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    recordedContainer: {
      width: '100%',
      alignItems: 'center',
    },
    recordedText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    playbackControls: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    playButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    playButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    reRecordButton: {
      flex: 1,
      backgroundColor: colors.border,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    reRecordButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    nameInput: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    categoryHelpText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 20,
      lineHeight: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveButton: {
      backgroundColor: colors.success,
    },
    discardButton: {
      backgroundColor: colors.error,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <SoundboardSettings
        soundChips={soundChips}
        onSave={saveSoundChips}
        onClose={onCloseSettings || (() => {})}
      />
    );
  }

  const filteredChips = getFilteredSoundChips();
  const categories = getCategories();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>🎛️ Soundboard</Text>
        <Text style={styles.subtitle}>Tap to play your recorded sounds</Text>
      </View>

      <TouchableOpacity
        style={styles.recordButton}
        onPress={() => setShowRecordingModal(true)}
      >
        <Text style={styles.recordButtonText}>🎤 Record New Sound</Text>
      </TouchableOpacity>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
          <TouchableOpacity
            style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryTab, selectedCategory === category && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryTabText, selectedCategory === category && styles.categoryTabTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filteredChips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {soundChips.length === 0
              ? "No sounds recorded yet.\nTap the button below to record your first sound!"
              : `No sounds in ${selectedCategory} category`
            }
          </Text>
          {soundChips.length === 0 && (
            <Text style={styles.emptyHelpText}>
              Tap "Record New Sound" above to get started!
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredChips.map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.soundChip,
                currentlyPlaying === chip.id && styles.soundChipPlaying
              ]}
              onPress={() => playSound(chip)}
            >
              <Text style={styles.soundChipName} numberOfLines={2}>
                {chip.displayName}
              </Text>
              <Text style={styles.soundChipDetails}>
                {chip.duration.toFixed(1)}s
              </Text>
              <Text style={styles.soundChipDetails}>
                {chip.category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recording Modal */}
      <Modal
        visible={showRecordingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecordingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRecordingModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Record New Sound</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.recordingContainer}>
            {recordingState === 'ready' && (
              <TouchableOpacity style={styles.startRecordButton} onPress={startRecording}>
                <Text style={styles.startRecordButtonText}>🎤 Start Recording</Text>
              </TouchableOpacity>
            )}

            {recordingState === 'countdown' && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>Recording starts in</Text>
                <Text style={styles.countdownNumber}>{countdown}</Text>
              </View>
            )}

            {recordingState === 'recording' && (
              <View style={styles.recordingActiveContainer}>
                <Text style={styles.recordingText}>🔴 Recording...</Text>
                <Text style={styles.recordingCountdown}>{recordingCountdown}s remaining</Text>
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}

            {recordingState === 'recorded' && (
              <View style={styles.recordedContainer}>
                <Text style={styles.recordedText}>
                  Recording complete! Duration: {recordedDuration.toFixed(1)}s
                </Text>

                <View style={styles.playbackControls}>
                  <TouchableOpacity style={styles.playButton} onPress={playRecordedSound}>
                    <Text style={styles.playButtonText}>▶ Play</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reRecordButton} onPress={reRecord}>
                    <Text style={styles.reRecordButtonText}>Re-record</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.nameInput}
                  placeholder="Enter sound name (e.g., 'Golf: Get in your hole')"
                  value={newSoundName}
                  onChangeText={setNewSoundName}
                />

                <Text style={styles.categoryHelpText}>
                  {newSoundName.trim() ? (
                    (() => {
                      const { category, displayText } = parseTaskText(newSoundName.trim());
                      return `Category: ${category} • Display: "${displayText}"`;
                    })()
                  ) : (
                    "Use format 'Category: Sound Name' to organize sounds into categories"
                  )}
                </Text>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionButton, styles.discardButton]} onPress={discardRecording}>
                    <Text style={styles.actionButtonText}>Discard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={saveRecording}>
                    <Text style={styles.actionButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};