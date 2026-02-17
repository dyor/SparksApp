# Record Swing Spark Improvement Plan

## Current State
- `RecordSwingSpark.tsx` is functional but has UI/UX issues.
- Voice activation for "Record Swing" is unreliable or not providing visual feedback.
- Two competing views for recordings (single most recent vs list) are causing confusion.
- Video thumbnails are missing (using placeholder icons).
- Voice activation toggle is a simple switch, not very prominent.
- Missing an "Auto-play" feature after recording.

## Proposed Changes

### 1. Voice Activation Upgrade
- **Shared Component**: Create `VoiceTranscript.tsx` in `src/components/shared`. This component will handle the real-time display of speech as it's being recognized, providing visual feedback to the user.
- **Integration**: Update `RecordSwingSpark.tsx` to use this new component.
- **Improved UI**: Replace the simple `Switch` with a more prominent mic button, similar to `SpeakSpark.tsx`.
- **Offline Capability**: 
    - *Speech-to-Text*: Uses native device engines (Apple/Google). May work offline if local models are installed, but typically performs better online.
    - *Command Parsing*: Unlike `SpeakSpark.tsx` which uses Gemini AI for complex commands, `RecordSwingSpark` uses simple string matching ("record swing"). This matching is local and **does not require AI/internet**.

### 2. UI Simplification
- **Remove Most Recent Card**: Simplify the UI by removing the large "Shot - Standard" card at the top. Everything will move to the "Recent Swings" list.
- **Fix Thumbnails**: Implement actual video thumbnails instead of the 📹 emoji placeholder. Use `expo-video-thumbnails` or similar if available, or just the "middle" frame of the video (not the first frame or the last frame - they will be boring - the middle frame will be the most likely to be interesting).

### 3. Feature Enhancements
- **Auto-Play Setting**: Add a toggle in the settings modal: "Auto-play recording". When enabled, the app will immediately open and play the recording at full speed once it's finished.
- **Auto-Play Completion**: After recording and then playing the recording, the app will automatically transition to the "Playback" view - and if voice activation is enabled, it will automatically start listening for voice commands.
- **Performance**: Ensure smooth transition from "Recording" to "Playback".

### 4. Voice Activation Enhancements    
- **Shot Quality**: at the end of a shot, listen for golfer saying "good shot" or "bad shot" and "200 yards" or "150 yards" etc. This information can be added to the swing data and shown on the card. 
- **Stop Recording**: at the end of a shot, listen for golfer saying "stop recording". This will stop the recording and save it to the device. 


## Implementation Steps

### Phase 1: Shared Infrastructure
1. Create `src/components/shared/VoiceTranscript.tsx`.
2. Export `VoiceTranscript` from `src/components/shared/index.ts`.
3. Update `src/services/VoiceCommandService.ts` if needed to better support shared usage.

### Phase 2: RecordSwingSpark Refactor
1. Update `RecordSwingSettings` interface and store to include `autoPlay`.
2. Modify `RecordSwingSettingsView` to include the new toggle.
3. Update `RecordSwingSpark` UI:
    - Replace the `Switch` with the new Mic button UI.
    - Integrate `VoiceTranscript` component.
    - Remove the single most recent card.
    - Update `renderItem` to show video thumbnails.
4. Implement Auto-play logic in `handleRecordingComplete`.

### Phase 3: Testing
1. Test voice activation with visual feedback.
2. Test thumbnail generation.
3. Test auto-play functionality.
4. Test offline behavior (voice trigger).
