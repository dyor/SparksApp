# RecordSwingSpark Enhancement Plan

## Objective
Implement four UX improvements in `src/sparks/RecordSwingSpark.tsx`:

1. Add `Play Today's Shots` to replay today's swings from oldest to newest with automatic advance.
2. Show shot metadata for all replayed videos below playback controls in the video modal.
3. Replace per-card `Delete` with `Update`; open an edit modal that supports field edits and deletion, aligned with `CONTEXT/GENERAL/SETTINGSDESIGN.md`.
4. Loop playback indefinitely when a user opens an individual video until they tap `Close`.

## Current Code Notes
- Recordings are currently inserted newest-first (`setRecordings(prev => [recording, ...prev])`).
- Video modal has one `selectedVideo` player with speed controls and close action.
- Playback-end logic currently auto-closes modal and resumes voice listening.
- Card-level action is `Delete` only.
- `RecordedSwing` supports editable metadata fields: `holeNumber`, `shotNumber`, `type`, `club`, `quality`, `distance`.

## Implementation Plan

### Phase 1: Playback Modes And Sequence Queue
1. Add explicit playback mode state:
- `playbackMode: 'single' | 'sequence'`
- `sequenceItems: RecordedSwing[]`
- `sequenceIndex: number`
2. Add helper to compute today's shots:
- Filter `recordings` by local date boundaries (start/end of current day).
- Sort ascending by `timestamp` (earliest to latest).
3. Add `Play Today's Shots` button above the recent swings list:
- Disable when no shots from today.
- On press, initialize sequence state and open first shot.
4. Update player completion behavior:
- If `playbackMode === 'sequence'`, auto-advance to next shot.
- If at end of sequence, close modal and reset sequence state.
- If `playbackMode === 'single'`, do not auto-close on completion.
5. Set loop behavior by mode:
- `single`: `player.loop = true`
- `sequence`: `player.loop = false`

### Phase 2: Modal Metadata UI
1. Add a metadata panel in the video modal below speed controls and `Close`.
2. Show consistent fields for both single and sequence playback:
- Timestamp (formatted)
- Hole / shot number
- Shot type
- Club
- Quality
- Distance
3. When in sequence mode, show progress context:
- Example: `Shot 2 of 5`
4. Ensure readability over dark background and support missing-value fallbacks (e.g., `Not set`).

### Phase 3: Update Modal (Replace Delete Action)
1. Replace card action text/button from `Delete` to `Update`.
2. Add `showUpdateModal` + `editingRecording` state.
3. Build modal with Settings Design alignment:
- Primary action: `Save Changes` (solid blue)
- Secondary action: `Cancel` (outlined/secondary style)
- Destructive action: `Remove` (red)
- Clear labels and minimum touch target sizing.
4. Editable fields in modal:
- `holeNumber`, `shotNumber`, `type`, `club`, `quality`, `distance`
5. Save flow:
- Update recording by `timestamp` in place.
6. Remove flow:
- Confirm destructive action, then remove by `timestamp`.
7. Keep modal UX non-blocking and preserve list scroll position/state.

### Phase 4: Playback Behavior Consistency
1. Ensure tapping a card opens single-shot playback in loop mode.
2. Preserve existing speed controls and apply to both modes.
3. On `Close`:
- Pause player
- Reset playback rate to `1.0`
- Clear sequence state
- Resume voice listening only when configured and appropriate.
4. Validate no background/shadow audio after modal close or mode switch.

## Acceptance Criteria
- `Play Today's Shots` replays only today’s swings in chronological order and auto-advances through all.
- Sequence playback ends automatically after the last shot; individual playback loops until closed.
- Video modal always shows shot metadata below controls.
- Card action is `Update`; update modal supports edit/save/cancel/remove with settings-style button semantics.
- Deletion is available only from the update modal and requires confirmation.
- Existing recording, voice flow, and persistence behaviors remain stable.

## Test Plan
1. Record at least 3 swings and verify `Play Today's Shots` plays oldest to newest.
2. Confirm sequence auto-advances and exits after final shot.
3. Tap single swing from list and verify infinite loop until `Close`.
4. Validate metadata appears for both single and sequence playback.
5. Update each editable field via modal and confirm card + modal reflect saved data.
6. Remove a swing from update modal and confirm it is deleted after confirmation.
7. Regression check: voice mode on/off, auto-play setting, modal close/resume listening behavior.
