import { getApp } from "firebase/app";
import { getRemoteConfig, RemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";

/**
 * Service for managing Firebase Remote Config
 * Allows remote API key rotation without app updates
 */
export class RemoteConfigService {
    private static _remoteConfig: RemoteConfig | null = null;
    private static _initialized: boolean = false;
    private static _lastFetchTime: number = 0;
    private static readonly FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    private static readonly CACHE_EXPIRATION_MS = 12 * 60 * 60 * 1000; // 12 hours

    /**
     * Initialize Remote Config
     * Should be called on app startup
     */
    static async initialize(): Promise<void> {
        if (this._initialized) {
            return;
        }

        try {
            // Get Firebase app instance
            const app = getApp();
            
            // Initialize Remote Config
            this._remoteConfig = getRemoteConfig(app);
            
            // Set minimum fetch interval (prevents excessive requests)
            this._remoteConfig.settings.minimumFetchIntervalMillis = this.FETCH_INTERVAL_MS;
            
            // Note: Defaults are handled in getGeminiApiKey() fallback logic
            // Firebase Remote Config will use server-side defaults if configured
            
            console.log('✅ Remote Config initialized');
            
            // Fetch and activate in background (non-blocking)
            this.fetchAndActivate().catch((error) => {
                console.warn('⚠️ Remote Config initial fetch failed (using defaults):', error.message);
            });
            
            this._initialized = true;
        } catch (error: any) {
            console.error('❌ Failed to initialize Remote Config:', error);
            // Continue without Remote Config - will use env fallback
            this._initialized = false;
        }
    }

    /**
     * Fetch and activate Remote Config values
     * Returns true if fetch was successful, false otherwise
     */
    static async fetchAndActivate(): Promise<boolean> {
        if (!this._remoteConfig) {
            console.warn('⚠️ Remote Config not initialized');
            return false;
        }

        try {
            // Check if we should fetch (respect minimum interval)
            const now = Date.now();
            if (now - this._lastFetchTime < this.FETCH_INTERVAL_MS) {
                console.log('⏭️ Skipping Remote Config fetch (within interval)');
                return false;
            }

            console.log('🔄 Fetching Remote Config...');
            const activated = await fetchAndActivate(this._remoteConfig);
            this._lastFetchTime = now;
            
            if (activated) {
                console.log('✅ Remote Config fetched and activated');
            } else {
                console.log('ℹ️ Remote Config fetched (no changes)');
            }
            
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
        if (!this._remoteConfig) {
            return null;
        }

        try {
            const value = getValue(this._remoteConfig, 'gemini_api_key');
            const key = value.asString();
            
            // Check if value is from Remote Config (not default)
            // getValue returns default/empty if not fetched yet
            const source = value.getSource();
            
            // Only use if it's from Remote Config (not default/static)
            if (source === 'remote' && key && key.trim() !== '') {
                console.log('🔑 Using Remote Config key (source: remote)');
                return key.trim();
            }
            
            // If source is 'default' or 'static', it means Remote Config hasn't fetched yet
            // or the parameter doesn't exist - return null to use env fallback
            return null;
        } catch (error: any) {
            console.warn('⚠️ Failed to get Gemini API key from Remote Config:', error.message);
            return null;
        }
    }

    /**
     * Ensure Remote Config is initialized
     * Call this before using Remote Config values
     */
    static async ensureInitialized(): Promise<void> {
        if (!this._initialized) {
            await this.initialize();
        }
    }

    /**
     * Force refresh Remote Config (ignores minimum interval)
     * Useful for manual refresh or after key rotation
     */
    static async forceRefresh(): Promise<boolean> {
        if (!this._remoteConfig) {
            await this.ensureInitialized();
        }
        
        // Reset last fetch time to force refresh
        this._lastFetchTime = 0;
        return await this.fetchAndActivate();
    }

    /**
     * Check if Remote Config is available and initialized
     */
    static isAvailable(): boolean {
        return this._initialized && this._remoteConfig !== null;
    }
}

