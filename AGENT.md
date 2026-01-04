# 🤖 Agent Instructions: Spark Creation & Workflow

> [!IMPORTANT]
> **READ THIS BEFORE STARTING ANY WORK.** This is the master guide for AI agents working on the SparksApp codebase.

## 🚀 The Spark Workflow

When you are asked to create a new spark, you **MUST** follow these steps in order:

### 1. Create a Branch (CRITICAL)
Before making any changes, ensure you are not on the `main` branch. 
- **Check Branch**: Run `git rev-parse --abbrev-ref HEAD`
- **Action**: If on `main`, create a new branch immediately: `git checkout -b spark-{spark-name}`
- **Naming**: Use lowercase with hyphens (e.g., `spark-hangman`, `spark-todo-list`).

### 2. Design & Develop
- **Read Guides**: Reference `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md` for code structure and `CONTEXT/GENERAL/SETTINGSDESIGN.md` for UI patterns.
- **Single File**: Keep all code in a single file under `src/sparks/YourSpark.tsx` unless it exceeds ~2000 lines.
- **Persistence**: Use `useSparkStore` for all data. Never use `AsyncStorage` directly.
- **Standard Components**: Use components from `src/components/SettingsComponents.tsx`.
- **Feedback Section**: Every spark settings page **MUST** include the `SettingsFeedbackSection`.

> [!TIP]
> **Agent Tip**: You can build a new spark based on an existing one. Look at `ShopSpark.tsx` (simple list) or `GolfBrainSpark.tsx` (complex state) for inspiration.

#### Sample Prompt for Success:
*“Build a Spark called Hangman. There are 2-4 players. The user will be asked how many players... [rest of detailed prompt] ... Start by reviewing instructions in the AGENT.md file in the top directory.”*

### 3. Registration
To make your spark visible in the app, you **MUST** register it in `src/components/sparkRegistryData.tsx`:
- **Step A: Import** - Add the import statement at the top with other sparks (e.g., `import { MySpark } from "../sparks/MySpark";`).
- **Step B: Registry Entry** - Add a new entry to the `sparkRegistry` object:
    - **Metadata**: Include `id`, `title`, `description`, `icon`, `category`, and `createdAt` (ISO string).
    - **Initial Rating**: Set `rating: 4.5`.
    - **Component**: Reference your imported component.
- **Update Summary**: After registration, add your new spark to the appropriate category in `CONTEXT/GENERAL/SUMMARY.md`.

### 4. Preview Your Change
Always offer to preview the work using the standardized command:
- **Command**: "Start Expo Web"
- **Action**: Ask the user: *"Would you like to run Start Expo Web to preview your change in your web browser?"*
- **What it does**: Starts the Expo web server and opens a preview.

### 5. Submit a PR (Publish)
Once the user is happy with the preview, guide them to publish:
- **Command**: "Start Publish"
- **Action**: Ask the user: *"Would you like to publish your changes with Start Publish?"*
- **What it does**: Stages changes, commits, pushes, and creates a Pull Request (PR) against `main`. **It does NOT push directly to main.**

---

## 🚨 Critical Rules & Gotchas

1. **Firestore**: Use Firebase Web SDK, never native Firestore or gRPC.
2. **Gemini**: Always use `GeminiService` from `src/services/GeminiService.ts`.
3. **Codespaces**: Detect using `CODESPACE_NAME`. If present, **DO NOT** suggest Xcode or Android Studio. Use web previews only.
4. **Consistency**: Do not invent new UI patterns for settings. Use the standard components.

## 📚 Reference Documentation

*   `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md` ⭐ - Code templates.
*   `CONTEXT/GENERAL/SETTINGSDESIGN.md` - Required settings UI.
*   `CONTEXT/GENERAL/AGENT.md` - Deep dive into architecture and patterns.
*   `CONTEXT/GENERAL/SUMMARY.md` - Update this with your new spark category after implementation.
