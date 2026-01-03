# 🤖 Agent Instructions

> **This is the entry point for AI agents working on SparksApp.**
> 
> All detailed instructions are located in `CONTEXT/GENERAL/AGENT.md`

## 🎯 Quick Start

**When creating a new spark, you MUST:**

1. **Read `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md`** - Complete guide with templates, patterns, and examples
2. **Follow `CONTEXT/GENERAL/SETTINGSDESIGN.md`** - Required design patterns for settings pages
3. **Use `useSparkStore`** - Never use AsyncStorage directly
4. **Keep code in single file** - Only split if exceeding ~2000 lines - complex new sparks are unlikely to be merged. 

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

## 🔗 Full Instructions

For complete agent instructions, see: **`CONTEXT/GENERAL/AGENT.md`**

---

*This file exists in the root directory for easy discovery. All detailed instructions are maintained in `CONTEXT/GENERAL/`.*

