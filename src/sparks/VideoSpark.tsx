import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    Dimensions,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BaseSpark } from '../components/BaseSpark';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { VideoRecorderView } from '../components/VideoRecorderView';
import { ScreenRecorder } from '../services/ScreenRecorderService';
import { VideoEditorModal } from '../components/VideoEditorModal';
import { GeminiService } from '../services/GeminiService';
import * as ImagePicker from 'expo-image-picker';
import { burnScript, BurnScriptItem } from 'video-overlay';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SettingsButton,
    SettingsSection,
    SettingsToggle,
} from '../components/SettingsComponents';
import * as FileSystem from 'expo-file-system';
import { BetaBadge } from '../components/BetaBadge';
import { getSparkById } from '../components/SparkRegistry';

export interface VideoAI {
    id: string;
    uri: string;
    thumbnail?: string;
    source: 'screen' | 'front_camera' | 'rear_camera' | 'overlay';
    script?: string;
    status: 'recording' | 'recorded' | 'editing' | 'publishing' | 'published' | 'archived';
    countdownSeconds: number;
    durationSeconds: number;
    timestamp: number;
    metadata?: {
        youtubeUrl?: string;
        instagramUrl?: string;
        isYouTubePublished?: boolean;
        isInstagramPublished?: boolean;
    };
}

interface VideoSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

const EMPTY_VIDEOS: VideoAI[] = [];

const VideoSpark: React.FC<VideoSparkProps> = ({
    showSettings = false,
    onCloseSettings
}) => {
    const { colors } = useTheme();
    const { setSparkData, isHydrated, videoCapture, setVideoCaptureData } = useSparkStore();

    // Reactive access to videos from the store
    const videos = useSparkStore(state => state.sparkData['video']?.videos ?? EMPTY_VIDEOS) as VideoAI[];

    // Recorder State
    const [showRecorder, setShowRecorder] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [screenRecordTimer, setScreenRecordTimer] = useState(0);
    const [isScreenRecording, setIsScreenRecording] = useState(false);

    const [selectedVideoForEdit, setSelectedVideoForEdit] = useState<{ video: VideoAI, mode: 'recording' | 'publishing' } | null>(null);
    const [isImprovingScript, setIsImprovingScript] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'recording' | 'publishing' | 'archived'>('recording');
    const [isAutoExporting, setIsAutoExporting] = useState(false);

    const sparkRecord = getSparkById('video-spark');
    const displayTitle = sparkRecord?.metadata.title || 'Video';

    const hasOverlays = (script?: string) => {
        if (!script) return false;
        return /^(\d+)s?-(\d+)s?:\s*(.+)$/im.test(script);
    };


    // Handle Screen Recording Auto-Finish & Script Timer
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        const listener = (status: any) => {
            if (status === 'recording') {
                setIsScreenRecording(true);
                setScreenRecordTimer(0);
                interval = setInterval(() => setScreenRecordTimer(prev => prev + 0.1), 100);
            } else if (status === 'idle') {
                setIsScreenRecording(false);
                if (interval) clearInterval(interval);
            }
        };

        ScreenRecorder.addListener(listener);
        return () => {
            ScreenRecorder.removeListener(listener);
            if (interval) clearInterval(interval);
        };
    }, []);

    const handleCreateNewVideo = () => {
        HapticFeedback.light();
        setShowOptions(true);
    };

    const startRecordingSession = () => {
        setShowOptions(false);

        let finalSource = videoCapture.source;
        if (Platform.OS === 'android' && finalSource === 'screen') {
            finalSource = 'front_camera';
        }

        if (finalSource === 'screen') {
            ScreenRecorder.startRecording();
            return;
        }

        setShowRecorder(true);
    };

    const improveScriptWithAI = async () => {
        if (isImprovingScript) return;

        setIsImprovingScript(true);
        HapticFeedback.light();

        try {
            const shotType = videoCapture.source === 'screen' ? 'a screen recording walkthrough' :
                videoCapture.source === 'front_camera' ? 'a front-facing camera selfie shot' :
                    'a rear-facing camera cinematic shot';

            const prompt = `You are a professional social media scriptwriter for short-form video (Shorts/Reels).
            Create a punchy, engaging script for a ${videoCapture.durationSeconds} second video. 
            The context is ${shotType}. 
            Current ideas/notes: "${videoCapture.script || 'A creative video spark'}"
            
            IMPORTANT: Return the script with TIMESTAMPS in the following EXACT format:
            0s-5s: [First sentence/action]
            5s-10s: [Next sentence/action]
            ...and so on until ${videoCapture.durationSeconds}s.
            
            Keep sentences short and high-impact. Return ONLY the script text with timestamps.`;

            const improved = await GeminiService.generateContent(prompt);
            setAiRecommendation(improved.trim());
            HapticFeedback.success();
        } catch (error) {
            console.error('Gemini Error:', error);
            Alert.alert('Gemini Error', 'Failed to improve script. Check your API key in settings.');
        } finally {
            setIsImprovingScript(false);
        }
    };

    const applyAiScript = () => {
        if (aiRecommendation) {
            setVideoCaptureData({ script: aiRecommendation });
            setAiRecommendation(null);
            HapticFeedback.success();
        }
    };

    const handleRecordingComplete = async (uri: string, source: 'front_camera' | 'rear_camera') => {
        setShowRecorder(false);
        HapticFeedback.success();

        let finalUri = uri;
        let finalSource: VideoAI['source'] = source;
        let finalStatus: VideoAI['status'] = 'recorded';

        // Automated Export with Overlays check
        if (videoCapture.includeSubtitles && hasOverlays(videoCapture.script)) {
            setIsAutoExporting(true);
            try {
                const lines = (videoCapture.script || '').split('\n');
                const scriptItems: BurnScriptItem[] = lines.map(line => {
                    const match = line.match(/^(\d+)s?-(\d+)s?:\s*(.+)$/i);
                    if (match) {
                        return {
                            start: parseInt(match[1]),
                            end: parseInt(match[2]),
                            text: match[3]
                        };
                    }
                    return null;
                }).filter((item): item is BurnScriptItem => item !== null);

                if (scriptItems.length > 0) {
                    const filename = `SparkAuto_${Date.now()}.mp4`;
                    const outputUri = FileSystem.documentDirectory + filename;
                    const resultUri = await burnScript(uri, scriptItems, outputUri);
                    finalUri = resultUri;
                    finalSource = 'overlay';

                    // Archive the original raw video
                    const rawVideo: VideoAI = {
                        id: Date.now().toString() + '_raw',
                        uri,
                        source,
                        script: videoCapture.script,
                        status: 'archived',
                        countdownSeconds: videoCapture.countdownSeconds,
                        durationSeconds: videoCapture.durationSeconds,
                        timestamp: Date.now(),
                    };
                    setSparkData('video', { videos: [rawVideo, ...videos] });
                }
            } catch (e) {
                console.error('Auto Export Error:', e);
            } finally {
                setIsAutoExporting(false);
            }
        }

        const newVideo: VideoAI = {
            id: Date.now().toString(),
            uri: finalUri,
            source: finalSource,
            script: videoCapture.script,
            status: finalStatus,
            countdownSeconds: videoCapture.countdownSeconds,
            durationSeconds: videoCapture.durationSeconds,
            timestamp: Date.now(),
        };

        setSparkData('video', { videos: [newVideo, ...videos] });
    };

    const handleSaveVideo = (updatedVideo: VideoAI) => {
        const updatedVideos = videos.map(v => v.id === updatedVideo.id ? updatedVideo : v);
        setSparkData('video', { videos: updatedVideos });
        setSelectedVideoForEdit(null);
    };

    const handleDeleteVideoFromModal = (id: string) => {
        Alert.alert(
            'Delete Video',
            'Are you sure you want to delete this video? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updatedVideos = videos.filter(v => v.id !== id);
                        setSparkData('video', { videos: updatedVideos });
                        setSelectedVideoForEdit(null);
                        HapticFeedback.success();
                    }
                }
            ]
        );
    };

    const handleStartPublishing = (video: VideoAI) => {
        Alert.alert(
            'Start Publishing',
            'Please select your final edited video from your Photos app to continue to YouTube Shorts.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Select Video',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                                allowsEditing: false,
                                quality: 1,
                            });

                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const selectedUri = result.assets[0].uri;
                                HapticFeedback.success();

                                // Persist selected file to app storage
                                const filename = `Published_${Date.now()}.mp4`;
                                const persistentUri = FileSystem.documentDirectory + filename;
                                await FileSystem.copyAsync({ from: selectedUri, to: persistentUri });

                                const updatedVideos = videos.map(v =>
                                    v.id === video.id
                                        ? { ...v, uri: persistentUri, status: 'publishing' as const }
                                        : v
                                );
                                setSparkData('video', { videos: updatedVideos });
                                Alert.alert('Ready to Publish', 'Final video selected. It is now ready for upload to YouTube Shorts.');
                            }
                        } catch (error) {
                            console.error('Picker Error:', error);
                            Alert.alert('Error', 'Failed to select video. Make sure you have granted Photos permissions.');
                        }
                    }
                }
            ]
        );
    };

    const deleteVideo = (id: string) => {
        Alert.alert(
            'Delete Video',
            'Are you sure you want to delete this video?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const updatedVideos = videos.filter(v => v.id !== id);
                        setSparkData('video', { videos: updatedVideos });
                        HapticFeedback.success();
                    },
                },
            ]
        );
    };

    const renderVideoCard = (video: VideoAI) => {
        const dateStr = new Date(video.timestamp).toLocaleString();

        return (
            <TouchableOpacity
                key={video.id}
                style={[styles.card, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
                onPress={() => setSelectedVideoForEdit({ video, mode: activeTab === 'publishing' ? 'publishing' : 'recording' })}
            >
                <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border + '40' }]}>
                    {video.thumbnail ? (
                        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                    ) : (
                        <Text style={styles.thumbnailEmoji}>
                            {video.source === 'screen' ? '📱' : '📷'}
                        </Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(video.status) }]}>
                        <Text style={styles.statusText}>{video.status.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {video.source === 'screen' ? 'SCREEN RECORDING' :
                                video.source === 'overlay' ? 'OVERLAY' :
                                    video.source.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {dateStr}
                    </Text>
                    <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>
                        {video.durationSeconds}s • {video.countdownSeconds}s delay
                    </Text>
                    {video.script && (
                        <Text style={[styles.scriptPreview, { color: colors.primary }]} numberOfLines={1}>
                            📜 {video.script}
                        </Text>
                    )}

                    {activeTab === 'publishing' && (video.status === 'editing' || video.status === 'recorded') && (
                        <TouchableOpacity
                            style={[styles.publishActionBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleStartPublishing(video)}
                        >
                            <Text style={styles.publishActionBtnText}>Start Publishing</Text>
                        </TouchableOpacity>
                    )}

                    {activeTab === 'publishing' && video.status === 'publishing' && (
                        <TouchableOpacity
                            style={[styles.publishActionBtn, { backgroundColor: '#FF0000' }]}
                            onPress={() => setSelectedVideoForEdit({ video, mode: 'publishing' })}
                        >
                            <Text style={styles.publishActionBtnText}>🏁 Ready to Publish</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const getStatusColor = (status: VideoAI['status']) => {
        switch (status) {
            case 'recording': return '#ff4444';
            case 'recorded': return '#4bb543';
            case 'editing': return '#ffbb33';
            case 'publishing': return '#33b5e5';
            case 'published': return '#00C851';
            case 'archived': return '#999';
            default: return '#999';
        }
    };

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title={`${displayTitle} Settings`}
                        subtitle="Capture and publish professional video sparks"
                        icon="🎥"
                        sparkId="video-spark"
                    />
                    <SettingsFeedbackSection sparkName="Video" sparkId="video" />

                    <SettingsSection title="Video Preferences">
                        <SettingsToggle
                            label="Include Subtitles Automatically"
                            value={videoCapture.includeSubtitles}
                            onValueChange={(val) => setVideoCaptureData({ includeSubtitles: val })}
                        />
                        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                            When enabled, we will automatically burn your script overlays into camera recordings if timestamps are detected.
                        </Text>
                    </SettingsSection>

                    <View style={{ paddingVertical: 20 }}>
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

    return (
        <BaseSpark>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>🎬✨ Video</Text>
                </View>

                {/* Studio Tabs */}
                <View style={styles.tabsRow}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('recording')}
                        style={[styles.tab, activeTab === 'recording' && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, activeTab === 'recording' && styles.activeTabText]}>Recording</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('publishing')}
                        style={[styles.tab, activeTab === 'publishing' && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, activeTab === 'publishing' && styles.activeTabText]}>Publishing </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('archived')}
                        style={[styles.tab, activeTab === 'archived' && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>Archived </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'recording' ? (
                    <>
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: colors.primary }]}
                            onPress={handleCreateNewVideo}
                        >
                            <Text style={styles.createButtonText}>+ Create New Video</Text>
                        </TouchableOpacity>

                        <View style={styles.listContainer}>

                            {videos.filter(v => ['recording', 'recorded', 'editing'].includes(v.status)).length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No active recordings. Start by creating a new one!
                                    </Text>
                                </View>
                            ) : (
                                videos.filter(v => ['recording', 'recorded', 'editing'].includes(v.status)).map(renderVideoCard)
                            )}
                        </View>
                    </>
                ) : activeTab === 'publishing' ? (
                    <View style={styles.listContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Publishing Pipeline</Text>
                        <Text style={[styles.tabSubtext, { color: colors.textSecondary }]}>
                            Manage videos ready for social media. 'Recorded' or 'Editing' videos can be sent to the publishing queue.
                        </Text>

                        {videos.filter(v => ['recorded', 'editing', 'publishing', 'published'].includes(v.status)).length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No videos in the pipeline. Finish a recording to see it here!
                                </Text>
                            </View>
                        ) : (
                            videos.filter(v => ['recorded', 'editing', 'publishing', 'published'].includes(v.status)).map(renderVideoCard)
                        )}
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Project Archive</Text>
                        <Text style={[styles.tabSubtext, { color: colors.textSecondary }]}>
                            Original raw recordings and completed projects are stored here.
                        </Text>

                        {videos.filter(v => v.status === 'archived').length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No archived videos yet.
                                </Text>
                            </View>
                        ) : (
                            videos.filter(v => v.status === 'archived').map(renderVideoCard)
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Creation Options Modal */}
            <Modal visible={showOptions} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalBackdrop}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.keyboardView}
                        >
                            <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.optionsScrollContent}
                                >
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>New Video Setup</Text>

                                    <View style={styles.inputRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 5 }]}>Delay (s)</Text>
                                            <TextInput
                                                style={[styles.smallInput, { borderColor: colors.border, color: colors.text }]}
                                                value={videoCapture.countdownSeconds.toString()}
                                                onChangeText={(v) => setVideoCaptureData({ countdownSeconds: parseInt(v) || 0 })}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 5 }]}>Limit (s)</Text>
                                            <TextInput
                                                style={[styles.smallInput, { borderColor: colors.border, color: colors.text }]}
                                                value={videoCapture.durationSeconds.toString()}
                                                onChangeText={(v) => setVideoCaptureData({ durationSeconds: parseInt(v) || 0 })}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Recording Source</Text>
                                    <View style={styles.sourceButtons}>
                                        {Platform.OS === 'ios' && (
                                            <TouchableOpacity
                                                style={[styles.sourceButton, { borderColor: videoCapture.source === 'screen' ? colors.primary : colors.border }]}
                                                onPress={() => setVideoCaptureData({ source: 'screen' })}
                                            >
                                                <Text style={styles.sourceButtonEmoji}>📱</Text>
                                                <Text style={[styles.sourceButtonText, { color: colors.text }]}>Screen</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.sourceButton, { borderColor: (videoCapture.source === 'front_camera' || (Platform.OS === 'android' && videoCapture.source === 'screen')) ? colors.primary : colors.border }]}
                                            onPress={() => setVideoCaptureData({ source: 'front_camera' })}
                                        >
                                            <Text style={styles.sourceButtonEmoji}>🤳</Text>
                                            <Text style={[styles.sourceButtonText, { color: colors.text }]}>Front</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sourceButton, { borderColor: videoCapture.source === 'rear_camera' ? colors.primary : colors.border }]}
                                            onPress={() => setVideoCaptureData({ source: 'rear_camera' })}
                                        >
                                            <Text style={styles.sourceButtonEmoji}>📷</Text>
                                            <Text style={[styles.sourceButtonText, { color: colors.text }]}>Rear</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Script Section */}
                                    <View style={{ marginTop: 20 }}>
                                        <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 8 }]}>What's the script? (Optional)</Text>
                                        <TextInput
                                            style={[styles.scriptInput, { borderColor: colors.border, color: colors.text }]}
                                            placeholder="Enter script like: \n0s-5s: Hello, welcome to Sparks! \n5s-10s: This is a test video."
                                            placeholderTextColor={colors.textSecondary}
                                            multiline
                                            value={videoCapture.script || ''}
                                            onChangeText={(v) => setVideoCaptureData({ script: v })}
                                            blurOnSubmit={false}
                                        />
                                        <TouchableOpacity
                                            style={styles.improveButton}
                                            onPress={improveScriptWithAI}
                                            disabled={isImprovingScript}
                                        >
                                            <Text style={[styles.improveLink, { color: colors.primary }]}>
                                                {isImprovingScript ? '✨ Thinking...' : 'Improve with Gemini ✨'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* AI Recommendation Preview */}
                                    {aiRecommendation && (
                                        <View style={[styles.aiPreview, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                                            <Text style={[styles.aiPreviewTitle, { color: colors.primary }]}>✨ Gemini's Suggestion</Text>
                                            <View style={{ maxHeight: 100 }}>
                                                <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                                                    <Text style={[styles.aiPreviewText, { color: colors.text }]}>{aiRecommendation}</Text>
                                                </ScrollView>
                                            </View>
                                            <View style={styles.aiPreviewActions}>
                                                <TouchableOpacity onPress={() => setAiRecommendation(null)}>
                                                    <Text style={[styles.aiPreviewCancel, { color: colors.textSecondary }]}>Dismiss</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.aiUseButton, { backgroundColor: colors.primary }]}
                                                    onPress={applyAiScript}
                                                >
                                                    <Text style={styles.aiUseButtonText}>Use Gemini's Script</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.mainRecordButton, { backgroundColor: colors.primary, marginTop: aiRecommendation ? 20 : 25 }]}
                                        onPress={startRecordingSession}
                                    >
                                        <Text style={styles.mainRecordButtonText}>🎥 Record Video</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.cancelButton, { marginTop: 10 }]}
                                        onPress={() => setShowOptions(false)}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <VideoRecorderView
                visible={showRecorder}
                onClose={() => setShowRecorder(false)}
                onComplete={handleRecordingComplete}
                initialSource={videoCapture.source === 'rear_camera' ? 'rear_camera' : 'front_camera'}
                countdownSeconds={videoCapture.countdownSeconds}
                durationSeconds={videoCapture.durationSeconds}
                colors={colors}
                script={videoCapture.script}
            />

            <VideoEditorModal
                visible={!!selectedVideoForEdit}
                video={selectedVideoForEdit?.video || null}
                mode={selectedVideoForEdit?.mode}
                onClose={() => setSelectedVideoForEdit(null)}
                onSave={handleSaveVideo}
                onDelete={handleDeleteVideoFromModal}
                onStartExport={(metadata) => setVideoCaptureData(metadata)}
                colors={colors}
            />

            {isAutoExporting && (
                <View style={[styles.autoExportOverlay, { backgroundColor: colors.surface + 'CC' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.autoExportText, { color: colors.text }]}>Applying Overlays...</Text>
                </View>
            )}
        </BaseSpark>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    createButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    card: {
        flexDirection: 'row',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    thumbnailPlaceholder: {
        width: 120,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailEmoji: {
        fontSize: 32,
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 2,
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 11,
        marginBottom: 2,
    },
    cardDetails: {
        fontSize: 11,
    },
    scriptPreview: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    keyboardView: {
        width: '90%',
        maxHeight: '85%',
        alignItems: 'center',
    },
    optionsCard: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    optionsScrollContent: {
        paddingBottom: 10,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 10,
    },
    scriptInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    smallInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        fontSize: 15,
        textAlign: 'center',
    },
    sourceButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 10,
    },
    sourceButton: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceButtonEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    sourceButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cancelButton: {
        alignItems: 'center',
        padding: 10,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scriptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    improveLink: {
        fontSize: 12,
        fontWeight: '800',
    },
    improveButton: {
        alignSelf: 'flex-end',
        marginTop: 6,
    },
    aiPreview: {
        marginTop: 20,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    aiPreviewTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 8,
    },
    aiPreviewText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    aiPreviewActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    aiPreviewCancel: {
        fontSize: 12,
        fontWeight: '600',
    },
    aiUseButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    aiUseButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
    },
    mainRecordButton: {
        marginTop: 25,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    mainRecordButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    floatingScriptContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#BB86FC',
        zIndex: 9999,
        elevation: 10,
    },
    floatingScriptText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
    },
    tabsRow: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#666',
    },
    activeTabText: {
        color: '#000',
    },
    tabSubtext: {
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 18,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    publishActionBtn: {
        marginTop: 12,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    publishActionBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    helpText: {
        fontSize: 12,
        marginTop: 8,
        lineHeight: 18,
    },
    autoExportOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        borderRadius: 24,
    },
    autoExportText: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default VideoSpark;
