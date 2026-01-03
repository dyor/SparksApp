# 🤖 Agent Instructions

> **This is the entry point for AI agents working on SparksApp.**
> 
> All detailed instructions are located in `CONTEXT/GENERAL/AGENT.md`

## 🎯 Quick Start

**When creating a new spark, you MUST:**

1. **Create a Branch** - If the user is on `main` branch, create a new branch before making changes (see "Create Branch" workflow below)
2. **Read `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md`** - Complete guide with templates, patterns, and examples
3. **Follow `CONTEXT/GENERAL/SETTINGSDESIGN.md`** - Required design patterns for settings pages
4. **Use `useSparkStore`** - Never use AsyncStorage directly
5. **Keep code in single file** - Only split if exceeding ~2000 lines - complex new sparks of 2000+ lines are unlikely to be merged.

## 🌿 Create Branch Workflow

**CRITICAL**: Before creating any new Spark, ensure the user is on a feature branch, not `main`.

### Detection Logic

When you detect that a user wants to create a new Spark, check the current branch:
```bash
git rev-parse --abbrev-ref HEAD
```

If the result is `main` (or `master`), you MUST create a new branch before proceeding.

### Branch Naming Convention

Extract the Spark name from the user's request and create a branch name:
- **Format**: `spark-{spark-name}` (lowercase, hyphens for spaces)
- **Examples**:
  - "Hangman" → `spark-hangman`
  - "Todo List" → `spark-todo-list`
  - "New Feature" → `spark-new-feature`

### Workflow Options

**Option 1: Guided Flow (Recommended for new users)**
1. When Codespace opens or user asks about creating a Spark, ask: "Would you like to create a new Spark?"
2. If yes, ask: "What is the name of your Spark?"
3. Extract the name and create the branch: `git checkout -b spark-{name}`
4. Then ask: "Now tell me what you want your Spark to do"

**Option 2: Direct Prompt Detection (Smart fallback)**
If the user provides a complete prompt like "Create a spark called X that does Y":
1. Extract the Spark name from the prompt (look for patterns like "called X", "named X", "spark X")
2. Check current branch: `git rev-parse --abbrev-ref HEAD`
3. If on `main`, create branch: `git checkout -b spark-{extracted-name}`
4. Proceed with creating the Spark

### Implementation Steps

**Step 1: Detect Spark Creation Intent**
Look for keywords/phrases in user input:
- "create a spark", "build a spark", "new spark", "add a spark"
- "spark called X", "spark named X", "create X spark"
- Patterns indicating a new Spark is being requested

**Step 2: Check Current Branch**
Run: `git rev-parse --abbrev-ref HEAD`
- If result is `main` or `master`: proceed to create branch
- If already on a feature branch: proceed with Spark creation (no branch needed)

**Step 3: Extract Spark Name**
From user input, extract the Spark name using patterns:
- "called {name}" → extract {name}
- "named {name}" → extract {name}  
- "spark {name}" → extract {name}
- "create {name}" → extract {name} (if context suggests it's a Spark name)

**Step 4: Normalize Branch Name**
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only alphanumeric and hyphens)
- Prefix with `spark-`
- Examples: "Hangman" → `spark-hangman`, "Todo List" → `spark-todo-list`

**Step 5: Create Branch**
Run: `git checkout -b spark-{normalized-name}`
- If branch already exists, suggest alternative: `spark-{name}-{timestamp}` or ask user for different name
- Confirm success: "✅ Created and switched to branch: `spark-{name}`"

**Step 6: Confirm with User**
After branch creation, say: "I've created branch `spark-{name}` and we're ready to build your Spark! Now tell me what you want your Spark to do."

**Important Notes:**
- **ALWAYS** check the branch BEFORE creating any files
- If user provides complete prompt ("Create spark called X that does Y"), extract name AND create branch before proceeding
- If branch creation fails, handle gracefully and suggest alternatives
- In guided flow, create branch immediately after getting the Spark name 

## 📚 Key Documentation Locations

All agent instructions and development guides are in `CONTEXT/GENERAL/`:

*   **`AGENT.md`** - Main agent instructions and codebase patterns
*   **`SPARK_DEVELOPMENT_GUIDE.md`** ⭐ - **START HERE** when creating new sparks
*   **`SETTINGSDESIGN.md`** - Required design patterns for settings pages - also useful for general design (e.g., creating consistent buttons and navigation)
*   **`DEPLOYMENT.md`** - Deployment procedures
*   **`LOCAL_IOS_PRODUCTION_BUILD.md`** - iOS build instructions
*   **`LOCAL_WEB_PRODUCTION_BUILD.md`** - Web build instructions
*   **`NOTIFICATIONS.md`** - Notification system patterns
*   **`TESTPLAN.md`** - Testing guidelines

## 🚨 Critical Rules

1. **NEVER use gRPC or native Firestore** - Always use Firebase Web SDK (because native Firestore does not appear to work with Reach native)
2. **NEVER use AsyncStorage directly** - Always use `useSparkStore`
3. **ALWAYS follow SETTINGSDESIGN.md** - Settings pages must be consistent
4. **ALWAYS include SettingsFeedbackSection** - Required in all settings pages
5. **Codespaces Detection** - If `CODESPACE_NAME` or `GITHUB_CODESPACE` environment variables are set, DO NOT suggest installing tools that aren't available in Codespaces (e.g., Xcode, Android Studio, GUI applications). Use web-based previews instead.
6. **Preview Button Note** - The Preview button uses `.vscode/preview.sh` which kills port 8081 before starting. If changes to `.vscode/settings.json` don't appear in Codespaces, the Codespace may need to be reloaded for VS Code settings to sync.

## 🔧 Common Commands Explained

### TypeScript Type Checking (`npx tsc`)

When suggesting to run `npx tsc`, always explain what it does and what optional parameters mean:

**What it does:**
- `npx tsc` runs the TypeScript compiler to check for type errors in your TypeScript/TSX files
- It reads `tsconfig.json` for configuration and checks all files matching the include patterns
- **By default**, it will compile TypeScript files and generate JavaScript output files

**Common Optional Parameters:**

- **`--noEmit`** (most common): Type-check only, do NOT generate any output files. Use this when you just want to verify there are no type errors without creating compiled files. Example: `npx tsc --noEmit`
- **`--watch`** or **`-w`**: Watch mode - continuously checks files for type errors as you edit them. Example: `npx tsc --watch --noEmit`
- **`--skipLibCheck`**: Skip type checking of declaration files (`.d.ts` files). Faster but less thorough. Example: `npx tsc --noEmit --skipLibCheck`
- **`--pretty`**: Enable colorized output (default in most terminals). Example: `npx tsc --noEmit --pretty`
- **`--incremental`**: Enable incremental compilation (faster subsequent runs). Example: `npx tsc --noEmit --incremental`

**When to use:**
- Before committing code: `npx tsc --noEmit` to catch type errors
- During development: `npx tsc --watch --noEmit` to continuously check types
- In CI/CD: `npx tsc --noEmit` to fail builds on type errors

**Note:** Expo projects typically don't need to compile TypeScript manually - Expo handles this. Use `npx tsc --noEmit` primarily for type checking, not for generating output files.

### Preview & Publish Commands

When suggesting to preview or publish changes, use these standardized commands:

**Preview Changes:**
- **Command Name**: "Start Expo Web"
- **Prompt**: "Would you like to run Start Expo Web to preview your change in your web browser?"
- **What it does**: Starts the Expo web server and opens a preview in your browser
- **Available via**: The 🌐 Preview button in VS Code or the command name "Start Expo Web"

**Publish Changes:**
- **Command Name**: "Start Publish"
- **Prompt**: "Would you like to publish your changes with Start Publish?"
- **What it does**: Stages all changes, commits them, pushes to the current branch, and creates a Pull Request (PR) against main
- **Available via**: The 🚀 Publish button in VS Code or the command name "Start Publish"
- **Important**: This creates a PR, it does NOT push directly to main

**Workflow:**
1. After making changes, suggest: "Would you like to run Start Expo Web to preview your change in your web browser?"
2. After Start Expo Web runs, suggest: "Would you like to publish your changes with Start Publish?"

**DO NOT** suggest CLI commands like `npx expo start --web` or `git push` directly. Always use the standardized command names.

## 🔗 Full Instructions

For complete agent instructions, see: **`CONTEXT/GENERAL/AGENT.md`**

---

*This file exists in the root directory for easy discovery. All detailed instructions are maintained in `CONTEXT/GENERAL/`.*

