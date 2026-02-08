# Build Improvement Plan

This document outlines the strategy for resolving existing build warnings and optimizing the Expo/EAS configuration for the Sparks App.

## 1. Dependency Alignment

### 🛠 Task: Resolve Async Storage Peer Dependency Conflict
**Warning:** `npm WARN peerOptional @react-native-async-storage/async-storage@"^1.18.1" from @firebase/auth@1.11.1`
*   **Analysis:** We are currently using version `2.1.2` which is required for React Native 0.79's New Architecture compatibility. However, Firebase Auth's peer dependency range is restricted to `^1.18.1`.
*   **Action:** 
    *   Verify if a newer version of the `firebase` JS SDK (or `@firebase/auth`) expands this range.
    *   If not, we will maintain the current version for stability and acknowledge the warning, or use `npm install --legacy-peer-deps` in the build script to suppress the conflict.

### 🛡 Task: Enforce TLS 1.2+ for npm Registry
**Warning:** `npm notice Beginning October 4, 2021... all connections to the npm registry... must use TLS 1.2 or higher.`
*   **Analysis:** The build environment appears to be hitting the registry via `http` instead of `https`. 
*   **Action:** Audit `.npmrc` files and environment variables (`NPM_CONFIG_REGISTRY`) to ensure they explicitly use `https://registry.npmjs.org/`.

---

## 2. Infrastructure & Tooling

### 🚀 Task: Upgrade EAS CLI
**Warning:** `eas-cli@16.32.0 is now available.`
*   **Action:** 
    *   Run `npm install -g eas-cli` on the development machine.
    *   Update the project dependency: `npm install --save-dev eas-cli@latest`.

### 🔒 Task: Lock EAS CLI Version
**Warning:** `It's recommended to use the "cli.version" field in eas.json...`
*   **Action:** Add `"cli": { "version": ">=16.32.0" }` to `eas.json` to ensure consistent build environments across all developers/CI.

---

## 3. App Config Cleanup (`app.json`)

### 📦 Task: Remove Redundant Android Package Override
**Warning:** `Specified value for "android.package" in app.json is ignored because an android directory was detected...`
*   **Analysis:** Since this is a prebuild/native project, the package name is managed in `android/app/build.gradle`.
*   **Action:** Remove the `expo.android.package` field from `app.json`.

### 🔢 Task: Remove Static Version Codes
**Warning:** `android.versionCode field in app config is ignored when version source is set to remote...`
*   **Analysis:** We are using EAS Remote Versioning, which manages these numbers on the EAS server.
*   **Action:** 
    *   Remove `expo.android.versionCode` from `app.json`.
    *   Remove `expo.ios.buildNumber` from `app.json`.

---

## 🔥 Target Completion
These improvements will be implemented iteratively before the next major release (v1.0.41) to ensure a cleaner, more robust CI/CD pipeline.
