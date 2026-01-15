#!/bin/bash

# Sparks App - Production Deployment Script
# This script automates the entire deployment process

set -e  # Exit on any error

echo "🚀 Sparks App - Production Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 0: Verify required files exist
echo "📋 Step 0: Verifying required configuration files..."
if [ ! -f "google-services.json" ]; then
  echo -e "${RED}✗ Error: google-services.json not found in project root${NC}"
  echo "Please ensure google-services.json exists before deploying."
  exit 1
fi
if [ ! -f "GoogleService-Info.plist" ]; then
  echo -e "${RED}✗ Error: GoogleService-Info.plist not found in project root${NC}"
  echo "Please ensure GoogleService-Info.plist exists before deploying."
  exit 1
fi
echo -e "${GREEN}✓ Required configuration files found${NC}"
echo ""

# Step 1: Check version consistency
echo "📋 Step 1: Checking version consistency..."
if ./scripts/check-version.sh; then
  echo -e "${GREEN}✓ Version check passed${NC}"
else
  echo ""
  echo -e "${YELLOW}⚠️  Version mismatch detected. Fixing...${NC}"
  echo ""
  
  # Ensure googleServicesFile is set in app.json before prebuild
  echo "Ensuring google-services.json path is configured in app.json..."
  node -e "
    const fs = require('fs');
    const appJson = require('../app.json');
    if (!appJson.expo.android.googleServicesFile) {
      appJson.expo.android.googleServicesFile = './google-services.json';
      fs.writeFileSync('../app.json', JSON.stringify(appJson, null, 2) + '\n');
      console.log('✓ Added googleServicesFile to Android config');
    }
  "
  
  # Run prebuild to sync versions
  echo "Running: npx expo prebuild --clean"
  npx expo prebuild --clean
  
  echo ""
  echo "Re-checking versions..."
  if ./scripts/check-version.sh; then
    echo -e "${GREEN}✓ Versions now synchronized${NC}"
  else
    echo -e "${RED}✗ Version sync failed. Please check manually.${NC}"
    exit 1
  fi
fi

echo ""

# Step 2: Bump version
echo "📈 Step 2: Bumping version..."
CURRENT_VERSION=$(node -e "console.log(require('./app.json').expo.version)")
echo "Current version: ${CURRENT_VERSION}"

# Increment patch version (e.g., 1.0.2 -> 1.0.3)
NEW_VERSION=$(node -e "
  const version = require('./app.json').expo.version;
  const parts = version.split('.');
  parts[2] = parseInt(parts[2]) + 1;
  console.log(parts.join('.'));
")

echo "New version: ${NEW_VERSION}"
echo ""

# Update app.json
node -e "
  const fs = require('fs');
  const appJson = require('./app.json');
  appJson.expo.version = '${NEW_VERSION}';
  appJson.expo.ios.buildNumber = '${NEW_VERSION}';
  appJson.expo.android.versionName = '${NEW_VERSION}';
  // Ensure googleServicesFile is set for Android
  if (!appJson.expo.android.googleServicesFile) {
    appJson.expo.android.googleServicesFile = './google-services.json';
  }
  fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2) + '\n');
"

echo "✓ Updated app.json"

# Update package.json
node -e "
  const fs = require('fs');
  const packageJson = require('./package.json');
  packageJson.version = '${NEW_VERSION}';
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n');
"

echo "✓ Updated package.json"

# Run prebuild to sync native configs
echo "Running: npx expo prebuild --clean"
npx expo prebuild --clean

echo ""
echo -e "${GREEN}✓ Version bumped to ${NEW_VERSION}${NC}"
echo ""

# Update RELEASENOTES.md: Replace "Next Release" with the new version
echo "📝 Updating RELEASENOTES.md..."
node -e "
  const fs = require('fs');
  const path = './CONTEXT/GENERAL/RELEASENOTES.md';
  
  if (!fs.existsSync(path)) {
    console.log('⚠️  RELEASENOTES.md not found, skipping update');
    process.exit(0);
  }
  
  let content = fs.readFileSync(path, 'utf8');
  const newVersion = '${NEW_VERSION}';
  
  // Replace '## Next Release' with '## Version X.X.X'
  content = content.replace(/^## Next Release$/m, '## Version ' + newVersion);
  
  // Find the version section and add a new 'Next Release' section after the separator
  const lines = content.split('\n');
  const versionIndex = lines.findIndex(line => line.trim() === '## Version ' + newVersion);
  
  if (versionIndex !== -1) {
    // Find the next '---' separator after the version section
    let separatorIndex = -1;
    for (let i = versionIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        separatorIndex = i;
        break;
      }
    }
    
    // Insert the new 'Next Release' section after the separator
    const newSection = [
      '',
      '## Next Release',
      '',
      '### New Sparks',
      '- (Add new sparks here)',
      '',
      '### Major Work Items',
      '- (Add major work items here as they\\'re completed)',
      ''
    ];
    
    if (separatorIndex !== -1) {
      lines.splice(separatorIndex + 1, 0, ...newSection);
    } else {
      // If no separator found, add after the version section
      lines.splice(versionIndex + 1, 0, ...newSection);
    }
    
    content = lines.join('\n');
  }
  
  fs.writeFileSync(path, content, 'utf8');
  console.log('✓ Updated RELEASENOTES.md');
"
echo ""

# Step 3: Ensure package.json and package-lock.json are in sync
echo "📦 Step 3: Syncing package.json and package-lock.json..."
echo "Running: npm install"
echo ""

if npm install; then
  echo -e "${GREEN}✓ Package files synchronized${NC}"
else
  echo -e "${RED}✗ Failed to sync package files. Please run 'npm install' manually and fix any issues.${NC}"
  exit 1
fi

echo ""

# Step 4: Select platform(s) to deploy
echo -e "${BLUE}Select platform(s) to deploy:${NC}"
echo "1) Both iOS and Android"
echo "2) iOS only"
echo "3) Android only"
echo ""
read -p "Enter choice (1-3): " -n 1 -r
echo ""

PLATFORM=""
case $REPLY in
  1)
    PLATFORM="all"
    echo -e "${GREEN}Selected: Both iOS and Android${NC}"
    ;;
  2)
    PLATFORM="ios"
    echo -e "${GREEN}Selected: iOS only${NC}"
    ;;
  3)
    PLATFORM="android"
    echo -e "${GREEN}Selected: Android only${NC}"
    ;;
  *)
    echo -e "${RED}Invalid choice. Deployment cancelled.${NC}"
    exit 1
    ;;
esac

echo ""

# Step 5: Confirm deployment
echo -e "${BLUE}Ready to deploy version ${NEW_VERSION} to ${PLATFORM}${NC}"
echo ""
read -p "Deploy version ${NEW_VERSION} to production? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 0
fi

echo ""

# Step 6: Build and submit
echo "📦 Step 6: Building and submitting to app stores..."
echo "Running: npx eas build --platform ${PLATFORM} --profile production --auto-submit"
echo ""

npx eas build --platform ${PLATFORM} --profile production --auto-submit

echo ""
echo -e "${GREEN}✓ Build and auto-submit initiated!${NC}"
echo ""

# Step 7: Post-deployment instructions
echo "======================================"
echo "📱 Next Steps - Manual Store Actions"
echo "======================================"
echo ""

if [[ "$PLATFORM" == "all" || "$PLATFORM" == "android" ]]; then
  echo -e "${BLUE}🤖 Google Play Console:${NC}"
  echo "1. Go to: https://play.google.com/console/u/0/developers/7574537990443980441/app/4974480089571997239/tracks/production"
  echo "2. Click: 'Create New Release'"
  echo "3. Click: 'Add from Library' (select the build that was just submitted)"
  echo "4. Add release notes describing what's new in version ${NEW_VERSION}"
  echo "   📋 See CONTEXT/GENERAL/RELEASENOTES.md for details about version ${NEW_VERSION}"
  echo "5. Click: 'Review Release'"
  echo "6. Click: 'Start Rollout to Production'"
  echo ""
fi

if [[ "$PLATFORM" == "all" || "$PLATFORM" == "ios" ]]; then
  echo -e "${BLUE}🍎 App Store Connect:${NC}"
  echo "1. Go to: https://appstoreconnect.apple.com/apps/6752919846/distribution/info"
  echo "   Or: https://appstoreconnect.apple.com/apps/6752919846/distribution/ios/version/deliverable"
  echo "2. Wait for build to appear in TestFlight (usually 5-15 minutes)"
  echo "3. Once processed, go to 'App Store' tab"
  echo "4. Click: '+' Next to iOS App"
  echo "5. Select the new build (version ${NEW_VERSION}) about halfway down the page"
  echo "6. Add 'What's New' release notes"
  echo "   📋 See CONTEXT/GENERAL/RELEASENOTES.md for details about version ${NEW_VERSION}"
  echo "7. Click: 'Save' then 'Submit for Review'"
  echo ""
fi

echo "======================================"
echo -e "${GREEN}✅ Deployment process complete!${NC}"
echo "======================================"
echo ""
echo "Monitor build status at: https://expo.dev/accounts/mattdyor/projects/sparks-app/builds"
echo ""
echo -e "${BLUE}📋 Release Notes:${NC}"
echo "   Check CONTEXT/GENERAL/RELEASENOTES.md for details about version ${NEW_VERSION}"
echo "   File location: $(pwd)/CONTEXT/GENERAL/RELEASENOTES.md"
echo ""
