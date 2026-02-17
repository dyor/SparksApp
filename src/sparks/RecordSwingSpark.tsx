import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Switch,
    Alert,
    Modal,
    TextInput,
    Dimensions,
    Image,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RecordSwing, RecordedSwing } from '../components/RecordSwing';
import { RecordSwingStorageService, RecordSwingSettings } from '../services/RecordSwingStorageService';
import { VoiceCommandService } from '../services/VoiceCommandService';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { isExpoGo } from '../utils/expoGoDetection';
import { HapticFeedback } from '../utils/haptics';
import { BaseSpark } from '../components/BaseSpark';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SaveCancelButtons,
    SettingsFeedbackSection,
} from '../components/SettingsComponents';
import { VideoView, useVideoPlayer } from 'expo-video';
import { VoiceTranscript } from '../components/shared';

const { width, height } = Dimensions.get('window');

interface RecordSwingSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

const RecordSwingSettingsView: React.FC<{
    settings: RecordSwingSettings;
    onSave: (settings: RecordSwingSettings) => void;
    onCancel: () => void;
    sparkId?: string;
}> = ({ settings, onSave, onCancel, sparkId = 'record-swing' }) => {
    const { colors } = useTheme();
    const [tempSettings, setTempSettings] = useState<RecordSwingSettings>({ ...settings });

    // Keep temp settings in sync if prop settings change (e.g. after initial load)
    useEffect(() => {
        setTempSettings({ ...settings });
    }, [settings]);

    const handleSave = () => {
        onSave(tempSettings);
        HapticFeedback.success();
    };

    return (
        <SettingsContainer>
            <SettingsScrollView>
                <SettingsHeader
                    title="Record Swing Settings"
                    subtitle="Configure your recording preferences"
                    icon="🎥"
                    sparkId={sparkId}
                />

                <SettingsFeedbackSection sparkName="Record Swing" sparkId={sparkId} />

                <SettingsSection title="Recording Configuration">
                    <View style={settingStyles.item}>
                        <Text style={[settingStyles.label, { color: colors.text }]}>Start Delay (seconds)</Text>
                        <TextInput
                            style={[settingStyles.input, { color: colors.text, borderColor: colors.border }]}
                            keyboardType="numeric"
                            value={tempSettings.countdownSeconds.toString()}
                            onChangeText={(val) => setTempSettings(prev => ({ ...prev, countdownSeconds: parseInt(val) || 0 }))}
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            Time to get into position before recording starts
                        </Text>
                    </View>

                    <View style={settingStyles.item}>
                        <Text style={[settingStyles.label, { color: colors.text }]}>Recording Duration (seconds)</Text>
                        <TextInput
                            style={[settingStyles.input, { color: colors.text, borderColor: colors.border }]}
                            keyboardType="numeric"
                            value={tempSettings.durationSeconds.toString()}
                            onChangeText={(val) => setTempSettings(prev => ({ ...prev, durationSeconds: parseInt(val) || 1 }))}
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            How long to record for each swing
                        </Text>
                    </View>
                    <View style={settingStyles.item}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[settingStyles.label, { color: colors.text }]}>Auto-play after recording</Text>
                                <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                                    Automatically play the swing at full speed when finished
                                </Text>
                            </View>
                            <Switch
                                value={!!tempSettings.autoPlay}
                                onValueChange={(val) => setTempSettings(prev => ({ ...prev, autoPlay: val }))}
                                trackColor={{ false: '#767577', true: colors.primary }}
                            />
                        </View>
                    </View>

                    <View style={settingStyles.item}>
                        <Text style={[settingStyles.label, { color: colors.text }]}>Voice Assistant Duration (seconds)</Text>
                        <TextInput
                            style={[settingStyles.input, { color: colors.text, borderColor: colors.border }]}
                            keyboardType="numeric"
                            value={(tempSettings.voiceAssistantDurationSeconds ?? 20).toString()}
                            onChangeText={(val) => {
                                const parsed = parseInt(val);
                                setTempSettings(prev => ({ ...prev, voiceAssistantDurationSeconds: isNaN(parsed) ? 1 : Math.max(1, parsed) }));
                            }}
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            How long the voice session stays active after tapping
                        </Text>
                    </View>
                    <View style={settingStyles.item}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[settingStyles.label, { color: colors.text }]}>Voice Control during recording</Text>
                                <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                                    Allows "Stop Recording" via voice, but mutes video audio
                                </Text>
                            </View>
                            <Switch
                                value={!!tempSettings.voiceControlDuringRecording}
                                onValueChange={(val) => setTempSettings(prev => ({ ...prev, voiceControlDuringRecording: val }))}
                                trackColor={{ false: '#767577', true: colors.primary }}
                            />
                        </View>
                    </View>
                </SettingsSection>

                <View style={{ marginTop: 20 }}>
                    <SaveCancelButtons onSave={handleSave} onCancel={onCancel} />
                </View>
            </SettingsScrollView>
        </SettingsContainer>
    );
};

const settingStyles = StyleSheet.create({
    item: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    helpText: {
        fontSize: 12,
        marginTop: 4,
    }
});

const RecordSwingSpark: React.FC<RecordSwingSparkProps> = ({ showSettings: propsShowSettings = false, onCloseSettings }) => {
    const { colors } = useTheme();
    const [recordings, setRecordings] = useState<RecordedSwing[]>([]);
    const [settings, setSettings] = useState<RecordSwingSettings>({
        countdownSeconds: 5,
        durationSeconds: 15,
        autoPlay: false,
        voiceAssistantDurationSeconds: 20,
        voiceControlDuringRecording: false,
    });
    const [isListening, setIsListening] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [loading, setLoading] = useState(true);
    const [triggerCount, setTriggerCount] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState<RecordedSwing | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [voiceContext, setVoiceContext] = useState<'idle' | 'recording' | 'reviewing'>('idle');
    const [lastRecording, setLastRecording] = useState<RecordedSwing | null>(null);

    // -- Voice Logic --
    const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startVoiceListening = useCallback(async () => {
        console.log('🎙️ RecordSwingSpark: startVoiceListening triggered');
        try {
            if (isExpoGo()) {
                Alert.alert("Not Available", "Speech recognition is not available in Expo Go. Please use a development build.");
                return;
            }

            if (!ExpoSpeechRecognitionModule) {
                Alert.alert("Module Error", "Speech recognition native module is not linked. Please rebuild your app.");
                return;
            }

            if (voiceTimeoutRef.current) {
                clearTimeout(voiceTimeoutRef.current);
                voiceTimeoutRef.current = null;
            }

            setCurrentTranscript('');
            const hasPermissions = await VoiceCommandService.requestPermissions();
            if (!hasPermissions) {
                Alert.alert("Permission Required", "Microphone permission is needed for voice activation.");
                return;
            }

            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                maxAlternatives: 1,
                continuous: true, // Use continuous to prevent premature ending
                requiresOnDeviceRecognition: false,
                addsPunctuation: true,
            });

            // Set timeout to stop listening
            const duration = settings.voiceAssistantDurationSeconds || 20;
            console.log(`🎙️ Voice session starting with ${duration}s timeout`);
            voiceTimeoutRef.current = setTimeout(() => {
                console.log('🎙️ Voice session timeout reached');
                toggleListening(false);
            }, duration * 1000);

        } catch (error: any) {
            console.error('🎙️ RecordSwingSpark: Failed to start voice listening:', error);
            setIsListening(false);
            setCurrentTranscript('');
            Alert.alert("Error", error.message || "Failed to start voice recognition");
        }
    }, [voiceContext, lastRecording, settings.voiceAssistantDurationSeconds]);

    const handleUpdateRecording = async (timestamp: number, updates: Partial<RecordedSwing>) => {
        setRecordings(prev => prev.map(r => r.timestamp === timestamp ? { ...r, ...updates } : r));
        // Also update in storage
        const data = await RecordSwingStorageService.getData();
        const updatedRecordings = data.recordings.map(r => r.timestamp === timestamp ? { ...r, ...updates } : r);
        await RecordSwingStorageService.saveData({ ...data, recordings: updatedRecordings });
    };

    const handleTriggerRecording = () => {
        setTriggerCount(prev => prev + 1);
        HapticFeedback.success();
    };

    const toggleListening = (value: boolean) => {
        console.log('🎙️ RecordSwingSpark: toggleListening called with:', value);
        if (value) {
            startVoiceListening();
        } else {
            console.log('🎙️ RecordSwingSpark: stopping voice session');
            if (voiceTimeoutRef.current) {
                clearTimeout(voiceTimeoutRef.current);
                voiceTimeoutRef.current = null;
            }
            ExpoSpeechRecognitionModule.stop();
            setVoiceContext('idle');
        }
    };

    // -- Voice Event Hooks --
    useSpeechRecognitionEvent("start", () => {
        console.log('🎙️ Voice Event: start');
        setIsListening(true);
    });
    useSpeechRecognitionEvent("end", () => {
        console.log('🎙️ Voice Event: end');
        setIsListening(false);
        setCurrentTranscript("");
    });
    useSpeechRecognitionEvent("result", (event) => {
        const text = event.results[0]?.transcript || "";
        console.log('🎙️ Voice Event: result', text);
        setCurrentTranscript(text);

        const lowerText = text.toLowerCase();

        // 1. Record Swing (Idle)
        if (voiceContext === 'idle' && lowerText.includes('record swing')) {
            setVoiceContext('recording');
            handleTriggerRecording();
            setCurrentTranscript('');
            return;
        }

        // 2. Stop Recording (Recording)
        if (voiceContext === 'recording' && lowerText.includes('stop recording')) {
            setTriggerCount(prev => prev > 0 ? -Math.abs(prev) - 1 : prev - 1);
            setVoiceContext('reviewing');
            setCurrentTranscript('');
            return;
        }

        // 3. Quality & Distance (Reviewing)
        if (voiceContext === 'reviewing') {
            let updated = false;
            const updates: Partial<RecordedSwing> = {};

            if (lowerText.includes('good shot')) {
                updates.quality = 'good';
                updated = true;
            } else if (lowerText.includes('bad shot')) {
                updates.quality = 'bad';
                updated = true;
            }

            const yardMatch = lowerText.match(/(\d+)\s*yards?/);
            if (yardMatch) {
                updates.distance = yardMatch[1] + ' yards';
                updated = true;
            }

            if (updated && lastRecording) {
                handleUpdateRecording(lastRecording.timestamp, updates);
                setCurrentTranscript('');
                HapticFeedback.success();
            }
        }
    });
    useSpeechRecognitionEvent("error", (event) => {
        console.warn("🎙️ Voice Event: error", event.error, event.message);
        setIsListening(false);
        setCurrentTranscript("");
        // Only show alert for real errors, not just speech-not-found
        if (event.error !== 'no-speech') {
            Alert.alert("Voice Activation Error", event.message || event.error);
        }
    });

    // -- Effects & Video --

    // Video Player
    const player = useVideoPlayer(selectedVideo?.uri || '', (player) => {
        player.loop = true;
        player.play();
    });

    useEffect(() => {
        if (selectedVideo?.uri) {
            console.log('🎥 RecordSwingSpark: Updating player source to:', selectedVideo.uri);
            player.replace(selectedVideo.uri);
            player.play();
        }
    }, [selectedVideo?.uri, player]);

    useEffect(() => {
        player.playbackRate = playbackRate;
    }, [player, playbackRate]);

    useEffect(() => {
        // Subscribe to player status
        const subscription = player.addListener('playingChange', (event) => {
            setIsPlaying(event.isPlaying);
        });
        return () => subscription.remove();
    }, [player]);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            const data = await RecordSwingStorageService.getData();
            setRecordings(data.recordings);
            setSettings(data.settings);
            setLoading(false);
        };
        loadData();
    }, []);

    // Handle new recording
    const handleRecordingComplete = useCallback(async (recording: RecordedSwing) => {
        const updatedData = await RecordSwingStorageService.addRecording(recording);
        setRecordings(updatedData.recordings);
        setLastRecording(recording);
        HapticFeedback.success();

        // 1. Auto-play if enabled
        if (settings.autoPlay) {
            setSelectedVideo(recording);
            setVoiceContext('reviewing');
        } else {
            setVoiceContext('reviewing'); // Still allow quality tagging even if not auto-played
        }

        // 2. Resume listening if it was on
        if (isListening) {
            setTimeout(() => {
                startVoiceListening();
            }, 500);
        }
    }, [isListening, settings.autoPlay, startVoiceListening]);



    const deleteRecording = async (timestamp: number) => {
        Alert.alert(
            'Delete Recording',
            'Are you sure you want to delete this swing?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedData = await RecordSwingStorageService.deleteRecording(timestamp);
                        setRecordings(updatedData.recordings);
                        HapticFeedback.light();
                    },
                },
            ]
        );
    };

    const updateSettings = async (newSettings: Partial<RecordSwingSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        await RecordSwingStorageService.updateSettings(updated);
    };

    const renderItem = ({ item }: { item: RecordedSwing }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => setSelectedVideo(item)}
        >
            <View style={[styles.thumbnail, { backgroundColor: colors.border + '40' }]}>
                {item.thumbnail ? (
                    <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24 }}>📹</Text>
                    </View>
                )}
            </View>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Swing {item.quality ? (item.quality === 'good' ? '✅' : '❌') : ''}
                    </Text>
                    <TouchableOpacity onPress={() => deleteRecording(item.timestamp)}>
                        <Text style={{ color: colors.error, padding: 4 }}>Delete</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {new Date(item.timestamp).toLocaleString()}
                </Text>
                {item.distance && (
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                        📏 {item.distance}
                    </Text>
                )}
                <Text style={[styles.playIndicator, { color: colors.primary }]}>▶️ Tap to Play</Text>
            </View>
        </TouchableOpacity>
    );

    if (propsShowSettings) {
        return (
            <RecordSwingSettingsView
                settings={settings}
                onSave={async (newSettings) => {
                    await updateSettings(newSettings);
                    onCloseSettings?.();
                }}
                onCancel={() => onCloseSettings?.()}
            />
        );
    }

    return (
        <BaseSpark>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>🏌️‍♂️ Record Swing</Text>
                </View>

                <View style={[styles.voiceActivationContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                            styles.micButton,
                            { backgroundColor: isListening ? '#ff4444' : colors.primary }
                        ]}
                        onPress={() => {
                            console.log('🎙️ RecordSwingSpark: Mic Button Pressed, isListening:', isListening);
                            if (isListening) {
                                toggleListening(false);
                            } else {
                                toggleListening(true);
                            }
                        }}
                    >
                        <Text style={styles.micIcon}>{isListening ? '⏹️' : '🎙️'}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.listenLabel, { color: colors.text }]}>
                        {isListening ? (
                            voiceContext === 'idle' ? 'Listening for "Record Swing"...' :
                                voiceContext === 'recording' ? 'Listening for "Stop Recording"...' :
                                    'Listening for "Good Shot" / Distance...'
                        ) : 'Tap for Voice Activation'}
                    </Text>
                    <Text style={[styles.listenSubtext, { color: colors.textSecondary }]}>
                        Say "Record Swing" to start hands-free
                    </Text>

                    <View style={{ width: '100%', marginTop: 8 }}>
                        <VoiceTranscript
                            transcript={currentTranscript}
                            isListening={isListening}
                        />
                    </View>
                </View>

                <View style={styles.recordSection}>
                    <RecordSwing
                        onRecordingComplete={handleRecordingComplete}
                        countdownSeconds={settings.countdownSeconds}
                        durationSeconds={settings.durationSeconds}
                        triggerCount={triggerCount}
                        isWaitingForVoice={isListening}
                        muteVideo={settings.voiceControlDuringRecording}
                        colors={colors}
                    />
                </View>

                <Text style={[styles.listTitle, { color: colors.text }]}>Recent Swings</Text>
                <FlatList
                    data={recordings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.timestamp.toString()}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No recordings yet. Tap the button above to start!
                        </Text>
                    }
                />

                {/* Video Player Modal */}
                <Modal
                    visible={!!selectedVideo}
                    transparent={false}
                    animationType="slide"
                    onRequestClose={() => {
                        setSelectedVideo(null);
                        setVoiceContext('idle');
                    }}
                >
                    <View style={[styles.videoPlayerModal, { backgroundColor: '#000' }]}>
                        {selectedVideo && (
                            <>
                                <VideoView
                                    player={player}
                                    style={styles.fullVideo}
                                    contentFit="contain"
                                    allowsFullscreen
                                    allowsPictureInPicture
                                />
                                <View style={styles.playbackControls}>
                                    <View style={styles.speedControls}>
                                        {[1.0, 0.5, 0.25].map((rate) => (
                                            <TouchableOpacity
                                                key={rate}
                                                style={[
                                                    styles.speedButton,
                                                    playbackRate === rate && { backgroundColor: colors.primary }
                                                ]}
                                                onPress={() => {
                                                    setPlaybackRate(rate);
                                                    player.play();
                                                    HapticFeedback.light();
                                                }}
                                            >
                                                <Text style={[styles.speedButtonText, playbackRate === rate && { color: '#fff' }]}>
                                                    {rate === 1.0 ? "1x" : `${rate}x`}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                                        onPress={() => {
                                            setSelectedVideo(null);
                                            setPlaybackRate(1.0);
                                            setVoiceContext('idle');
                                        }}
                                    >
                                        <Text style={[styles.modalCloseButtonText, { color: colors.text }]}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </Modal>
            </View>
        </BaseSpark>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    settingsLink: {
        fontSize: 16,
        fontWeight: '600',
    },
    voiceActivationContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    micButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    micIcon: {
        fontSize: 32,
        color: '#fff',
    },
    listenLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    listenSubtext: {
        fontSize: 12,
        textAlign: 'center',
    },
    recordSection: {
        marginBottom: 30,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    listContainer: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    thumbnail: {
        width: 100,
        height: 80,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 11,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
        fontStyle: 'italic',
    },
    playIndicator: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    videoPlayerModal: {
        flex: 1,
        justifyContent: 'center',
    },
    fullVideo: {
        flex: 1,
        width: '100%',
    },
    playbackControls: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    speedControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 20,
    },
    speedButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#333',
        minWidth: 60,
        alignItems: 'center',
    },
    speedButtonText: {
        color: '#ccc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalCloseButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default RecordSwingSpark;
