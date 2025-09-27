# Tee Time Timer Spark - Implementation Plan

## Overview
A golf preparation timer that helps golfers prepare for their tee time with a set of customizable activities. The timer shows multiple concurrent countdown timers for each activity, with a master timer showing overall progress.

## Requirements Summary
- **Target Audience**: Golfers preparing for their tee time
- **Core Function**: Multi-activity countdown timer with visual progress indicators
- **Persistence**: Save user's custom activity settings
- **User Experience**: Simple, clear timers with iOS-style circular progress

## Default Activities
1. Make Coffee (5 minutes)
2. Drive to Course (15 minutes)
3. 20 Irons (7 minutes)
4. 15 Drives (7 minutes)
5. 15 Chips (8 minutes)
6. 20 Putts (8 minutes)

**Total Default Time**: 50 minutes

## Core Features

### 1. Settings Management
- **Editable Activities**: Users can add, remove, rename, and change duration of activities
- **Persistent Storage**: Settings saved to AsyncStorage/useSparkStore
- **Reset to Defaults**: Option to restore default activities

### 2. Timer Interface States

#### State A: Pre-Timer Setup
- Ask user for their tee time (time picker)
- Calculate start time based on total activity duration
- Show preparation schedule/timeline

#### State B: Active Timer
- **Master Timer**: Large circular progress indicator showing overall progress
- **Activity List**: Scrollable list of all activities with individual states:
  - **Past Activities**: Greyed out, no timer, checked off
  - **Current Activity**: Highlighted, active countdown timer
  - **Future Activities**: Normal display, countdown to start time

### 3. Timer Logic
- **Smart Start Detection**: If user starts late, automatically mark early activities as completed
- **Multiple Concurrent Timers**: Each future activity shows countdown to its start time
- **Automatic Progression**: Activities automatically transition from future → current → past

### 4. User Interface
- **iOS Timer Style**: Circular progress indicator for main timer
- **Activity Cards**: Clean cards showing activity name, duration, and timer state
- **Visual States**: Clear visual distinction between past/current/future activities
- **Haptic Feedback**: Success/warning feedback for transitions

## Technical Implementation

### Component Structure
```
TeeTimeTimerSpark/
├── TeeTimeTimerSpark.tsx (main component)
├── TeeTimeTimerSettings.tsx (settings component)
├── ActivityCard.tsx (individual activity display)
├── CircularProgress.tsx (main timer display)
└── types.ts (TypeScript interfaces)
```

### Data Models
```typescript
interface Activity {
  id: string;
  name: string;
  duration: number; // minutes
  order: number;
}

interface TimerState {
  teeTime: Date | null;
  startTime: Date | null;
  isActive: boolean;
  currentActivityIndex: number;
}
```

### Storage Schema
```typescript
interface TeeTimeTimerData {
  activities: Activity[];
  lastUsed: string;
  settings: {
    defaultTeeTime?: string; // for convenience
  };
}
```

## User Flow

### Initial Setup
1. User opens spark
2. If no custom activities exist, load defaults
3. Show settings screen or main timer interface

### Setting Tee Time
1. User clicks "Set Tee Time"
2. Time picker appears
3. Calculate start time = tee time - total activity duration
4. Show confirmation: "Start preparation at [start time] for [tee time] tee time"

### Active Timer
1. Display master circular progress (iOS style)
2. Show activity list with current states
3. Update timers every second
4. Handle activity transitions automatically
5. Show completion celebration when done

### Settings Management
1. List all activities with edit controls
2. Add/remove/edit activity options
3. Drag to reorder activities
4. Reset to defaults option

## Edge Cases & Considerations

### Late Start Handling
- If current time > calculated start time, mark early activities as completed
- Show warning: "You're starting X minutes late. Activities [list] have been marked complete."

### Interruption Handling
- Save timer state to storage
- Resume on app reopen
- Handle app backgrounding gracefully

### Validation
- Prevent empty activity names
- Ensure positive durations
- Minimum 1 activity required
- Maximum reasonable duration (e.g., 4 hours)

## UI/UX Design Principles

### Visual Hierarchy
1. **Master Timer**: Most prominent, center stage
2. **Current Activity**: Highlighted, secondary focus
3. **Activity List**: Supporting information
4. **Controls**: Accessible but not distracting

### Color Coding
- **Past Activities**: Muted grey with checkmark
- **Current Activity**: Primary theme color, highlighted
- **Future Activities**: Standard text color
- **Late/Warning**: Warning orange/red

### Accessibility
- Large, readable timers
- Clear state indicators
- Haptic feedback for important transitions
- Voice-over support for screen readers

## Success Metrics
- **Usability**: Can user set up and use timer without confusion?
- **Flexibility**: Can user customize activities to match their routine?
- **Reliability**: Does timer work correctly across app state changes?
- **Performance**: Smooth animations and responsive interface

## Questions for Clarification
See separate section below for specific implementation questions.