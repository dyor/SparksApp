# Spark Development Guide

## Quick Start Checklist

When creating a new spark, follow these patterns for consistency and maintainability:

### ✅ Required Patterns

1. **Use `useSparkStore` for Data Persistence**
   ```typescript
   import { useSparkStore } from '../store';
   
   const { getSparkData, setSparkData } = useSparkStore();
   
   // Load data
   const [data, setData] = useState(() => {
     const saved = getSparkData('spark-id');
     return saved || DEFAULT_DATA;
   });
   
   // Save data
   const saveData = (newData: YourDataType) => {
     setData(newData);
     setSparkData('spark-id', newData);
   };
   ```

2. **Follow Settings Design Guidelines**
   - See `CONTEXT/GENERAL/SETTINGSDESIGN.md`
   - Always include `SettingsFeedbackSection` as first section
   - Use standardized components from `SettingsComponents.tsx`
   - Follow button color and placement standards

3. **Keep Code in Single File**
   - All spark code in `src/sparks/YourSpark.tsx`
   - Only split if file exceeds ~2000 lines
   - Use TypeScript interfaces/types at top of file
   - Group related functions together

4. **Use Theme System**
   ```typescript
   import { useTheme } from '../contexts/ThemeContext';
   const { colors } = useTheme();
   ```

5. **Implement Haptic Feedback**
   ```typescript
   import { HapticFeedback } from '../utils/haptics';
   HapticFeedback.light(); // For selections
   HapticFeedback.success(); // For completions
   HapticFeedback.error(); // For errors
   ```

### 📋 Standard Spark Structure

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ... } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import { SettingsComponents } from '../components/SettingsComponents';
import { HapticFeedback } from '../utils/haptics';

// 1. Type Definitions
interface YourSparkData {
  // Define your data structure
}

const DEFAULT_DATA: YourSparkData = {
  // Default values
};

// 2. Main Component
export const YourSpark: React.FC<SparkProps> = ({
  showSettings,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();

  // 3. State Management
  const [data, setData] = useState(() => {
    const saved = getSparkData('your-spark-id');
    return saved || DEFAULT_DATA;
  });

  // 4. Save Helper
  const saveData = (newData: YourSparkData) => {
    setData(newData);
    setSparkData('your-spark-id', newData);
  };

  // 5. Settings View
  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            icon="🎯"
            title="Your Spark Settings"
            subtitle="Configure your spark"
          />
          <SettingsFeedbackSection sparkId="your-spark-id" />
          {/* Your settings sections */}
          <SaveCancelButtons
            onSave={onCloseSettings || (() => {})}
            onCancel={onCloseSettings || (() => {})}
            saveText="Done"
            cancelText="Close"
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  // 6. Main View
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Your spark UI */}
    </View>
  );
};

// 7. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### 🎨 Common Patterns

#### Loading/Saving Data
```typescript
// Load on mount
useEffect(() => {
  const saved = getSparkData('spark-id');
  if (saved) {
    setData(saved);
  }
}, [getSparkData]);

// Auto-save on changes
useEffect(() => {
  setSparkData('spark-id', data);
}, [data, setSparkData]);
```

#### Settings Pattern
```typescript
// Always include feedback section first
<SettingsFeedbackSection sparkId="your-spark-id" />

// Use SettingsSection for grouping
<SettingsSection title="Configuration" icon="⚙️">
  {/* Settings content */}
</SettingsSection>

// Use SaveCancelButtons at bottom
<SaveCancelButtons
  onSave={handleSave}
  onCancel={onCloseSettings || (() => {})}
/>
```

#### List Management
```typescript
// Add item
const addItem = (item: Item) => {
  saveData({
    ...data,
    items: [...data.items, item],
  });
  HapticFeedback.success();
};

// Remove item
const removeItem = (id: string) => {
  saveData({
    ...data,
    items: data.items.filter(i => i.id !== id),
  });
  HapticFeedback.light();
};
```

### 🚫 Anti-Patterns to Avoid

1. **Don't use AsyncStorage directly** - Use `useSparkStore` instead
2. **Don't create separate service files** - Keep everything in the spark file
3. **Don't skip SettingsFeedbackSection** - It's required
4. **Don't use custom storage keys** - Let `useSparkStore` handle it
5. **Don't split into multiple files** - Keep it in one file unless >2000 lines

### 📚 Reference Examples

- **Simple Spark**: `ShopSpark.tsx` - Basic list management
- **Complex Spark**: `GolfBrainSpark.tsx` - Multiple screens, complex state
- **Settings Heavy**: `CardScoreSpark.tsx` - Extensive configuration
- **Chart/Visualization**: `GoalTrackerSpark.tsx` - Data visualization

### 🔧 Migration from dbService

If migrating from `dbService.ts` pattern:

1. Define single data structure
2. Replace all AsyncStorage calls with `getSparkData`/`setSparkData`
3. Remove error handling (handled by Zustand)
4. Remove key constants
5. Remove initDB function
6. Simplify all CRUD operations

### 📝 Checklist Before Submitting

- [ ] Uses `useSparkStore` for persistence
- [ ] Follows `SETTINGSDESIGN.md` guidelines
- [ ] All code in single `.tsx` file
- [ ] Uses theme system (`useTheme`)
- [ ] Implements haptic feedback
- [ ] Includes `SettingsFeedbackSection`
- [ ] Uses standardized components
- [ ] TypeScript types defined
- [ ] Error handling for user-facing operations
- [ ] Tested on iOS, Android, and Web

