# Skill-Based Agent Instruction Migration Plan

## 1. Overview

This document outlines a plan to refactor the agent instruction framework from the current monolithic `AGENTS.md` and `CONTEXT/GENERAL/AGENT.md` approach to a modular, skill-based system. The goal is to enhance clarity, maintainability, scalability, and decision-making for AI agents interacting with the SparksApp codebase.

## 2. Rationale & Benefits of a Skill-Based Approach

The current instruction set, while comprehensive, can be dense and challenging to navigate for agents. A skill-based approach offers several advantages:

*   **Modularity & Maintainability**: Complex instructions are broken into smaller, self-contained units. Each skill focuses on a specific capability, making updates and additions simpler without impacting unrelated instructions.
*   **Clarity & Focus**: Each skill will have a defined purpose, required inputs, and expected outcomes, allowing agents to quickly understand the scope of a task. This reduces the cognitive load associated with parsing lengthy general instructions.
*   **Scalability**: As the agent's capabilities evolve, new skills can be developed and documented independently, promoting a more scalable and organized instruction set.
*   **Improved Task Routing & Decision-Making**: Agents can more effectively identify and "activate" the most relevant skill(s) for a given user request, leading to more precise and efficient task execution.
*   **Enhanced Auditability**: It becomes clearer which specific capability an agent is attempting to leverage, making debugging and performance analysis more straightforward.
*   **Reduced Context Window Burden (Potential)**: By referencing or dynamically loading specific skills rather than a large, comprehensive document, there's potential to optimize token usage in agent prompts.

## 3. Proposed Migration Plan

The migration will involve identifying distinct "skills" from existing documentation, defining their structure, and reorganizing the content.

### Phase 1: Skill Identification & Definition (Analysis)

Review `AGENTS.md` and `CONTEXT/GENERAL/AGENT.md` to identify core, repeatable tasks and capabilities. Each identified skill should have:
*   A clear, descriptive name (e.g., "Spark Creation Skill", "UI Refactoring Skill", "Firebase Integration Skill").
*   A brief overview of its purpose.
*   Key steps or sub-tasks involved.
*   Relevant tools or reference documents.
*   "Critical Rules" or "Gotchas" specific to that skill.

**Initial Skill Candidates:**

*   **Spark Development & Creation**: Encapsulates the workflow from `AGENTS.md` (branching, design, registration, preview, publish).
*   **Codebase Query & Analysis**: How to investigate files, dependencies, architectural patterns (currently implicit in general instructions, but a core capability).
*   **UI Component Usage**: Guidelines for using `SettingsComponents`, `CommonModal`, custom dropdowns, etc. (from `AGENTS.md` and `SETTINGSDESIGN.md`).
*   **Data Persistence Management**: Using `useSparkStore`, `AsyncStorage` rules, `dataLoaded` guard (from `AGENTS.md`, `CONTEXT/GENERAL/AGENT.md`, `CONTEXT/GENERAL/SPARKDATAPERSISTENCE.md`).
*   **Backend Services & Firebase Integration**: Rules for Firebase SDK, `AnalyticsService`, `ServiceFactory` (from `AGENTS.md`, `CONTEXT/GENERAL/AGENT.md`).
*   **AI Integration (Gemini)**: Implementing AI features in Sparks using `GeminiService.ts`.
*   **Git & Version Control**: Branching, committing, PR workflow (from `AGENTS.md`).
*   **Environment Awareness**: Codespaces detection, tool restrictions (from `AGENTS.md`, `CONTEXT/GENERAL/AGENT.md`).

### Phase 2: `SKILLS.md` Structure Definition

`SKILLS.md` will serve as the central registry and high-level description of all available skills.

```markdown
# Agent Skills Reference

This document outlines the specialized capabilities (skills) an AI agent can utilize to perform tasks within the SparksApp codebase. Each skill is designed to be modular, focusing on a specific domain of expertise.

## Available Skills

*   [Spark Development & Creation](#spark-development-creation)
*   [Codebase Query & Analysis](#codebase-query-analysis)
*   [UI Component Usage Guidelines](#ui-component-usage-guidelines)
*   [Data Persistence Management](#data-persistence-management)
*   [Backend Services & Firebase Integration](#backend-services-firebase-integration)
*   [AI Integration (Gemini)](#ai-integration-gemini)
*   [Git & Version Control Workflow](#git-version-control-workflow)
*   [Development Environment Awareness](#development-environment-awareness)
*   [Dropdown Component Implementation (Custom)](#dropdown-component-implementation-custom) - *Newly identified as a specific, reusable skill*

---

## Skill: Spark Development & Creation
*   **Purpose**: Guides the agent through the end-to-end process of building a new Spark.
*   **Key Steps**: Branching, design principles (`SETTINGSDESIGN.md`), code structure (`SPARK_DEVELOPMENT_GUIDE.md`), state management (`useSparkStore`), component usage (`SettingsComponents`), registration (`sparkRegistryData.tsx`), preview, and publishing (PRs).
*   **Critical Rules**: Adhere to single-file policy (unless >2000 lines), use `useSparkStore` only, mandatory `SettingsFeedbackSection`.
*   **References**: `AGENTS.md` (original workflow), `CONTEXT/GENERAL/SPARK_DEVELOPMENT_GUIDE.md`, `CONTEXT/GENERAL/SETTINGSDESIGN.md`.

## Skill: Codebase Query & Analysis
*   **Purpose**: Enables the agent to efficiently understand the codebase, locate relevant information, and diagnose issues.
*   **Key Steps**: Utilizing search tools (`search_file_content`, `glob`), reading files (`read_file`), understanding context (imports, patterns), identifying dependencies.
*   **References**: `CONTEXT/GENERAL/AGENT.md` (architectural patterns section).

## Skill: UI Component Usage Guidelines
*   **Purpose**: Ensures consistent application of UI components and design patterns across Sparks.
*   **Key Steps**: Using `SettingsComponents` (e.g., `SettingsSection`, `SettingsInput`), `CommonModal`, `StarRating`, `SparkChart`, `CelebrationOverlay`. Adhering to `SETTINGSDESIGN.md`.
*   **Critical Rules**: Do not invent new UI patterns for settings. Every Spark settings page MUST include `SettingsFeedbackSection`. Avoid `@react-native-picker/picker` for dropdowns; use custom patterns.
*   **References**: `AGENTS.md` (UI Components section), `CONTEXT/GENERAL/SETTINGSDESIGN.md`, `DROPDOWNPLAN.md`.

## Skill: Data Persistence Management
*   **Purpose**: Guides the agent in correctly implementing data storage and retrieval for Sparks.
*   **Key Steps**: Using `useSparkStore` for all persistent data, `getSparkData(id)`, `setSparkData(id, data)`. Implementing the `dataLoaded` guard pattern to prevent race conditions.
*   **Critical Rules**: Never use `AsyncStorage` directly. Always check `isHydrated` before loading data. Implement `dataLoaded` guard.
*   **References**: `AGENTS.md` (Data Persistence section), `CONTEXT/GENERAL/SPARKDATAPERSISTENCE.md`.

## Skill: Backend Services & Firebase Integration
*   **Purpose**: Manages interaction with Firebase services (excluding core AI functionality) and application analytics.
*   **Key Steps**: Using Firebase Web SDK, `AnalyticsService`, `ServiceFactory`.
*   **Critical Rules**: Use Firebase Web SDK, never native Firestore or gRPC.
*   **References**: `AGENTS.md` (Critical Rules, Common Code sections), `CONTEXT/GENERAL/AGENT.md` (Persistence Layer, Known Issues sections). For AI-specific integration, refer to the "AI Integration (Gemini)" skill.

## Skill: AI Integration (Gemini)
*   **Purpose**: Implements AI features within Sparks using Google's Gemini models via `GeminiService.ts`.
*   **Key Steps**: Utilizing `GeminiService.generateContent(prompt)` and `GeminiService.generateJSON<T>()`. Managing API keys via the defined hierarchy (custom user key > Remote Config key > env variable fallback).
*   **Critical Rules**: Always use `GeminiService` from `src/services/GeminiService.ts`. Never hardcode API keys. Handle rate limits gracefully.
*   **References**: `AGENTS.md` (Critical Rules, Common Code sections), `CONTEXT/GENERAL/GEMINI.md`.

## Skill: Git & Version Control Workflow
*   **Purpose**: Guides the agent through standard Git operations for safe and collaborative development.
*   **Key Steps**: Branch creation (`git checkout -b`), committing, pushing, creating Pull Requests.
*   **Critical Rules**: Always work on a new branch. Never push directly to `main`.
*   **References**: `AGENTS.md` (Create a Branch, Submit a PR sections).

## Skill: Development Environment Awareness
*   **Purpose**: Adapts agent behavior based on the development environment.
*   **Key Steps**: Detecting GitHub Codespaces (`CODESPACE_NAME` or `GITHUB_CODESPACE`), adjusting tool suggestions.
*   **Critical Rules**: In Codespaces, DO NOT suggest Xcode or Android Studio; use web previews only.
*   **References**: `AGENTS.md` (Critical Rules section), `CONTEXT/GENERAL/AGENT.md` (GitHub Codespaces section).```

### Phase 3: Content Migration & Refinement

1.  **Extract Content**: Systematically move relevant sections and bullet points from `AGENTS.md` and `CONTEXT/GENERAL/AGENT.md` into their corresponding skill sections in `SKILLS.md`.
2.  **Rewrite & Condense**: Rephrase instructions to be skill-centric. Remove redundancies.
3.  **Cross-Referencing**: Update any references in existing `CONTEXT/GENERAL` files that point to `AGENTS.md` or `CONTEXT/GENERAL/AGENT.md` to point to the relevant sections in `SKILLS.md` or dedicated skill files (if we decide to split skills into individual files later).
4.  **Deprecate Old Files**: Once all relevant content is migrated, `AGENTS.md` and `CONTEXT/GENERAL/AGENT.md` will be updated to point to `SKILLS.md` and clearly state their deprecation. They might contain only a very high-level "how to work with the agent" if needed, but the detailed instructions would live in `SKILLS.md`.

### Phase 4: Integration with Agent Workflow (Future Consideration)

*   **Dynamic Skill Loading**: Explore mechanisms for the agent to "load" or "activate" skills based on user requests, reducing the initial context size.
*   **Skill Invocation**: Define clear patterns for how the agent identifies a user's intent and maps it to a specific skill or combination of skills.

## 4. Benefits Realized

*   **Improved Agent Performance**: Agents will have a clearer, more focused set of instructions for each task, leading to faster and more accurate execution.
*   **Easier Onboarding for New Agents**: New or updated agent models can be trained or configured with a more organized instruction set.
*   **Simplified Maintenance**: The modular structure will significantly reduce the effort required to update or expand agent capabilities.
*   **Enhanced Understanding of Agent Capabilities**: Explicitly defined skills provide a clearer picture of what the AI agent can and cannot do.

This migration represents a significant step towards a more robust and intelligent agent framework for SparksApp.
