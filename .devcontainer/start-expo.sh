#!/usr/bin/env bash
set -e

# Start Expo web server in the background for Codespaces
# Uses the robust start-web.js script that handles port conflicts automatically

echo "🚀 Auto-starting Expo web server for Codespaces..."
cd "$(dirname "$(dirname "$0")")" || exit 1

# Ensure packages are installed (no-op if already done)
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install --silent
fi

# Use the robust start-web.js script which handles port conflicts automatically
# Run in background and redirect output to log file
nohup node scripts/start-web.js > /tmp/expo-web.log 2>&1 &

echo "✅ Expo web server starting in background (logs: /tmp/expo-web.log)"
echo "📋 Next steps:"
echo "   1. Wait a few seconds for the server to start"
echo "   2. Check the 'Ports' tab in VS Code (bottom panel)"
echo "   3. Look for port 8081 (or next available port)"
echo "   4. Click the globe icon 🌐 to open in browser"
echo ""
echo "💡 Tip: You can also run 'npm run web' manually anytime" 
