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
  - `recorded`: Finished recording/auto-exported (Ready for Publishing Studio).
  - `editing`: User has initiated a manual edit in the system Photos app.
  - `publishing`: In the process of being uploaded to social media.
  - `published`: Successfully uploaded.
  - `archived`: Original raw footage (after auto-export) or finished project.

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
    source: 'screen' | 'front_camera' | 'rear_camera' | 'overlay';
    script?: string;
    status: 'recording' | 'recorded' | 'editing' | 'publishing' | 'published' | 'archived';
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
- [x] **Automated Overlays**: (New) Automatic burn-in during recording flow for Camera shots.
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

### Phase 6: Publishing Studio & YouTube Shorts
- [ ] **Publishing Studio UI**: Introduce a tabbed interface (Recording Studio vs. Publishing Studio).
- [ ] **Enhanced Statuses**:
    - `exported`: The original source video after an overlay burn-in has been created.
    - `editing`: The primary active status for videos intended for social media.
- [ ] **Recording Studio Workflow**:
    - Front/Rear Camera: "Export with Overlays" (to `exported`) or "Edit in Photos" (to `editing`).
    - Screen/Overlay: Only "Edit in Photos" (to `editing`).
- [ ] **Publishing Studio Workflow**:
    - Show only videos in `editing` status.
    - **"Start Publishing"**: 
        1. User selects the *edited* file from native Photos app via `MediaLibrary`.
        2. Application sets status to `publishing`.
        3. Initial integration: **YouTube Shorts** (Metadata + video upload).
- [ ] **Linkage**: Maintain metadata and deep links back to the original Recording Studio entry.

---

## 5. Reference: RecordSwing Implementation
The Video Spark will adapt the following patterns from `RecordSwingSpark.tsx`:
- **Timer Logic**: `setInterval` based countdowns synced with UI updates.
- **Haptics**: `HapticFeedback.light()` for countdown ticks, `success()` for start/stop.
- **Permissions**: Using `PermissionService` to ensure Camera/Mic/Media access.
- **Modals**: Full-screen modal for recording to ensure maximum real estate.

---

## 6. Build Error Resolutions

### iOS: Provisioning Profile & App Groups Mismatch
The `react-native-nitro-screen-recorder` requires App Groups to share video data between the broadcast extension and the main app. If EAS fails to sync this automatically, it must be done manually in the Apple Developer Portal.

- [ ] Log in to the [Apple Developer Portal - Identifiers](https://developer.apple.com/account/resources/identifiers/list/bundleId).
- [ ] Select **App Groups** from the dropdown menu (top right).
- [ ] Create or verify the existence of the App Group: `group.com.mattdyor.sparks.screen-recorder`.
- [ ] Switch the dropdown back to **App IDs**.
- [ ] Find and click the main app identifier: `com.mattdyor.sparks`.
- [ ] Scroll to the **App Groups** capability.
- [ ] Check the box for **App Groups**.
- [ ] Click **Edit** next to App Groups, check `group.com.mattdyor.sparks.screen-recorder`, and click **Save**.
- [ ] Go back to App IDs and find the extension identifier: `com.mattdyor.sparks.BroadcastExtension`.
- [ ] Scroll to the **App Groups** capability, check the box, click **Edit**, select the same App Group (`group.com.mattdyor.sparks.screen-recorder`), and click **Save**.
- [ ] Run `eas build -p ios` again. EAS should now successfully pull the updated remote provisioning profiles.

### Android: Google Play Foreground Service Permissions

- [x] **Permissions Removed**: We removed `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and `FOREGROUND_SERVICE_MEDIA_PROJECTION` (and the associated `ScreenRecordingService`) from `AndroidManifest.xml` since audio like Soundboard or Spanish Flashcards only play while the app is actively in the foreground. 
- [x] **Disabled Screen Recording on Android**: Due to Google Play Console strictly blocking apps that request `FOREGROUND_SERVICE_MEDIA_PROJECTION` without Google-approved video justifications, we have implemented an automatic fallback to bypass this completely:
  - Added a custom `withDisableAndroidScreenRecorder.js` Expo prebuild config plugin to actively strip the permissions and services added automatically by the `react-native-nitro-screen-recorder` library's underlying native plugin.
  - Removed the "Screen" recording option entirely from the `VideoSpark` UI on Android, forcing users to use the standard front/rear camera workflows instead. IOS remains fully able to initiate global screen recordings. 
- ⚠️ **Important Note on Video Studio (MediaProjection)**: Google has mandated that any app using the Android `MediaProjection` API (which `react-native-nitro-screen-recorder` uses to capture the screen device feed) must attach it to a foreground service from Android 10 onwards, *even if you are only recording while the app is actively on-screen*. 
- **Next Steps**: Android enforces that permission strictly for screen recording at the system API level. If you find that Video Studio's screen recording feature suddenly crashes when you try to use it on Android, it's because of this strict enforcement. We will need to restore the permission and provide the required justifications to the Google Play Console if that happens.
