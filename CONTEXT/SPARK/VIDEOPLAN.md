# VIDEOPLAN.md - "Video" Spark Implementation Plan

## 1. Overview
The **Video** Spark is designed to help users create high-quality videos of their app usage or themselves for social media and AI analysis. Key features include screen recording, front/rear camera modes, customizable countdowns, and integrated editing.

This spark starts as a **Beta** feature.

## 2. Core Features

### 2.1 Video Management
- **List View**: A main screen showing all recorded videos with thumbnails and metadata.
- **Creation Entry**: "Create New Video" button at the top of the list.
- **Status Tracking**:
  - `recording`: Currently being captured.
  - `editing`: Captured but needs trimming/adjustments (default after recording).
  - `publishing`: Ready for upload.
  - `published`: Successfully uploaded to external platforms.

### 2.2 Recording Engine
- **Source Selection**:
  - **Screen Recording** (Default): Captures the app interface active on the screen.
  - **Front/Rear Camera**: Standard camera capture using `expo-camera`.
- **Countdowns**:
  - **Pre-roll Countdown**: 5s default (adjustable). Visual overlay before capture begins.
  - **Duration Countdown**: 60s default (adjustable). Visual indicator during capture.
- **Overlay UI**: 
  - Floating status indicators during recording (Rec icon, time remaining).
  - Inspired by [RecordSwingSpark.tsx](file:///Users/mattdyor/SparksApp/src/sparks/RecordSwingSpark.tsx).

### 2.3 Editing (Beta Phase)
- **Trimming**: Efficient UI to crop the start and end of the video.
- **Native Integration**: 
  - Preferred: Direct in-app cropping using `expo-video` or `expo-image-manipulator` (if feasible).
  - Fallback: Use the native video player's editing capabilities.

### 2.4 Scripting
- **Optional Script**: Users can write a script/notes for the video.
- **Teleprompter Mode**: (Future) Show the script as a transparent overlay during recording.

---

## 3. Technical Architecture

### 3.1 Data Model
```typescript
interface VideoAI {
    id: string;
    uri: string;
    thumbnail?: string;
    source: 'screen' | 'front_camera' | 'rear_camera';
    script?: string;
    status: 'recording' | 'editing' | 'publishing' | 'published';
    countdownSeconds: number;
    durationSeconds: number;
    timestamp: number;
    metadata: {
        youtubeUrl?: string;
        instagramUrl?: string;
    };
}
```

### 3.2 Key Dependencies
- **`expo-camera`**: For camera-based recording.
- **`expo-video`**: For playback and potentially basic editing.
- **`react-native-nitro-screen-recorder`**: Modern NitroModule-based library for high-performance screen capture (New Architecture compatible).
- **`expo-media-library`**: For saving videos to the device gallery.

### 3.3 UI Components (New)
1. **`VideoSpark.tsx`**: Main component managing the list and creation flow.
2. **`VideoRecorderView.tsx`**: Specialized view for handling the recording HUD and transitions.
3. **`VideoEditorDialog.tsx`**: Interface for trimming and status updates.

---

## 4. Implementation Phases

### Phase 1: Foundation & List UI
- [ ] Create `src/sparks/VideoSpark.tsx` and register in `SparkFactory`.
- [ ] Implement data persistence in `appStore` / `sparkStore`.
- [ ] Build the video list card UI.
- [ ] Implement "Create New Video" modal/navigation.

### Phase 2: Recording Logic (Camera First)
- [ ] Implement Camera recording (Front/Rear) using `expo-camera`.
- [ ] Build the 5s pre-roll countdown overlay.
- [ ] Build the 60s recording duration overlay with automatic stop.
- [ ] Implement "Finish Recording" logic and save to local storage.

### Phase 3: Professional Export (Phase 3 Completed)
- [x] **Native Burn-in Module**: Implemented `burnScript` in the `VideoOverlay` Expo Module.
- [x] **CATextLayer Rendering**: Uses AVFoundation Core Animation for professional text rendering.
- [x] **Script Parsing**: Automated parsing of `START-END: Text` script format.
- [x] **Export UI**: New "Export with Overlays" button in the editor.
- [x] **Eye-Contact Optimization**: Adjusted recorder UI for natural lens contact.

### Phase 4: Nitro Screen Capture (Phase 4 Completed)
- [x] **Nitro Integration**: Successfully integrated `react-native-nitro-screen-recorder`.
- [x] **New Architecture Support**: Fully compatible with the project's modern build system.
- [x] **Permission Flow**: Integrated native permission requests for Mic/Camera.
- [x] **In-App Capture**: Optimized for high-quality iOS UI recording.

### Phase 5: WYSIWYG Recording & Persistence (Phase 5 Completed)
- [x] **Global Recording Context**: Moved script and metadata to `sparkStore` to persist during app navigation.
- [x] **WYSIWYG HUD**: Script captions are now captured directly in screen recordings (smaller, bottom-positioned).
- [x] **Discrete HUD**: Recording controls (REC/Stop) are hidden during the session to ensure a clean capture.
- [x] **Export Loading UI**: Added professional `ActivityIndicator` HUD during export.
- [x] **Smart Overlay Logic**: Disabled post-processing export for Screen Recordings and Overlays.

### Phase 6: Publishing & AI (Future)
- [ ] **Publishing**: YouTube Shorts & Instagram Reels integration.
- [ ] **AI Video Analysis**: Analyze user-recorded videos for technique/content.

---

## 5. Reference: RecordSwing Implementation
The Video Spark will adapt the following patterns from `RecordSwingSpark.tsx`:
- **Timer Logic**: `setInterval` based countdowns synced with UI updates.
- **Haptics**: `HapticFeedback.light()` for countdown ticks, `success()` for start/stop.
- **Permissions**: Using `PermissionService` to ensure Camera/Mic/Media access.
- **Modals**: Full-screen modal for recording to ensure maximum real estate.
