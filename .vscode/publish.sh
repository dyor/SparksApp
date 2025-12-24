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
git push || true

# Create PR
echo "🔀 Creating Pull Request..."

# Determine current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Helper: parse owner/repo from a remote URL
parse_owner_repo() {
    url="$1"
    # handle formats like git@github.com:owner/repo.git or https://github.com/owner/repo.git
    echo "$url" | sed -E 's#.*[:/](.+/.+?)(\.git)?$#\1#'
}

# Get fork (origin) and upstream (parent) remotes
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || true)
UPSTREAM_URL=$(git remote get-url upstream 2>/dev/null || true)

ORIGIN_REPO=$(parse_owner_repo "$ORIGIN_URL")
UPSTREAM_REPO=$(parse_owner_repo "$UPSTREAM_URL")

# If no upstream is configured, treat origin as upstream (user likely has push access)
if [ -z "$UPSTREAM_REPO" ]; then
    UPSTREAM_REPO="$ORIGIN_REPO"
fi

# Extract owner (user/org) for head ref
FORK_OWNER=$(echo "$ORIGIN_REPO" | cut -d'/' -f1)

# Build head ref as owner:branch
HEAD_REF="$FORK_OWNER:$BRANCH"

# Attempt to create PR against upstream explicitly to avoid requiring a default gh repo
# Use --fill to populate title/body from commits; if PR exists, warn but continue
if gh pr create --repo "$UPSTREAM_REPO" --base main --head "$HEAD_REF" --fill; then
    echo "✅ Pull Request created."
else
    echo "⚠️ Could not create PR (it may already exist or there was an error)."
    echo "You can create a PR manually with:"
    echo "  gh pr create --repo $UPSTREAM_REPO --base main --head $HEAD_REF --fill"
fi

echo "🎉 Publish complete!"
