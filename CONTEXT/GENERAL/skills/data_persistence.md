# Skill: Data Persistence

This skill outlines the correct procedures for storing and retrieving persistent data for a Spark. Using the centralized state management solution is critical for data integrity and stability.

## 1. The Golden Rule: Use `useSparkStore`

All data that needs to persist between app sessions for a Spark **must** be managed using the `useSparkStore` hook.

*   **Direct `AsyncStorage` is forbidden**: Do not use `@react-native-async-storage/async-storage` directly. The store manages this automatically.
*   **Location**: The store is implemented in `src/store/appStore.ts` using Zustand.

## 2. Core Functions

The `useSparkStore` hook provides two primary functions for data management:

*   **`getSparkData(sparkId: string)`**: Retrieves the data for a specific Spark.
*   **`setSparkData(sparkId: string, data: any)`**: Saves or updates the data for a specific Spark.

## 3. Implementation Pattern

```typescript
import { useSparkStore } from '../store/appStore';

// Inside your Spark component
const { getSparkData, setSparkData } = useSparkStore();

// To get data
const mySparkData = getSparkData('mySparkId');

// To save data
const newSparkData = { ...mySparkData, newKey: 'newValue' };
setSparkData('mySparkId', newSparkData);
```

## 4. Custom API Key Hierarchy

A special case in the persistence layer is the Gemini API key. The system follows a strict hierarchy for determining which key to use:

1.  **Custom User Key**: A key set by the user in the settings. This is stored via `useSparkStore` and always takes top priority.
2.  **Default Sparks Key**: If no custom key is present, the app falls back to the default key.

The logic for this is handled within `GeminiService.ts`. You do not need to implement this hierarchy yourself, but you should be aware of it.
