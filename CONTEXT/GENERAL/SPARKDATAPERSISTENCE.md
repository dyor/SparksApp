# Spark Data Persistence: The "Save-on-Mount" Race Condition

## The Problem
Many Sparks follow a pattern where local state is synced to the global store via a `useEffect` hook:

```tsx
// ❌ VULNERABLE PATTERN
useEffect(() => {
    setSparkData('my-spark', localState);
}, [localState]);
```

### The Root Cause
The `useSparkStore` (Zustand + AsyncStorage) is **asynchronous**. When a Spark component mounts:
1.  **Initial Render**: The component renders with its default initial state (e.g., `[]` or default objects).
2.  **Immediate Effect**: The `useEffect` above triggers immediately because the component has rendered.
3.  **The Overwrite**: The empty initial state is saved to the store, overwriting the actual saved data **before the store has finished hydrating from disk**.

This results in users losing their data as soon as they open a Spark after an app restart or update.

## The Solution: The `dataLoaded` Guard
To prevent this, every Spark that persists data must implement a `dataLoaded` flag.

### Implementation Pattern

1.  **Add the State**:
    ```tsx
    const [dataLoaded, setDataLoaded] = useState(false);
    ```

2.  **Set Flag on Load**:
    In the `useEffect` responsible for fetching data from the store, set `dataLoaded` to `true` *after* the data has been processed.

    ```tsx
    useEffect(() => {
        const savedData = getSparkData('my-spark');
        if (savedData) {
            // Apply saved data to local state...
        }
        setDataLoaded(true); // ✅ Mark as safe to save
    }, [getSparkData]);
    ```

3.  **Guard the Save**:
    Update the saving `useEffect` to return early if `dataLoaded` is false.

    ```tsx
    useEffect(() => {
        if (!dataLoaded) return; // ✅ Prevent overwriting during hydration

        setSparkData('my-spark', localState);
    }, [localState, dataLoaded]);
    ```

## Summary of Affected Sparks
The following sparks have been identified and patched with this pattern:
- **TeeTimeTimerSpark.tsx**
- **MinuteMinderSpark.tsx**
- **FlashcardsSpark.tsx**
- **SoundboardSpark.tsx**

> [!IMPORTANT]
> Always implement the `dataLoaded` guard in new Sparks to ensure data integrity during store hydration.
