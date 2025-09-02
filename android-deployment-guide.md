# Android Google Play Store Deployment Guide

## Prerequisites Checklist

### Google Play Developer Account
- [ ] Google Play Developer Console access ($25 one-time registration fee)
- [ ] Two-factor authentication enabled
- [ ] Developer profile completed

### Development Environment
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into Expo: `eas login`

## Step 1: Google Play Console Setup

1. **Create New App**
   - Go to [Google Play Console](https://play.google.com/console)
   - Click "Create app"
   - App name: "Sparks"
   - Default language: English
   - App or game: App
   - Free or paid: Free
   - Declarations: Complete all required declarations

2. **Store Listing Setup**
   - App name: "Sparks"
   - Short description: "Spin wheels, study flashcards, run businesses"
   - Full description: Use content from `store-config/app-store-listing.md`
   - App icon: 512 x 512 pixels (use resized version of assets/icon.png)
   - Feature graphic: 1024 x 500 pixels (create promotional banner)
   - Screenshots: See requirements below

## Step 2: App Signing Configuration

### Option 1: Let Google Play Manage (Recommended)
- Google Play will handle app signing
- More secure and allows for app recovery
- EAS Build supports this automatically

### Option 2: Upload Your Own Key
```bash
# Generate upload key (if needed)
keytool -genkey -v -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

## Step 3: Create Android Build

### Development Build (for testing)
```bash
eas build --platform android --profile development
```

### Production Build (for Play Store)
```bash
eas build --platform android --profile production
```

**Output**: Android App Bundle (.aab) file - optimized for Google Play

## Step 4: Upload to Google Play Console

### Automatic Submission
```bash
eas submit --platform android
```

### Manual Upload
1. Download the .aab file from EAS dashboard
2. Go to Google Play Console → Release → Production
3. Upload the .aab file
4. Complete release details

## Step 5: Complete Store Listing

### Required Store Assets

#### Screenshots (Upload at least 2, up to 8)
- **Phone screenshots**: 16:9 or 9:16 aspect ratio
- **7-inch tablet**: 16:10 or 10:16 aspect ratio  
- **10-inch tablet**: 16:10 or 10:16 aspect ratio

#### Graphics
- **App icon**: 512 x 512 pixels (PNG, no transparency)
- **Feature graphic**: 1024 x 500 pixels (JPG or PNG)
- **Promotional video**: YouTube link (optional)

### Store Listing Content
```
App Name: Sparks
Short Description: Interactive micro-experiences: spinning wheels, flashcards, and business simulations

Full Description:
Discover a world of interactive micro-experiences with Sparks! This engaging app combines entertainment and education through three distinct experiences:

🎡 SPINNER
Create and customize your own spinning wheel with weighted options. Perfect for making decisions, choosing restaurants, or having fun with friends and family.

🃏 FLASHCARDS  
Study and learn with interactive flashcards across various topics. Track your progress, monitor accuracy, and improve knowledge retention with smooth animations.

💼 BUSINESS SIMULATION
Run your own virtual business for 30 days! Make strategic decisions, manage resources, handle random events, and see how your choices affect success.

KEY FEATURES:
• Beautiful, intuitive interface with dark/light theme support
• Progress tracking and detailed statistics across all experiences  
• Fully customizable options and comprehensive settings
• Smooth animations and optional haptic feedback
• No ads or in-app purchases - everything is completely free!
• Works entirely offline - no internet connection required

Whether you're looking to learn something new, make a fun decision with friends, or challenge your business skills, Sparks offers perfectly sized experiences for any moment.

Perfect for students, families, decision-makers, and anyone who loves interactive entertainment!
```

## Step 6: Content Rating

Complete the content rating questionnaire:
- **Violence & Graphic Content**: None
- **Sexual Content**: None  
- **Profanity**: None
- **Controlled Substances**: None
- **Gambling & Contests**: None
- **User-Generated Content**: None

**Expected Rating**: Everyone

## Step 7: Target Audience & Content

1. **Target Age Groups**
   - Primary: 13+ (teenagers and adults)
   - Secondary: All ages welcome

2. **App Category**
   - Primary: Education
   - Secondary: Casual Games

3. **Content Labels**
   - No special content warnings needed
   - Family-friendly content

## Step 8: Privacy Policy & Data Safety

### Data Safety Section
```
Data Collection: No data collected
Data Sharing: No data shared with third parties
Data Security: All data stored locally on device
Data Deletion: Data deleted when app is uninstalled
```

### Privacy Policy
- Host the `PRIVACY_POLICY.md` file on a website
- Provide the URL in Google Play Console
- Must be accessible and clearly written

## Step 9: Release Management

### Internal Testing Track
1. Upload build to Internal Testing
2. Add internal testers (up to 100)
3. Test thoroughly before production

### Production Release
1. Upload final build
2. Set rollout percentage (start with 20%, increase gradually)
3. Add release notes
4. Submit for review

## Step 10: Review Process

### Google Play Review Timeline
- **Automated review**: Few hours
- **Manual review**: 1-3 days (for new apps)
- **Policy compliance review**: May take longer

### Common Review Issues
- **Metadata accuracy**: Ensure screenshots match app functionality
- **Content policy**: Verify no prohibited content
- **Technical requirements**: App must not crash on launch

## Required Screenshots Dimensions

### Phone Screenshots
- **Portrait**: Minimum 320px, Maximum 3840px
- **Landscape**: Minimum 320px, Maximum 3840px
- **Recommended**: 1080 x 1920 (portrait) or 1920 x 1080 (landscape)

### Tablet Screenshots  
- **7-inch**: Minimum 1024 x 600
- **10-inch**: Minimum 1920 x 1200

## Pre-Submission Testing Checklist

- [ ] App installs and launches correctly
- [ ] All three sparks function properly
- [ ] Theme switching works on Android devices
- [ ] Settings persist between app sessions
- [ ] Add/Remove spark functionality operational
- [ ] Haptic feedback appropriate for Android
- [ ] App adapts to different screen sizes
- [ ] No crashes or critical errors
- [ ] Back button navigation works correctly
- [ ] Permission requests are appropriate

## Launch Strategy

### Soft Launch Approach
1. **Phase 1**: Release in select countries (20% rollout)
2. **Phase 2**: Monitor metrics, fix issues (50% rollout)
3. **Phase 3**: Full global release (100% rollout)

### Key Metrics to Monitor
- Crash rate (keep below 2%)
- ANR (Application Not Responding) rate
- User retention
- Play Store rating and reviews

## Useful Commands Summary

```bash
# Build for Android production
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android

# Build for both platforms
eas build --platform all --profile production

# Check build status
eas build:list --platform android
```

## Post-Release Management

### Update Process
1. Increment `versionCode` in app.json
2. Update `version` if needed
3. Build and submit new version
4. Provide clear release notes

### Monitoring Tools
- Google Play Console analytics
- Crash reporting via Play Console
- User feedback and reviews

## Troubleshooting Common Issues

### Build Issues
- **Gradle build failures**: Check Android dependencies
- **Signing issues**: Verify keystore configuration
- **Bundle size too large**: Enable Proguard/R8 optimization

### Upload Issues
- **Package name conflicts**: Ensure unique package name
- **Version conflicts**: Increment version codes properly
- **Metadata issues**: Complete all required fields

## Support Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [EAS Build for Android](https://docs.expo.dev/build-reference/android-builds/)
- [Google Play Policy Documentation](https://support.google.com/googleplay/android-developer/answer/9858738)