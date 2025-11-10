# CardScore Spark Plan

## Overview Name: CardScore Tagline: Fast, simple scorekeeping for card games. Icon: ♠️ Category: Utility / Game Difficulty: Medium Estimated Time: 90-120 minutes

## Core Concept A high-speed, persistent scorecard utility that allows users to quickly track scores for card games between two or more players. The primary design focus is on the speed of score entry, allowing users to add scores for a full round with the fewest taps possible and resume any game in progress instantly.

## Features

### Primary Functionality

Player Set Management - Create, edit, and delete named sets of players (e.g., "Poker Night: Alice, Bob, Charlie"). - Persistently store sets and their overall win/loss records.

Active Game Tracking - Start a new game for any Player Set. - View scores in a reverse-chronological table (newest round at the top). - Automatically calculated 'Total' row always visible at the top.

Rapid Score Entry - 'Add Round' button opens a modal focused on speed. - Large, tappable buttons for common scores (0-15). - Tapping a number immediately saves that player's score and auto-advances to the next player. - Manual input for scores > 15.

Game Lifecycle & Persistence - 'End Game' button calculates the winner (highest score), updates the Player Set's win history, and clears the active game. - If a game is in-progress, launching the Spark automatically routes the user back to the Active Game Screen.

### User Experience Flow ``` [App Launch] | +-- Check for 'ActiveGame' in storage | +-- (IF 'ActiveGame' EXISTS) --> [Navigate to 'Active Game Screen'] | +-- (IF 'ActiveGame' IS NULL) --> [Navigate to 'Home Screen']

[Home Screen] | +-- (Tap 'Settings') --> [Navigate to 'Settings Screen'] | +-- (Tap 'Start Game' on a Player Set) | +-- Create 'ActiveGame' object in storage +-- [Navigate to 'Active Game Screen']

[Active Game Screen] | +-- (Tap 'Add Round') --> [Show 'Add Round Modal'] | +-- (Tap 'End Game') | +-- Calculate totals and find winner +-- Update 'PlayerSet.winHistory' in storage +-- Clear 'ActiveGame' object +-- [Navigate to 'Home Screen']

[Add Round Modal] | +-- Show "Enter Score for [Player 1]" | +-- (User taps number 0-15) --> Save score, advance to [Player 2] | +-- (After last player) --> Close Modal, update 'Active Game Screen' ```

## Data Models

### PlayerSet ```typescript interface PlayerSet { id: string; setName: string; // Ordered list of player names players: string[]; // Key-value store of wins, e.g., {"Hero": 5, "Villain": 2} winHistory: Record<string, number>; createdAt: string; updatedAt: string; } ```

### ActiveGame ```typescript // A single object in storage, e.g., storage.set('ActiveGame', ...) // This object is NULL if no game is in progress. interface ActiveGame { // ID of the PlayerSet being used activeSetId: string; // Array of round scores. // e.g., [{"Hero": 10, "Villain": 2}, {"Hero": 8, "Villain": 4}] rounds: Array<Record<string, number>>; startedAt: string; } ```

## User Interface

### Main Screen (Home Screen) - Title: "CardScore ♠️" - Button: 'Settings' (⚙️) - List of PlayerSet items - Each PlayerSet item displays: - setName (e.g., "Default") - winHistory (e.g., "Hero: 0 wins | Villain: 0 wins") - Button: 'Start Game'

### Active Game Screen - Header: "Now Playing: [setName]" - UI: Scrollable Table - Columns: Player names (e.g., "Hero", "Villain") - Top Row (Sticky): "Total" (with calculated sums) - Rows (Scrollable): "Round 2", "Round 1" (newest on top) - Footer (Sticky): - Button: 'Add Round' - Button: 'End Game'

### Add Round Modal - Title: "Enter Score for [PlayerName]:" - UI: Grid of large, tappable buttons [ 0 ] to [ 15 ] - UI: Text Input for manual entry (e.g., "Or enter score:") - UI: Button: 'Save' (for manual input) - Logic: Auto-advances to next player on button tap. Closes automatically after last player.

## Technical Implementation

### Dependencies - Uses existing SparksApp infrastructure.

### Storage - Utilizes Spark's persistent storage (e.g., AsyncStorage). - Key 1: PlayerSets (stores an array of PlayerSet objects). - Key 2: ActiveGame (stores a single ActiveGame object, or null).

### Core Logic - App Load: A boot-up function must check if ActiveGame exists in storage. If yes, immediately navigate to the Active Game Screen, passing the game state. - Score Calculation: The "Total" row is a derived state, calculated by summing all rounds for each player. - Winner Calculation: 'End Game' logic finds the player(s) with the max score in the "Total" row, finds the matching player name in the PlayerSet, and increments their winHistory count.

## Settings - Create Player Set: A form to enter a setName and add 2+ player names. - Edit Player Set: View a PlayerSet and edit its name or the player names. - Delete Player Set: A button to remove a PlayerSet from storage (with confirmation).

## Future Enhancements - Support for "lowest score wins" game types (e.g., Golf). - Detailed game history (view all rounds from past, completed games). - Player avatars or colors for better visual distinction. - "Undo Last Round" button.

## Implementation Specifications

### Data Flow - The ActiveGame object is the single source of truth for the Active Game Screen. - When the 'Add Round Modal' closes, it updates the ActiveGame object in storage, which triggers a re-render of the Active Game Screen. - When 'End Game' is tapped, the ActiveGame object is processed, PlayerSets is updated, and ActiveGame is set to null.

### UI - The score table must support vertical scrolling for rounds if the list exceeds the viewport. - If a Player Set has more than ~3 players, the table headers must be horizontally scrollable (with the 'Round' column frozen, if possible). - The 'Add Round' modal's number buttons (0-15) must be large and easy to tap.

### Default State - On first load, the app must create and save one default PlayerSet: - setName: "Default" - players: ["Hero", "Villain"] - winHistory: {"Hero": 0, "Villain": 0}

## Ready for Implementation [Status: Ready to build]