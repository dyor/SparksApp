# Skill: Settings Design

This skill provides critical guidelines for creating consistent and user-friendly settings screens for Sparks. Adherence to these standards is mandatory to ensure a cohesive user experience.

## 1. Guiding Principle: Consistency

Settings screens are the most standardized part of the application. **Do not invent new UI patterns for settings.** Always use the established components and layouts. The primary reference for design standards is `CONTEXT/GENERAL/SETTINGSDESIGN.md`.

## 2. Standard Components

All components required for building a settings screen are available in `src/components/SettingsComponents.tsx`.

*   **`SettingsSection`**: The root container for a group of related settings.
*   **`SettingsRow`**: A container for a single setting item, typically including a label and a control.
*   **`SettingsToggle`**: A `SettingsRow` with a pre-configured `Switch` for boolean settings.
*   **`SettingsButton`**: A standardized button for actions within a settings screen.
*   **`SettingsInput`**: A standardized text input for string-based settings.

## 3. Mandatory Section: Feedback

Every Spark's settings screen **must** include the `SettingsFeedbackSection` component. This provides a direct and consistent way for users to submit feedback about a specific Spark.

## 4. Implementation Workflow

1.  **Structure with `SettingsSection`**: Group related settings into one or more `SettingsSection` blocks.
2.  **Use `SettingsRow` and `SettingsToggle`**: Build out the individual settings using the standard components.
3.  **Add Feedback Section**: Add `<SettingsFeedbackSection sparkId={YOUR_SPARK_ID} />` at the bottom of the screen.
4.  **Reference Existing Sparks**: If you are unsure how to structure a settings screen, examine the implementation of existing Sparks for examples.
