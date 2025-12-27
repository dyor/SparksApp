# Codespaces Web Development Guide

This guide explains how to use the web development server in GitHub Codespaces for testing your Sparks app.

## Quick Start

### Automatic Start (Recommended for Beginners)

When you open a Codespace, the web server **automatically starts** in the background. Here's what to do:

1. **Wait 10-15 seconds** after the Codespace opens for the server to start
2. **Open the "Ports" tab** in VS Code (bottom panel, or View → Ports)
3. **Look for port 8081** (or the next available port if 8081 is in use)
4. **Click the globe icon 🌐** next to the port to open in your browser
5. The app should load automatically!

### Manual Start

If you need to start the server manually:

```bash
npm run web
```

This will:
- ✅ Automatically find an available port (starting from 8081)
- ✅ Handle port conflicts without prompts
- ✅ Disable all interactive popups
- ✅ Start the web server reliably

## Troubleshooting

### Blank Screen

If you see a blank screen:

1. **Check the Ports tab** - Make sure port 8081 (or the port shown) is forwarded
2. **Wait a bit longer** - The server needs time to compile on first start
3. **Check the terminal** - Look for any error messages
4. **Try refreshing** - Press F5 or Cmd+R in the browser
5. **Check logs** - Run `tail -f /tmp/expo-web.log` to see server logs

### Port Already in Use

The system **automatically handles this** - you don't need to do anything! The script will:
- Detect if port 8081 is in use
- Automatically try the next port (8082, 8083, etc.)
- Show you which port it's using

Just check the Ports tab for the actual port number.

### Popups About Opening Browser or Making Port Public

These popups are **disabled** by our configuration. If you still see them:

1. Make sure you're using `npm run web` (not `npx expo start --web` directly)
2. The environment variables are set automatically to prevent prompts

### Server Won't Start

1. **Check if it's already running**: Look in the Ports tab
2. **Kill existing processes**: Run `pkill -f "expo start"` then try again
3. **Check dependencies**: Run `npm install` to ensure everything is installed
4. **Check logs**: Look at `/tmp/expo-web.log` for error messages

## How It Works

### Port Conflict Handling

The `scripts/start-web.js` script:
- Checks if port 8081 is available
- If not, automatically tries 8082, 8083, etc. up to 8100
- Starts Expo on the first available port
- No user interaction required!

### Non-Interactive Mode

All prompts are disabled via environment variables:
- `EXPO_NO_DOTENV=1` - Don't prompt about .env files
- `EXPO_NO_GIT_STATUS=1` - Don't check git status
- `CI=true` - Run in CI mode (non-interactive)
- `EXPO_NO_TELEMETRY=1` - Disable telemetry prompts

### Port Forwarding

The `.devcontainer/devcontainer.json` is configured to:
- Automatically forward port 8081
- Label it as "Expo Web Server"
- Open the browser automatically when the port is ready

## Advanced Usage

### Using a Specific Port

If you need a specific port:

```bash
PORT=8082 npm run web
```

### Viewing Server Logs

```bash
# View logs from auto-started server
tail -f /tmp/expo-web.log

# Or start manually to see logs in terminal
npm run web
```

### Stopping the Server

Press `Ctrl+C` in the terminal where it's running, or:

```bash
pkill -f "expo start"
```

## Tips for Novice Coders

1. **Always use `npm run web`** - Don't use `npx expo start --web` directly
2. **Check the Ports tab first** - It shows you exactly which port to use
3. **Wait for compilation** - First start takes 30-60 seconds
4. **Refresh if blank** - Sometimes a refresh fixes loading issues
5. **Look for the globe icon** - That's your "open in browser" button

## Need Help?

- Check `/tmp/expo-web.log` for detailed error messages
- Look at the terminal output when running `npm run web`
- Check the VS Code Problems panel for any issues
- Review the Expo documentation: https://docs.expo.dev/

