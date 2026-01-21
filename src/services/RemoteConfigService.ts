import { getApp } from "firebase/app";
import { Platform } from "react-native";

/**
 * Service for managing Firebase Remote Config
 * Allows remote API key rotation without app updates
 * 
 * NOTE: Firebase Web SDK's Remote Config requires IndexedDB which is not 
 * available in native React Native. For native, we rely on environment fallbacks.
 */
export class RemoteConfigService {
    private static _remoteConfig: any = null;
    private static _initialized: boolean = false;
    private static _initializing: Promise<void> | null = null;
    private static _lastFetchTime: number = 0;
    private static readonly FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

    /**
     * Initialize Remote Config
     * Should be called on app startup
     */
    static async initialize(): Promise<void> {
        if (this._initialized) {
            return;
        }

        if (this._initializing) {
            return this._initializing;
        }

        this._initializing = (async () => {
            try {
                if (Platform.OS === 'web') {
                    // Dynamic import to avoid top-level browser checks
                    const { getRemoteConfig } = await import("firebase/remote-config");

                    // Get Firebase app instance safely
                    const { getApp, getApps } = require("firebase/app");
                    const apps = getApps();
                    if (apps.length === 0) {
                        console.log('⏳ Remote Config waiting for Firebase app initialization...');
                        return; // Will retry or fail gracefully
                    }
                    const app = getApp();

                    // Initialize Remote Config
                    this._remoteConfig = getRemoteConfig(app);

                    // Set minimum fetch interval
                    this._remoteConfig.settings.minimumFetchIntervalMillis = this.FETCH_INTERVAL_MS;

                    console.log('✅ Remote Config initialized (Web)');
                } else {
                    // Native initialization
                    const remoteConfig = require("@react-native-firebase/remote-config").default;
                    this._remoteConfig = remoteConfig();

                    // Set config settings
                    await this._remoteConfig.setConfigSettings({
                        minimumFetchIntervalMillis: this.FETCH_INTERVAL_MS,
                    });

                    console.log('✅ Remote Config initialized (Native)');
                }

                // Fetch and activate in background
                await this.fetchAndActivate();

                this._initialized = true;
            } catch (error: any) {
                console.log(`⚠️ Failed to initialize Remote Config (${Platform.OS}):`, error.message);
                // We still mark as initialized so we don't block the app, 
                // but _remoteConfig will be null
                this._initialized = true;
            } finally {
                this._initializing = null;
            }
        })();

        return this._initializing;
    }

    /**
     * Fetch and activate Remote Config values
     */
    static async fetchAndActivate(): Promise<boolean> {
        if (!this._remoteConfig) {
            return false;
        }

        try {
            const now = Date.now();
            if (now - this._lastFetchTime < this.FETCH_INTERVAL_MS) {
                return false;
            }

            console.log('🔄 Fetching Remote Config...');

            let activated = false;
            if (Platform.OS === 'web') {
                const { fetchAndActivate } = await import("firebase/remote-config");
                activated = await fetchAndActivate(this._remoteConfig);
            } else {
                // Native fetch and activate
                activated = await this._remoteConfig.fetchAndActivate();
            }

            this._lastFetchTime = now;
            return activated;
        } catch (error: any) {
            console.warn('⚠️ Remote Config fetch failed:', error.message);
            return false;
        }
    }

    /**
     * Get a string value from Remote Config
     * Returns null if not available or is default
     */
    static getString(key: string): string | null {
        if (!this._remoteConfig) {
            return null;
        }

        try {
            let val: string | null = null;
            let source: string | null = null;

            if (Platform.OS === 'web') {
                const { getValue } = require("firebase/remote-config");
                const value = getValue(this._remoteConfig, key);
                val = value.asString();
                source = value.getSource();
            } else {
                const value = this._remoteConfig.getValue(key);
                val = value.asString();
                source = value.getSource();
            }

            if (val && val.trim() !== '' && val !== '{}') {
                return val.trim();
            }

            return null;
        } catch (error: any) {
            return null;
        }
    }

    /**
     * Get Gemini API key from Remote Config
     * Returns null if not available
     */
    static getGeminiApiKey(): string | null {
        return this.getString('gemini_api_key') || this.getString('default_gemini_api_key');
    }

    /**
     * Get Google Web Client ID from Remote Config
     */
    static getGoogleWebClientId(): string | null {
        return this.getString('google_web_client_id');
    }

    /**
     * Get Google iOS Client ID from Remote Config
     */
    static getGoogleIosClientId(): string | null {
        return this.getString('google_ios_client_id');
    }

    /**
     * Get Google Android Client ID from Remote Config
     */
    static getGoogleAndroidClientId(): string | null {
        return this.getString('google_android_client_id');
    }

    /**
     * Get Web Firebase configuration from Remote Config
     * Useful for initializing Web SDK in native environments
     */
    static getWebFirebaseConfig(): any | null {
        if (!this._remoteConfig) {
            return null;
        }

        try {
            let configJson: string | null = null;
            if (Platform.OS === 'web') {
                const { getValue } = require("firebase/remote-config");
                configJson = getValue(this._remoteConfig, 'web_firebase_config').asString();
            } else {
                configJson = this._remoteConfig.getValue('web_firebase_config').asString();
            }

            if (configJson && configJson.trim() !== '' && configJson !== '{}') {
                try {
                    return JSON.parse(configJson);
                } catch (e) {
                    console.error('❌ Failed to parse web_firebase_config JSON:', e);
                    return null;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Ensure Remote Config is initialized
     */
    static async ensureInitialized(): Promise<void> {
        if (!this._initialized) {
            await this.initialize();
        }
    }

    /**
     * Force refresh Remote Config
     */
    static async forceRefresh(): Promise<boolean> {
        if (!this._remoteConfig) {
            await this.ensureInitialized();
        }

        this._lastFetchTime = 0;
        return await this.fetchAndActivate();
    }

    /**
     * Check if Remote Config is available
     */
    static isAvailable(): boolean {
        return this._initialized && this._remoteConfig !== null;
    }
}

