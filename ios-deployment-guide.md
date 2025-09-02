# iOS TestFlight & App Store Deployment Guide

## Prerequisites Checklist

### Apple Developer Account
- [ ] Apple Developer Program membership ($99/year)
- [ ] Two-factor authentication enabled
- [ ] App Store Connect access

### Development Environment
- [ ] macOS with Xcode installed
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into Expo: `eas login`

## Step 1: App Store Connect Setup

1. **Create New App**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"
   - Platform: iOS
   - Name: "Sparks"
   - Bundle ID: `com.sparks.app` (must match app.json)
   - SKU: `sparks-app-2025`
   - Language: English

2. **App Information**
   - Category: Education
   - Age Rating: Complete questionnaire (should result in 4+)
   - Privacy Policy URL: [Your hosted privacy policy URL]

## Step 2: Configure EAS Build

1. **Initialize EAS in your project**
   ```bash
   cd /path/to/SparksApp
   eas build:configure
   ```

2. **Verify eas.json configuration** (already created)
   - Development, preview, and production profiles configured
   - Resource classes set appropriately

## Step 3: Create iOS Build

### Development Build (for testing)
```bash
eas build --platform ios --profile development
```

### Production Build (for App Store)
```bash
eas build --platform ios --profile production
```

**Note**: First build may take 15-30 minutes. Subsequent builds are faster.

## Step 4: TestFlight Submission

### Automatic Submission
```bash
eas submit --platform ios
```

### Manual Process
1. Download the .ipa file from EAS dashboard
2. Use Transporter app or Xcode Organizer to upload
3. Wait for processing (5-10 minutes)

## Step 5: TestFlight Configuration

1. **Build Processing**
   - Wait for "Ready to Submit" status
   - Add export compliance information if prompted

2. **Internal Testing**
   - Add internal testers (up to 100)
   - Distribute build to testers
   - Test all features thoroughly

3. **External Testing** (optional)
   - Create test groups
   - Add external testers (up to 10,000)
   - Requires Apple review (1-3 days)

## Step 6: App Store Submission

1. **Complete App Information**
   - App Store Screenshots (see store-config/app-store-listing.md)
   - App descriptions and keywords
   - Support URL and marketing URL
   - Review information and notes

2. **Pricing and Availability**
   - Set to Free (or your preferred price)
   - Select territories
   - Set availability date

3. **Submit for Review**
   - Select build from TestFlight
   - Complete all required fields
   - Submit for Apple review
   - Average review time: 24-48 hours

## Required Screenshots Dimensions

### iPhone
- **6.7" Display** (iPhone 14 Pro Max): 1290 x 2796 pixels
- **6.1" Display** (iPhone 14): 1170 x 2532 pixels
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels

### iPad
- **12.9" Display** (iPad Pro): 2048 x 2732 pixels
- **11" Display** (iPad Pro): 1640 x 2360 pixels

## App Store Review Guidelines Compliance

✅ **Sparks complies with Apple's guidelines:**
- No inappropriate content
- No data collection without consent
- Clear app functionality
- No misleading features
- Proper use of device features (haptic feedback)

## Common Issues and Solutions

### Build Failures
- **Missing provisioning profile**: EAS handles this automatically for managed projects
- **Code signing issues**: Ensure Apple Developer account is properly configured
- **Bundle ID conflicts**: Verify uniqueness in App Store Connect

### Review Rejections
- **Missing metadata**: Ensure all required fields are completed
- **Screenshot issues**: Follow exact dimension requirements
- **App functionality**: Ensure app doesn't crash and all features work

### Performance Issues
- **Large bundle size**: Use asset optimization and tree shaking
- **Slow load times**: Optimize images and reduce initial bundle size

## Testing Checklist Before Submission

- [ ] App launches without crashing
- [ ] All three sparks work correctly
- [ ] Theme switching functions properly
- [ ] Settings save and persist
- [ ] Add/Remove spark functionality works
- [ ] Haptic feedback works (can be disabled)
- [ ] App works on both iPhone and iPad
- [ ] No console errors or warnings
- [ ] Privacy policy is accessible

## Post-Submission

### Monitor Status
- Check App Store Connect for review status
- Respond to Apple feedback within 7 days if required
- Monitor TestFlight crash reports

### Release Planning
- Plan release notes for updates
- Consider soft launch in select territories
- Prepare marketing materials

## Useful Commands Summary

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list --platform ios
```

## Support Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)