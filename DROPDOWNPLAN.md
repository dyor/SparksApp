# Dropdown Component Refactoring Plan

## Overview

This plan outlines the strategy for creating a standardized, reusable `Dropdown` component for the SparksApp and refactoring existing implementations to use it. The goal is to ensure UI/UX consistency, simplify development, and enable advanced features like input-style display with modal selection.

Currently, custom dropdown logic exists in `GolfBrainSpark.tsx` and has been recently implemented in `SpinnerSpark.tsx` (as `WeightDropdown`). Both follow a similar pattern of toggling between an input-like appearance and a modal for selection, avoiding the use of external libraries like `@react-native-picker/picker`. This plan aims to consolidate these into a single shared component.

## Goals

1.  **Centralize Dropdown Logic**: Create a single, highly configurable `Dropdown` component in `src/components/shared/Dropdown.tsx`.
2.  **Ensure UI/UX Consistency**: All dropdowns across the app should look and behave similarly.
3.  **Simplify Development**: Provide a ready-to-use component for future Spark development.
4.  **Refactor Existing Sparks**: Update `GolfBrainSpark.tsx` and `SpinnerSpark.tsx` to utilize the new shared `Dropdown` component.

## Proposed Component: `src/components/shared/Dropdown.tsx`

The new `Dropdown` component should be designed to be flexible, supporting various use cases. It should expose the following interface and features:

```typescript
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
```

## Implementation Plan

### Phase 1: Create the Shared Component

1.  **Create Directory**: Create `src/components/shared/` if it doesn't exist.
2.  **Create File**: Create `src/components/shared/Dropdown.tsx`.
3.  **Populate Content**: Add the code for the `Dropdown` component as defined above.

### Phase 2: Refactor `SpinnerSpark.tsx`

1.  **Import**: Update `SpinnerSpark.tsx` to import the new `Dropdown` component:
    `import { Dropdown } from '../components/shared/Dropdown';`
2.  **Replace `WeightDropdown`**:
    *   Remove the locally defined `WeightDropdown` component from `SpinnerSpark.tsx`.
    *   Replace all instances of `<WeightDropdown ... />` with `<Dropdown ... />`.
    *   Map the weight values (1-10) to `DropdownOption` format: `{ label: '1 (Small)', value: 1 }`.

### Phase 3: Refactor `GolfBrainSpark.tsx`

1.  **Import**: Update `GolfBrainSpark.tsx` to import the new `Dropdown` component:
    `import { Dropdown } from '../components/shared/Dropdown';`
2.  **Replace Existing Dropdown**:
    *   Remove the locally defined `Dropdown` component from `GolfBrainSpark.tsx`.
    *   Replace all instances of `<Dropdown ... />` with the new `<Dropdown ... />`.
    *   Ensure all options are mapped to `DropdownOption` format: `{ label: string, value: string }`. The existing `options: readonly string[]` can be mapped by using `options.map(o => ({ label: o, value: o }))`.

## Future Work

*   **Documentation**: Add usage examples and props documentation to the `Dropdown.tsx` file and potentially to `CONTEXT/GENERAL/UI_COMPONENTS.md` (if such a file exists or is created).
*   **Accessibility**: Ensure the component is fully accessible for screen readers and keyboard navigation.
*   **Error Handling**: Add more robust error handling for invalid props or empty options.
*   **Theming**: Further integrate with the `ThemeContext` for advanced theming options.
*   **Other Spark Refactoring**: Identify any other Sparks that might benefit from this shared dropdown component.

This plan ensures a consistent, maintainable, and scalable solution for dropdowns across the SparksApp.