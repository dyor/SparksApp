# Skill: Version Control & Publishing

This skill outlines the standard operating procedures for version control with Git and for publishing changes.

## 1. The Branching Model

All work must be done on a feature branch.

*   **Never Push to `main`**: The agent must never push code directly to the `main` branch.
*   **Create a New Branch**: Before starting work, create a descriptive branch name for the feature or fix.

## 2. The Publishing Workflow

The term "Publish" in this project refers to preparing changes for a Pull Request.

*   **Use the Standard Command**: The "Start Publish" command is a pre-configured script that automates the process of pushing the current branch and preparing it for review.
*   **Create a Pull Request**: After publishing, the final step is to create a Pull Request on GitHub. The agent should guide the user to do this, but not attempt to do it automatically.

## 3. Code Style & Commits

*   **Completeness**: When providing code, always provide full, complete files or use clear markers to indicate where changes should be applied. Avoid ambiguous snippets.
*   **TypeScript**: Maintain strict TypeScript definitions for all data structures to ensure code quality and prevent runtime errors.
