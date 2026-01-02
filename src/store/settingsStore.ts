import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  // UI Preferences
  hapticEnabled: boolean;
  soundEnabled: boolean;
  darkMode: boolean;
  animations: boolean;
  notifications: boolean;

  // Display Settings
  fontSize: "small" | "medium" | "large";
  language: "en" | "es" | "fr" | "de";

  // Privacy Settings
  analytics: boolean;
  crashReporting: boolean;

  // Actions
  toggleHaptic: () => void;
  toggleSound: () => void;
  toggleDarkMode: () => void;
  toggleAnimations: () => void;
  toggleNotifications: () => void;
  toggleAnalytics: () => void;
  toggleCrashReporting: () => void;

  setFontSize: (size: "small" | "medium" | "large") => void;
  setLanguage: (lang: "en" | "es" | "fr" | "de") => void;

  resetAllSettings: () => void;

  // Getters
  getThemeColors: () => ThemeColors;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  card: string;
}

const lightTheme: ThemeColors = {
  primary: "#007AFF",
  secondary: "#007AFF",
  // dyor background
  background: "#ffffff",
  // dyor top nav
  surface: "#ffffff",
  text: "#333333",
  textSecondary: "#666666",
  border: "#e0e0e0",
  success: "#28A745",
  warning: "#FFC107",
  error: "#DC3545",
  info: "#17A2B8",
  card: "#ffffff",
};

const darkTheme: ThemeColors = {
  primary: "#0A84FF",
  secondary: "#5E5CE6",
  background: "#000000",
  // dyor: top nav color
  surface: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#AEAEB2",
  border: "#38383A",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
  info: "#64D2FF",
  card: "#1C1C1E",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state - default preferences
      hapticEnabled: true,
      soundEnabled: true,
      darkMode: false,
      animations: true,
      notifications: true,
      fontSize: "medium",
      language: "en",
      analytics: true,
      crashReporting: true,

      // Actions
      toggleHaptic: () =>
        set((state) => ({ hapticEnabled: !state.hapticEnabled })),
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleAnimations: () =>
        set((state) => ({ animations: !state.animations })),
      toggleNotifications: () =>
        set((state) => ({ notifications: !state.notifications })),
      toggleAnalytics: () => set((state) => ({ analytics: !state.analytics })),
      toggleCrashReporting: () =>
        set((state) => ({ crashReporting: !state.crashReporting })),

      setFontSize: (size) => set({ fontSize: size }),
      setLanguage: (lang) => set({ language: lang }),

      resetAllSettings: () =>
        set({
          hapticEnabled: true,
          soundEnabled: true,
          darkMode: false,
          animations: true,
          notifications: true,
          fontSize: "medium",
          language: "en",
          analytics: true,
          crashReporting: true,
        }),

      // Theme getter - ensure it always returns valid colors
      getThemeColors: () => {
        try {
          const state = get();
          const darkMode = state?.darkMode ?? false;
          return darkMode ? darkTheme : lightTheme;
        } catch (error) {
          // Fallback to light theme if store isn't ready
          console.warn("Theme store not ready, using light theme:", error);
          return lightTheme;
        }
      },
    }),
    {
      name: "sparks-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.darkMode = false;
        }
      },
      partialize: (state) => {
        // Exclude darkMode from persistence so it always starts in light mode
        const { darkMode, ...rest } = state;
        return rest;
      },
    }
  )
);

// Export theme colors for use in components
export { lightTheme, darkTheme };
export type { ThemeColors };
