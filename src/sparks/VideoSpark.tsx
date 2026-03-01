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
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { BaseSpark } from '../components/BaseSpark';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { VideoRecorderView } from '../components/VideoRecorderView';
import { ScreenRecorder } from '../services/ScreenRecorderService';
import { VideoEditorModal } from '../components/VideoEditorModal';
import { GeminiService } from '../services/GeminiService';

export interface VideoAI {
    id: string;
    uri: string;
    thumbnail?: string;
    source: 'screen' | 'front_camera' | 'rear_camera' | 'overlay';
    script?: string;
    status: 'recording' | 'editing' | 'publishing' | 'published';
    countdownSeconds: number;
    durationSeconds: number;
    timestamp: number;
    metadata?: {
        youtubeUrl?: string;
        instagramUrl?: string;
    };
}

const VideoSpark: React.FC = () => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData, isHydrated, videoCapture, setVideoCaptureData } = useSparkStore();
    const [videos, setVideos] = useState<VideoAI[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Recorder State
    const [showRecorder, setShowRecorder] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [screenRecordTimer, setScreenRecordTimer] = useState(0);
    const [isScreenRecording, setIsScreenRecording] = useState(false);

    const [selectedVideoForEdit, setSelectedVideoForEdit] = useState<VideoAI | null>(null);
    const [isImprovingScript, setIsImprovingScript] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [pendingScreenMetadata, setPendingScreenMetadata] = useState<{ script?: string, countdown: number, duration: number, isOverlayProcess?: boolean } | null>(null);

    // Initial Load
    useEffect(() => {
        if (!isHydrated) return;
        if (dataLoaded) return;

        const data = getSparkData('video');
        if (data?.videos) {
            setVideos(data.videos);
        }
        setDataLoaded(true);
    }, [isHydrated, dataLoaded, getSparkData]);

    // Save on Change
    useEffect(() => {
        if (!dataLoaded) return;
        setSparkData('video', { videos });
    }, [videos, dataLoaded, setSparkData]);

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

        if (videoCapture.source === 'screen') {
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

    const handleRecordingComplete = (uri: string, source: 'front_camera' | 'rear_camera') => {
        setShowRecorder(false);

        const newVideo: VideoAI = {
            id: Date.now().toString(),
            uri,
            source,
            script: videoCapture.script,
            status: 'editing', // Default to editing
            countdownSeconds: videoCapture.countdownSeconds,
            durationSeconds: videoCapture.durationSeconds,
            timestamp: Date.now(),
        };

        setVideos(prev => [newVideo, ...prev]);
        HapticFeedback.success();
    };

    const handleSaveVideo = (updatedVideo: VideoAI) => {
        setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        setSelectedVideoForEdit(null);
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
                        setVideos(prev => prev.filter(v => v.id !== id));
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
                onPress={() => setSelectedVideoForEdit(video)}
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
                        <TouchableOpacity onPress={() => deleteVideo(video.id)}>
                            <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
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
                </View>
            </TouchableOpacity>
        );
    };

    const getStatusColor = (status: VideoAI['status']) => {
        switch (status) {
            case 'recording': return '#ff4444';
            case 'editing': return '#ffbb33';
            case 'publishing': return '#33b5e5';
            case 'published': return '#00C851';
            default: return '#999';
        }
    };

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

                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={handleCreateNewVideo}
                >
                    <Text style={styles.createButtonText}>+ Create New Video</Text>
                </TouchableOpacity>

                <View style={styles.listContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>My Videos</Text>

                    {videos.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No videos yet. Start by creating a new one!
                            </Text>
                        </View>
                    ) : (
                        videos.map(renderVideoCard)
                    )}
                </View>
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
                                        <TouchableOpacity
                                            style={[styles.sourceButton, { borderColor: videoCapture.source === 'screen' ? colors.primary : colors.border }]}
                                            onPress={() => setVideoCaptureData({ source: 'screen' })}
                                        >
                                            <Text style={styles.sourceButtonEmoji}>📱</Text>
                                            <Text style={[styles.sourceButtonText, { color: colors.text }]}>Screen</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.sourceButton, { borderColor: videoCapture.source === 'front_camera' ? colors.primary : colors.border }]}
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
                video={selectedVideoForEdit}
                onClose={() => setSelectedVideoForEdit(null)}
                onSave={handleSaveVideo}
                onStartExport={setPendingScreenMetadata}
                colors={colors}
            />
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
});

export default VideoSpark;
