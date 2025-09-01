import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

export const HapticFeedback = {
  // Light feedback for button presses, toggles
  light: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  // Medium feedback for card flips, selections
  medium: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  // Heavy feedback for important actions, game events
  heavy: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  // Success feedback for correct answers, achievements
  success: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  // Warning feedback for alerts, cautions
  warning: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  // Error feedback for wrong answers, failures
  error: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  // Selection feedback for UI interactions
  selection: () => {
    const { hapticEnabled } = useSettingsStore.getState();
    if (hapticEnabled) {
      Haptics.selectionAsync();
    }
  },
};

// Convenience function to check if haptics are enabled
export const isHapticEnabled = (): boolean => {
  return useSettingsStore.getState().hapticEnabled;
};