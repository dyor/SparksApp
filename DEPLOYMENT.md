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