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

        // Only support Remote Config on Web for now (requires IndexedDB)
        if (Platform.OS !== 'web') {
            console.log('ℹ️ Remote Config skipped on native (using environment fallbacks)');
            this._initialized = true;
            return;
        }

        try {
            // Dynamic import to avoid top-level browser checks
            const { getRemoteConfig } = await import("firebase/remote-config");

            // Get Firebase app instance
            const app = getApp();

            // Initialize Remote Config
            this._remoteConfig = getRemoteConfig(app);

            // Set minimum fetch interval
            this._remoteConfig.settings.minimumFetchIntervalMillis = this.FETCH_INTERVAL_MS;

            console.log('✅ Remote Config initialized (Web)');

            // Fetch and activate in background
            this.fetchAndActivate().catch((error) => {
                console.warn('⚠️ Remote Config initial fetch failed:', error.message);
            });

            this._initialized = true;
        } catch (error: any) {
            console.log('⚠️ Failed to initialize Remote Config Web SDK:', error.message);
            this._initialized = true; // Mark as initialized so we don't keep retrying
        }
    }

    /**
     * Fetch and activate Remote Config values
     */
    static async fetchAndActivate(): Promise<boolean> {
        if (!this._remoteConfig || Platform.OS !== 'web') {
            return false;
        }

        try {
            const { fetchAndActivate } = await import("firebase/remote-config");

            const now = Date.now();
            if (now - this._lastFetchTime < this.FETCH_INTERVAL_MS) {
                return false;
            }

            console.log('🔄 Fetching Remote Config...');
            const activated = await fetchAndActivate(this._remoteConfig);
            this._lastFetchTime = now;

            return activated;
        } catch (error: any) {
            console.warn('⚠️ Remote Config fetch failed:', error.message);
            return false;
        }
    }

    /**
     * Get Gemini API key from Remote Config
     * Returns null if not available
     */
    static getGeminiApiKey(): string | null {
        if (!this._remoteConfig || Platform.OS !== 'web') {
            return null;
        }

        try {
            // This is synchronous in the Web SDK if already fetched
            // We use the imported function from the initialized session
            const { getValue } = require("firebase/remote-config");
            const value = getValue(this._remoteConfig, 'gemini_api_key');
            const key = value.asString();
            const source = value.getSource();

            if (source === 'remote' && key && key.trim() !== '') {
                console.log('🔑 Using Remote Config key (source: remote)');
                return key.trim();
            }

            return null;
        } catch (error: any) {
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
        if (Platform.OS !== 'web') return false;

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

