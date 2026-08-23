import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Linking,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { VideoAI } from '../sparks/VideoSpark';
import { HapticFeedback } from '../utils/haptics';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { ScreenRecorder } from '../services/ScreenRecorderService';
import { burnScript, BurnScriptItem } from 'video-overlay';

interface VideoEditorModalProps {
    visible: boolean;
    video: VideoAI | null;
    onClose: () => void;
    onSave: (updatedVideo: VideoAI) => void;
    onStartExport: (metadata: { script?: string, countdown: number, duration: number, isOverlayProcess?: boolean }) => void;
    onDelete?: (id: string) => void;
    colors: any;
    mode?: 'recording' | 'publishing';
}

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({
    visible,
    video,
    onClose,
    onSave,
    onStartExport,
    onDelete,
    colors,
    mode = 'recording',
}) => {
    const [status, setStatus] = useState<VideoAI['status']>('editing');
    const [script, setScript] = useState('');
    const [currentOverlay, setCurrentOverlay] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const player = useVideoPlayer(video?.uri || '', (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (video) {
            setStatus(video.status);
            setScript(video.script || '');
            if (video.uri) {
                player.replace(video.uri);
            }
        }
    }, [video]);

    // Script Overlay Logic
    useEffect(() => {
        if (!script) {
            setCurrentOverlay(null);
            return;
        }

        // Parse script format: "0s-5s: Text"
        const parseScript = () => {
            const lines = script.split('\n');
            const parsed = lines.map(line => {
                const match = line.match(/^(\d+)s?-(\d+)s?:\s*(.+)$/i);
                if (match) {
                    return {
                        start: parseInt(match[1]),
                        end: parseInt(match[2]),
                        text: match[3]
                    };
                }
                return null;
            }).filter(Boolean);
            return parsed;
        };

        const scriptSegments = parseScript();

        const interval = setInterval(() => {
            const time = player.currentTime;
            const activeSegment = scriptSegments.find(seg => seg && time >= seg.start && time < seg.end);
            setCurrentOverlay(activeSegment ? activeSegment.text : null);
        }, 100);

        return () => clearInterval(interval);
    }, [script, player]);

    const handleSave = () => {
        if (!video) return;

        onSave({
            ...video,
            status,
            script: script.trim() || undefined,
        });
        HapticFeedback.success();
    };

    const handleDelete = () => {
        if (video && onDelete) {
            onDelete(video.id);
            onClose();
        }
    };

    const openInSystemEditor = async () => {
        if (!video?.uri) return;
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(video.uri);
            } else {
                // Fallback to media library
                // Write-only on Android — we no longer hold READ_MEDIA_VIDEO.
                const { status: libStatus } = await MediaLibrary.requestPermissionsAsync(
                    Platform.OS === 'android'
                );
                if (libStatus === 'granted') {
                    await MediaLibrary.createAssetAsync(video.uri);
                    Alert.alert('Saved to Gallery', 'The video has been saved to your gallery. You can edit it there using the system tools.');
                }
            }

            // Update status to editing as user is likely going to make changes now
            if (status !== 'editing') {
                setStatus('editing');
                onSave({
                    ...video,
                    status: 'editing',
                    script: script.trim() || undefined,
                });
            }
        } catch (e) {
            console.error('System Editor Error:', e);
            Alert.alert('Error', 'Could not open the system video editor or sharing menu.');
        }
    };
    const handlePublish = async (platform: 'YouTube' | 'Instagram') => {
        if (!video?.uri) return;
        HapticFeedback.light();

        try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(video.uri, {
                    dialogTitle: `Publish to ${platform}`,
                    mimeType: 'video/mp4',
                    UTI: 'public.mpeg-4'
                });

                // Update platform flags in metadata
                const isYouTube = platform === 'YouTube';
                const updatedMetadata = {
                    ...video.metadata,
                    isYouTubePublished: isYouTube ? true : video.metadata?.isYouTubePublished,
                    isInstagramPublished: !isYouTube ? true : video.metadata?.isInstagramPublished,
                };

                onSave({
                    ...video,
                    metadata: updatedMetadata,
                    status: (updatedMetadata.isYouTubePublished && updatedMetadata.isInstagramPublished) ? 'published' : 'publishing'
                });
            } else {
                Alert.alert('Sharing Unavailable', 'Your device does not support native sharing.');
            }
        } catch (error) {
            console.error('Publish Error:', error);
        }
    };

    const handleArchive = () => {
        if (!video) return;
        setStatus('archived');
        onSave({ ...video, status: 'archived' });
        HapticFeedback.success();
        onClose();
    };


    const handleExportWithOverlays = async () => {
        if (!video || !video.uri) return;

        setIsExporting(true);
        HapticFeedback.success();

        try {
            // 1. Parse Script to Native Format
            const lines = script.split('\n');
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

            // 2. Define Output URI (same folder as source)
            const filename = `SparksExport_${Date.now()}.mp4`;
            const outputUri = video.uri.substring(0, video.uri.lastIndexOf('/') + 1) + filename;

            // 3. Burn captions via Native Module
            console.log('🔥 Burning captions into video:', outputUri);
            const resultUri = await burnScript(video.uri, scriptItems, outputUri);
            console.log('✅ Burn-in complete:', resultUri);

            // 4. Create new Video Record in the app
            onStartExport({
                script: script,
                countdown: 0,
                duration: video.durationSeconds,
                isOverlayProcess: true
            });

            // Notify ScreenRecorder of simulated finish so VideoSpark picks it up
            // (We reuse the listener logic in VideoSpark to add the new video)
            await ScreenRecorder.stopRecording(resultUri);

            // Mark THIS original video as ARCHIVED
            onSave({
                ...video,
                status: 'archived',
                script: script.trim() || undefined
            });

            setIsExporting(false);
            Alert.alert(
                'Export Successful',
                'A new video has been created with the overlays burned in. You can find it in your My Videos list.',
                [{ text: 'View Video', onPress: onClose }]
            );
        } catch (e) {
            console.error('❌ Export Error:', e);
            setIsExporting(false);
            Alert.alert('Export Failed', 'An error occurred while burning captions into the video. Using Screen Recording as fallback is recommended if this persists.');
        }
    };

    if (!video) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                {/* Video Preview */}
                <View style={[styles.videoContainer, isExporting && { height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }]}>
                    <VideoView
                        player={player}
                        style={styles.videoPlayer}
                        contentFit="contain"
                    />

                    {/* Script Overlay HUD - Only show if not already an 'overlay' or 'screen' source */}
                    {currentOverlay && video.source !== 'overlay' && video.source !== 'screen' && (
                        <View style={[styles.overlayContainer, isExporting ? styles.overlayExport : styles.overlayPreview]}>
                            <Text style={[styles.overlayText, !isExporting && { fontSize: 16 }]}>{currentOverlay}</Text>
                        </View>
                    )}

                    {!isExporting && (
                        <TouchableOpacity style={styles.previewClose} onPress={onClose}>
                            <Text style={styles.closeEmoji}>❌</Text>
                        </TouchableOpacity>
                    )}

                    {isExporting && (
                        <View style={styles.exportOverlay}>
                            <Text style={styles.exportText}>EXPORTING WITH OVERLAYS...</Text>
                            <Text style={styles.exportSubtext}>Please do not touch the screen</Text>
                        </View>
                    )}
                </View>

                {!isExporting && (
                    <ScrollView
                        style={[styles.editorContent, { backgroundColor: colors.background }]}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>
                                {mode === 'recording' ? 'Recording Studio' : 'Publishing Studio'}
                            </Text>
                            <View style={[styles.statusTag, { backgroundColor: getStatusColor(status) }]}>
                                <Text style={styles.statusTagText}>{status.toUpperCase()}</Text>
                            </View>
                        </View>

                        {mode === 'recording' && (
                            <>
                                <Text style={[styles.label, { color: colors.text }]}>Script / Description</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    multiline
                                    value={script}
                                    onChangeText={setScript}
                                    placeholder="What happens in this video?"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </>
                        )}

                        <View style={styles.actionSection}>
                            <Text style={[styles.label, { color: colors.text }]}>Actions</Text>
                            {mode === 'recording' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: colors.primary, marginBottom: 12 }]}
                                    onPress={openInSystemEditor}
                                >
                                    <Text style={styles.actionEmoji}>✂️</Text>
                                    <Text style={[styles.actionText, { color: colors.text }]}>Edit in Photos</Text>
                                </TouchableOpacity>
                            )}

                            {mode === 'publishing' && (
                                <View style={styles.socialPublishingRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.socialPublishingBtn,
                                            { backgroundColor: '#FF000020', borderColor: '#FF0000' },
                                            video.metadata?.isYouTubePublished && { backgroundColor: '#FF000040' }
                                        ]}
                                        onPress={() => handlePublish('YouTube')}
                                    >
                                        <Text style={styles.socialPublishingEmoji}>
                                            {video.metadata?.isYouTubePublished ? '✅' : '🟥'}
                                        </Text>
                                        <Text style={[styles.socialPublishingText, { color: '#FF0000' }]}>
                                            YouTube {video.metadata?.isYouTubePublished ? '✓' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.socialPublishingBtn,
                                            { backgroundColor: '#E1306C20', borderColor: '#E1306C' },
                                            video.metadata?.isInstagramPublished && { backgroundColor: '#E1306C40' }
                                        ]}
                                        onPress={() => handlePublish('Instagram')}
                                    >
                                        <Text style={styles.socialPublishingEmoji}>
                                            {video.metadata?.isInstagramPublished ? '✅' : '🟪'}
                                        </Text>
                                        <Text style={[styles.socialPublishingText, { color: '#E1306C' }]}>
                                            Instagram {video.metadata?.isInstagramPublished ? '✓' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {mode === 'publishing' && (video.metadata?.isYouTubePublished || video.metadata?.isInstagramPublished) && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: colors.primary, marginTop: 12 }]}
                                    onPress={handleArchive}
                                >
                                    <Text style={styles.actionEmoji}>📦</Text>
                                    <Text style={[styles.actionText, { color: colors.text }]}>Archive Project</Text>
                                </TouchableOpacity>
                            )}

                            {video.source !== 'overlay' && video.source !== 'screen' && status !== 'archived' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { borderColor: '#BB86FC', marginTop: mode === 'publishing' ? 12 : 0 }]}
                                    onPress={handleExportWithOverlays}
                                >
                                    <Text style={styles.actionEmoji}>✨</Text>
                                    <Text style={[styles.actionText, { color: colors.text }]}>Export with Overlays</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={[styles.label, { color: colors.text }]}>Change Status</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                            {(['recording', 'recorded', 'editing', 'publishing', 'published', 'archived'] as VideoAI['status'][]).map((s, index) => {
                                const statusList = ['recording', 'recorded', 'editing', 'publishing', 'published', 'archived'];
                                const originalStatusIndex = statusList.indexOf(video?.status || 'recording');
                                const isFutureStatus = index > originalStatusIndex && originalStatusIndex !== -1;

                                return (
                                    <TouchableOpacity
                                        key={s}
                                        disabled={isFutureStatus}
                                        style={[
                                            styles.statusPill,
                                            { borderColor: colors.border },
                                            status === s && { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) },
                                            isFutureStatus && { opacity: 0.3 }
                                        ]}
                                        onPress={() => {
                                            setStatus(s);
                                            HapticFeedback.light();
                                        }}
                                    >
                                        <Text style={[styles.statusPillText, status === s && { color: '#fff' }, { color: colors.text }]}>
                                            {s.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.deleteMainBtn, { borderColor: colors.error }]}
                            onPress={handleDelete}
                        >
                            <Text style={[styles.deleteMainBtnText, { color: colors.error }]}>Delete video</Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}

                {/* Big Full-Screen Loading HUD for Export */}
                {isExporting && (
                    <View style={styles.fullscreenLoading}>
                        <View style={styles.loadingCard}>
                            <ActivityIndicator size="large" color="#BB86FC" style={{ marginBottom: 20 }} />
                            <Text style={styles.loadingTitle}>Exporting Video...</Text>
                            <Text style={styles.loadingText}>Wait for the Export to Finish</Text>
                            <View style={styles.progressBar}>
                                <View style={styles.progressInner} />
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const getStatusColor = (status: string) => {
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    videoContainer: {
        height: '60%',
        backgroundColor: '#000',
    },
    videoPlayer: {
        flex: 1,
    },
    previewClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeEmoji: {
        fontSize: 18,
    },
    editorContent: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTagText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    actionSection: {
        marginTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusScroll: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    statusPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        minWidth: 90,
        alignItems: 'center',
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    socialPublishingRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    socialPublishingBtn: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    socialPublishingEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    socialPublishingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    deleteMainBtn: {
        marginTop: 30,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 10,
    },
    deleteMainBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBtn: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    statusBtnText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    publishSection: {
        marginTop: 10,
    },
    publishRow: {
        flexDirection: 'row',
        gap: 15,
    },
    socialBtn: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 15,
        alignItems: 'center',
        gap: 8,
    },
    socialIcon: {
        fontSize: 24,
    },
    socialText: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    saveButton: {
        marginTop: 40,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    overlayContainer: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 15,
        borderRadius: 18,
        alignItems: 'center',
        alignSelf: 'center',
        maxWidth: '85%',
        bottom: 40,
    },
    overlayPreview: {
        padding: 10,
    },
    overlayExport: {
        bottom: 100, // Slightly higher when full screen to clear bottom safe area
    },
    overlayText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
    },
    exportOverlay: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        padding: 20,
    },
    exportText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    exportSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 5,
    },
    fullscreenLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    loadingCard: {
        backgroundColor: '#1E1E1E',
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        width: '80%',
        borderWidth: 1,
        borderColor: '#BB86FC',
    },
    spinnerEmoji: {
        fontSize: 50,
        marginBottom: 20,
    },
    loadingTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 10,
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressInner: {
        width: '40%', // Decorative
        height: '100%',
        backgroundColor: '#BB86FC',
    },
});
