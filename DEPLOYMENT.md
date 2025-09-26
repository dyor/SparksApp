# Sparks App - Deployment Guide

## Pre-Deployment Checklist

### 1. App Configuration ✅
- [x] Updated app.json with proper bundle identifiers
- [x] Added app description and keywords
- [x] Configured iOS and Android specific settings
- [x] Set up EAS build configuration

### 2. Assets Verification ✅
- [x] App icon (1024x1024) - `assets/icon.png`
- [x] Adaptive icon for Android - `assets/adaptive-icon.png`
- [x] Splash screen - `assets/splash-icon.png`
- [x] Favicon for web - `assets/favicon.png`

### 3. Code Quality
- [ ] Run final tests: `npm test` (if tests exist)
- [ ] Run linting: `npm run lint` (if configured)
- [ ] Ensure all features work in production build

## iOS Deployment (TestFlight & App Store)

### Prerequisites
- Apple Developer Account ($99/year)
- Xcode installed (for local builds)
- App Store Connect app created

### Steps

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Initialize EAS project**
   ```bash
   eas build:configure
   ```

4. **Build for iOS**
   ```bash
   # Development build
   eas build --platform ios --profile development
   
   # Production build for App Store
   eas build --platform ios --profile production
   ```

5. **Submit to TestFlight**
   ```bash
   eas submit --platform ios
   ```

### App Store Connect Configuration
- Bundle ID: `com.sparks.app`
- App Name: "Sparks"
- Category: Education
- Age Rating: 4+
- Screenshots: See `store-config/app-store-listing.md`

## Android Deployment (Google Play Store)

### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Google Play Console app created

### Steps

1. **Build for Android**
   ```bash
   # Development build
   eas build --platform android --profile development
   
   # Production build for Play Store
   eas build --platform android --profile production
   ```

2. **Submit to Google Play**
   ```bash
   eas submit --platform android
   ```

### Google Play Console Configuration
- Package name: `com.sparks.app`
- App name: "Sparks"
- Category: Education
- Content rating: Everyone
- Screenshots: See `store-config/app-store-listing.md`

## Web Deployment

### Build for Web
```bash
# Build web version
npx expo export --platform web

# The built files will be in the 'dist' folder
```

### Deployment Options

1. **Netlify**
   - Connect GitHub repository
   - Build command: `npx expo export --platform web`
   - Publish directory: `dist`

2. **Vercel**
   - Import project from GitHub
   - Framework preset: Other
   - Build command: `npx expo export --platform web`
   - Output directory: `dist`

3. **GitHub Pages**
   ```bash
   npm install --save-dev gh-pages
   ```
   Add to package.json:
   ```json
   {
     "scripts": {
       "deploy": "expo export --platform web && gh-pages -d dist"
     }
   }
   ```

## Environment-Specific Notes

### Production Build Differences
- Minified JavaScript
- Optimized assets
- No development warnings
- Performance optimized

### Testing Production Builds
Before deploying:
1. Test the production build locally
2. Verify all features work correctly
3. Check performance on lower-end devices
4. Ensure offline capabilities work (if applicable)

## Republishing Updates (After Initial Deployment)

Now that you've successfully deployed once, here's how to republish updates to both the App Store and Google Play Store:

### Quick Republish Commands

**Most Common Workflow:**
```bash
# 1. Update version in app.json first (e.g., "1.0.0" → "1.0.1")
# 2. Build and submit everything
npm run build:all
npm run submit:ios
npm run submit:android
```

### Step-by-Step Republishing Process

#### 1. Pre-Release Checklist
- [ ] Update `version` in `app.json` (e.g., "1.0.1", "1.1.0")
- [ ] Test your changes locally (`npm start`)
- [ ] Test web build (`npm run build:web`)
- [ ] Build numbers auto-increment via EAS config

#### 2. Build for Both Platforms
```bash
# Build iOS and Android simultaneously
npm run build:all

# Or build individually:
npm run build:ios    # Same as: npx eas build --platform ios --profile production
npm run build:android # Same as: npx eas build --platform android --profile production
```

#### 3. Submit to App Stores
```bash
# Submit to App Store (uses latest iOS build)
npx eas-cli submit --platform ios

# Submit to Google Play (uses latest Android build)
npx eas-cli submit --platform android
```

#### 4. Monitor Submission Status
- **EAS Dashboard**: https://expo.dev/accounts/mattdyor/projects/sparks-app
- **iOS**: Check App Store Connect for review status
- **Android**: Check Google Play Console for review status

### Build Commands Reference

```bash
# Check recent build status
npx eas build:list

# View specific build details
npx eas build:view [build-id]

# Cancel a running build
npx eas build:cancel [build-id]

# Re-run credentials setup (if needed)
npx eas credentials
```

### Web Updates
```bash
# Build and deploy web updates (instant, no review needed)
npm run build:web
# Then deploy the 'dist/' folder to your web hosting service
```

### Common Update Scenarios

#### Bug Fix Release (Patch: 1.0.0 → 1.0.1)
```bash
# Make your fixes, then:
# Update version to "1.0.1" in app.json
npm run build:all
npx eas submit --platform ios
npx eas submit --platform android
```

#### Feature Release (Minor: 1.0.1 → 1.1.0)
```bash
# Add your features, then:
# Update version to "1.1.0" in app.json
npm run build:all
npx eas submit --platform ios
npx eas submit --platform android
```

#### Major Release (Major: 1.1.0 → 2.0.0)
```bash
# Implement major changes, then:
# Update version to "2.0.0" in app.json
npm run build:all
npx eas submit --platform ios
npx eas submit --platform android
```

### Troubleshooting Republishing

#### If Build Fails
1. Check build logs in EAS dashboard
2. Common fixes:
   - `npm install --legacy-peer-deps` (dependency issues)
   - Check `newArchEnabled: false` in app.json
   - Verify all new dependencies are compatible

#### If Submission Fails
1. **iOS**: Usually credential or metadata issues
2. **Android**: Check Google Play Console for specific errors
3. Re-run credentials setup: `npx eas credentials`

### Review Timeline Expectations
- **iOS App Store**: 1-3 days review time
- **Google Play Store**: 1-2 days review time
- **Web**: Instant (no review required)

### Current Configuration
- **Bundle ID**: `com.mattdyor.sparks` ✅
- **Auto-increment**: Enabled for both platforms ✅
- **Credentials**: Configured and working ✅

---

## Post-Deployment

### Monitoring
- Set up crash reporting (Sentry, Bugsnag)
- Monitor app store reviews
- Track user engagement metrics

### Updates
- Use EAS Update for quick JavaScript updates
- Submit new builds for native code changes
- Maintain backward compatibility

## Troubleshooting

### Common Issues
1. **Build failures**: Check logs in EAS dashboard
2. **Icon issues**: Ensure icons are correct dimensions
3. **Permission errors**: Verify all required permissions in app.json
4. **Bundle ID conflicts**: Ensure unique bundle identifiers

### Support Resources
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)

## Release Notes Template

### Version 1.0.0
**New Features:**
- 🎡 Spinner: Customizable spinning wheel with weighted options
- 🃏 Flashcards: Interactive study system with progress tracking
- 💼 Business Simulation: 30-day business management game
- 🌙 Dark/Light theme support
- ⚙️ Comprehensive settings system
- 📊 Progress tracking and statistics
- 🎯 Haptic feedback throughout the app

**What's Next:**
Future updates may include additional micro-experiences, social features, and enhanced customization options.