#!/usr/bin/env bash
set -e

# Robust web server startup script for Codespaces
# Handles port conflicts automatically and ensures reliable web serving

echo "🚀 Starting Expo Web Server for Codespaces..."
cd "$(dirname "$(dirname "$0")")" || exit 1

# Ensure packages are installed
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install --silent
fi

# Function to find an available port starting from 8081
find_available_port() {
    local port=$1
    while lsof -ti:$port > /dev/null 2>&1; do
        echo "⚠️  Port $port is in use, trying next port..."
        port=$((port + 1))
        if [ $port -gt 8100 ]; then
            echo "❌ Could not find available port (tried up to 8100)"
            exit 1
        fi
    done
    echo $port
}

# Kill any existing Expo processes to avoid conflicts
echo "🧹 Cleaning up any existing Expo processes..."
pkill -f "expo start" || true
sleep 1

# Find available port
PORT=$(find_available_port 8081)
echo "✅ Using port $PORT"

# Set environment variables to disable all interactive prompts
export EXPO_NO_GIT_STATUS=1
export CI=true
export EXPO_NO_TELEMETRY=1

# Export port for Expo to use
export PORT=$PORT

# Start Expo web server
echo "🌐 Starting Expo web server on port $PORT..."
echo "   This will be automatically forwarded in Codespaces"
echo "   Look for the port in the 'Ports' tab and click to open"

# Use exec to replace shell process, ensuring proper signal handling
exec npx expo start --web --port "$PORT" --non-interactive

