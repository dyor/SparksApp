# Expo SDK 53 Upgrade - Step by Step

## Current Status
✅ On test branch: `test/expo-sdk-53-web-test`
✅ SDK 52 web build working
✅ Ready to upgrade

## Step 1: Upgrade Expo SDK

```bash
# Make sure you're on the test branch
git branch  # Should show: test/expo-sdk-53-web-test

# Upgrade Expo SDK to 53
npx expo install expo@^53.0.22 --fix

# This will:
# - Update expo package to SDK 53
# - Update all Expo-related dependencies to compatible versions
# - Fix any version conflicts automatically
```

## Step 2: Update All Dependencies

```bash
# Update all dependencies to SDK 53 compatible versions
npx expo install --fix

# This ensures all Expo packages are compatible with SDK 53
```

## Step 3: Test Web Development Server

```bash
# Test web dev server (your normal workflow)
npm run web
# Or: npx expo start --web --tunnel

# Check for:
# - Server starts without errors
# - App loads in browser
# - No console errors
# - Navigation works
```

## Step 4: Test Web Production Build

```bash
# Test production build
npm run build:web

# Should complete without errors
# Then test the build:
npx serve dist
# Open http://localhost:3000 in browser
```

## Step 5: Test Critical Features

Test these on web:
- [ ] App loads without errors
- [ ] Navigation works (React Navigation)
- [ ] Firebase services work (auth, firestore, analytics)
- [ ] Theme switching works
- [ ] At least one spark works (test a simple one)
- [ ] No console errors

## Step 6: Test Android Build (If Web Works)

```bash
# Only if web testing passed
eas build --platform android --profile production
```

## If Issues Occur

### Web Dev Server Issues
- Check console for specific errors
- Verify all dependencies installed correctly
- Try: `rm -rf node_modules && npm install`

### Web Build Issues
- Check for breaking changes in SDK 53 changelog
- Verify `app.json` web config is correct
- Check for deprecated packages

### Dependency Conflicts
- Review error messages
- May need to manually update some packages
- Check Expo SDK 53 compatibility list

## Next Steps After Successful Upgrade

1. **If web works:**
   - Commit changes to test branch
   - Test Android build
   - If Android works, merge to main

2. **If web has issues:**
   - Document the issues
   - Check Expo SDK 53 changelog for breaking changes
   - Look for solutions/workarounds
   - Consider if issues are fixable or need to explore alternatives

## Rollback Plan

If upgrade fails completely:

```bash
# Go back to main branch
git checkout main

# Or restore from backup tag
git checkout backup-sdk-52-before-test

# Delete test branch if needed
git branch -D test/expo-sdk-53-web-test
```

