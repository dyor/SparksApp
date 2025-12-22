#!/bin/bash
set -e

echo "🚀 Starting publish workflow..."

# check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    exit 1
fi

# Add all changes
echo "📦 Staging changes..."
git add .

# Commit changes
if ! git diff-index --quiet HEAD --; then
    echo "💾 Committing changes..."
    git commit -m "Publishing changes"
else
    echo "ℹ️ No changes to commit."
fi

# Push changes
echo "⬆️ Pushing changes..."
git push

# Create PR
echo "🔀 Creating Pull Request..."
# Try to create a PR, filling title/body from commits.
# If PR exists, this might error, so we allow failure but warn.
gh pr create --fill || echo "⚠️ Could not create PR (may already exist)."

echo "🎉 Publish complete!"
