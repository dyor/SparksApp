# Home Navigation Analysis

## All Places Where Home Navigation is Called

### 1. **CustomTabBar - onPress Handler (Lines 259-328)**
This is the main handler when clicking the Home tab button in the bottom navigation.

**Flow:**
```
onPress() called
  ↓
Check 1: Marketplace special case (lines 260-271)
  - If Marketplace tab + on spark screen + has recent spark
  - Navigate to recent spark
  - RETURN EARLY
  
Check 2: Home tab special case (lines 273-300)
  - If MySparks tab + on spark screen in MySparks stack
  - Check if already at root (index === 0)
    - If yes: RETURN EARLY (no transition)
    - If no: Navigate to root using CommonActions.navigate()
  - RETURN EARLY
  
Check 3: Normal tab press flow (lines 302-327)
  - Emit tabPress event
  - If NOT focused: navigate to tab (line 310)
  - If IS focused: 
    - Check if at root (index === 0)
      - If yes: RETURN EARLY
      - If no: Navigate to root (line 322-324)
```

**Problem Identified:**
- Line 274: `isOnSparkScreenInTab('MySparks')` checks if we're on Spark screen
- Line 279: Checks if `routeState.index === 0` (already at root)
- BUT: When clicking Home from Spark, the first click might not be detected correctly
- The second click might be going through the normal flow (lines 308-327) instead of the special case

### 2. **SparkScreen - handleClose (Lines 171-180)**
Called when closing a spark (back button or close action).

```typescript
navigation.navigate('MySparks', {
  screen: 'MySparksList',
});
```

This always navigates to MySparksList (root).

### 3. **QuickSwitchModal - handleSelectSpark (Lines 203-213)**
Called when selecting a spark from quick switch modal.

```typescript
navigation.navigate('MySparks', {
  screen: 'Spark',
  params: { sparkId },
});
```

This navigates to a specific spark (not Home).

### 4. **Marketplace Tab - Recent Spark Navigation (Lines 261-270)**
When on a spark screen, clicking Marketplace navigates to recent spark:

```typescript
navigation.navigate('MySparks', {
  screen: 'Spark',
  params: { sparkId: mostRecentSpark },
});
```

## The Problem

When clicking Home from a Spark screen:

**First Click:**
- Should trigger line 274 check: `isOnSparkScreenInTab('MySparks')`
- Should detect we're on Spark (index > 0)
- Should navigate to root using CommonActions.navigate() (line 290-297)
- **BUT**: The navigation might be creating a transition, and the state might not update immediately

**Second Click:**
- Should trigger line 279 check: `routeState.index === 0`
- Should return early (no transition)
- **BUT**: If the first navigation didn't complete properly, index might still be > 0
- So it goes through the normal flow (line 322) which creates another transition

## Key Issues

1. **State Detection Timing**: `isOnSparkScreenInTab()` reads from `state.routes[index]?.state`, but this state might not be updated immediately after navigation.

2. **Double Navigation**: The special case handler (line 290-297) uses `CommonActions.navigate()`, but then the normal flow might also execute if the early return doesn't work.

3. **Navigation Method**: Using `CommonActions.navigate()` might not properly reset the stack - it might be pushing a new route instead of popping to root.

## Suggested Fix

Instead of `CommonActions.navigate()`, we should use `CommonActions.reset()` to properly reset the stack to root, or use the stack navigator's `popToTop()` method if accessible.

