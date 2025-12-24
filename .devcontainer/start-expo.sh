#!/usr/bin/env bash
set -e

# Start Expo in web + tunnel mode in the background and write logs to /tmp/expo.log
# Use non-interactive mode so the script doesn't hang awaiting input.

echo "Starting Expo (web + tunnel) in background..."
cd "$(dirname "$(dirname "$0")")" || exit 1

# Ensure packages are installed (no-op if already done)
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --silent
fi

# Run Expo in background and detach
nohup npx expo start --web --tunnel --non-interactive > /tmp/expo.log 2>&1 &

echo "Expo started (logs: /tmp/expo.log)." 
