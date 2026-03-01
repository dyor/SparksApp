import { Alert, Platform } from 'react-native';
import { HapticFeedback } from '../utils/haptics';
import {
    startInAppRecording,
    stopInAppRecording,
    startGlobalRecording,
    stopGlobalRecording,
    getCameraPermissionStatus,
    getMicrophonePermissionStatus,
    requestCameraPermission,
    requestMicrophonePermission
} from 'react-native-nitro-screen-recorder';

// This service now uses nitro-screen-recorder for high-performance capture.
// It supports both In-App (iOS) and Global (iOS/Android) recording.

export type ScreenRecordingStatus = 'idle' | 'starting' | 'recording' | 'stopping';

class ScreenRecorderService {
    private status: ScreenRecordingStatus = 'idle';
    private startTime: number = 0;
    private listeners: ((status: ScreenRecordingStatus, uri?: string | null) => void)[] = [];

    getStatus() {
        return this.status;
    }

    addListener(callback: (status: ScreenRecordingStatus, uri?: string | null) => void) {
        this.listeners.push(callback);
    }

    removeListener(callback: (status: ScreenRecordingStatus, uri?: string | null) => void) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    private setStatus(status: ScreenRecordingStatus, uri?: string | null) {
        this.status = status;
        this.listeners.forEach(l => l(status, uri));
    }

    async startRecording(skipCountdown = false) {
        if (this.status !== 'idle') return;

        if (skipCountdown) {
            this.finalizeStart();
            return;
        }

        this.setStatus('starting');
        HapticFeedback.light();
    }

    async finalizeStart() {
        console.log('📱 ScreenRecorder: Starting Capture via Nitro Modules...');
        try {
            // Permission Checks
            if (getMicrophonePermissionStatus() !== 'granted') {
                await requestMicrophonePermission();
            }

            if (Platform.OS === 'ios') {
                // In-App Recording is best for iOS Sparks
                await startInAppRecording({
                    options: {
                        enableMic: true,
                        enableCamera: false,
                    },
                    onRecordingFinished: (file) => {
                        console.log('✅ In-App Recording Finished:', file.path);
                        this.setStatus('idle', 'file://' + file.path);
                    }
                });
            } else {
                // Global Recording for Android (or iOS fallback)
                await startGlobalRecording({
                    options: { enableMic: true },
                    onRecordingError: (err) => console.error('Global Recording Error:', err)
                });
            }

            this.setStatus('recording');
            this.startTime = Date.now();
            HapticFeedback.success();
        } catch (e) {
            console.error('❌ Screen Recording Error:', e);
            this.setStatus('idle');
            Alert.alert(
                'Recording Error',
                'Failed to start screen capture. Please ensure permissions are granted and you are using a Dev Client.'
            );
        }
    }

    async stopRecording(manualUri?: string | null): Promise<string | null> {
        if (this.status !== 'recording' && !manualUri) return null;

        this.setStatus('stopping');
        HapticFeedback.success();

        try {
            if (manualUri) {
                setTimeout(() => this.setStatus('idle', manualUri), 500);
                return manualUri;
            }

            let uri: string | null = null;
            if (Platform.OS === 'ios') {
                const file = await stopInAppRecording();
                uri = file ? 'file://' + file.path : null;
            } else {
                const file = await stopGlobalRecording();
                uri = file ? 'file://' + file.path : null;
            }

            if (uri) {
                this.setStatus('idle', uri);
                return uri;
            } else {
                // Final fallback
                setTimeout(() => {
                    if (this.status === 'stopping') this.setStatus('idle', null);
                }, 1000);
                return null;
            }
        } catch (e) {
            console.error('❌ Stop Recording Error:', e);
            this.setStatus('idle');
            return null;
        }
    }
}

export const ScreenRecorder = new ScreenRecorderService();
