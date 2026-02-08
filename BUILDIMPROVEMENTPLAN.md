# Build Improvement Plan

This document outlines the strategy for resolving existing build warnings and optimizing the Expo/EAS configuration for the Sparks App.

## 1. Dependency Alignment

### 🛠 Task: Resolve Async Storage Peer Dependency Conflict - [x] DONE
**Warning:** `npm WARN peerOptional @react-native-async-storage/async-storage@"^1.18.1" from @firebase/auth@1.11.1`
*   **Analysis:** Attempted update to root `firebase@12.9.0` caused a internal component registration conflict ("firestore has not been registered") because `@react-native-firebase/app` depends on `firebase@12.6.0`. 
*   **Action:** 
    *   [x] Pin root `firebase` to `12.6.0` to match sub-dependencies and avoid registry conflicts.
    *   [x] Update `async-storage` to latest (`2.2.0`).
    *   **Status:** Resolved by pining version and ensuring a single Firebase instance in the dependency tree.

    This is what Gemini said: 

    Update Firebase:

Bash
npm install firebase@latest
# Or specifically the auth package if using modularly:
npm install @firebase/auth@latest
Verify Version: Ensure @firebase/auth is at least 1.12.0.

### 🛡 Task: Enforce TLS 1.2+ for npm Registry - [x] DONE
**Warning:** `npm notice Beginning October 4, 2021... all connections to the npm registry... must use TLS 1.2 or higher.`
*   **Analysis:** Registry was detected as `http://registry.npmjs.org`.
*   **Action:** 
    *   [x] Set registry to HTTPS: `npm config set registry https://registry.npmjs.org/`.
    *   **Status:** Verified via `npm config get registry`.

---

## 2. Infrastructure & Tooling

### 🚀 Task: Upgrade EAS CLI - [x] DONE (I did this on 2/8/2026)
**Warning:** `eas-cli@16.32.0 is now available.`
*   **Action:** 
    *   Run `npm install -g eas-cli` on the development machine.
    *   Update the project dependency: `npm install --save-dev eas-cli@latest`.
    *   **Status:** User confirmed completion. Project dependency verified.

### 🔒 Task: Lock EAS CLI Version - [x] DONE
**Warning:** `It's recommended to use the "cli.version" field in eas.json...`
*   **Action:** Add `"cli": { "version": ">=16.32.0" }` to `eas.json` to ensure consistent build environments across all developers/CI.
*   **Status:** Verified in `eas.json`.

---

## 3. App Config Cleanup (`app.json`)

### 📦 Task: Remove Redundant Android Package Override - [x] DONE
**Warning:** `Specified value for "android.package" in app.json is ignored because an android directory was detected...`
*   **Analysis:** Since this is a prebuild/native project, the package name is managed in `android/app/build.gradle`.
*   **Action:** Remove the `expo.android.package` field from `app.json`.
*   **Status:** Removed and verified in `app.json`.

### 🔢 Task: Remove Static Version Codes - [x] DONE
**Warning:** `android.versionCode field in app config is ignored when version source is set to remote...`
*   **Analysis:** We are using EAS Remote Versioning, which manages these numbers on the EAS server.
*   **Action:** 
    *   Remove `expo.android.versionCode` from `app.json`.
    *   Remove `expo.ios.buildNumber` from `app.json`.
*   **Status:** Removed and verified in `app.json`.

---

## 🔥 Target Completion
These improvements will be implemented iteratively before the next major release (v1.0.41) to ensure a cleaner, more robust CI/CD pipeline.
