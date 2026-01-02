# Local Web Production Build Guide

## Quick Reference Commands

```bash
cd /Users/mattdyor/SparksApp

# 1. Clean dependencies
rm -rf node_modules
npm install

# 2. Clear Expo cache
npx expo start --clear

# 3. Build for web
npm run build:web
```

## Understanding the Build Process

### Key Concepts

1. **Development Server** (`npm run web` or `npx expo start --web --tunnel`):
   - Serves app with hot reload
   - Requires Metro bundler running
   - Good for development and testing
   - **Not suitable for production deployment**

2. **Production Build** (`npm run build:web`):
   - Creates optimized static files in `dist/` folder
   - Bundles and minifies JavaScript
   - Optimizes assets (images, fonts, etc.)
   - Works offline and can be deployed to any static hosting
   - **Suitable for production deployment**

### Build Output

After running `npm run build:web`, you'll get:
- `dist/index.html` - Main entry point
- `dist/_expo/static/` - Optimized JavaScript and CSS bundles
- `dist/assets/` - Optimized images and icons
- `dist/manifest.json` - PWA manifest file

## Complete Build Process

### Step 1: Clean Everything
```bash
cd /Users/mattdyor/SparksApp

# Remove node_modules and lock file (optional, but thorough)
rm -rf node_modules
rm -f package-lock.json  # Optional: forces fresh install

# Clean Expo cache
rm -rf .expo
rm -rf node_modules/.cache
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Clear Expo Cache
```bash
npx expo start --clear
# Or just clear without starting:
npx expo export --clear
```

### Step 4: Build for Production
```bash
npm run build:web
```

This runs:
1. `expo export --platform web` - Creates optimized static files
2. `node scripts/fix-web-build.js` - Applies web-specific fixes

### Step 5: Test Locally (Optional)
```bash
# Serve the built files locally
npx serve dist

# Or use Python's built-in server
cd dist
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Troubleshooting Common Issues

### Issue 1: "No routes found" Error

**Symptoms:**
```
Error: No routes found
    at apply (/node_modules/expo-router/build/static/getServerManifest.js:28:15)
```

**Solution:**
- Ensure `expo-router` is NOT in `app.json` plugins (you use React Navigation)
- Ensure `expo-router` is NOT in `package.json` dependencies
- Ensure `app.json` has `"output": "single"` (not `"static"`) in web config

**Fix:**
```bash
# Check app.json
cat app.json | grep -A 3 '"web"'

# Should show:
# "web": {
#   "output": "single"
# }

# If not, update app.json
```

### Issue 2: Build Fails with Module Errors

**Solution:**
```bash
# Clean everything and reinstall
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
npm run build:web
```

### Issue 3: Changes Not Appearing

**Solution:**
- Production builds are static - you must rebuild after changes
- Clear cache: `npx expo start --clear`
- Rebuild: `npm run build:web`

### Issue 4: Large Bundle Size

**Solution:**
- Check what's being included: `npx expo export --platform web --dump-sourcemap`
- Review large dependencies
- Consider code splitting (if using Expo Router, but you're using React Navigation)

## Development vs Production

### Development Workflow
```bash
# Start development server
npm run web
# Or
npx expo start --web --tunnel

# App runs with hot reload
# Changes appear immediately
# Requires Metro bundler running
```

### Production Workflow
```bash
# Build static files
npm run build:web

# Deploy dist/ folder to hosting
# No server needed (static files)
# Works offline (PWA)
```

## Deployment Options

### Netlify
```bash
# Build first
npm run build:web

# Deploy
netlify deploy --prod --dir=dist
```

### Vercel
```bash
# Build first
npm run build:web

# Deploy
vercel --prod dist
```

### Firebase Hosting
```bash
# Build first
npm run build:web

# Deploy
firebase deploy --only hosting
```

### GitHub Pages
```bash
# Build first
npm run build:web

# Copy dist/ to gh-pages branch
# Or use GitHub Actions for automatic deployment
```

## Quick Reference: When to Use Each Command

| Command | Use Case | Output |
|---------|----------|--------|
| `npm run web` | Development/testing | Dev server (needs Metro) |
| `npx expo start --web --tunnel` | Development with tunnel | Dev server accessible remotely |
| `npm run build:web` | Production build | Static files in `dist/` |
| `npx serve dist` | Test production build | Local server for testing |

## Most Reliable Method for Production Build

```bash
# 1. Clean everything
cd /Users/mattdyor/SparksApp
rm -rf node_modules
rm -rf .expo
rm -rf node_modules/.cache

# 2. Fresh install
npm install

# 3. Clear Expo cache
npx expo start --clear

# 4. Build for production
npm run build:web

# 5. Verify build
ls -la dist/
# Should see: index.html, _expo/, assets/, manifest.json

# 6. Test locally (optional)
npx serve dist
# Open http://localhost:3000 in browser
```

## Key Differences: Development vs Production

### Development Build (`npm run web`)
- ✅ Fast refresh enabled
- ✅ Requires Metro bundler running
- ✅ Loads JS at runtime
- ✅ Can connect to dev server
- ✅ Source maps for debugging
- ❌ Not optimized
- ❌ Larger bundle size
- ❌ Not suitable for deployment

### Production Build (`npm run build:web`)
- ✅ No dev server needed
- ✅ JS is bundled and minified
- ✅ Optimized assets
- ✅ Smaller bundle size
- ✅ Suitable for deployment
- ✅ PWA support
- ❌ No hot reload
- ❌ Must rebuild after changes

## Recommended Workflow

1. **For development:** Use `npm run web` or `npx expo start --web --tunnel`
2. **For production testing:** Build with `npm run build:web` and test with `npx serve dist`
3. **For deployment:** Build and deploy `dist/` folder to your hosting provider

## Build Configuration

Your web build is configured in `app.json`:
```json
"web": {
  "bundler": "metro",
  "favicon": "./assets/favicon.png",
  "output": "single"
}
```

**Important Notes:**
- `"output": "single"` creates a single-page app (works with React Navigation)
- `"output": "static"` would require Expo Router (you don't use this)
- `"bundler": "metro"` uses Metro bundler (standard for Expo)

## Post-Build Fixes

The `scripts/fix-web-build.js` script automatically:
- Fixes ES module script tags
- Adds mobile-centered layout styles
- Ensures proper module loading

This runs automatically as part of `npm run build:web`.

## Verification Checklist

After building, verify:
- [ ] `dist/index.html` exists
- [ ] `dist/_expo/static/` contains JS bundles
- [ ] `dist/assets/` contains images/icons
- [ ] `dist/manifest.json` exists (for PWA)
- [ ] App loads in browser when serving `dist/`
- [ ] No console errors
- [ ] Navigation works
- [ ] Assets load correctly

## Common Build Times

- Clean build: ~30-60 seconds
- Incremental build: ~10-20 seconds
- With cache cleared: ~30-60 seconds

## Environment Variables

If you need environment variables for web builds:
```bash
# Set before building
export EXPO_PUBLIC_API_URL=https://api.example.com
npm run build:web
```

Or use `.env` file (Expo automatically loads `EXPO_PUBLIC_*` variables).

