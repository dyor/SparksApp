#!/bin/bash

# Preview script that kills port 8081 before starting Expo
# This prevents "port already in use" errors

set -e

PORT=8081

echo "🔍 Checking for processes on port $PORT..."

# Kill any process using port 8081
if command -v lsof >/dev/null 2>&1; then
    # Unix/Linux/Mac
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ ! -z "$PID" ]; then
        echo "🛑 Killing process $PID on port $PORT..."
        kill -9 $PID 2>/dev/null || true
        sleep 1
        echo "✅ Port $PORT is now free"
    else
        echo "✅ Port $PORT is already free"
    fi
elif command -v netstat >/dev/null 2>&1; then
    # Windows (if netstat is available)
    PID=$(netstat -ano | findstr :$PORT | awk '{print $5}' | head -1 || true)
    if [ ! -z "$PID" ]; then
        echo "🛑 Killing process $PID on port $PORT..."
        taskkill //F //PID $PID 2>/dev/null || true
        sleep 1
        echo "✅ Port $PORT is now free"
    else
        echo "✅ Port $PORT is already free"
    fi
else
    echo "⚠️  Could not find lsof or netstat, skipping port cleanup"
fi

echo ""
echo "🚀 Starting Expo web server..."
echo ""

# Start Expo using the project's robust start script which handles ports
# Run in CI mode to avoid interactive flags in Codespaces
export CI=true
node scripts/start-web.js --port=$PORT

