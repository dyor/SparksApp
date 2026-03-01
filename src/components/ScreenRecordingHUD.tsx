import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { ScreenRecorder, ScreenRecordingStatus } from '../services/ScreenRecorderService';
import { HapticFeedback } from '../utils/haptics';

import { useSparkStore } from '../store';

export const ScreenRecordingHUD: React.FC = () => {
    const { videoCapture } = useSparkStore();
    const [status, setStatus] = useState<ScreenRecordingStatus>('idle');
    const [countdown, setCountdown] = useState<number | null>(null);
    const [duration, setDuration] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleStatusChange = (newStatus: ScreenRecordingStatus) => {
            console.log('📱 HUD Status Change:', newStatus);
            setStatus(newStatus);

            if (newStatus === 'starting') {
                startCountdownFlow();
            } else if (newStatus === 'recording') {
                startDurationTimer();
            } else if (newStatus === 'idle') {
                // If it finished with a URI, we handle persistence here or in the listener?
                // Actually, let's keep it simple: the service returns the raw path, 
                // the HUD/App handles the "saving" to library/persistence.
                hideHUD();
            }
        };

        ScreenRecorder.addListener(handleStatusChange);
        return () => {
            ScreenRecorder.removeListener(handleStatusChange);
            stopTimers();
        };
    }, []);

    const stopTimers = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        timerRef.current = null;
        countdownRef.current = null;
    };

    const startCountdownFlow = () => {
        stopTimers();
        showHUD();
        setCountdown(5);
        let count = 5;

        countdownRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
                HapticFeedback.light();
            } else {
                setCountdown(null);
                clearInterval(countdownRef.current!);
                countdownRef.current = null;
                ScreenRecorder.finalizeStart();
            }
        }, 1000);
    };

    const startDurationTimer = () => {
        if (timerRef.current) return;
        setDuration(0);
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
    };

    const showHUD = () => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hideHUD = () => {
        stopTimers();
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setDuration(0);
            setCountdown(null);
        });
    };

    const stopRecording = () => {
        ScreenRecorder.stopRecording();
    };

    const getCurrentScriptOverlay = () => {
        const script = videoCapture.script;
        if (!script || status !== 'recording') return null;

        const lines = script.split('\n');
        const activeSegment = lines.map(line => {
            const match = line.match(/^(\d+)s?-(\d+)s?:\s*(.+)$/i);
            if (match) {
                const start = parseInt(match[1]);
                const end = parseInt(match[2]);
                if (duration >= start && duration < end) return match[3];
            }
            return null;
        }).find(s => s !== null);

        return activeSegment;
    };

    if (status === 'idle' && !countdown) return null;

    return (
        <>
            {/* Top HUD - Controls (Only after duration) */}
            <Animated.View style={[styles.hudContainer, { opacity: fadeAnim }]}>
                {countdown !== null ? (
                    <View style={styles.countdownBox}>
                        <Text style={styles.countdownLabel}>STARTING IN</Text>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                ) : (status === 'recording' || status === 'stopping') && duration >= videoCapture.durationSeconds ? (
                    <View style={styles.recordingRow}>
                        <View style={styles.badge}>
                            <View style={styles.dot} />
                            <Text style={styles.statusText}>REC</Text>
                        </View>
                        <Text style={styles.timerText}>{duration}s</Text>
                        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                            <Text style={styles.stopIcon}>⏹️</Text>
                            <Text style={styles.stopLabel}>STOP</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </Animated.View>

            {/* Bottom HUD - Script Captions (Always during recording) */}
            {status === 'recording' && getCurrentScriptOverlay() && (
                <Animated.View style={[styles.captionContainer, { opacity: fadeAnim }]}>
                    <View style={styles.captionBox}>
                        <Text style={styles.captionText}>{getCurrentScriptOverlay()}</Text>
                    </View>
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    hudContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 99999,
        alignItems: 'center',
    },
    countdownBox: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        width: 250,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    countdownLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    countdownText: {
        color: '#fff',
        fontSize: 80,
        fontWeight: 'bold',
    },
    recordingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#ff4444',
        gap: 15,
        width: '100%',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff4444',
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
    },
    timerText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        flex: 1,
        textAlign: 'center',
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 5,
    },
    stopIcon: {
        fontSize: 12,
    },
    stopLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    captionContainer: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        zIndex: 99999,
        alignItems: 'center',
    },
    captionBox: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    captionText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
});
