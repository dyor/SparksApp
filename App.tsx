import React from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useSettingsStore } from './src/store/settingsStore';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { darkMode } = useSettingsStore();
  
  return (
    <>
      <AppNavigator />
      <StatusBar style={darkMode ? 'light' : 'dark'} />
    </>
  );
}