# Debugging Share Story Crashes

## Overview
The Share Story feature can crash when processing trips with many large photos due to memory constraints. This guide helps you debug the issue on your device.

## What Was Added
The code now includes comprehensive logging at every step:
- Trip statistics (photo count, activity count, days)
- Progress tracking for each photo conversion
- Memory size warnings
- Detailed error messages with stack traces
- Timing information for PDF generation

## How to View Logs on Your Device

### Option 1: Using Metro Bundler (Recommended)
1. Make sure your device is connected and the app is running
2. In your terminal where Metro is running, you'll see all console.log output
3. Look for logs prefixed with:
   - 📄 Starting PDF generation
   - 📊 Trip stats
   - 🔄 Photo conversion progress
   - ✅ Success messages
   - ❌ Error messages

### Option 2: Using React Native Debugger
1. Open React Native Debugger
2. Go to Console tab
3. Filter for "PDF" or "Photo" to see relevant logs

### Option 3: Using Xcode Console (iOS)
1. Connect your iOS device
2. Open Xcode
3. Go to Window → Devices and Simulators
4. Select your device
5. Click "Open Console"
6. Filter for your app name or "SparksApp"

### Option 4: Using Android Logcat (Android)
```bash
adb logcat | grep -i "pdf\|photo\|tripstory"
```

## What to Look For

### Before the Crash
1. **Photo Count**: How many photos are being processed?
   - Look for: `📊 Trip stats: { photoCount: X }`
   - If > 100 photos, this is likely the issue

2. **Progress**: Which photo is being processed when it crashes?
   - Look for: `🔄 Photo X/Y: Converting to base64...`
   - This tells you if it crashes during photo conversion

3. **Memory Warnings**: 
   - Look for: `⚠️ WARNING: HTML size is very large`
   - If HTML size > 50MB, memory issues are likely

4. **HTML Generation**:
   - Look for: `🔄 Generating HTML template...`
   - If crash happens here, the HTML string is too large

5. **PDF Generation**:
   - Look for: `🔄 Generating PDF from HTML...`
   - If crash happens here, expo-print is running out of memory

### Error Messages
Look for lines starting with `❌`:
- `❌ Error converting photo to base64` - Individual photo failed
- `❌ Print/Share error` - PDF generation failed
- `❌ Error generating trip story` - General error

## Common Issues and Solutions

### Issue 1: Too Many Photos
**Symptoms**: Crash during photo conversion, HTML size > 50MB
**Solution**: We need to implement photo compression or batching

### Issue 2: Large Individual Photos
**Symptoms**: Crash on specific photo, very large base64 size
**Solution**: We need to resize/compress photos before converting to base64

### Issue 3: PDF Generation Memory
**Symptoms**: Crash during `Print.printToFileAsync`
**Solution**: We need to reduce HTML size or use a different PDF generation method

### Issue 4: Missing Photo Files
**Symptoms**: Many `⚠️ Photo file does not exist` warnings
**Solution**: Photo URIs are invalid or files were deleted

## Next Steps After Debugging

Once you identify where the crash occurs, we can:
1. **Add photo compression** - Resize photos before base64 conversion
2. **Implement batching** - Process photos in smaller batches
3. **Use file references** - Instead of embedding base64, reference files
4. **Add pagination** - Split PDF into multiple pages/files
5. **Optimize HTML** - Reduce image sizes in HTML template

## Sharing Debug Information

When reporting the issue, please share:
1. The last 20-30 lines of console output before the crash
2. Photo count from the trip stats
3. HTML size estimate (if it gets that far)
4. Any error messages with stack traces
5. Device model and iOS/Android version

