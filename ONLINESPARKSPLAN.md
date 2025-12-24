# ONLINESPARKSPLAN: Restructure Codespaces UI

Role: UI/UX Architect
Objective: Restructure the Codespaces UI to mirror the Lovable.dev layout for novice users.

## Step 1: Layout Configuration

Configure `.vscode/settings.json` to move the Primary Side Bar to the right and the Secondary Side Bar (where the Agent lives) to the left.

- Set `"workbench.activityBar.location": "hidden"` and `"workbench.statusBar.visible": true`.
- Set the default view to automatically open a browser preview on the right side of the editor upon startup.

## Step 2: Preview & Publish Buttons

Install the "Action Buttons" extension via `.devcontainer/devcontainer.json`.

- Add a high-visibility button in the Editor Title Menu (top right) labeled "🌐 Preview". This button must trigger `npx expo start --web --tunnel`.
- Add a high-visibility button in the Editor Title Menu labeled "🚀 Publish". This button must trigger a custom script: `.vscode/publish.sh`.

## Step 3: Automation Scripts

Create `.vscode/publish.sh` to automate the workflow: `git add .`, `git commit -m "Publishing changes"`, `git push`, and use the GitHub CLI (`gh pr create`) to finalize the "Publish" action.

## Step 4: Cleanup

Hide the Terminal and File Explorer by default to ensure the user only sees the Agent (Left) and Preview (Right).
