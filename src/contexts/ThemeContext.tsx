import React, { createContext, useContext, ReactNode } from "react";
import { useSettingsStore, ThemeColors } from "../store/settingsStore";

// Re-export ThemeColors for use in other files
export type { ThemeColors };

interface ThemeContextType {
  colors: ThemeColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// Default theme colors - used as fallback if store isn't ready
const defaultLightTheme = {
  primary: "#007AFF",
  secondary: "#007AFF",
  background: "#ffffff",
  surface: "#ffffff",
  text: "#333333",
  textSecondary: "#666666",
  border: "#e0e0e0",
  success: "#28A745",
  warning: "#FFC107",
  error: "#DC3545",
  info: "#17A2B8",
} as ThemeColors;

const defaultDarkTheme = {
  primary: "#0A84FF",
  secondary: "#5E5CE6",
  background: "#000000",
  surface: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#AEAEB2",
  border: "#38383A",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
  info: "#64D2FF",
} as ThemeColors;

// Provide a default context value to prevent crashes during initialization
const defaultContextValue: ThemeContextType = {
  colors: defaultLightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const store = useSettingsStore();
  const themeColors = store.getThemeColors();
  const currentDarkMode = store.darkMode;

  const toggleTheme = React.useCallback(() => {
    store.toggleDarkMode();
  }, [store]);

  const contextValue: ThemeContextType = {
    colors: themeColors,
    isDarkMode: currentDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined || !context || !context.colors) {
    // Return default theme if context isn't ready yet (can happen in release builds during initialization)
    console.warn("useTheme: Context not ready, returning default theme");
    return {
      colors: defaultLightTheme,
      isDarkMode: false,
      toggleTheme: () => {},
    };
  }
  return context;
};
