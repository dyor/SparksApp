import Constants from 'expo-constants';

/**
 * Check if the app is running in Expo Go
 * @returns true if running in Expo Go, false otherwise
 */
export const isExpoGo = (): boolean => {
  try {
    // Check execution environment
    const executionEnvironment = Constants.executionEnvironment;
    if (executionEnvironment === 'storeClient') {
      return true; // Expo Go
    }

    // Fallback check: Expo Go doesn't have native modules hook
    if (__DEV__ && typeof (global as any).nativeCallSyncHook === 'undefined') {
      return true;
    }

    return false;
  } catch (error) {
    // If we can't determine, assume not Expo Go to avoid breaking functionality
    return false;
  }
};
