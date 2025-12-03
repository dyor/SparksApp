# Codebase Shrink Plan

**Objective**: Reduce codebase size through code reuse, centralized styling, and removal of unused functionality.

**Prioritization**: Ordered by anticipated codebase reduction (biggest wins first).

---

## 🏆 BIG WINS (High Impact)

### 1. Centralize StyleSheet Definitions (~15-20KB reduction)
**Estimated Reduction**: 15,000-20,000 bytes
**Effort**: Medium
**Files Affected**: All 25+ Spark files

**Problem**: Every Spark file contains StyleSheet.create() with 30-100+ style definitions. Many styles are identical or nearly identical across Sparks:
- `container: { flex: 1, backgroundColor: colors.background }`
- `title: { fontSize: 24, fontWeight: 'bold', color: colors.text }`
- `subtitle: { fontSize: 16, color: colors.textSecondary }`
- `button: { padding: 16, borderRadius: 12, alignItems: 'center' }`
- `modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }`
- Input field styles, card styles, section headers, etc.

**Solution**:
- Create `/src/styles/CommonStyles.ts` with reusable style factory functions
- Create `/src/styles/StyleTokens.ts` for spacing, sizing, border radius constants
- Export functions like `createContainerStyle(colors)`, `createModalStyles(colors)`, `createButtonStyles(colors)`
- Each Spark imports and uses these instead of redefining

**Example**:
```typescript
// Before (in every Spark):
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  // ... 50+ more styles
});

// After:
import { CommonStyles, createModalStyles } from '../styles/CommonStyles';
const styles = {
  ...CommonStyles.container(colors),
  ...CommonStyles.typography(colors),
  ...createModalStyles(colors),
  // Only custom styles here
  customStyle: { ... }
};
```

---

### 2. Extract Modal Component (~8-12KB reduction)
**Estimated Reduction**: 8,000-12,000 bytes
**Effort**: Medium
**Files Affected**: 15+ Sparks with modals

**Problem**: Modal implementations are duplicated across:
- SongSaverSpark (track management modal)
- TripSurveySpark (finalize modal, add response modal, share modal)
- TripStorySpark (multiple modals)
- GolfBrainSpark (hole history modal, round summary)
- BusinessSpark, FlashcardsSpark, TodoSpark, etc.

Each modal has:
- Same overlay structure (`backgroundColor: 'rgba(0,0,0,0.5)'`)
- Same header pattern (title + close button)
- Same footer pattern (cancel + save buttons)
- Similar scroll view setup
- Duplicate styling

**Solution**:
- Create `/src/components/CommonModal.tsx`
- Props: `visible`, `title`, `onClose`, `children`, `footer`, `scrollable`
- Handles all common modal patterns
- Reduces each modal implementation from 100-150 lines to 20-30 lines

---

### 3. Remove SongSaver Embed Functionality (~3-4KB reduction)
**Estimated Reduction**: 3,000-4,000 bytes
**Effort**: Low
**Files Affected**: `SongSaverSpark.tsx`

**Problem**: Lines 753-824 contain "Add Song as Embed" functionality in settings that is no longer used. The main app now just embeds directly, making this settings UI and logic redundant.

**Code to Remove**:
- `handleAddEmbed()` function (lines 328-373)
- State variables: `embedInput`, `embedCategory`, `embedName`
- Settings section UI (lines 753-824)
- Related styles: `settingsSection`, `settingsInputGroup`, `settingsInput`, `settingsMultilineInput`, `addEmbedButton`

**Impact**: Clean removal with no functionality loss.

---

### 4. Create Shared Input Components (~5-8KB reduction)
**Estimated Reduction**: 5,000-8,000 bytes
**Effort**: Medium
**Files Affected**: All Sparks with forms

**Problem**: TextInput implementations are repeated everywhere with same patterns:
- Styled input with label
- Multiline text areas
- Date inputs
- Dropdown/picker inputs

**Solution**:
- Create `/src/components/FormComponents.tsx`
- Components: `LabeledInput`, `MultilineInput`, `DateInput`, `DropdownInput`
- Each handles styling, placeholder colors, border colors automatically
- Reduces 10-15 lines per input to 1-2 lines

---

### 5. Consolidate List/Grid Rendering (~4-6KB reduction)
**Estimated Reduction**: 4,000-6,000 bytes
**Effort**: Medium
**Files Affected**: 10+ Sparks with lists

**Problem**: Similar FlatList/ScrollView patterns repeated:
- Empty state rendering
- Item cards with consistent styling
- Pull-to-refresh
- Loading states

**Solution**:
- Create `/src/components/DataList.tsx`
- Props: `data`, `renderItem`, `emptyMessage`, `emptyIcon`, `onRefresh`
- Handles empty states, loading, refresh automatically

---

## 💡 MEDIUM WINS (Moderate Impact)

### 6. Extract Dropdown Component (~3-5KB reduction)
**Estimated Reduction**: 3,000-5,000 bytes
**Effort**: Low
**Files Affected**: GolfBrainSpark, others with dropdowns

**Problem**: GolfBrainSpark has a 150-line Dropdown component (lines 266-415) that could be reused.

**Solution**:
- Move to `/src/components/Dropdown.tsx`
- Already well-structured and reusable
- Other Sparks can use instead of Alert.prompt or custom implementations

---

### 7. Centralize Date Formatting (~2-3KB reduction)
**Estimated Reduction**: 2,000-3,000 bytes
**Effort**: Low
**Files Affected**: 10+ Sparks

**Problem**: Date formatting functions duplicated:
- `formatDate()` in TripSurveySpark, TripStorySpark, GolfBrainSpark
- `formatDateRange()` in TripSurveySpark
- `getDaysRemaining()` in TripStorySpark, ComingUpSpark

**Solution**:
- Create `/src/utils/dateUtils.ts`
- Export all date formatting functions
- Single source of truth

---

### 8. Consolidate Alert Patterns (~2-3KB reduction)
**Estimated Reduction**: 2,000-3,000 bytes
**Effort**: Low
**Files Affected**: All Sparks

**Problem**: Alert.alert() calls with similar patterns:
- Confirmation dialogs (delete, finalize, etc.)
- Error messages
- Success messages

**Solution**:
- Create `/src/utils/alertHelpers.ts`
- Functions: `confirmDelete()`, `showError()`, `showSuccess()`, `confirmAction()`
- Reduces 10-15 lines to 1 line per alert

---

### 9. Extract Photo/Image Handling (~3-4KB reduction)
**Estimated Reduction**: 3,000-4,000 bytes
**Effort**: Medium
**Files Affected**: TripStorySpark, FoodCamSpark

**Problem**: Image picker, camera, and photo saving logic duplicated.

**Solution**:
- Create `/src/utils/photoHelpers.ts`
- Functions: `pickImage()`, `capturePhoto()`, `savePhotoToLibrary()`
- Centralize permission handling

---

### 10. Standardize Empty States (~2-3KB reduction)
**Estimated Reduction**: 2,000-3,000 bytes
**Effort**: Low
**Files Affected**: 15+ Sparks

**Problem**: Empty state UI repeated:
```tsx
<View style={styles.emptyState}>
  <Text style={styles.emptyIcon}>📦</Text>
  <Text style={styles.emptyTitle}>No items</Text>
  <Text style={styles.emptySubtitle}>Add your first item</Text>
</View>
```

**Solution**:
- Create `/src/components/EmptyState.tsx`
- Props: `icon`, `title`, `subtitle`, `actionButton?`

---

## 🔧 SMALLER WINS (Low Impact but Easy)

### 11. Remove Duplicate Color Generators (~1KB reduction)
**Estimated Reduction**: 1,000 bytes
**Effort**: Very Low
**Files Affected**: SongSaverSpark, others

**Problem**: `generateColorFromString()` in SongSaverSpark (lines 115-127) could be in utils.

**Solution**: Move to `/src/utils/colorUtils.ts`

---

### 12. Consolidate ID Generation (~500 bytes reduction)
**Estimated Reduction**: 500 bytes
**Effort**: Very Low
**Files Affected**: All Sparks

**Problem**: `generateId()` or `Date.now().toString()` repeated everywhere.

**Solution**: Create `/src/utils/idUtils.ts` with `generateId()` function

---

### 13. Extract Score/Color Helpers (~1-2KB reduction)
**Estimated Reduction**: 1,000-2,000 bytes
**Effort**: Low
**Files Affected**: GolfBrainSpark, CardScoreSpark

**Problem**: `getScoreColor()` function duplicated in multiple places.

**Solution**: Move to `/src/utils/scoreUtils.ts`

---

### 14. Standardize Loading States (~1-2KB reduction)
**Estimated Reduction**: 1,000-2,000 bytes
**Effort**: Low
**Files Affected**: 10+ Sparks

**Problem**: Loading indicators and states implemented differently.

**Solution**:
- Create `/src/components/LoadingIndicator.tsx`
- Create `/src/components/LoadingOverlay.tsx`

---

### 15. Remove Commented Code (~1-2KB reduction)
**Estimated Reduction**: 1,000-2,000 bytes
**Effort**: Very Low
**Files Affected**: Various

**Problem**: Comments like `// agentToDo - I think this should be deleted` (TripStorySpark line 448)

**Solution**: Search for `agentToDo`, `TODO`, commented-out code blocks and remove

---

## 📊 TOTAL ESTIMATED REDUCTION

**Conservative Estimate**: 50,000-70,000 bytes (50-70KB)
**Optimistic Estimate**: 70,000-100,000 bytes (70-100KB)

**Current Total Size**: ~1,200KB across all Sparks
**Projected Reduction**: 5-8% of total codebase

---

## 🎯 IMPLEMENTATION PRIORITY

**Phase 1** (Biggest Impact):
1. Centralize StyleSheet Definitions
2. Extract Modal Component
3. Remove SongSaver Embed Functionality

**Phase 2** (Medium Impact):
4. Create Shared Input Components
5. Consolidate List/Grid Rendering
6. Extract Dropdown Component

**Phase 3** (Cleanup):
7-15. All remaining items

---

## 📝 NOTES

- All changes should maintain existing functionality
- Theme colors must continue to work dynamically
- Haptic feedback patterns should be preserved
- Settings components are already well-centralized (good!)
- Focus on DRY (Don't Repeat Yourself) principle
- Each extraction should make code MORE readable, not less
