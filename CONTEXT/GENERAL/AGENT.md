# 🏗️ Codebase Architecture & Reference Guide

> [!NOTE]
> For all agent instructions and workflows, please refer to the primary guide: `CONTEXT/GENERAL/SKILLS.md`. This document now serves as a deep-dive reference for architectural patterns, design standards, and internal workflows of the SparksApp codebase, but not the primary source of agent instructions.

---

## 🏗️ Core Architecture & Patterns

### 1. The Spark Pattern
Everything is a "Spark". A Spark is a self-contained feature module.
*   **Location**: `src/sparks/`
*   **Registration**: `src/components/sparkRegistryData.tsx` (add to `sparkRegistry` object).
*   **Interface**: Must implement `SparkProps` (see `src/types/spark.ts`).
*   **State & Persistence**: Use `useSparkStore` (Zustand) for all persistent data.

### 2. Navigation & UI Structure
*   **Tab Bar**: The global tab bar automatically hides when a Spark is active.
*   **Headers**: Sparks are responsible for rendering their own navigation headers.
*   **Theming**: Use the `useTheme` hook to access the unified color palette.

### 3. Settings Design (CRITICAL)
Consistency is key. Follow `CONTEXT/GENERAL/SETTINGSDESIGN.md` strictly.
*   **Standard Components**: Use `SettingsSection`, `SettingsRow`, `SettingsToggle`, and `SettingsButton` from `src/components/SettingsComponents.tsx`.
*   **Mandatory Section**: Every Spark must have a `SettingsFeedbackSection`.

### 4. Notifications & Feedback
*   **Service**: Use `FeedbackNotificationService` for system-wide feedback.
*   **Manual Clearing**: Notifications are cleared manually by the user, not automatically upon viewing.

---

## 🛠️ Environment & Tooling

### 1. GitHub Codespaces
*   **Detection**: Check for `CODESPACE_NAME` or `GITHUB_CODESPACE` environment variables.
*   **Tooling Restrictions**: In Codespaces, avoid suggesting Xcode, Android Studio, or any GUI-based local tools. Rely on CLI and Expo's web server.

### 2. Preview & Publishing
*   **Standard Commands**: Use "Start Expo Web" for previews and "Start Publish" for creating Pull Requests.
*   **No Direct Push**: Agents should never push directly to `main`. Always create a PR using the publish workflow.

---

## ⚡ Productivity & Best Practices

### 1. Code Style
*   **Completeness**: Provide full files or clear markers. Avoid ambiguous code snippets.
*   **TypeScript**: Maintain strict type definitions for all data structures.
*   **Single File**: Keep Spark logic unified in one file to simplify agent context and maintenance.

### 2. Persistence Layer
*   **Zustand Store**: `src/store/appStore.ts` provides the `useSparkStore` hook.
*   **Hierarchy**: Custom Gemini API keys (if set by the user) take precedence over the default Sparks key.

### 3. Context Management
*   **Archiving**: Move stale plans to `CONTEXT/ARCHIVE/`.
*   **New Ideas**: Log future Spark concepts in `CONTEXT/PLANNEDSPARKS/`.

---

## 🚨 Known Issues & Security
*   **Firebase**: Use only the Web SDK. Native Firestore is known to have compatibility issues with the current React Native setup.
*   **API Keys**: Use `process.env.EXPO_PUBLIC_...` prefixes. Never hardcode keys.
*   **Gemini Service**: Always use the central `GeminiService.ts` for AI operations.

---

## 📂 Key Documentation References

*   [SPARK_DEVELOPMENT_GUIDE.md](file:///Users/mattdyor/SparksApp/CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md) - Code templates.
*   [SETTINGSDESIGN.md](file:///Users/mattdyor/SparksApp/CONTEXT/GENERAL/SETTINGSDESIGN.md) - UI standards.
*   [DEPLOYMENT.md](file:///Users/mattdyor/SparksApp/CONTEXT/GENERAL/DEPLOYMENT.md) - Release procedures.
