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
    ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RecordSwing, RecordedSwing } from '../components/RecordSwing';
import { VoiceCommandService } from '../services/VoiceCommandService';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { isExpoGo } from '../utils/expoGoDetection';
import { HapticFeedback } from '../utils/haptics';
import { BaseSpark } from '../components/BaseSpark';
import { useSparkStore } from '../store';

export interface RecordSwingSettings {
    countdownSeconds: number;
    durationSeconds: number;
    voiceAssistantDurationSeconds: number; // Moved up
    autoPlay: boolean;
    voiceControlDuringRecording: boolean;
    isListeningMode: boolean;
}
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SaveCancelButtons,
    SettingsFeedbackSection,
} from '../components/SettingsComponents';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { VoiceTranscript } from '../components/shared';
import ConfettiCannon from 'react-native-confetti-cannon';

// Dropdown Component
const Dropdown = React.forwardRef<
    { open: () => void },
    {
        options: readonly string[];
        selectedValue: string;
        onSelect: (value: string) => void;
        placeholder?: string;
        style?: any;
        textStyle?: any;
    }
>(
    (
        { options, selectedValue, onSelect, placeholder, style, textStyle },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const { colors } = useTheme();

        React.useImperativeHandle(ref, () => ({
            open: () => setIsOpen(true),
        }));

        const shouldUseModal = options.length >= 5;

        return (
            <View style={{ position: "relative" }}>
                <TouchableOpacity
                    onPress={() => setIsOpen(!isOpen)}
                    style={[
                        style,
                        {
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderWidth: 1,
                            borderRadius: 8,
                            padding: 12,
                            borderColor: colors.border
                        },
                    ]}
                    activeOpacity={0.7}
                >
                    <Text style={[textStyle, { color: selectedValue ? colors.text : colors.textSecondary }]}>
                        {selectedValue || placeholder}
                    </Text>
                    <Text style={[textStyle, { fontSize: 12, color: colors.textSecondary }]}>
                        {isOpen ? "▲" : "▼"}
                    </Text>
                </TouchableOpacity>

                {isOpen && shouldUseModal ? (
                    <Modal
                        visible={isOpen}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setIsOpen(false)}
                    >
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,0.5)",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            activeOpacity={1}
                            onPress={() => setIsOpen(false)}
                        >
                            <View
                                style={{
                                    backgroundColor: colors.surface,
                                    borderRadius: 12,
                                    margin: 20,
                                    maxHeight: "70%",
                                    minWidth: "80%",
                                    elevation: 5,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 3.84,
                                }}
                                onStartShouldSetResponder={() => true}
                            >
                                <View
                                    style={{
                                        padding: 16,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: "600",
                                            textAlign: "center",
                                            color: colors.text
                                        }}
                                    >
                                        {placeholder || "Select Option"}
                                    </Text>
                                </View>
                                <ScrollView
                                    style={{ maxHeight: 300 }}
                                    showsVerticalScrollIndicator={true}
                                    bounces={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {options?.map((option) => (
                                        <TouchableOpacity
                                            key={option}
                                            onPress={() => {
                                                onSelect(option);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                padding: 16,
                                                borderBottomWidth: 1,
                                                borderBottomColor: colors.border,
                                                backgroundColor:
                                                    selectedValue === option ? colors.primary + '20' : "transparent",
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    textStyle,
                                                    {
                                                        color:
                                                            selectedValue === option ? colors.primary : colors.text,
                                                        fontWeight:
                                                            selectedValue === option ? "600" : "400",
                                                    },
                                                ]}
                                            >
                                                {option}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                ) : isOpen ? (
                    <View
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 6,
                            zIndex: 1000,
                            elevation: 5,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            maxHeight: 200,
                            marginTop: 2,
                        }}
                    >
                        <ScrollView
                            style={{ maxHeight: 200 }}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                            keyboardShouldPersistTaps="handled"
                            scrollEventThrottle={16}
                        >
                            {options?.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => {
                                        onSelect(option);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                        minHeight: 44,
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[textStyle, { color: colors.text }]}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}
            </View>
        );
    }
);

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
                        <Dropdown
                            options={Array.from({ length: 31 }, (_, i) => i.toString())}
                            selectedValue={tempSettings.countdownSeconds.toString()}
                            onSelect={(val) => setTempSettings(prev => ({ ...prev, countdownSeconds: parseInt(val) || 0 }))}
                            placeholder="Select delay"
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            Time to get into position before recording starts
                        </Text>
                    </View>

                    <View style={settingStyles.item}>
                        <Text style={[settingStyles.label, { color: colors.text }]}>Recording Duration (seconds)</Text>
                        <Dropdown
                            options={Array.from({ length: 31 }, (_, i) => i.toString())}
                            selectedValue={tempSettings.durationSeconds.toString()}
                            onSelect={(val) => setTempSettings(prev => ({ ...prev, durationSeconds: parseInt(val) || 5 }))}
                            placeholder="Select duration"
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            How long to record for each swing
                        </Text>
                    </View>

                    <View style={settingStyles.item}>
                        <Text style={[settingStyles.label, { color: colors.text }]}>Voice Assistant Duration (seconds)</Text>
                        <Dropdown
                            options={Array.from({ length: 30 }, (_, i) => (i + 1).toString())}
                            selectedValue={(tempSettings.voiceAssistantDurationSeconds ?? 20).toString()}
                            onSelect={(val) => setTempSettings(prev => ({ ...prev, voiceAssistantDurationSeconds: parseInt(val) || 20 }))}
                            placeholder="Select timeout"
                        />
                        <Text style={[settingStyles.helpText, { color: colors.textSecondary }]}>
                            How long the voice session stays active after tapping
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
    const { getSparkData, setSparkData, isHydrated } = useSparkStore();
    const [recordings, setRecordings] = useState<RecordedSwing[]>([]);
    const [settings, setSettings] = useState<RecordSwingSettings>({
        countdownSeconds: 5,
        durationSeconds: 5,
        autoPlay: false,
        voiceAssistantDurationSeconds: 20,
        voiceControlDuringRecording: false,
        isListeningMode: false,
    });
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [loading, setLoading] = useState(true);
    const [triggerCount, setTriggerCount] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState<RecordedSwing | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [voiceContext, setVoiceContext] = useState<'idle' | 'recording' | 'reviewing'>('idle');
    const [lastRecording, setLastRecording] = useState<RecordedSwing | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const confettiRef = useRef<any>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingCommandRef = useRef(false);

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

            // Clear any existing timers before starting a new session
            clearVoiceTimers();

            setCurrentTranscript('');
            const hasPermissions = await VoiceCommandService.requestPermissions();
            if (!hasPermissions) {
                Alert.alert("Permission Required", "Microphone permission is needed for voice activation.");
                return;
            }

            // Always stop first to ensure a fresh session and clear the native transcript buffer
            try { await ExpoSpeechRecognitionModule.stop(); } catch (e) { }

            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                maxAlternatives: 1,
                continuous: true,
                requiresOnDeviceRecognition: false,
                addsPunctuation: true,
            });

            // Set timeout to stop listening
            const duration = settings.voiceAssistantDurationSeconds || 20;
            console.log(`🎙️ Voice session starting with ${duration}s timeout`);
            setTimeLeft(duration);

            countdownIntervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev !== null && prev > 1) return prev - 1;
                    return 0;
                });
            }, 1000);

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

    const clearVoiceTimers = useCallback(() => {
        if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setTimeLeft(null);
    }, []);

    const handleUpdateRecording = (timestamp: number, updates: Partial<RecordedSwing>) => {
        setRecordings(prev => prev.map(r => r.timestamp === timestamp ? { ...r, ...updates } : r));
    };

    const handleTriggerRecording = () => {
        setTriggerCount(prev => prev + 1);
        HapticFeedback.success();
    };

    const toggleListening = (value: boolean) => {
        console.log('🎙️ RecordSwingSpark: toggleListening called with:', value);

        // Update local settings (Save useEffect will sync to store)
        setSettings(prev => ({ ...prev, isListeningMode: value }));

        if (value) {
            startVoiceListening();
        } else {
            console.log('🎙️ RecordSwingSpark: stopping voice session');
            clearVoiceTimers();
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
        if (!isListening || isProcessingCommandRef.current) return;

        const text = event.results[event.results.length - 1]?.transcript || "";
        const fullTranscriptText = (event.results[0]?.transcript || "");

        setCurrentTranscript(fullTranscriptText);

        const lowerText = text.toLowerCase();
        const lowerFull = fullTranscriptText.toLowerCase();

        // Check both latest chunk and full transcript for the command
        const hasStartCommand = lowerText.includes('record swing') || lowerText.includes('start recording') ||
            lowerFull.includes('record swing') || lowerFull.includes('start recording');

        // 1. Record Swing (Idle or Reviewing)
        if ((voiceContext === 'idle' || voiceContext === 'reviewing') && hasStartCommand) {
            console.log('🎙️ Command Detected: Record Swing');
            isProcessingCommandRef.current = true;
            setIsListening(false);
            setVoiceContext('recording');
            handleTriggerRecording();
            setCurrentTranscript('');
            clearVoiceTimers(); // Clear timers while recording
            ExpoSpeechRecognitionModule.stop();

            setTimeout(() => { isProcessingCommandRef.current = false; }, 2000);
            return;
        }

        // 2. Stop Recording (Recording)
        if (voiceContext === 'recording' && (lowerText.includes('stop recording') || lowerFull.includes('stop recording'))) {
            console.log('🎙️ Command Detected: Stop Recording');
            isProcessingCommandRef.current = true;
            setIsListening(false);
            setTriggerCount(prev => prev > 0 ? -Math.abs(prev) - 1 : prev - 1);
            setVoiceContext('reviewing');
            setCurrentTranscript('');
            clearVoiceTimers(); // Clear timers while reviewing
            ExpoSpeechRecognitionModule.stop();

            setTimeout(() => { isProcessingCommandRef.current = false; }, 2000);
            return;
        }

        // 3. Quality & Distance (Reviewing)
        if (voiceContext === 'reviewing') {
            let updated = false;
            const updates: Partial<RecordedSwing> = {};

            if (lowerText.includes('good shot') || lowerFull.includes('good shot')) {
                updates.quality = 'good';
                updated = true;
                setShowConfetti(true);
            } else if (lowerText.includes('bad shot') || lowerFull.includes('bad shot')) {
                updates.quality = 'bad';
                updated = true;
            }

            const yardMatch = lowerFull.match(/(\d+)\s*yards?/);
            if (yardMatch) {
                updates.distance = yardMatch[1] + ' yards';
                updated = true;
            }

            if (updated && lastRecording) {
                handleUpdateRecording(lastRecording.timestamp, updates);
                // Don't stop mic here, usually user says "Good shot, 150 yards" in one go or two
                // But we clear the transcript to show we heard it
                if (lowerText.includes('shot') || yardMatch) {
                    // We don't necessarily want to stop the whole session yet
                }
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

    // Video Player - only load source if we have a video selected to prevent "shadow" background audio
    const player = useVideoPlayer(selectedVideo ? selectedVideo.uri : '', (player) => {
        player.loop = false;
        // player.play() is handled in useEffect to ensure it only starts when we want it to
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
        const sub1 = player.addListener('playingChange', (event) => {
            setIsPlaying(event.isPlaying);
            // Detect end of playback: Not playing and (currentTime approx duration)
            if (!event.isPlaying && player.currentTime > 0 && Math.abs(player.currentTime - player.duration) < 0.5) {
                console.log('🎥 RecordSwingSpark: Playback finished detected via position, returning to listening state');
                player.pause(); // Ensure it stops
                setSelectedVideo(null);
                setVoiceContext('idle');
                // Auto-resume listening if it was active
                if (settings.isListeningMode) {
                    startVoiceListening();
                }
            }
        });
        return () => {
            sub1.remove();
        };
    }, [player, settings.isListeningMode, startVoiceListening, voiceContext]);

    // Ensure player pauses when modal closes to prevent shadow audio
    useEffect(() => {
        if (!selectedVideo) { // Using selectedVideo as a proxy for modal visibility
            player.pause();
        }
    }, [selectedVideo, player]);

    // Load data on mount
    useEffect(() => {
        if (!isHydrated) return;
        if (dataLoaded) return;

        const loadData = () => {
            console.log('🔄 RecordSwingSpark: Loading data from sparkStore');
            const data = getSparkData('record-swing');
            if (data.recordings) setRecordings(data.recordings);
            if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));

            setLoading(false);
            setDataLoaded(true);

            // Auto-start listening if was active in database
            if (data.settings?.isListeningMode) {
                setTimeout(() => {
                    startVoiceListening();
                }, 500);
            }
        };
        loadData();

        return () => {
            clearVoiceTimers();
        };
    }, [isHydrated, dataLoaded, getSparkData, startVoiceListening, clearVoiceTimers]);

    // Save data whenever recordings or settings change
    useEffect(() => {
        if (!dataLoaded) return;

        console.log('💾 RecordSwingSpark: Saving data to sparkStore');
        setSparkData('record-swing', {
            recordings,
            settings
        });
    }, [recordings, settings, setSparkData, dataLoaded]);

    // Handle new recording
    const handleRecordingComplete = useCallback((recording: RecordedSwing) => {
        setRecordings(prev => [recording, ...prev]);
        setLastRecording(recording);
        HapticFeedback.success();

        // 1. Auto-play if enabled
        if (settings.autoPlay) {
            setSelectedVideo(recording);
            setVoiceContext('reviewing');
        } else {
            setVoiceContext('reviewing'); // Still allow quality tagging even if not auto-played
        }

        // 2. Resume listening if it was on AND we aren't auto-playing (otherwise wait for playback finish)
        if (settings.isListeningMode && !settings.autoPlay) {
            setTimeout(() => {
                startVoiceListening();
            }, 500);
        }
    }, [settings.isListeningMode, settings.autoPlay, startVoiceListening]);



    const deleteRecording = (timestamp: number) => {
        Alert.alert(
            'Delete Recording',
            'Are you sure you want to delete this swing?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setRecordings(prev => prev.filter(r => r.timestamp !== timestamp));
                        HapticFeedback.light();
                    },
                },
            ]
        );
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
                        Swing {item.quality === 'good' ? '🔥' : item.quality === 'bad' ? '💩' : ''}
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
                onSave={(newSettings) => {
                    setSettings(newSettings);
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
                            voiceContext === 'idle' ? `Listening for "Record Swing"... ${timeLeft !== null ? `[${timeLeft}s]` : ''}` :
                                voiceContext === 'recording' ? `Listening for "Stop Recording"... ${timeLeft !== null ? `[${timeLeft}s]` : ''}` :
                                    `Listening for "Good Shot" / Distance... ${timeLeft !== null ? `[${timeLeft}s]` : ''}`
                        ) : 'Tap for Voice Activation'}
                    </Text>
                    {voiceContext === 'idle' && (
                        <Text style={[styles.listenSubtext, { color: colors.textSecondary }]}>
                            Say "Record Swing" to start hands-free
                        </Text>
                    )}

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
                        onCountdownStart={() => {
                            console.log('🎥 RecordSwingSpark: Countdown started, clearing timers');
                            clearVoiceTimers();

                            // If we don't want voice control during recording, stop the engine to prevent interference
                            if (!settings.voiceControlDuringRecording) {
                                console.log('🎥 RecordSwingSpark: Stopping voice engine for recording duration');
                                setIsListening(false);
                                ExpoSpeechRecognitionModule.stop();
                            }
                        }}
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
                                            player.pause(); // Ensure audio stops
                                            setSelectedVideo(null);
                                            setPlaybackRate(1.0);
                                            setVoiceContext('idle');
                                            // Resume listening when returning to main screen
                                            if (settings.isListeningMode) {
                                                setTimeout(() => startVoiceListening(), 500);
                                            }
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

            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: width / 2, y: 0 }}
                    fadeOut={true}
                    fallSpeed={3000}
                    onAnimationEnd={() => setShowConfetti(false)}
                />
            )}
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
