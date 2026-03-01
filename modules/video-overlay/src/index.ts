import { requireNativeModule } from 'expo-modules-core';

let VideoOverlay: any;
try {
    VideoOverlay = requireNativeModule('VideoOverlay');
} catch (e) {
    // Module not found or not supported on this platform
    VideoOverlay = null;
}

export async function overlayImage(
    videoUri: string,
    imageUri: string,
    outputUri: string
): Promise<string> {
    if (!VideoOverlay) {
        throw new Error("VideoOverlay native module is not available on this platform or build.");
    }
    return await VideoOverlay.overlayImage(videoUri, imageUri, outputUri);
}

export interface BurnScriptItem {
    text: string;
    start: number;
    end: number;
}

export async function burnScript(
    videoUri: string,
    scriptItems: BurnScriptItem[],
    outputUri: string
): Promise<string> {
    if (!VideoOverlay) {
        throw new Error("VideoOverlay native module is not available on this platform or build.");
    }
    return await VideoOverlay.burnScript(videoUri, scriptItems, outputUri);
}

