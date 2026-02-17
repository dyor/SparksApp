# Skill: Development Environment Awareness

This skill guides the agent in adapting its behavior based on the development environment it is running in, particularly for GitHub Codespaces.

## 1. Detecting the Environment

The primary environment to be aware of is GitHub Codespaces. The agent can detect this by checking for the presence of specific environment variables:

*   `CODESPACE_NAME`
*   `GITHUB_CODESPACE`

If either of these variables is set, the agent should assume it is operating in a Codespaces environment.

## 2. Tooling Restrictions in Codespaces

When in a Codespaces environment, there are significant restrictions on the available tools. The agent **must not** suggest or attempt to use any of the following:

*   Xcode
*   Android Studio
*   Any other local, GUI-based development tools

## 3. Workflow in Codespaces

The development workflow in Codespaces is web-centric.

*   **Previewing**: Use the "Start Expo Web" command to preview changes in a web browser.
*   **CLI is Key**: Rely on command-line tools for all operations.
*   **Publishing**: The standard "Start Publish" command for creating Pull Requests is still the correct workflow.
