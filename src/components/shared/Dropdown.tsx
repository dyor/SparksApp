// src/components/shared/Dropdown.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext'; // Assuming path from shared component

export interface DropdownOption {
  label: string;
  value: string | number;
}

export interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string | number;
  onSelect: (value: string | number) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  modalTitle?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  placeholder = "Select an option",
  style,
  textStyle,
  modalTitle = "Select Option",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();

  const handleSelect = useCallback((value: string | number) => {
    onSelect(value);
    setIsOpen(false);
  }, [onSelect]);

  const styles = StyleSheet.create({
    touchable: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.background,
      paddingVertical: 12,
      paddingHorizontal: 12,
      minHeight: 44,
    },
    text: {
      color: colors.text,
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      margin: 20,
      maxHeight: '70%',
      minWidth: '80%',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalHeader: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      color: colors.text,
    },
    optionItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    selectedOptionItem: {
      backgroundColor: colors.primary + '20',
    },
    optionText: {
      color: colors.text,
      fontSize: 16,
    },
    selectedOptionText: {
      fontWeight: '600',
      color: colors.primary,
    },
  });

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  return (
    <View style={{ position: 'relative', width: '100%' }}>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.touchable, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, textStyle]}>{selectedLabel}</Text>
        <Text style={[styles.text, { fontSize: 12 }]}>{'▼'}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalHeader}>{modalTitle}</Text>
            <ScrollView
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={true}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value.toString()}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.optionItem,
                    selectedValue === option.value && styles.selectedOptionItem,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedValue === option.value && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};