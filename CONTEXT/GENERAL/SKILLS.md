# Agent Skills Reference

This document outlines the specialized capabilities (skills) an AI agent can utilize to perform tasks within the SparksApp codebase. Each skill is designed to be modular, focusing on a specific domain of expertise.

## Available Skills

*   [Spark Development & Creation](#spark-development-creation)
*   [Codebase Query & Analysis](#codebase-query-analysis)
*   [UI Component Usage Guidelines](#ui-component-usage-guidelines)
*   [Data Persistence Management](#data-persistence-management)
*   [Backend Services & Firebase Integration](#backend-services-firebase-integration)
*   [AI Integration (Gemini)](#ai-integration-gemini)
*   [Git & Version Control Workflow](#git-version-control-workflow)
*   [Development Environment Awareness](#development-environment-awareness)
*   [Context Management](#context-management)
*   [Dropdown Component Implementation (Custom)](#dropdown-component-implementation-custom)

---

## Skill: Spark Development & Creation
*   **Purpose**: Guides the agent through the end-to-end process of building a new Spark, encompassing architectural patterns and best practices.
*   **Key Steps**:
    *   **1. Create a Branch (CRITICAL)**
        *   Before making any changes, ensure you are not on the `main` branch.
        *   Check Branch: Run `git rev-parse --abbrev-ref HEAD`
        *   Action: If on `main`, create a new branch immediately: `git checkout -b spark-{spark-name}`
        *   Naming: Use lowercase with hyphens (e.g., `spark-hangman`, `spark-todo-list`).
    *   **2. Design & Develop**
        *   Read Guides: Reference `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md` for code structure and `CONTEXT/GENERAL/SETTINGSDESIGN.md` for UI patterns.
        *   Single File: Keep all code in a single file under `src/sparks/YourSpark.tsx` unless it exceeds ~2000 lines.
        *   Persistence: Use `useSparkStore` for all data. Never use `AsyncStorage` directly.
        *   Standard Components: Use components from `src/components/SettingsComponents.tsx`.
        *   Feedback Section: Every spark settings page **MUST** include the `SettingsFeedbackSection`.
        *   *Agent Tip*: You can build a new spark based on an existing one. Look at `ShopSpark.tsx` (simple list) or `GolfBrainSpark.tsx` (complex state) for inspiration.
    *   **3. Registration**
        *   To make your spark visible in the app, you **MUST** register it in `src/components/sparkRegistryData.tsx`.
        *   Step A: Import - Add the import statement at the top with other sparks (e.g., `import { MySpark } from "../sparks/MySpark";`).
        *   Step B: Registry Entry - Add a new entry to the `sparkRegistry` object:
            *   Metadata: Include `id`, `title`, `description`, `icon`, `category`, and `createdAt` (ISO string).
            *   Initial Rating: Set `rating: 4.5`.
            *   Component: Reference your imported component.
        *   Update Summary: After registration, add your new spark to the appropriate category in `CONTEXT/GENERAL/SUMMARY.md`.
    *   **4. Preview Your Change**
        *   Always offer to preview the work using the standardized command.
        *   Command: "Start Expo Web"
        *   Action: Ask the user: *"Would you like to run Start Expo Web to preview your change in your web browser?"*
        *   What it does: Starts the Expo web server and opens a preview.
    *   **5. Submit a PR (Publish)**
        *   Once the user is happy with the preview, guide them to publish.
        *   Command: "Start Publish"
        *   Action: Ask the user: *"Would you like to publish your changes with Start Publish?"*
        *   What it does: Stages changes, commits, pushes, and creates a Pull Request (PR) against `main`. **It does NOT push directly to main.**
    *   **The Spark Pattern**
        *   **Description**: Everything is a "Spark". A Spark is a self-contained feature module.
        *   **Location**: `src/sparks/`
        *   **Registration**: `src/components/sparkRegistryData.tsx` (add to `sparkRegistry` object).
        *   **Interface**: Must implement `SparkProps` (see `src/types/spark.ts`).
        *   **State & Persistence**: Use `useSparkStore` (Zustand) for all persistent data.
    *   **Navigation & UI Structure**
        *   **Tab Bar**: The global tab bar automatically hides when a Spark is active.
        *   **Headers**: Sparks are responsible for rendering their own navigation headers.
        *   **Theming**: Use the `useTheme` hook to access the unified color palette.
    *   **Code Style**
        *   **Completeness**: Provide full files or clear markers. Avoid ambiguous code snippets.
        *   **TypeScript**: Maintain strict type definitions for all data structures.
        *   **Single File**: Keep Spark logic unified in one file to simplify agent context and maintenance.
*   **Critical Rules**: Adhere to single-file policy (unless >2000 lines). Use `useSparkStore` for all data; never use `AsyncStorage` directly. Every spark settings page MUST include the `SettingsFeedbackSection`.
*   **References**: `SKILLS.md` (Spark Development & Creation section), `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md`, `CONTEXT/GENERAL/SETTINGSDESIGN.md`, `src/components/sparkRegistryData.tsx`, `CONTEXT/GENERAL/SUMMARY.md`, `src/types/spark.ts`.

## Skill: Codebase Query & Analysis
*   **Purpose**: Enables the agent to efficiently understand the codebase, locate relevant information, and diagnose issues.
*   **Key Steps**: Utilizing search tools (`search_file_content`, `glob`), reading files (`read_file`), understanding context (imports, patterns), identifying dependencies.
*   **References**: `CONTEXT/GENERAL/AGENT.md` (architectural patterns section).

## Skill: UI Component Usage Guidelines
*   **Purpose**: Ensures consistent application of UI components and design patterns across Sparks, providing guidance on available reusable assets.
*   **Key Steps**: Using `SettingsComponents` (e.g., `SettingsSection`, `SettingsInput`), `CommonModal`, `StarRating`, `SparkChart`, `CelebrationOverlay`, `HapticFeedback`. Adhering to `SETTINGSDESIGN.md`.
    *   **Settings Design (CRITICAL)**
        *   Consistency is key. Follow `CONTEXT/GENERAL/SETTINGSDESIGN.md` strictly.
        *   **Standard Components**: Use `SettingsSection`, `SettingsRow`, `SettingsToggle`, and `SettingsButton` from `src/components/SettingsComponents.tsx`.
        *   **Mandatory Section**: Every Spark must have a `SettingsFeedbackSection`.
    *   **Notifications & Feedback**
        *   **Service**: Use `FeedbackNotificationService` for system-wide feedback.
        *   **Manual Clearing**: Notifications are cleared manually by the user, not automatically upon viewing.
    *   **Celebrations (`CelebrationOverlay`)**
        *   **Location**: `src/components/CelebrationOverlay.tsx`
        *   **Usage**: A full-screen overlay for animations.
            *   `triggerConfetti()`: standard colorful confetti.
            *   `triggerFire()`: 🔥 rising from bottom to top.
            *   `triggerPoop()`: 💩 falling from top to bottom.
    *   **Ratings (`StarRating`)**
        *   **Location**: `src/components/StarRating.tsx`
        *   **Usage**: Interactive or read-only star ratings.
    *   **Charts (`SparkChart`)**
        *   **Location**: `src/components/SparkChart.tsx`
        *   **Usage**: Standardized line charts with support for multiple series, dashed/solid lines, and emoji markers. Supports touch tooltips. Legend is disabled by default to maximize chart space but can be enabled via `showLegend={true}`. Better suited for full-width displays (90%+ of screen).
    *   **Feedback (`SettingsFeedbackSection`)**
        *   **Location**: `src/components/SettingsComponents.tsx`
        *   **Usage**: **REQUIRED** in every spark's settings screen. Handles user ratings and text feedback to Firebase.
    *   **UI Components (`SettingsComponents`)**
        *   **Location**: `src/components/SettingsComponents.tsx`
        *   **Included**: `SettingsContainer`, `SettingsScrollView`, `SettingsHeader`, `SettingsSection`, `SettingsInput`, `SettingsButton`, `SaveCancelButtons`.
        *   **Dropdowns**: Avoid `@react-native-picker/picker`. Implement custom dropdowns following patterns seen in `GolfBrainSpark.tsx` (e.g., `Dropdown` component) or `SpinnerSpark.tsx` (e.g., `WeightDropdown` component) for consistent UI/UX and to enable advanced features like input-style display and modal selection.
    *   **Haptics (`HapticFeedback`)**
        *   **Location**: `src/utils/haptics.ts`
        *   **Usage**: `HapticFeedback.light()`, `success()`, `error()`, `selection()` for physical device feedback.
    *   **Common Modal (`CommonModal`)**
        *   **Location**: `src/components/CommonModal.tsx`
        *   **Usage**: Standardized modal with keyboard handling and theme support.
*   **Critical Rules**: Do not invent new UI patterns for settings. Every Spark settings page MUST include `SettingsFeedbackSection`.
*   **References**: `SKILLS.md` (UI Component Usage Guidelines section), `CONTEXT/GENERAL/SETTINGSDESIGN.md`, `DROPDOWNPLAN.md`.

## Skill: Data Persistence Management
*   **Purpose**: Guides the agent in correctly implementing data storage and retrieval for Sparks, ensuring data integrity.
*   **Key Steps**:
    *   **Data Persistence (`useSparkStore`)
        *   **Location**: `src/store/index.ts` (primary usage) and `src/store/appStore.ts` (Zustand Store implementation).
        *   **Usage**: Use `getSparkData(id)` and `setSparkData(id, data)` for persistent storage. Always check `isHydrated` before loading data.
    *   **`dataLoaded` Guard Pattern**: Implement the `dataLoaded` guard pattern to prevent default data from overwriting persisted data during initial load.
*   **Critical Rules**: Never use `AsyncStorage` directly. Always check `isHydrated` before loading data. Implement `dataLoaded` guard for all Sparks persisting data.
*   **References**: `SKILLS.md` (Data Persistence Management section), `CONTEXT/GENERAL/SPARKDATAPERSISTENCE.md`, `src/store/appStore.ts`.

## Skill: Backend Services & Firebase Integration
*   **Purpose**: Manages interaction with Firebase services (excluding core AI functionality) and application analytics, addressing known compatibility issues.
*   **Key Steps**: Using Firebase Web SDK, `AnalyticsService`, `ServiceFactory`.
    *   **Analytics Service (`AnalyticsService`)**
        *   **Location**: `src/services/AnalyticsService.ts`
        *   **Usage**: `trackSparkOpen()`, `trackFeatureUsage()`, and `trackCrash()` to log events to Firebase.
    *   **Service Factory (`ServiceFactory`)**
        *   **Location**: `src/services/ServiceFactory.ts`
        *   **Usage**: Centralized access to Firebase, Analytics, and other singleton services. Ensures proper initialization.
*   **Critical Rules**: Use Firebase Web SDK, never native Firestore or gRPC. Native Firestore is known to have compatibility issues with the current React Native setup.
*   **References**: `SKILLS.md` (Backend Services & Firebase Integration section), `SKILLS.md` (AI Integration (Gemini) section).

## Skill: AI Integration (Gemini)
*   **Purpose**: Implements AI features within Sparks using Google's Gemini models via `GeminiService.ts`, and details secure API key management.
*   **Key Steps**: Utilizing `GeminiService.generateContent(prompt)` and `GeminiService.generateJSON<T>()`.
    *   **API Key Management**: Manage API keys via the defined hierarchy: custom user key (if set) > Remote Config key (for defaults) > environment variable fallback (`process.env.EXPO_PUBLIC_...`).
    *   **AI Service (`GeminiService`)**
        *   **Location**: `src/services/GeminiService.ts`
        *   **Usage**: `GeminiService.generateContent(prompt)` for AI text generation.
*   **Critical Rules**: Always use `GeminiService` from `src/services/GeminiService.ts`. Never hardcode API keys; use `process.env.EXPO_PUBLIC_...` prefixes. Handle rate limits gracefully.
*   **References**: `SKILLS.md` (AI Integration (Gemini) section), `CONTEXT/GENERAL/GEMINI.md`.

## Skill: Git & Version Control Workflow
*   **Purpose**: Guides the agent through standard Git operations for safe and collaborative development, including preview and publishing workflows.
*   **Key Steps**: Branch creation (`git checkout -b`), committing, pushing, creating Pull Requests.
    *   **Preview & Publishing**
        *   **Standard Commands**: Use "Start Expo Web" for previews and "Start Publish" for creating Pull Requests.
        *   **No Direct Push**: Agents should never push directly to `main`. Always create a PR using the publish workflow.
*   **Critical Rules**: Always work on a new branch. Never push directly to `main`.
*   **References**: `SKILLS.md` (Git & Version Control Workflow section).

## Skill: Development Environment Awareness
*   **Purpose**: Adapts agent behavior based on the development environment and provides guidance on tooling restrictions.
*   **Key Steps**:
    *   **Codespaces Detection**:
        *   **Detection**: Check for `CODESPACE_NAME` or `GITHUB_CODESPACE` environment variables.
        *   **Tooling Restrictions**: In Codespaces, avoid suggesting Xcode, Android Studio, or any GUI-based local tools. Rely on CLI and Expo's web server.
    *   **Expo Go Detection (`isExpoGo`)**:
        *   **Location**: `src/utils/expoGoDetection.ts`
        *   **Usage**: Check if running in Expo Go to guard against native module calls that would crash the app (e.g., Speech Recognition).
*   **Critical Rules**: In Codespaces, DO NOT suggest Xcode or Android Studio; use web previews only.
*   **References**: `SKILLS.md` (Development Environment Awareness section).

## Skill: Context Management
*   **Purpose**: Guides the agent on how to manage and organize contextual information within the codebase.
*   **Key Steps**:
    *   **Archiving**: Move stale plans to `CONTEXT/ARCHIVE/`.
    *   **New Ideas**: Log future Spark concepts in `CONTEXT/PLANNEDSPARKS/`.
*   **References**: `SKILLS.md` (Context Management section).

## Skill: Dropdown Component Implementation (Custom)
*   **Purpose**: Guides the agent in implementing and using the standardized custom dropdown pattern.
*   **Key Steps**: Avoiding `@react-native-picker/picker`, understanding the input/modal toggle behavior, using `Modal` and `TouchableOpacity` for custom dropdowns.
*   **Critical Rules**: Maintain consistency with `GolfBrainSpark.tsx` and `SpinnerSpark.tsx` patterns.
*   **References**: `SKILLS.md` (Dropdown Component Implementation (Custom) section), `DROPDOWNPLAN.md`, `src/sparks/GolfBrainSpark.tsx` (existing example), `src/sparks/SpinnerSpark.tsx` (existing example).
