# Skill: Spark Development

This skill guides the agent through the end-to-end process of creating, developing, and registering a new Spark within the SparksApp ecosystem.

## 1. The Spark Pattern

A "Spark" is the fundamental building block of the application. It is a self-contained feature module designed for a specific purpose.

*   **Location**: All Sparks must be located in the `src/sparks/` directory.
*   **Single File Principle**: To simplify agent context and maintenance, a Spark's primary logic should be contained within a single `.tsx` file whenever possible.

## 2. Core Requirements

*   **Interface**: Every Spark must implement the `SparkProps` interface, which is defined in `src/types/spark.ts`.
*   **Navigation**: Sparks are responsible for rendering their own navigation headers. The global tab bar will automatically hide when a Spark is active.
*   **Theming**: Use the `useTheme` hook to access the unified color palette and ensure consistent styling.

## 3. Registration

For a Spark to be accessible within the app, it must be registered.

1.  **Open the Registry**: Navigate to `src/components/sparkRegistryData.tsx`.
2.  **Add Entry**: Add a new entry to the `sparkRegistry` object. This entry includes the Spark's ID, title, description, and the component itself.

## 4. Development Workflow

1.  **Create the File**: Create your new Spark file (e.g., `MyNewSpark.tsx`) inside `src/sparks/`.
2.  **Implement Logic**: Build the feature, adhering to the core requirements. Use `BaseSpark.tsx` as a starting point if needed.
3.  **Register the Spark**: Add your Spark to `sparkRegistryData.tsx`.
4.  **Test**: Thoroughly test the Spark's functionality in the simulator or on a device.

## 5. Key Documentation

*   **Code Templates**: `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md` contains useful code templates and patterns.
*   **Deployment**: `CONTEXT/GENERAL/DEPLOYMENT.md` outlines the procedures for releasing new versions of the app.
