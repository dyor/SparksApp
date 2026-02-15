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
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RecordSwing, RecordedSwing } from '../components/RecordSwing';
import { RecordSwingStorageService, RecordSwingSettings } from '../services/RecordSwingStorageService';
import { VoiceCommandService } from '../services/VoiceCommandService';
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
import { AVPlaybackStatus, VideoFullscreenUpdate, Video, ResizeMode } from 'expo-av';

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
    });
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(true);
    const [triggerCount, setTriggerCount] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState<RecordedSwing | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isPlaying, setIsPlaying] = useState(false);
    const modalVideoRef = useRef<Video>(null);

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
        HapticFeedback.success();

        // Resume listening if it was on
        if (isListening) {
            startVoiceListening();
        }
    }, [isListening]);

    // Voice Command Logic
    const startVoiceListening = useCallback(async () => {
        try {
            await VoiceCommandService.startListening(
                (text, isFinal) => {
                    console.log('Voice Command:', text);
                    if (text.toLowerCase().includes('record swing')) {
                        VoiceCommandService.stopListening(); // Stop listening while recording
                        handleTriggerRecording();
                    }
                },
                (error) => {
                    console.error('Voice Command Error:', error);
                    setIsListening(false);
                },
                (listening) => {
                    setIsListening(listening);
                }
            );
        } catch (error) {
            console.error('Failed to start voice listening:', error);
            setIsListening(false);
        }
    }, []);

    const handleTriggerRecording = () => {
        setTriggerCount(prev => prev + 1);
        HapticFeedback.success();
    };

    const toggleListening = (value: boolean) => {
        if (value) {
            startVoiceListening();
        } else {
            VoiceCommandService.stopListening();
            setIsListening(false);
        }
    };

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
            <Video
                source={{ uri: item.uri }}
                style={styles.thumbnail}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                usePoster
            />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Swing Recording
                    </Text>
                    <TouchableOpacity onPress={() => deleteRecording(item.timestamp)}>
                        <Text style={{ color: colors.error, padding: 4 }}>Delete</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {new Date(item.timestamp).toLocaleString()}
                </Text>
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

                <View style={[styles.listenContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.listenInfo}>
                        <Text style={[styles.listenLabel, { color: colors.text }]}>
                            {isListening ? '🎤 Listening for "Record Swing"...' : 'Voice Activation'}
                        </Text>
                        <Text style={[styles.listenSubtext, { color: colors.textSecondary }]}>
                            Say "Record Swing" to start hands-free
                        </Text>
                    </View>
                    <Switch
                        value={isListening}
                        onValueChange={toggleListening}
                        trackColor={{ false: '#767577', true: colors.primary }}
                    />
                </View>

                <View style={styles.recordSection}>
                    <RecordSwing
                        onRecordingComplete={handleRecordingComplete}
                        countdownSeconds={settings.countdownSeconds}
                        durationSeconds={settings.durationSeconds}
                        triggerCount={triggerCount}
                        isWaitingForVoice={isListening}
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
                    onRequestClose={() => setSelectedVideo(null)}
                >
                    <View style={[styles.videoPlayerModal, { backgroundColor: '#000' }]}>
                        {selectedVideo && (
                            <>
                                <Video
                                    ref={modalVideoRef}
                                    source={{ uri: selectedVideo.uri }}
                                    style={styles.fullVideo}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    useNativeControls
                                    isLooping
                                    rate={playbackRate}
                                    shouldCorrectPitch={false}
                                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                                        if (status.isLoaded) {
                                            setIsPlaying(status.isPlaying);
                                        }
                                    }}
                                    onFullscreenUpdate={(event) => {
                                        if (
                                            event.fullscreenUpdate ===
                                            VideoFullscreenUpdate.PLAYER_DID_DISMISS
                                        ) {
                                            if (modalVideoRef.current) {
                                                modalVideoRef.current.pauseAsync();
                                            }
                                        }
                                    }}
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
                                                onPress={async () => {
                                                    setPlaybackRate(rate);
                                                    if (modalVideoRef.current) {
                                                        await modalVideoRef.current.playAsync();
                                                    }
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
    listenContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    listenInfo: {
        flex: 1,
    },
    listenLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    listenSubtext: {
        fontSize: 12,
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
