# 🤖# Agent Instructions

> [!WARNING]
> **NEVER USE gRPC or native Firestore** in this React Native project.
> It introduces complex dependency conflicts ("non-modular header" errors).
> **ALWAYS use the Firebase Web SDK (JS SDK)** for Firestore.

 & Codebase Guide

**READ THIS FIRST**: This document is your primary instruction manual for working on the SparksApp codebase. It defines the rules, patterns, and workflows you must follow to be effective.

## 🎯 **How to Use This Document**

*   **When to Read**: Read this at the **start of every session**. You do not need to be reminded in every prompt if you have this context.
*   **How to Update**: If you discover new patterns, fix recurring issues, or change architecture, **update this file** to help your future self.
*   **Refresh Command**: Run `cat CONTEXT/GENERAL/AGENT.md` if you need to refresh your memory on specific guidelines.

---

## 🏗️ **Core Architecture & Patterns**

### **1. The Spark Pattern**
Everything is a "Spark". When adding a new feature, ask: "Is this a Spark?"
*   **Location**: `src/sparks/`
*   **Registration**: `src/components/SparkRegistry.tsx`
*   **Interface**: Must implement `SparkProps` (see `src/types/spark.ts`)
*   **State**: Use `useSparkStore` for persistence. **Do not use local state for data that should persist.**

### **2. Navigation**
*   **Tab Bar Hiding**: The tab bar automatically hides when entering a Spark. Do not fight this behavior.
*   **Custom Navigation**: Sparks render their own navigation headers.
*   **Back Handling**: Use the provided `onClose` or navigation props to return to the list.

### **3. Settings Design (CRITICAL)**
**ALWAYS** follow the design patterns in `CONTEXT/GENERAL/SETTINGSDESIGN.md`.
*   **Components**: Use `SettingsSection`, `SettingsRow`, `SettingsToggle`, `SettingsButton` from `src/components/SettingsComponents.tsx`.
*   **Feedback**: Every spark MUST have a feedback section.
*   **Consistency**: Do not invent new settings UI. Use the standard components.

### **4. Notifications**
*   **Service**: Use `FeedbackNotificationService` for feedback-related notifications.
*   **Logic**: We use **manual clearing** for notifications. Do not auto-clear notifications on view. Users must click "Mark as Read".
*   **Reference**: See `CONTEXT/GENERAL/NOTIFICATIONS.md` for full details.

---

## 🛠️ **Deployment & Builds**

### **1. Local Development**
*   **Command**: `npx expo start`
*   **Simulator**: `npx expo run:ios` (requires Xcode)

### **2. Production Builds**
*   **Reference**: `CONTEXT/GENERAL/LOCAL_IOS_PRODUCTION_BUILD.md`
*   **Key Command**: `npx expo run:ios --configuration Release --device`
*   **Troubleshooting**: If build fails, check `CONTEXT/GENERAL/DEPLOYMENT.md`.

---

## ⚡ **Productivity & Best Practices**

### **1. Code Suggestions**
*   **Be Complete**: When suggesting code, provide the **full context** or clear markers. Don't leave ambiguous `...` in critical logic.
*   **Imports**: Check imports carefully. We use absolute paths or consistent relative paths.
*   **Types**: We are strict about TypeScript. Define interfaces for your data.

### **2. Common Tasks**
*   **Adding a Spark**:
    1.  Create `src/sparks/MySpark.tsx`
    2.  Add to `src/components/SparkRegistry.tsx`
    3.  Add type definition in `src/types/spark.ts`
    4.  **Initial Rating**: Set `rating: 4.5` in the metadata.
*   **Adding Assets**: Put images in `assets/` and run `npx expo install` if adding new native dependencies.

### **3. Context Management**
*   **Archive**: Old plans and docs go to `CONTEXT/ARCHIVE/`. Keep the active context clean.
*   **Planned Sparks**: Future ideas go to `CONTEXT/PLANNEDSPARKS/`.

---

## 🚨 **Known Issues & "Gotchas"**

*   **Firebase Keys**: Never hardcode API keys. Use `process.env.EXPO_PUBLIC_...`.
*   **Expo Go vs Dev Build**: Some features (Notifications, Background Tasks) **do not work** in Expo Go. Always verify if a Dev Build is needed.
*   **Directory Check**: Always ensure you are in the root (`/Users/mattdyor/SparksApp`) before running commands.

---

## 📂 **Key Documentation References**

*   **Settings Design**: `CONTEXT/GENERAL/SETTINGSDESIGN.md`
*   **Deployment**: `CONTEXT/GENERAL/DEPLOYMENT.md`
*   **iOS Build**: `CONTEXT/GENERAL/LOCAL_IOS_PRODUCTION_BUILD.md`
*   **Notifications**: `CONTEXT/GENERAL/NOTIFICATIONS.md`
*   **Testing**: `CONTEXT/GENERAL/TESTPLAN.md`
