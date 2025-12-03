import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsStore, ThemeColors } from '../store/settingsStore';

// Re-export ThemeColors for use in other files
export type { ThemeColors };

interface ThemeContextType {
  colors: ThemeColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { darkMode, toggleDarkMode, getThemeColors } = useSettingsStore();

  const contextValue: ThemeContextType = {
    colors: getThemeColors(),
    isDarkMode: darkMode,
    toggleTheme: toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};