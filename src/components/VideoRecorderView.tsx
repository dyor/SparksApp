import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { HapticFeedback } from '../utils/haptics';

interface VideoRecorderViewProps {
    visible: boolean;
    onClose: () => void;
    onComplete: (uri: string, source: 'front_camera' | 'rear_camera') => void;
    initialSource: 'front_camera' | 'rear_camera';
    countdownSeconds: number;
    durationSeconds: number;
    colors: any;
    script?: string;
}

export const VideoRecorderView: React.FC<VideoRecorderViewProps> = ({
    visible,
    onClose,
    onComplete,
    initialSource,
    countdownSeconds,
    durationSeconds,
    colors,
    script,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [facing, setFacing] = useState<'front' | 'back'>(initialSource === 'front_camera' ? 'front' : 'back');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [currentOverlay, setCurrentOverlay] = useState<string | null>(null);

    const cameraRef = useRef<any>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();

    // Reset state when visible/initialSource changes
    useEffect(() => {
        if (!visible) {
            cancelEverything();
        } else {
            setFacing(initialSource === 'front_camera' ? 'front' : 'back');
        }
    }, [visible, initialSource]);

    // Script Overlay Logic (Same as editor)
    useEffect(() => {
        if (!isRecording || !script) {
            setCurrentOverlay(null);
            return;
        }

        const lines = script.split('\n');
        const parsedSegments = lines.map(line => {
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

        const activeSegment = parsedSegments.find(seg => seg && recordingDuration >= seg.start && recordingDuration < seg.end);
        setCurrentOverlay(activeSegment ? activeSegment.text : null);
    }, [isRecording, script, recordingDuration]);

    const cancelEverything = () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        countdownTimerRef.current = null;
        recordingTimerRef.current = null;
        setCountdown(null);
        setIsRecording(false);
        setRecordingDuration(0);
        setCurrentOverlay(null);
    };

    const startFlow = async () => {
        if (!cameraPermission?.granted || !micPermission?.granted) {
            const c = await requestCameraPermission();
            const m = await requestMicPermission();
            if (!c.granted || !m.granted) {
                Alert.alert('Permissions Required', 'Camera and Microphone access are needed to record.');
                return;
            }
        }

        startCountdown();
    };

    const startCountdown = () => {
        setCountdown(countdownSeconds);
        let count = countdownSeconds;
        HapticFeedback.light();

        countdownTimerRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
                HapticFeedback.light();
            } else {
                setCountdown(null);
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                }
                startRecording();
            }
        }, 1000);
    };

    const startRecording = async () => {
        if (!cameraRef.current) return;

        try {
            setIsRecording(true);
            setRecordingDuration(0);
            HapticFeedback.success();

            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => {
                    const next = prev + 1;
                    if (next >= durationSeconds) {
                        stopRecording();
                    }
                    return next;
                });
            }, 1000);

            const video = await cameraRef.current.recordAsync({
                maxDuration: durationSeconds,
            });

            if (video && video.uri) {
                // Return actual final facing
                onComplete(video.uri, facing === 'front' ? 'front_camera' : 'rear_camera');
            }
        } catch (error) {
            console.error('Recording Error:', error);
            cancelEverything();
            Alert.alert('Error', 'Failed to start recording.');
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setIsRecording(false);
        HapticFeedback.success();
    };

    const toggleFacing = () => {
        if (isRecording || countdown !== null) return;
        setFacing(prev => (prev === 'front' ? 'back' : 'front'));
        HapticFeedback.light();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    mode="video"
                    onCameraReady={() => setIsCameraReady(true)}
                >
                    {/* Overlays */}
                    <View style={styles.overlay} pointerEvents="none">
                        {countdown !== null && (
                            <View style={styles.countdownContainer}>
                                <Text style={styles.countdownLabel}>GET READY</Text>
                                <Text style={styles.countdownText}>{countdown}</Text>
                            </View>
                        )}

                        {isRecording && (
                            <>
                                <View style={styles.recordingHud}>
                                    <View style={styles.recBadge}>
                                        <View style={styles.recDot} />
                                        <Text style={styles.recText}>REC</Text>
                                    </View>
                                    <Text style={styles.durationText}>
                                        {recordingDuration}s / {durationSeconds}s
                                    </Text>
                                </View>

                                {currentOverlay && (
                                    <View style={styles.recordingScriptOverlay}>
                                        <Text style={styles.recordingScriptText}>{currentOverlay}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        {!isRecording && countdown === null ? (
                            <>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.controlText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.recordButton, { borderColor: colors.primary }]}
                                    onPress={startFlow}
                                >
                                    <View style={[styles.recordButtonInner, { backgroundColor: colors.primary }]} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.flipButton} onPress={toggleFacing}>
                                    <Text style={styles.emojiText}>{facing === 'front' ? '🤳' : '📷'}</Text>
                                </TouchableOpacity>
                            </>
                        ) : isRecording ? (
                            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                                <View style={styles.stopButtonInner} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 30,
        borderRadius: 20,
    },
    countdownLabel: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    countdownText: {
        color: '#fff',
        fontSize: 120,
        fontWeight: 'bold',
    },
    recordingHud: {
        position: 'absolute',
        top: 160, // Clear of script
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 12,
    },
    recBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    recDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ff4444',
    },
    recText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    durationText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'Courier', // Clock feel
    },
    recordingScriptOverlay: {
        position: 'absolute',
        top: 60, // Near lens for eye contact
        alignSelf: 'center',
        maxWidth: '85%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    recordingScriptText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    recordButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    stopButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#ff4444',
    },
    closeButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flipButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emojiText: {
        fontSize: 24,
    },
    controlLabel: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
    }
});
