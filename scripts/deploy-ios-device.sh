#!/bin/bash

# 1. Navigate to the project directory
# Using a relative path or a variable is safer if you share this script
PROJECT_DIR="/Users/mattdyor/SparksApp"
cd "$PROJECT_DIR" || { echo "Directory not found"; exit 1; }

# 2. Clean up old builds
echo "Cleaning old builds..."
rm -rf ios/build

# 3. Install Pods
echo "Installing CocoaPods..."
cd ios && pod install && cd ..

# 4. Run on device
echo "Deploying to Matt's iPhone (2) in Release mode..."
npx expo run:ios --device "Matt's iPhone (2)" --configuration Release