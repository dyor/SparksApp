---
name: data-persistence
description: Implement persistent Spark state with Zustand `useSparkStore` in `src/store/appStore.ts`, including safe load/save patterns that avoid hydration overwrite bugs. Use when building or updating any Spark that reads or writes user data across app sessions, especially when adding `getSparkData`/`setSparkData` logic, migrating from local storage patterns, or debugging data-loss after app restart.
---

# Data Persistence

Use the centralized Spark store for all persisted Spark data.

## Apply The Core Rule

Use `useSparkStore` for persisted Spark state.

- Import from `src/store/appStore.ts`.
- Read with `getSparkData(sparkId)`.
- Write with `setSparkData(sparkId, data)`.
- Do not call `@react-native-async-storage/async-storage` directly in Spark components.

## Prevent Hydration Overwrite

Guard all save effects with a `dataLoaded` flag to prevent overwriting stored data during async hydration.

1. Initialize local guard state.
2. Load persisted data from `getSparkData` in a mount/load effect.
3. Set `dataLoaded` to `true` only after load handling completes.
4. Return early from save effects while `dataLoaded` is `false`.

Use this pattern:

```tsx
const { getSparkData, setSparkData } = useSparkStore();
const [localState, setLocalState] = useState<LocalState>(initialState);
const [dataLoaded, setDataLoaded] = useState(false);

useEffect(() => {
  const saved = getSparkData('my-spark-id');
  if (saved) {
    setLocalState(saved);
  }
  setDataLoaded(true);
}, [getSparkData]);

useEffect(() => {
  if (!dataLoaded) return;
  setSparkData('my-spark-id', localState);
}, [localState, dataLoaded, setSparkData]);
```

## Use Save/Load Checklist

Before merging persistence changes, verify all of the following:

- Spark uses a stable `sparkId` key.
- Initial render does not write default empty data.
- Save effect is guarded by `dataLoaded`.
- Load effect sets `dataLoaded` after load logic finishes.
- No direct AsyncStorage usage in Spark component code.

## Respect Gemini Key Precedence

When working on AI-related Sparks, preserve the key hierarchy implemented in `src/services/GeminiService.ts`:

1. User custom Gemini API key (stored via `useSparkStore`).
2. App default Sparks key fallback.

Do not re-implement this precedence inside individual Sparks unless a change to the global service is explicitly required.
