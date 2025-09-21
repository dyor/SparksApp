# SparksApp Codebase Overview

## 🏗️ **Architecture & Technology Stack**

### **Core Technologies**
- **React Native + Expo**: Cross-platform mobile development
- **TypeScript**: Type-safe JavaScript for better development experience
- **React Navigation**: Navigation system with tab and stack navigators
- **Zustand**: Lightweight state management
- **AsyncStorage**: Local data persistence
- **Styled Components**: CSS-in-JS styling (minimal usage)

### **Key Dependencies**
- `expo-notifications`: Push notifications and scheduling
- `expo-speech`: Text-to-speech functionality
- `expo-haptics`: Tactile feedback
- `react-native-safe-area-context`: Handle device safe areas

## 📁 **Project Structure**

```
src/
├── components/          # Reusable UI components
│   ├── SparkRegistry.tsx   # Central spark registration
│   └── BaseSpark.tsx       # Base spark component
├── contexts/            # React context providers
│   └── ThemeContext.tsx    # Dark/light theme management
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx    # Main navigation setup
├── screens/            # Main application screens
│   ├── SparkSelectionScreen.tsx  # "My Sparks" screen
│   ├── MarketplaceScreen.tsx     # Available sparks browser
│   ├── SettingsScreen.tsx        # App settings
│   └── SparkScreen.tsx           # Individual spark renderer
├── sparks/             # Individual spark implementations
│   ├── FlashcardsSpark.tsx      # Spanish language learning
│   ├── TodoSpark.tsx            # Task management
│   ├── PackingListSpark.tsx     # Travel packing lists
│   ├── SpinnerSpark.tsx         # Decision-making wheel
│   └── BusinessSpark.tsx        # Business simulation game
├── store/              # State management
│   ├── index.ts             # Store exports
│   ├── appStore.ts          # App-wide preferences
│   └── sparkStore.ts        # Spark data and progress
├── types/              # TypeScript definitions
│   ├── navigation.ts        # Navigation type definitions
│   └── spark.ts            # Spark interface definitions
└── utils/              # Utility functions
    ├── haptics.ts          # Haptic feedback wrapper
    └── notifications.ts    # Notification service
```

## 🧩 **Core Architecture Concepts**

### **1. Spark System**
The app is built around **"Sparks"** - self-contained mini-applications/activities:

```typescript
interface BaseSpark {
  metadata: SparkMetadata;  // Title, description, icon, category
  component: React.ComponentType<SparkProps>;
}
```

**SparkRegistry.tsx** acts as the central registry where all sparks are registered and can be discovered.

### **2. Navigation Architecture**
```
TabNavigator (AppNavigator)
├── MySparks Tab → MySparksStack
│   ├── MySparksList (SparkSelectionScreen)
│   └── Spark (SparkScreen) → Renders individual spark
├── Marketplace Tab → MarketplaceStack  
│   ├── MarketplaceList (MarketplaceScreen)
│   └── Spark (SparkScreen) → Same spark renderer
└── Settings Tab (SettingsScreen)
```

**Key Feature**: Custom navigation hiding - tab bar disappears when inside sparks for immersive experience.

### **3. State Management Pattern**
**Zustand stores** handle different data domains:

- **`appStore.ts`**: User preferences (theme, notifications, haptics)
- **`sparkStore.ts`**: Spark data, user progress, collections

```typescript
// Spark-specific data storage pattern
const { getSparkData, setSparkData } = useSparkStore();
const savedData = getSparkData('spark-id');
setSparkData('spark-id', { user: 'data' });
```

### **4. Spark Implementation Pattern**
Each spark follows a consistent interface:

```typescript
interface SparkProps {
  showSettings?: boolean;      // Settings modal control
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}
```

**Sparks are responsible for**:
- Their own UI and logic
- Data persistence via `useSparkStore`
- Settings management
- Progress tracking
- Completion callbacks

## 🔄 **Data Flow & Key Interactions**

### **Spark Lifecycle**
1. **Discovery**: User browses sparks in Marketplace
2. **Addition**: User adds spark to their collection
3. **Launch**: User opens spark from "My Sparks"
4. **Execution**: Spark renders with custom navigation
5. **Persistence**: Spark saves progress via store
6. **Completion**: Optional completion callback triggers

### **Navigation Flow**
```
User in TabNavigator → Selects Spark → SparkScreen
→ SparkScreen renders spark component → Custom navigation appears
→ Tab bar hides → Immersive spark experience
→ User exits → Returns to tab navigation
```

### **Theme System**
- **ThemeContext** provides colors and theme state
- **Automatic switching** between light/dark modes
- **Safe area handling** for modern iOS devices (Dynamic Island)

## 📱 **Current Sparks Overview**

| Spark | Purpose | Key Features |
|-------|---------|--------------|
| **FlashcardsSpark** | Spanish learning | 50 travel phrases, TTS, session tracking, randomization |
| **TodoSpark** | Task management | Due dates, completion tracking, relative date display |
| **PackingListSpark** | Travel packing | Customizable items, progress tracking |
| **SpinnerSpark** | Decision making | Customizable wheel with options |
| **BusinessSpark** | Business simulation | Strategic decision-making game |

## 🔧 **Key Technical Features**

### **Notifications System**
- **Daily reminders** at 8 AM to check new sparks
- **Expo Notifications** with proper permissions
- **Cross-platform** scheduling (iOS/Android)
- **Settings toggle** for user control

### **Audio & Haptics**
- **Text-to-speech** for Spanish pronunciation (FlashcardsSpark)
- **Haptic feedback** throughout the app for better UX
- **Audio settings** user can control

### **Data Persistence**
- **AsyncStorage** via Zustand persistence
- **Per-spark data** storage pattern
- **Settings and progress** automatically saved
- **Export functionality** (basic implementation)

## 🚀 **Getting Started as a New Developer**

### **1. Key Entry Points**
- **App.tsx**: Application root with theme and navigation setup
- **AppNavigator.tsx**: Main navigation structure
- **SparkRegistry.tsx**: Add new sparks here

### **2. Adding a New Spark**
1. Create component in `src/sparks/NewSpark.tsx`
2. Implement `SparkProps` interface
3. Add to `SparkRegistry.tsx`
4. Test via Marketplace

### **3. Common Patterns**
- **State**: Use `useSparkStore()` for data persistence
- **Styling**: Follow existing `StyleSheet.create()` patterns with `colors` from theme
- **Navigation**: Sparks auto-hide tab bar, use provided navigation props
- **Feedback**: Use `HapticFeedback.light()` for interactions

### **4. Development Commands**
```bash
npm start          # Start development server
npx expo start     # Expo development server
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
```

## 📋 **Current Status & Known Issues**

### **Recently Completed**
- ✅ Daily notification system
- ✅ Spanish flashcards with TTS and randomization
- ✅ TodoSpark with date management
- ✅ iOS Dynamic Island spacing fixes

### **Architecture Strengths**
- **Modular spark system** - easy to add new functionality
- **Consistent data patterns** - predictable state management
- **Cross-platform** - single codebase for iOS/Android
- **Type safety** - TypeScript throughout

### **Areas for Future Enhancement**
- **Testing framework** - No tests currently implemented
- **Performance optimization** - Large spark registry could be lazy-loaded
- **Offline capability** - Currently requires online for notifications
- **Analytics** - No usage tracking implemented

This architecture provides a solid foundation for a mini-app ecosystem where each "spark" is a focused, useful tool or activity for users.