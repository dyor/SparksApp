import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MusicAnalysisResult } from '../services/MusicMakerService';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyNotificationsEnabled: boolean;
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

  // Recent sparks for quick switching
  recentSparks: string[];
  addRecentSpark: (sparkId: string) => void;
  clearRecentSparks: () => void;

  // *** Persistent songs ***
  songs: MusicAnalysisResult[];
  addSong: (song: MusicAnalysisResult) => void;
  removeSong: (songId: string) => void; // songId = vocalUri or generated id
  setSongs: (songs: MusicAnalysisResult[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: {
        theme: 'system',
        soundEnabled: true,
        hapticsEnabled: true,
        dailyNotificationsEnabled: false,
      },
      isFirstLaunch: true,
      currentSparkId: null,
      recentSparks: [],
      songs: [],

      // Actions
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      setIsFirstLaunch: (isFirst) => set({ isFirstLaunch: isFirst }),

      setCurrentSparkId: (sparkId) => set({ currentSparkId: sparkId }),

      addRecentSpark: (sparkId) =>
        set((state) => {
          const filtered = state.recentSparks.filter(id => id !== sparkId);
          const updated = [sparkId, ...filtered].slice(0, 5); // Keep only 5 most recent
          return { recentSparks: updated };
        }),

      clearRecentSparks: () => set({ recentSparks: [] }),
      addSong: (song) => set((state) => ({ songs: [...state.songs, song] })),
      removeSong: (songId) => set((state) => ({ songs: state.songs.filter((s) => s.vocalUri !== songId) })),
      setSongs: (songs) => set(() => ({ songs }))
    }),
    {
      name: 'sparks-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        isFirstLaunch: state.isFirstLaunch,
        recentSparks: state.recentSparks,
        songs: state.songs,
      }),
    }
  )
);