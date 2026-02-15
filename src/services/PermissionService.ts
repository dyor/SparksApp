import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

export type PermissionType = 'camera' | 'microphone' | 'mediaLibrary' | 'location';

export interface PermissionStatus {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
}

class PermissionService {
    /**
     * Shows a standard alert for denied permissions with a link to settings
     */
    private static showDeniedAlert(permissionName: string) {
        Alert.alert(
            `${permissionName} Permission Required`,
            `This feature requires ${permissionName.toLowerCase()} access. Please enable it in your device settings to continue.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
        );
    }

    /**
     * Camera Permissions
     */
    static async checkCameraPermission(): Promise<PermissionStatus> {
        const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
        return { granted: status === 'granted', canAskAgain, status };
    }

    static async requestCameraPermission(showAlert = true): Promise<boolean> {
        const current = await Camera.getCameraPermissionsAsync();
        if (current.status === 'granted') return true;

        const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();

        if (status !== 'granted' && !canAskAgain && showAlert) {
            this.showDeniedAlert('Camera');
        }

        return status === 'granted';
    }

    /**
     * Microphone Permissions
     */
    static async checkMicrophonePermission(): Promise<PermissionStatus> {
        const { status, canAskAgain } = await Camera.getMicrophonePermissionsAsync();
        return { granted: status === 'granted', canAskAgain, status };
    }

    static async requestMicrophonePermission(showAlert = true): Promise<boolean> {
        const current = await Camera.getMicrophonePermissionsAsync();
        if (current.status === 'granted') return true;

        const { status, canAskAgain } = await Camera.requestMicrophonePermissionsAsync();

        if (status !== 'granted' && !canAskAgain && showAlert) {
            this.showDeniedAlert('Microphone');
        }

        return status === 'granted';
    }

    /**
     * Media Library Permissions
     */
    static async checkMediaLibraryPermission(): Promise<PermissionStatus> {
        const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
        return { granted: status === 'granted', canAskAgain, status };
    }

    static async requestMediaLibraryPermission(showAlert = true): Promise<boolean> {
        const current = await MediaLibrary.getPermissionsAsync();
        if (current.status === 'granted') return true;

        const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

        if (status !== 'granted' && !canAskAgain && showAlert) {
            this.showDeniedAlert('Media Library');
        }

        return status === 'granted';
    }

    /**
     * Location Permissions
     */
    static async checkLocationPermission(): Promise<PermissionStatus> {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        return { granted: status === 'granted', canAskAgain, status };
    }

    static async requestLocationPermission(showAlert = true): Promise<boolean> {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted' && !canAskAgain && showAlert) {
            this.showDeniedAlert('Location');
        }

        return status === 'granted';
    }

    /**
     * Requests multiple permissions at once. 
     * Useful for Sparks that need both Camera and Media Library.
     */
    static async requestMultiple(types: PermissionType[]): Promise<boolean> {
        console.log(`🛡 PermissionService: requesting [${types.join(', ')}]`);
        const results: boolean[] = [];
        for (const type of types) {
            let granted = false;
            let statusStr = 'unknown';

            // Check current status first - calling request...Async when already granted 
            // can sometimes hang or cause AppState toggles on Android
            switch (type) {
                case 'camera':
                    const currentCam = await Camera.getCameraPermissionsAsync();
                    if (currentCam.status === 'granted') {
                        granted = true;
                        statusStr = 'granted (cached)';
                    } else {
                        const res = await Camera.requestCameraPermissionsAsync();
                        granted = res.status === 'granted';
                        statusStr = res.status;
                    }
                    break;
                case 'microphone':
                    const currentMic = await Camera.getMicrophonePermissionsAsync();
                    if (currentMic.status === 'granted') {
                        granted = true;
                        statusStr = 'granted (cached)';
                    } else {
                        const res = await Camera.requestMicrophonePermissionsAsync();
                        granted = res.status === 'granted';
                        statusStr = res.status;
                    }
                    break;
                case 'mediaLibrary':
                    const currentMedia = await MediaLibrary.getPermissionsAsync();
                    if (currentMedia.status === 'granted') {
                        granted = true;
                        statusStr = 'granted (cached)';
                    } else {
                        const res = await MediaLibrary.requestPermissionsAsync();
                        granted = res.status === 'granted';
                        statusStr = res.status;
                    }
                    break;
                case 'location':
                    const currentLoc = await Location.getForegroundPermissionsAsync();
                    if (currentLoc.status === 'granted') {
                        granted = true;
                        statusStr = 'granted (cached)';
                    } else {
                        const res = await Location.requestForegroundPermissionsAsync();
                        granted = res.status === 'granted';
                        statusStr = res.status;
                    }
                    break;
            }
            console.log(`🛡 PermissionService: ${type} status = ${statusStr}, granted = ${granted}`);
            results.push(granted);
            if (!granted) {
                // If one fails, we can stop or continue, but let's give it a breather
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const allGranted = results.every(granted => granted);

        if (!allGranted) {
            // Find which one failed and show a generic alert or the first failed one
            Alert.alert(
                'Permissions Required',
                'This feature requires additional permissions to work correctly. Please enable them in your device settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
            );
        }

        return allGranted;
    }
}

export default PermissionService;
