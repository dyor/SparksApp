import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExchangeRateResult {
  success: boolean;
  rate?: number;
  error?: string;
}

export interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
  baseCode: string;
}

export class ExchangeRateService {
  // Using exchangerate-api.com v6 with API key
  // Free plan: Unlimited requests, updates once per day
  private static readonly API_KEY = 'f13ccf82091a2f08ba5470b7';
  private static readonly EXCHANGE_RATE_URL = 'https://v6.exchangerate-api.com/v6';
  private static readonly CACHE_KEY = 'exchange_rates_cache';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  static async isNetworkAvailable(): Promise<boolean> {
    // Simple network check by attempting a fetch to a reliable endpoint
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached exchange rates from AsyncStorage
   */
  private static async getCachedRates(): Promise<CachedRates | null> {
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cachedData) {
        return null;
      }

      const cached: CachedRates = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is still valid (within 24 hours)
      if (now - cached.timestamp < this.CACHE_DURATION) {
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cached rates:', error);
      return null;
    }
  }

  /**
   * Save exchange rates to AsyncStorage cache
   */
  private static async saveCachedRates(rates: Record<string, number>, baseCode: string): Promise<void> {
    try {
      const cached: CachedRates = {
        rates,
        timestamp: Date.now(),
        baseCode,
      };
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Error saving cached rates:', error);
    }
  }

  /**
   * Fetch all exchange rates from API and cache them
   */
  static async fetchAllRates(): Promise<{ success: boolean; rates?: Record<string, number>; error?: string }> {
    try {
      // Check network connectivity first
      const isOnline = await this.isNetworkAvailable();
      if (!isOnline) {
        // Try to return cached rates if offline
        const cached = await this.getCachedRates();
        if (cached) {
          return {
            success: true,
            rates: cached.rates,
          };
        }
        return {
          success: false,
          error: 'No internet connection available',
        };
      }

      // Fetch all exchange rates from exchangerate-api.com v6
      // Format: https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD
      const response = await fetch(`${this.EXCHANGE_RATE_URL}/${this.API_KEY}/latest/USD`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        // Try to return cached rates if API fails
        const cached = await this.getCachedRates();
        if (cached) {
          return {
            success: true,
            rates: cached.rates,
          };
        }
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json();
      
      // exchangerate-api.com v6 returns: { result: "success", base_code: "USD", conversion_rates: { MXN: 18.32, ... } }
      if (!data || data.result !== 'success' || !data.conversion_rates) {
        const errorMsg = data?.error || data?.message || 'Exchange rate service error';
        // Try to return cached rates if API returns error
        const cached = await this.getCachedRates();
        if (cached) {
          return {
            success: true,
            rates: cached.rates,
          };
        }
        throw new Error(errorMsg);
      }

      // Cache all rates
      await this.saveCachedRates(data.conversion_rates, data.base_code || 'USD');

      return {
        success: true,
        rates: data.conversion_rates,
      };
    } catch (error) {
      console.error('Exchange rate error:', error);
      
      // Try to return cached rates as fallback
      const cached = await this.getCachedRates();
      if (cached) {
        return {
          success: true,
          rates: cached.rates,
        };
      }
      
      let errorMessage = 'Failed to fetch exchange rate';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = (error as any).message || (error as any).error || JSON.stringify(error);
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get cached rate for a specific currency, or fetch all rates if cache is stale
   */
  static async getCachedRate(currencyCode: string): Promise<number | null> {
    const cached = await this.getCachedRates();
    if (cached && cached.rates[currencyCode]) {
      return cached.rates[currencyCode];
    }
    return null;
  }

  /**
   * Fetch current exchange rate from USD to target currency
   * Uses cache if available, otherwise fetches all rates from API
   * @param currencyCode - ISO currency code (e.g., 'MXN', 'EUR', 'GBP')
   * @returns ExchangeRateResult with rate or error
   */
  static async fetchExchangeRate(currencyCode: string): Promise<ExchangeRateResult> {
    try {
      // First, check if we have cached rates
      const cached = await this.getCachedRates();
      if (cached && cached.rates[currencyCode]) {
        return {
          success: true,
          rate: cached.rates[currencyCode],
        };
      }

      // If no cache, fetch all rates from API
      const result = await this.fetchAllRates();
      
      if (result.success && result.rates) {
        const rate = result.rates[currencyCode];
        if (rate && typeof rate === 'number' && rate > 0) {
          return {
            success: true,
            rate: rate,
          };
        } else {
          return {
            success: false,
            error: `Currency ${currencyCode} not found in exchange rates`,
          };
        }
      }

      return {
        success: false,
        error: result.error || 'Failed to fetch exchange rate',
      };
    } catch (error) {
      console.error('Exchange rate error:', error);
      let errorMessage = 'Failed to fetch exchange rate';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = (error as any).message || (error as any).error || JSON.stringify(error);
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

