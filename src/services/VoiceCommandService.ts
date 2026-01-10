import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { isExpoGo } from '../utils/expoGoDetection';

class VoiceCommandServiceClass {
    private isListening = false;
    private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
    private onErrorCallback: ((error: string) => void) | null = null;
    private onStateChangeCallback: ((isListening: boolean) => void) | null = null;

    constructor() {
        // No direct event listeners needed here as we'll use the module methods directly
        // or rely on the hook in the component if needed. 
        // However, for a service, we might need a different approach or just export functions.
        // Given the library structure, it's often better to use the hook in the component.
        // But for a shared service, we can wrap the imperative methods.
    }

    async requestPermissions(): Promise<boolean> {
        if (isExpoGo()) {
            console.warn('⚠️ ExpoSpeechRecognition is not available in Expo Go');
            return false;
        }
        try {
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            return result.granted;
        } catch (error) {
            console.error('Error requesting speech recognition permissions:', error);
            return false;
        }
    }

    async startListening(
        onResult: (text: string, isFinal: boolean) => void,
        onError: (error: string) => void,
        onStateChange: (isListening: boolean) => void
    ) {
        if (this.isListening) return;

        if (isExpoGo()) {
            onError('Speech recognition is not available in Expo Go. Please use a development build.');
            return;
        }

        this.onResultCallback = onResult;
        this.onErrorCallback = onError;
        this.onStateChangeCallback = onStateChange;

        try {
            const hasPermissions = await this.requestPermissions();
            if (!hasPermissions) {
                throw new Error('Microphone permission denied');
            }

            this.isListening = true;
            this.onStateChangeCallback(true);

            await ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                maxAlternatives: 1,
                continuous: false,
                requiresOnDeviceRecognition: false,
                addsPunctuation: true,
            });

        } catch (error: any) {
            this.isListening = false;
            if (this.onStateChangeCallback) this.onStateChangeCallback(false);
            if (this.onErrorCallback) this.onErrorCallback(error.message || 'Failed to start recording');
        }
    }

    async stopListening() {
        if (!this.isListening) return;

        if (isExpoGo()) {
            this.isListening = false;
            if (this.onStateChangeCallback) this.onStateChangeCallback(false);
            return;
        }

        try {
            await ExpoSpeechRecognitionModule.stop();
            this.isListening = false;
            if (this.onStateChangeCallback) this.onStateChangeCallback(false);
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
    }

    isAvailable(): boolean {
        return !isExpoGo(); // Not available in Expo Go
    }
}

export const VoiceCommandService = new VoiceCommandServiceClass();
