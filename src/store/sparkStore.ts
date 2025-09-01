import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SparkProgress {
  sparkId: string;
  lastPlayed: Date;
  timesPlayed: number;
  bestScore?: number;
  completionPercentage?: number;
  customData?: Record<string, any>;
}

interface SparkState {
  // Progress tracking
  sparkProgress: Record<string, SparkProgress>;
  updateSparkProgress: (sparkId: string, progress: Partial<SparkProgress>) => void;
  getSparkProgress: (sparkId: string) => SparkProgress | undefined;
  
  // Spark data persistence
  sparkData: Record<string, Record<string, any>>;
  setSparkData: (sparkId: string, data: Record<string, any>) => void;
  getSparkData: (sparkId: string) => Record<string, any>;
  
  // User's spark collection
  userSparkIds: string[];
  addSparkToUser: (sparkId: string) => void;
  removeSparkFromUser: (sparkId: string) => void;
  getUserSparks: () => string[];
  isUserSpark: (sparkId: string) => boolean;
  
  // Favorites
  favoriteSparkIds: string[];
  addToFavorites: (sparkId: string) => void;
  removeFromFavorites: (sparkId: string) => void;
  isFavorite: (sparkId: string) => boolean;
}

export const useSparkStore = create<SparkState>()(
  persist(
    (set, get) => ({
      // Initial state
      sparkProgress: {},
      sparkData: {},
      userSparkIds: ['spinner', 'flashcards', 'business-sim'], // Default sparks
      favoriteSparkIds: [],
      
      // Actions
      updateSparkProgress: (sparkId, progress) =>
        set((state) => {
          const existingProgress = state.sparkProgress[sparkId] || {
            sparkId,
            lastPlayed: new Date(),
            timesPlayed: 0,
          };
          
          return {
            sparkProgress: {
              ...state.sparkProgress,
              [sparkId]: {
                ...existingProgress,
                ...progress,
                lastPlayed: new Date(),
                timesPlayed: existingProgress.timesPlayed + 1,
              },
            },
          };
        }),
      
      getSparkProgress: (sparkId) => get().sparkProgress[sparkId],
      
      setSparkData: (sparkId, data) =>
        set((state) => ({
          sparkData: {
            ...state.sparkData,
            [sparkId]: { ...state.sparkData[sparkId], ...data },
          },
        })),
      
      getSparkData: (sparkId) => get().sparkData[sparkId] || {},
      
      // User spark collection methods
      addSparkToUser: (sparkId) =>
        set((state) => ({
          userSparkIds: [...new Set([...state.userSparkIds, sparkId])],
        })),
      
      removeSparkFromUser: (sparkId) =>
        set((state) => ({
          userSparkIds: state.userSparkIds.filter(id => id !== sparkId),
        })),
      
      getUserSparks: () => get().userSparkIds,
      
      isUserSpark: (sparkId) => get().userSparkIds.includes(sparkId),
      
      addToFavorites: (sparkId) =>
        set((state) => ({
          favoriteSparkIds: [...new Set([...state.favoriteSparkIds, sparkId])],
        })),
      
      removeFromFavorites: (sparkId) =>
        set((state) => ({
          favoriteSparkIds: state.favoriteSparkIds.filter(id => id !== sparkId),
        })),
      
      isFavorite: (sparkId) => get().favoriteSparkIds.includes(sparkId),
    }),
    {
      name: 'sparks-data-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);