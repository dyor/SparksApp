import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

interface AppState {
  // User preferences
  preferences: UserPreferences;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // App state
  isFirstLaunch: boolean;
  setIsFirstLaunch: (isFirst: boolean) => void;
  
  // Current spark state
  currentSparkId: string | null;
  setCurrentSparkId: (sparkId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: {
        theme: 'system',
        soundEnabled: true,
        hapticsEnabled: true,
      },
      isFirstLaunch: true,
      currentSparkId: null,
      
      // Actions
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      
      setIsFirstLaunch: (isFirst) => set({ isFirstLaunch: isFirst }),
      
      setCurrentSparkId: (sparkId) => set({ currentSparkId: sparkId }),
    }),
    {
      name: 'sparks-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        isFirstLaunch: state.isFirstLaunch,
      }),
    }
  )
);