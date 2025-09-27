import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

interface SettingsContainerProps {
  children: React.ReactNode;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({ children }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return <View style={styles.container}>{children}</View>;
};

interface SettingsScrollViewProps {
  children: React.ReactNode;
}

export const SettingsScrollView: React.FC<SettingsScrollViewProps> = ({ children }) => {
  const styles = StyleSheet.create({
    scrollContainer: {
      padding: 20,
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
};

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
  icon?: string;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title, subtitle, icon }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{icon && `${icon} `}{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

interface SettingsInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
      minHeight: multiline ? numberOfLines * 24 + 24 : 44,
    },
  });

  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
};

interface SettingsButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          ...baseStyle
        };
      case 'secondary':
        return {
          backgroundColor: colors.border,
          borderWidth: 0,
          ...baseStyle
        };
      case 'danger':
        return {
          backgroundColor: colors.error,
          borderWidth: 0,
          ...baseStyle
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
          ...baseStyle
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          ...baseStyle
        };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: '#fff' };
      case 'secondary':
        return { color: colors.text };
      case 'danger':
        return { color: '#fff' };
      case 'outline':
        return { color: colors.text };
      default:
        return { color: '#fff' };
    }
  };

  const styles = StyleSheet.create({
    button: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 12,
      ...getButtonStyle(),
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      ...getTextStyle(),
    },
  });

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

interface SettingsButtonRowProps {
  children: React.ReactNode;
}

export const SettingsButtonRow: React.FC<SettingsButtonRowProps> = ({ children }) => {
  const styles = StyleSheet.create({
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
  });

  return <View style={styles.buttonContainer}>{children}</View>;
};

interface SaveCancelButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  saveText?: string;
  cancelText?: string;
  saveDisabled?: boolean;
}

export const SaveCancelButtons: React.FC<SaveCancelButtonsProps> = ({
  onSave,
  onCancel,
  saveText = 'Save Changes',
  cancelText = 'Cancel',
  saveDisabled = false
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>{cancelText}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          styles.saveButton,
          saveDisabled && { opacity: 0.6 }
        ]}
        onPress={onSave}
        disabled={saveDisabled}
      >
        <Text style={styles.saveButtonText}>{saveText}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface SettingsItemProps {
  children: React.ReactNode;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ children }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });

  return <View style={styles.item}>{children}</View>;
};

interface SettingsTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'caption';
}

export const SettingsText: React.FC<SettingsTextProps> = ({ children, variant = 'body' }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    bodyText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    captionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

  const textStyle = variant === 'body' ? styles.bodyText : styles.captionText;

  return <Text style={textStyle}>{children}</Text>;
};

interface SettingsRemoveButtonProps {
  onPress: () => void;
  text?: string;
}

export const SettingsRemoveButton: React.FC<SettingsRemoveButtonProps> = ({
  onPress,
  text = 'Remove'
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    removeButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginLeft: 10,
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity style={styles.removeButton} onPress={onPress}>
      <Text style={styles.removeButtonText}>{text}</Text>
    </TouchableOpacity>
  );
};

interface SettingsFeedbackSectionProps {
  sparkName: string;
}

export const SettingsFeedbackSection: React.FC<SettingsFeedbackSectionProps> = ({ sparkName }) => {
  const handleShareFeedback = async () => {
    const subject = encodeURIComponent(`${sparkName} Feedback - Sparks App`);
    const body = encodeURIComponent(`Hi Matt,

I'd like to share some feedback about ${sparkName}:

[Please share your thoughts, suggestions, or issues here]

Thanks!`);

    const emailUrl = `mailto:matt@dyor.com?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        HapticFeedback.success();
      } else {
        Alert.alert(
          'Email Not Available',
          'Please send your feedback to matt@dyor.com',
          [
            { text: 'OK', onPress: () => HapticFeedback.light() }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not open email app. Please send feedback to matt@dyor.com',
        [
          { text: 'OK', onPress: () => HapticFeedback.light() }
        ]
      );
    }
  };

  return (
    <SettingsSection title="Feedback">
      <SettingsButton
        title="📧 Share Feedback"
        onPress={handleShareFeedback}
      />
    </SettingsSection>
  );
};