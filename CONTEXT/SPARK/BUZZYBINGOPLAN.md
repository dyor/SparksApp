# Buzzy Bingo Plan

## Overview
Buzzy Bingo is a buzzword bingo game where players mark squares on a 5x5 grid as they hear specific buzzwords during meetings, presentations, or events. The center square is always free.

## Game Mechanics

### Grid Layout
- **5x5 grid** (25 squares total)
- **Center square** (row 3, column 3) is always **FREE** and automatically checked
- **24 word squares** that can be marked as heard
- Words are randomly placed each game (except center square)

### Word Display
- Each square displays a single buzzword
- Squares can be **checked** (marked as heard) or **unchecked**
- Visual indication when a square is checked (e.g., background color change, checkmark icon)

### Winning Conditions
- Traditional bingo: **5 in a row** (horizontal, vertical, or diagonal)
- Visual feedback when a bingo is achieved (optional celebration)

## Data Structure

### Word Set
```typescript
interface WordSet {
  id: string;
  name: string;
  words: string[]; // Exactly 24 words for a 5x5 grid (center is free)
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}
```

### Game State
```typescript
interface BuzzyBingoGame {
  wordSetId: string;
  grid: string[][]; // 5x5 grid with words (center is "FREE")
  checkedSquares: boolean[][]; // 5x5 grid of checked states
  randomized: boolean; // Whether words have been randomized
  lastResetAt: string;
}
```

### Storage
- Word sets stored in persistent data using `useSparkStore` (spark ID: `buzzy-bingo`)
- Game state also stored in persistent data
- Active word set tracked via `isActive` flag (only one can be active at a time)

## Default Word Set

**Name:** "Tech Buzzwords"

**Words (24):**
1. KMP
2. CMP
3. Android
4. Agentic
5. AI
6. LLM
7. Cross Platform
8. Premium
9. Vibe Coding
10. Agent
11. Android Studio
12. Cursor
13. React Native
14. TypeScript
15. Compose
16. Kotlin
17. Developer
18. CUJ
19. Hallucinate
20. Gemini
21. Claude
22. Context
23. Foldable
24. Wear

This word set should be created as the default active set when the spark is first used.

## Reset Functionality

### Shake Detection
- **Primary method:** Use device shake detection (if available)
- **Library:** `expo-sensors` or `react-native-shake` for shake detection
- **Platform support:** Check if shake detection is available on both iOS and Android

### Fallback Reset Button
- If shake detection is not available or fails, provide a **"Reset" button**
- Button should be prominently displayed on the main game screen
- Styled consistently with app theme

### Reset Behavior
1. **Uncheck all squares** (except center FREE square)
2. **Randomize word placement** (shuffle the 24 words into new positions)
3. Center square remains "FREE" and checked
4. Update `lastResetAt` timestamp

## Word Set Management

### Settings Page Structure

Following `SETTINGSDESIGN.md` guidelines:

1. **SettingsHeader**
   - Title: "Buzzy Bingo Settings"
   - Subtitle: "Manage your word sets and game preferences"

2. **SettingsFeedbackSection** (REQUIRED - Always First)
   - Spark Name: "Buzzy Bingo"
   - Spark ID: "buzzy-bingo"

3. **SettingsSection: "Active Word Set"**
   - Display current active word set name
   - Dropdown/selector to switch active word set
   - Only one word set can be active at a time

4. **SettingsSection: "Your Word Sets"**
   - List of all word sets
   - Each word set shows:
     - Name
     - Word count (24)
     - Active indicator (if active)
     - Edit button
     - Delete button (with confirmation)
     - Activate button (if not active)
   - "Add Word Set" button at the top

5. **SettingsSection: "Share & Import"**
   - **Share Word Set** button
     - Opens modal to select a word set to share
     - Generates JSON/text export
     - Uses `expo-sharing` to share via system share sheet
   - **Import Word Set** button
     - Opens file picker or text input
     - Validates imported word set (must have exactly 24 words)
     - Adds as new word set (not active by default)

6. **Close Button** (per SETTINGSDESIGN.md)
   - Styled as outlined button
   - Returns to main game screen

### Word Set Edit Modal

When editing or creating a word set:
- Text input for name
- List of word inputs (can have any number of words)
- Add/remove word functionality
- Save and Cancel buttons
- Validation: 
  - If fewer than 24 words, automatically duplicate words to fill to 24
  - If more than 24 words, take first 24
  - All words must be non-empty (trim whitespace)
  - Duplicate words are allowed

## Main Game Screen

### Layout
- **Header:**
  - Spark title: "Buzzy Bingo"
  - Settings button (gear icon)
  - Reset button (or shake indicator)

- **Grid:**
  - 5x5 grid of squares
  - Each square:
    - Displays word (or "FREE" in center)
    - Tap to toggle checked/unchecked
    - Visual feedback (background color, checkmark)
    - Responsive sizing for different screen sizes

- **Status Indicators:**
  - Current word set name
  - Bingo count (if multiple bingos tracked)
  - Last reset time (optional)

### Interactions
- **Tap square:** Toggle checked/unchecked
- **Long press square:** (Optional) Show word details or quick actions
- **Shake device:** Reset game
- **Reset button:** Reset game (if shake not available)

## Share & Import Functionality

### Share Format
```json
{
  "name": "Tech Buzzwords",
  "words": [
    "KMP",
    "CMP",
    "Android",
    ...
  ]
}
```

### Import Process
1. User taps "Import Word Set"
2. Option to:
   - **Paste JSON/text** via text input
   - **Select file** via file picker (if available)
3. Validate:
   - Must have `name` field
   - Must have `words` array (any number of words)
   - All words must be non-empty (trim whitespace)
   - If fewer than 24 words, duplicate to fill to 24
   - If more than 24 words, take first 24
4. Create new word set with imported data
5. Show success message

### Export Process
1. User taps "Share Word Set"
2. Select word set from list
3. Generate JSON export
4. Use `expo-sharing` to share via system share sheet
5. User can save to file, send via message, etc.

## Technical Implementation

### Components
- `BuzzyBingoSpark.tsx` - Main component
- `BuzzyBingoSettings.tsx` - Settings component
- `BingoGrid.tsx` - 5x5 grid component
- `WordSetManager.tsx` - Word set management modal
- `ShareImportModal.tsx` - Share/import functionality

### Libraries
- `expo-sensors` or device shake detection for reset
- `expo-sharing` for share functionality
- `expo-file-system` or file picker for import (if needed)

### State Management
- Use `useSparkStore` for persistent data
- Store word sets array
- Store active word set ID
- Store current game state

## Decisions Made

1. **Shake Detection:**
   - ✅ Use `expo-sensors` Accelerometer (standard implementation)
   - Sensitivity threshold should be balanced to avoid too-frequent resets
   - Shake detection should be reliable but not overly sensitive

2. **Bingo Detection:**
   - ✅ **Automatically detect and highlight bingos**
   - ✅ **Show celebration animation when bingo achieved**
   - Track multiple bingos per game (user may achieve multiple lines)

3. **Reset Confirmation:**
   - Start with **automatic reset** (no confirmation dialog)
   - Shake detection should be balanced to avoid accidental resets
   - If too sensitive, we can adjust later

4. **Word Set Validation:**
   - ✅ **Allow duplicate words** in a word set
   - If word set has **fewer than 24 words**, expand to fill by duplicating words
   - No minimum/maximum word length restrictions
   - No character restrictions

5. **Grid Styling:**
   - Checked squares should have distinct visual indication
   - Show bingo lines when achieved (highlight winning line)
   - Animation for checking squares (smooth transition)
   - Center FREE square should be visually distinct

6. **Word Set Sharing:**
   - ✅ **Share format: Just name and words** (no metadata)
   - JSON format: `{ "name": "...", "words": [...] }`

## Future Enhancements (Optional)

- Multiple bingo modes (4 corners, blackout, etc.)
- Custom grid sizes (4x4, 6x6)
- Word set categories/tags
- Statistics tracking (most used words, bingo count)
- Themes/custom colors
- Sound effects for bingos
- Multiplayer mode (shared bingo card)

