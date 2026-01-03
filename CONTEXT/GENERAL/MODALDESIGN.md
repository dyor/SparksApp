# Modal Design Best Practices

This document outlines best practices for creating modals in the SparksApp, particularly those that contain text inputs and need to handle keyboard interactions properly.

## Core Principles

1. **Always use KeyboardAvoidingView** for modals with text inputs
2. **Use ScrollView** inside KeyboardAvoidingView to allow scrolling when keyboard is open
3. **Set keyboardShouldPersistTaps="handled"** to allow tapping buttons while keyboard is visible
4. **Use Platform-specific behavior** for KeyboardAvoidingView
5. **Move buttons to footer** when using CommonModal component

## Standard Modal Structure

### Option 1: Using CommonModal Component (Recommended)

```tsx
import { CommonModal } from '../components/CommonModal';

// Create footer with buttons
const footer = (
  <View style={styles.buttonContainer}>
    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
      <Text>Cancel</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
      <Text>Save</Text>
    </TouchableOpacity>
  </View>
);

return (
  <CommonModal
    visible={visible}
    title="Modal Title"
    onClose={onClose}
    footer={footer}  // Buttons in footer for proper keyboard handling
  >
    <TextInput
      style={styles.input}
      placeholder="Enter text..."
      value={text}
      onChangeText={setText}
    />
  </CommonModal>
);
```

**Benefits:**
- CommonModal already includes KeyboardAvoidingView
- Buttons in footer automatically stay above keyboard
- Consistent styling across app
- Less code to write

### Option 2: Custom Modal with KeyboardAvoidingView

```tsx
import { Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

return (
  <Modal visible={visible} transparent animationType="slide">
    <KeyboardAvoidingView
      style={styles.modalContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Title</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter text..."
            value={text}
            onChangeText={setText}
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>
);
```

## Key Components Explained

### KeyboardAvoidingView

**Purpose:** Automatically adjusts modal position when keyboard appears

**Behavior:**
- iOS: Use `'padding'` - adjusts padding to push content up
- Android: Use `'height'` - adjusts height to accommodate keyboard

**keyboardVerticalOffset:**
- iOS: Usually `0` (works well with SafeAreaView)
- Android: May need `20` or more depending on status bar

### ScrollView Inside Modal

**Purpose:** Allows content to scroll when keyboard is open

**Important Props:**
- `keyboardShouldPersistTaps="handled"` - Allows tapping buttons while keyboard is visible
- `contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}` - Centers content vertically
- `showsVerticalScrollIndicator={false}` - Cleaner appearance

### TextInput Considerations

**keyboardType:**
- `"numeric"` - Numbers only (no negative sign)
- `"numbers-and-punctuation"` - Numbers with minus sign for negative values
- `"default"` - Full keyboard

**For Negative Numbers:**
- Option 1: Use `keyboardType="numbers-and-punctuation"` and allow `-` in validation
- Option 2: Add +/- toggle button next to input

**Validation Pattern:**
```tsx
onChangeText={(text) => {
  // Allow empty, negative sign, or numbers
  if (text === '' || text === '-' || /^-?\d*$/.test(text)) {
    setValue(text);
  }
}}
```

## Common Patterns

### Pattern 1: Simple Form Modal

```tsx
<CommonModal visible={visible} title="Add Item" onClose={onClose} footer={footer}>
  <TextInput
    style={styles.input}
    placeholder="Item name"
    value={name}
    onChangeText={setName}
    autoFocus
  />
  <TextInput
    style={styles.input}
    placeholder="Description"
    value={description}
    onChangeText={setDescription}
    multiline
  />
</CommonModal>
```

### Pattern 2: Modal with Numeric Input and +/- Button

```tsx
<View style={styles.inputRow}>
  <TouchableOpacity
    style={styles.signButton}
    onPress={() => {
      if (value.startsWith('-')) {
        setValue(value.substring(1));
      } else {
        setValue('-' + value);
      }
    }}
  >
    <Text style={styles.signButtonText}>±</Text>
  </TouchableOpacity>
  <TextInput
    style={styles.input}
    placeholder="Score"
    value={value}
    onChangeText={(text) => {
      if (text === '' || text === '-' || /^-?\d*$/.test(text)) {
        setValue(text);
      }
    }}
    keyboardType="numbers-and-punctuation"
  />
</View>
```

### Pattern 3: Modal with Multiple Inputs and Scrollable Content

```tsx
<CommonModal visible={visible} title="Edit" onClose={onClose} footer={footer}>
  <ScrollView keyboardShouldPersistTaps="handled">
    <TextInput style={styles.input} ... />
    <TextInput style={styles.input} ... />
    <TextInput style={styles.input} ... />
  </ScrollView>
</CommonModal>
```

## Styling Guidelines

### Modal Container
```tsx
modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
}
```

### Modal Content
```tsx
modalContent: {
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: 24,
  width: '90%',
  maxWidth: 400,
  maxHeight: '80%', // Important for scrollable content
}
```

### Input Row with Sign Button
```tsx
inputRow: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
},
signButton: {
  width: 44,
  height: 44,
  backgroundColor: colors.border,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
},
```

## Testing Checklist

- [ ] Modal opens correctly
- [ ] Keyboard appears when input is focused
- [ ] Input is not blocked by keyboard
- [ ] Modal content scrolls when keyboard is open
- [ ] Buttons remain accessible with keyboard open
- [ ] Tapping outside modal (if allowed) dismisses keyboard
- [ ] Negative numbers work correctly (if applicable)
- [ ] Works on both iOS and Android
- [ ] Works in both light and dark mode

## Anti-Patterns to Avoid

❌ **Don't:** Use Modal without KeyboardAvoidingView for text inputs
❌ **Don't:** Put buttons inside ScrollView without footer prop (CommonModal)
❌ **Don't:** Use `keyboardType="numeric"` if you need negative numbers
❌ **Don't:** Forget to set `keyboardShouldPersistTaps="handled"`
❌ **Don't:** Use fixed heights that don't account for keyboard

## Examples in Codebase

- **CommonModal**: `src/components/CommonModal.tsx` - Reusable modal component
- **AddPhraseModal**: `src/components/AddPhraseModal.tsx` - Uses CommonModal with footer
- **CardScoreSpark**: `src/sparks/CardScoreSpark.tsx` - Custom modal with KeyboardAvoidingView
- **TodoSpark**: `src/sparks/TodoSpark.tsx` - Uses CommonModal for edit modal

## Quick Reference

```tsx
// Import
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { CommonModal } from '../components/CommonModal';

// Use CommonModal (easiest)
<CommonModal visible={visible} title="Title" onClose={onClose} footer={buttons}>
  <TextInput ... />
</CommonModal>

// Or custom modal
<Modal visible={visible} transparent>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled">
      <TextInput ... />
    </ScrollView>
  </KeyboardAvoidingView>
</Modal>
```

