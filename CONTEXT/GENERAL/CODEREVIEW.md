# Code Review: Pending Video Spark Changes

## Scope Reviewed
- `App.tsx`
- `CONTEXT/SPARK/VIDEOPLAN.md`
- `src/components/VideoEditorModal.tsx`
- `src/sparks/VideoSpark.tsx`
- `src/store/sparkStore.ts`

## Findings (Ordered by Severity)

### 1) Archived raw video is overwritten/lost during auto-export flow
- **Severity**: High
- **Files/Lines**:
  - `src/sparks/VideoSpark.tsx:218`
  - `src/sparks/VideoSpark.tsx:238`
- **Issue**:
  - In camera auto-export, code first writes archived raw video with `setSparkData('video', { videos: [rawVideo, ...videos] })`.
  - It then writes the new exported video with `setSparkData('video', { videos: [newVideo, ...videos] })`.
  - Because both writes use the same stale `videos` snapshot, the second write drops the archived insert.
- **Risk**:
  - Silent data loss of the original raw video.

### 2) `isOverlayProcess` appears sticky and can misclassify future screen recordings
- **Severity**: High
- **Files/Lines**:
  - `src/components/VideoEditorModal.tsx:222`
  - `App.tsx:308`
- **Issue**:
  - Export flow sets `isOverlayProcess: true`.
  - Global screen recording completion in `App.tsx` uses `videoCapture.isOverlayProcess` to set `source`.
  - No clear reset path was found after use.
- **Risk**:
  - Later normal screen recordings may be incorrectly tagged as `overlay`.

### 3) Publishing status can be marked as complete even when share is canceled
- **Severity**: Medium-High
- **Files/Lines**:
  - `src/components/VideoEditorModal.tsx:151`
  - `src/components/VideoEditorModal.tsx:165`
- **Issue**:
  - State is updated to `publishing/published` after `Sharing.shareAsync` returns.
  - Share sheet completion does not guarantee successful upload/publication.
- **Risk**:
  - False-positive publish state and metadata drift.

### 4) Delete flow closes modal before delete confirmation
- **Severity**: Medium
- **Files/Lines**:
  - `src/components/VideoEditorModal.tsx:108`
  - `src/components/VideoEditorModal.tsx:111`
  - `src/sparks/VideoSpark.tsx:247`
- **Issue**:
  - Modal calls `onDelete(video.id)` and immediately `onClose()`.
  - Parent handler shows confirm alert; if user cancels, editor is already closed.
- **Risk**:
  - UX regression and confusing delete/cancel behavior.

### 5) Persisted-state migration gap for new `includeSubtitles` field
- **Severity**: Medium
- **Files/Lines**:
  - `src/store/sparkStore.ts:56`
  - `src/store/sparkStore.ts:75`
  - `src/sparks/VideoSpark.tsx:184`
- **Issue**:
  - `includeSubtitles` default is added, but existing persisted stores may hydrate with `undefined`.
  - Condition `if (videoCapture.includeSubtitles && hasOverlays(...))` will treat `undefined` as disabled.
- **Risk**:
  - Existing users get different behavior from fresh installs.

### 6) Settings feedback spark id mismatch
- **Severity**: Low-Medium
- **Files/Lines**:
  - `src/sparks/VideoSpark.tsx:414`
  - `src/sparks/VideoSpark.tsx:416`
- **Issue**:
  - `SettingsHeader` uses `sparkId="video-spark"` while `SettingsFeedbackSection` uses `sparkId="video"`.
- **Risk**:
  - Feedback/analytics may be attributed to inconsistent spark ids.

### 7) Stale/unused function remains (`deleteVideo`)
- **Severity**: Low
- **Files/Lines**:
  - `src/sparks/VideoSpark.tsx:310`
- **Issue**:
  - Legacy delete handler appears unused after modal-based delete flow.
- **Risk**:
  - Maintenance clutter and ambiguity.

## Open Questions / Follow-Up
1. Should `published` mean “share sheet opened” or “platform upload confirmed”?
2. Where should `isOverlayProcess` be reset to prevent carry-over?
3. Are manual status transitions intended to remain open in both recording and publishing modes?

## Suggested Test Coverage Before Merge
1. Auto-export path: verify both archived raw and new overlay video persist together.
2. Sequential recordings after overlay export: verify `source` tagging is correct (`screen` vs `overlay`).
3. Delete flow: verify canceling delete keeps editor open.
4. Upgrade scenario with pre-existing persisted store: verify `includeSubtitles` behavior is deterministic.
