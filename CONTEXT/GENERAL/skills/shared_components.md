# Skill: Shared Components

This skill guides the agent in using, creating, and extending shared UI components. The goal is to build a consistent, reusable, and maintainable component library.

## 1. Guiding Principles

*   **Reusability**: Before creating a new component, check the existing shared components list to see if one can be used or adapted.
*   **Consistency**: Shared components ensure a uniform look and feel across all Sparks. Adhere to the design standards defined in `CONTEXT/GENERAL/SETTINGSDESIGN.md`.
*   **Encapsulation**: Components should be self-contained and manage their own state whenever possible.
*   **Centralization**: All shared components should be located in `src/components/shared/` or exposed via `src/components/`.

## 2. How to Use Shared Components

1.  **Identify a Need**: Determine the UI requirement (e.g., a modal, a button, a chart).
2.  **Consult the List**: Review the "Existing Shared Components" section below to find a suitable component.
3.  **Import and Implement**: Import the component from its path in `src/components/` and integrate it into your Spark.
4.  **Refer to Usage**: If unsure how a component is used, use `grep_search` to find existing implementations of it across the codebase.

## 3. How to Create a New Shared Component

1.  **Verify Necessity**: Confirm that no existing component meets the need.
2.  **Define Scope**: The component should be generic enough for use in multiple contexts. Avoid hardcoding Spark-specific logic.
3.  **Location**: Create the new component file in `src/components/shared/`.
4.  **Documentation**: Add comments to the component file explaining its purpose, props, and a basic usage example.
5.  **Update this Skill**: Add the new component to the list below.

## 4. Existing Shared Components

This is a non-exhaustive list of commonly used components.

### Modals & Overlays
*   `CommonModal.tsx`: A standard modal for custom content.
*   `GeminiApiKeyModal.tsx`: For configuring the user's Gemini API key.
*   `FeedbackModal.tsx`: For submitting feedback.
*   `PendingResponseModal.tsx`: A modal to show while waiting for an asynchronous response.
*   `CelebrationOverlay.tsx`: An overlay to celebrate a user's achievement.

### Settings & Forms
*   `SettingsComponents.tsx`: Contains a suite of components for building settings screens (`SettingsSection`, `SettingsRow`, `SettingsToggle`, `SettingsInput`, `SettingsButton`).
*   `AuthComponents.tsx`: Components for authentication flows.
*   `FormComponents.tsx`: Reusable form elements.

### Specialized Components
*   `SparkChart.tsx`: For displaying data in charts.
*   `StarRating.tsx`: A component for star-based ratings.
*   `VoiceTranscript.tsx` (from `AGENT.md`): Real-time display for voice recognition results.

### Core Components
*   `BaseSpark.tsx`: A base component for creating new Sparks.
*   `SparkRegistry.tsx`: The main registry for all Sparks in the app.
