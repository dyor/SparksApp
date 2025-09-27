# Soundboard Spark Specification

## Overview
The Soundboard Spark allows users to record, organize, and play custom sound clips in an easy-to-use grid interface. Users can categorize sounds and quickly access them through an intuitive soundboard layout.

## Core Features

### Main Interface
- **Grid Layout**: 3-column grid similar to FoodCam layout
- **Sound Chips**: Text-based tiles displaying the sound name prominently
- **Category Filtering**: Category tabs similar to Todo app functionality
- **Tap to Play**: Simple tap interaction to play sound clips
- **Visual Feedback**: Highlight/animation when sound is playing

### Sound Chip Display
- **Text-Based Tiles**: Sound name serves as the primary visual element
- **Category Color Coding**: Optional colored borders or backgrounds based on category
- **Duration Indicator**: Small text showing recording length (e.g., "3.2s")
- **Play State**: Visual indication when a sound is currently playing

### Category System
- **Automatic Parsing**: Extract categories using "Category: Sound Name" format
  - Example: "Golf: Get in your hole" → Category: "Golf", Display: "Get in your hole"
- **Category Filtering**: Filter tabs at top of grid
- **Category Management**: Categories are created automatically when sounds are added

## Recording Interface

### Settings Page Recording
- **Record Button**: Large, prominent record button in settings
- **10 Second Limit**: Maximum recording length with countdown timer
- **Recording States**:
  - Ready: "🎤 Record New Sound" button that kicks off a 3 second countdown to start
  - Recording: Red recording indicator with countdown (10, 9, 8...). Additionally there is a Stop button. 
  - Recorded: Playback preview with save/re-record/discard options
- **Naming Interface**: Text input to name the sound chip after recording
- **Real-time Preview**: Play button to test recording before saving

### Recording Flow
1. User taps "🎤 Record New Sound" in settings
2. Permission check for microphone access
3. 3-2-1 countdown before recording starts
4. Recording begins with visual countdown (10 seconds max)
5. Auto-stop at 10 seconds or manual stop button
6. Preview playback with save/re-record/discard options
7. Name input field with save confirmation

## Audio Specifications
- **Format**: AAC (iOS) / MP3 (Android) for compatibility
- **Quality**: 44.1kHz, mono, medium quality for balance of size/quality
- **Storage**: Local file system with unique IDs
- **Maximum Duration**: 10 seconds
- **File Naming**: `sound_[timestamp]_[id].m4a`

## Data Structure

### SoundChip Interface
```typescript
interface SoundChip {
  id: string;
  name: string;
  displayName: string; // Name without category prefix
  category: string; // Parsed category or "General"
  duration: number; // Length in seconds
  filePath: string; // Local file path
  createdDate: string; // ISO date string
  lastPlayed?: string; // ISO date string
  playCount: number; // Usage tracking
}
```

### Storage Structure
```typescript
interface SoundboardData {
  soundChips: SoundChip[];
  categories: string[]; // Auto-generated from sound chips
  lastUsed: string; // ISO date string
}
```

## Main Interface Layout

### Grid View
- **3-Column Grid**: Consistent with FoodCam layout
- **Sound Chip Tiles**:
  - Square aspect ratio
  - Sound name as primary text
  - Category and duration as secondary text
  - Subtle border or background color
- **Empty State**: "No sounds recorded yet" with link to settings

### Category Filtering
- **Filter Tabs**: Horizontal scrollable tabs at top
- **All Sounds**: Default view showing all categories
- **Category Counts**: Show number of sounds per category
- **Active State**: Highlight selected category

### Playback Features
- **Single Playback**: Stop other sounds when starting new one
- **Visual Feedback**: Animated border or color change during playback
- **Audio Session**: Proper audio session management for iOS silent mode
- **Background Playback**: Continue playing when app is backgrounded briefly

## Settings Page

### Main Settings Interface
- **Record New Sound**: Primary action button at top
- **Sound Management**: List of existing sounds with edit/delete options - consistent with Settings Design requirements markdown document
- **Category Overview**: Display current categories and counts
- **Storage Info**: Show total sounds and storage used

### Sound Management
- **Edit Sound Names**: Tap to edit existing sound names
- **Delete Sounds**: Swipe or tap to delete with confirmation
- **Bulk Actions**: Select multiple sounds for deletion
- **Export Options**: Share individual sounds or entire collection

### Recording Section
- **Microphone Permissions**: Check and request permissions
- **Audio Quality Settings**: Option for quality preferences
- **Recording Tips**: Help text about optimal recording practices

## User Experience Features

### Accessibility
- **VoiceOver Support**: Proper labels for all interactive elements
- **Large Touch Targets**: Minimum 44pt touch targets
- **High Contrast**: Ensure text is readable in all themes
- **Audio Descriptions**: Screen reader support for sound management

### Error Handling
- **Permission Denied**: Graceful handling with help instructions
- **Storage Full**: Alert when device storage is low
- **Playback Errors**: Retry options for failed playback
- **Recording Errors**: Clear error messages with recovery options

### Performance
- **Lazy Loading**: Load audio files only when needed
- **Memory Management**: Proper cleanup of audio resources
- **Background Tasks**: Handle recording interruptions gracefully

## Integration with Sparks Ecosystem

### Design Consistency
- **SettingsComponents**: Use standardized settings components
- **Theme Support**: Full light/dark theme compatibility
- **Haptic Feedback**: Consistent haptic responses
- **Design Guidelines**: Follow SETTINGSDESIGN.md patterns

### Feedback Integration
- **Settings Feedback**: Include SettingsFeedbackSection
- **Usage Analytics**: Track recording and playback frequency
- **Error Reporting**: Integrated error reporting for issues

### Data Management
- **Spark Store**: Integration with useSparkStore
- **Data Persistence**: Automatic saving of sound library
- **Backup Friendly**: Export/import capability for data portability

## Technical Implementation Notes

### Required Dependencies
- **expo-av**: Audio recording and playback
- **expo-file-system**: File management
- **expo-permissions**: Microphone access
- **react-native-sound** (if needed): Additional audio features

### File Management
- **Local Storage**: Store audio files in app documents directory
- **Unique IDs**: UUID for each sound chip
- **Cleanup**: Remove orphaned files on app startup
- **Size Limits**: Monitor and warn about storage usage

### Audio Session Management
- **iOS Compatibility**: Proper audio session setup for silent mode
- **Interruption Handling**: Pause/resume for phone calls, etc.
- **Multiple Sounds**: Prevent multiple simultaneous playback
- **Quality Optimization**: Balance file size vs. audio quality

## Future Enhancement Ideas

### Advanced Features (Future Versions)
- **Sound Effects**: Built-in effects like reverb, pitch shift
- **Loop Mode**: Option to loop sounds continuously
- **Volume Control**: Individual volume settings per sound
- **Favorites**: Mark frequently used sounds
- **Search**: Text search through sound names
- **Sharing**: Share individual sounds with other users
- **Cloud Sync**: Optional cloud backup and sync
- **External Import**: Import sounds from device library

### Social Features
- **Sound Packs**: Pre-made sound collections
- **Community Sharing**: Share sound collections with others
- **Collaborative Boards**: Shared soundboards for groups

---

This specification provides a comprehensive foundation for implementing the Soundboard Spark while maintaining consistency with the existing Sparks ecosystem and design patterns.