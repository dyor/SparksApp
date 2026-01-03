# dbService.ts Migration Analysis

## Current State
- **File**: `src/dbService.ts`
- **Lines**: 210
- **Used by**: `ScorecardSpark.tsx` only
- **Storage**: Direct AsyncStorage with custom keys (`@sparks_rounds_v1`, `@sparks_scores_v1:`, `@sparks_courses_v1`)

## Migration to useSparkStore

### Current Code Breakdown
- AsyncStorage operations: ~80 lines (getItem, setItem, removeItem)
- Error handling (try/catch): ~30 lines
- Key constants: ~5 lines
- initDB function: ~20 lines
- JSON parsing/stringifying: ~15 lines
- Data structure definitions: ~20 lines
- Business logic: ~40 lines

### With useSparkStore
- Data structure definition: ~30 lines (single interface)
- Business logic functions: ~40 lines (simplified, no AsyncStorage calls)
- Migration helper: ~10 lines (one-time migration from old keys)
- **Total**: ~80 lines

### Estimated Savings
- **Lines saved**: ~130 lines (210 → 80)
- **Code reduction**: ~62%
- **Benefits**:
  - Automatic persistence (no manual AsyncStorage calls)
  - Built-in error handling
  - Consistent with other sparks
  - Easier to maintain
  - Type-safe with TypeScript

### Migration Pattern
```typescript
// Instead of:
const raw = await AsyncStorage.getItem(ROUNDS_KEY);
const rounds = raw ? JSON.parse(raw) : [];

// Use:
const { getSparkData } = useSparkStore();
const data = getSparkData('scorecard');
const rounds = data.rounds || [];
```

### Data Structure
```typescript
interface ScorecardData {
  courses: Course[];
  rounds: Round[];
  scores: Record<number, ScoreRecord[]>; // roundId -> scores
}
```

## Recommendation
✅ **Migrate to useSparkStore** - Significant code reduction and consistency benefits.

