# Release Notes

This document tracks new features, sparks, and major work items between releases.

## Next Release

## Version 1.0.28 released Jan 14, 2026

### Major Work Items

Improved Dream Catcher spark to store dream interpreation so it can be read later. Improved Golf Brain's charts to prevent the chart from going outside the chart area. Fix a bug in submitting feedback on Android. 

- **Dream Catcher Spark Enhancements**: 
    - Fixed dream interpretation saving and accessibility from history.
    - Improved UI navigation to allow viewing interpretations without re-generating them and returning to editing without data loss.
    - Resolved Android scrolling issues for long interpretations using `nestedScrollEnabled`.
- **New Common Charting Capability (`SparkChart`)**:
    - Implemented a unified charting component using `react-native-svg` for better performance and consistency.
    - Supports multiple series, customizable line styles (dashed/solid), and interactive touch-based tooltips.
    - Migrated Goal Tracker, Card Score, and Golf Brain sparks to use the new standardized charts.
- **Firebase Initialization & Stability**:
    - Resolved critical "Firebase not initialized" errors across iOS and Android production builds.
    - Standardized on Firebase Web SDK for Firestore to avoid gRPC dependency issues while maintaining native @react-native-firebase/app for base initialization.
    - Added a robust retry mechanism with exponential backoff for service initialization.
    - Improved error propagation to provide clear, actionable alerts to users.
- **Build & Dependency Optimizations**:
    - Fixed `patch-package` missing dependency causing build failures.
    - Resolved TypeScript errors in `react-native-screens` Fabric components to ensure smooth New Architecture compatibility.
    - Synchronized versions across `package.json`, `app.json`, and native configurations.

---

## Version 1.0.26 released Jan 11, 2026

### Major Work Items

Adjusted RecAIpe spark to provide better step by step instructions. Bug fixes in Tee Time Timer and Soundboard spark. Added audio to Golf Brain's golf swing recorder. 


- **RecAIpe Spark Overhaul**: Redesigned navigation with top headers, improved keyboard handling, and added star ratings for each recipe. Updated AI engine to generate more granular, step-by-step instructions.
- **Enhanced Visual Celebrations**: Created a reusable `CelebrationOverlay` component supporting high-quality Confetti, Fire (🔥), and Poop (💩) animations across all sparks.
- **Settings UI Polish**: Optimized safe area spacing for iPhone Dynamic Island/notch, fixed modal keyboard styling, and resolved double-tap requirements for feedback submission.
- **Native Module Stability**: Implemented proactive Expo Go detection to prevent native module crashes and fixed critical iOS recording errors in Soundboard spark.
- **Developer Experience**: Renamed and centralized agent instructions in `AGENTS.md`, including a new "COMMON CODE" reference for reusable services and components.
- **Reliability & Performance**: Fixed data persistence issues in Tee Time Timer and resolved New Architecture build failures by optimizing library dependencies.

## Version 1.0.25 released Jan 7, 2026

### New Sparks
- Improved image selection experience for Trip Story spark with single-column layout for better photo visibility, and added pinch-to-zoom functionality in photo details with pan support when zoomed. Reset zoom button moved to header for better accessibility. Added swing recording experience for Golf Brain spark. Added Goal Tracker spark to track how many times you do a goal over the year. Supports multiple goals and displays cumulative charts showing actual, target, and forecast lines. 


---

## Version 1.0.24

### Major Work Items
- Migrated to Expo SDK 53 to support Android 16KB memory page sizes
- Implemented Firebase Remote Config for Gemini API key rotation
- Added user override option for Gemini API key in Settings
- Added AI and Shareable property filters to Marketplace

---

## Version 1.0.23

### Major Work Items
- (Previous release notes)

---

