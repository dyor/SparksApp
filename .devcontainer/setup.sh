#!/bin/bash
set -e

echo "🚀 Setting up SparksApp development environment..."
echo "⏳ Please wait - this may take 3-5 minutes on first run"
echo ""

# Install dependencies with legacy peer deps to handle React 19 + Expo 54
echo "📦 Installing npm packages (including Expo CLI)..."
echo "   Using --legacy-peer-deps to handle React 19 compatibility..."
npm install --legacy-peer-deps

# Install ngrok for tunneling support (required for Codespaces)
echo "🌐 Installing tunnel dependencies for Codespaces..."
npm install --save-dev @expo/ngrok --legacy-peer-deps

# Verify expo is installed
echo "✅ Verifying Expo installation..."
if ! npx expo --version &> /dev/null; then
    echo "⚠️  Expo CLI not found, installing explicitly..."
    npm install -D expo-cli@latest --legacy-peer-deps
fi

# Setup environment variables if .env doesn't exist
if [ ! -f .env ]; then
    echo "🔑 Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️  IMPORTANT: Edit .env file with your Firebase credentials!"
        echo "   You can find these in Firebase Console > Project Settings > General"
    else
        echo "❌ Warning: .env.example not found"
    fi
else
    echo "✅ .env file already exists"
fi

# Display helpful information
echo ""
echo "✅ Setup complete! You're ready to develop."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Configure Environment Variables:"
echo "   • Open .env file in the editor"
echo "   • Add your Firebase and Gemini API credentials"
echo ""
echo "2️⃣  Start Expo Development Server:"
echo "   • Run: npx expo start --tunnel --go"
echo "   • Wait for tunnel URL and QR code to appear"
echo "   • Look for: exp://xxx.tunnel.exp.dev:8081"
echo ""
echo "3️⃣  Connect Your Phone:"
echo "   • Install Expo Go app on your device"
echo "   • Scan the QR code"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • Always use 'npx expo start --tunnel --go' for Codespaces"
echo "   • The --tunnel flag enables cloud access"
echo "   • The --go flag forces Expo Go mode (not dev build)"
echo "   • Restart Metro if .env changes: Ctrl+C then restart"
echo "   • Need help? See CONTEXT/GENERAL/CODESPACESPLAN.md"
echo ""
