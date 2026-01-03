# Logic Flow After Adding Photo to Activity

## Sequence of Events:

1. **User adds photo** (via `capturePhoto` or `addFromGallery`)
   - Photo is captured/selected from gallery
   - Location is optionally captured

2. **Photo is saved permanently** (`savePhotoPermanently`)
   - Tries to save to document directory
   - Falls back to original URI if save fails
   - **ISSUE**: Document directory may not be available in simulator/web

3. **New photo object created** with:
   - `id`, `tripId`, `activityId`, `uri`, `timestamp`, `location`, `caption`

4. **Trips array updated** (`updatedTrips`)
   - New photo added to current trip's photos array

5. **State updates trigger re-renders**:
   - `saveTrips(updatedTrips)` - saves to store
   - `setCurrentTrip(updatedTrip)` - updates current trip state
   - This triggers component re-render

6. **Re-render effects**:
   - `useEffect` for `onStateChange` fires (line 177)
   - `useEffect` for saving active state fires (line 367)
   - `HorizontalImageRow` component re-renders with new photos
   - `HorizontalImageRow`'s `useEffect` (line 2333) detects photo count change

7. **HorizontalImageRow useEffect** (line 2333-2390):
   - Detects `photos.length` changed
   - If new photo added: scrolls horizontally to center it (after 800ms delay)
   - **POTENTIAL ISSUE**: The horizontal scroll might be affecting parent ScrollView

8. **Layout recalculations**:
   - `onLayout` callbacks fire for activities (line 2610)
   - Activity positions are recalculated
   - **POTENTIAL ISSUE**: Layout changes might cause ScrollView to jump

## Potential Causes of Vertical Scroll:

1. **Layout shifts**: When photos array changes, React re-renders, causing layout recalculations
2. **Activity position updates**: `onLayout` fires and updates `activityPositions`, but this shouldn't cause scrolling
3. **ScrollView content size change**: Adding a photo might change the content size, causing ScrollView to adjust
4. **HorizontalImageRow scroll interaction**: The horizontal scroll might somehow affect the parent vertical ScrollView

## Solutions Needed:

1. **Preserve vertical scroll position** when photos are added
2. **Fix document directory error** for simulator/web environments
3. **Ensure horizontal scroll doesn't affect vertical scroll**

