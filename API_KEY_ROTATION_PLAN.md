# API Key Rotation Plan - Firebase Remote Config

## Problem Statement

An environment variable containing an API key was exposed, requiring immediate key rotation. Currently, rotating the key requires:
1. Generating a new API key
2. Updating environment variables
3. Rebuilding the app (Android & iOS)
4. Republishing to app stores
5. Waiting for users to update

This process takes days/weeks and leaves users with broken functionality during the transition.

## Solution: Remote Key Rotation via Firebase Remote Config

Use Firebase Remote Config to store and update API keys remotely, allowing instant key rotation without app updates.

## Current State Analysis

### Exposed API Key
- **Key**: `EXPO_PUBLIC_GEMINI_API_KEY`
- **Usage**: Used in multiple places:
  - `GeminiService.ts` - Main service for Gemini API calls
  - `RecAIpeSpark.tsx` - Direct API calls for recipe generation
  - `MinuteMinderSpark.tsx` - Schedule scanning
  - `SpeakSpark.tsx` - Voice command parsing
  - `AudioTranscriptionService.ts` - Audio transcription

### Firebase Setup
- ✅ Firebase Web SDK (`firebase` v12.4.0) already installed
- ✅ Firebase initialized in `WebFirebaseService.ts` and `firebaseConfig.ts`
- ✅ Firestore already configured
- ❌ Remote Config not yet implemented

## Architecture

### Key Resolution Hierarchy

```
1. User Custom Key (if configured) → Highest Priority
2. Firebase Remote Config Key → Remote fallback
3. Environment Variable → Build-time fallback
```

### Flow Diagram

```
┌─────────────────────────────────────────┐
│  App Starts / API Call Needed           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Check User Custom Key (AsyncStorage)   │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │            │
    Found?        Not Found?
        │            │
        ▼            ▼
┌─────────────┐  ┌──────────────────────────┐
│ Use Custom  │  │ Check Remote Config      │
│    Key      │  │ (Firebase Remote Config)  │
└─────────────┘  └──────────┬───────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                Found?          Not Found?
                    │               │
                    ▼               ▼
            ┌──────────────┐  ┌──────────────────┐
            │ Use Remote   │  │ Use Env Variable │
            │ Config Key   │  │ (Fallback)       │
            └──────────────┘  └──────────────────┘
```

## Implementation Plan

### Phase 1: Install Remote Config Package

**Task 1.1**: Install Firebase Remote Config
```bash
npm install firebase
# Already installed, but verify version supports remote-config
```

**Task 1.2**: Verify Firebase Remote Config is available
- Check Firebase Web SDK v12.4.0 supports Remote Config
- If not, upgrade Firebase package

### Phase 2: Create Remote Config Service

**Task 2.1**: Create `src/services/RemoteConfigService.ts`

**Features**:
- Initialize Firebase Remote Config
- Fetch and activate config values
- Cache config locally (Firebase handles this automatically)
- Provide getter methods for API keys
- Handle offline/error scenarios gracefully

**Key Methods**:
```typescript
class RemoteConfigService {
  static async initialize(): Promise<void>
  static async fetchAndActivate(): Promise<boolean>
  static getGeminiApiKey(): string | null
  static async ensureInitialized(): Promise<void>
}
```

**Configuration**:
- Minimum fetch interval: 1 hour (prevents excessive requests)
- Cache expiration: 12 hours
- Default values: Current `EXPO_PUBLIC_GEMINI_API_KEY` as fallback

### Phase 3: Update Gemini Service

**Task 3.1**: Modify `GeminiService.ts`

**Changes**:
- Add `getApiKey()` method implementing key resolution hierarchy
- Update all API call methods to use `getApiKey()`
- Add error handling for missing/invalid keys
- Log which key source is being used (for debugging)

**Key Resolution Logic**:
1. Check AsyncStorage for user custom key
2. Check Remote Config for remote key
3. Fallback to `process.env.EXPO_PUBLIC_GEMINI_API_KEY`
4. Throw error if none available

### Phase 4: Update Direct API Calls

**Task 4.1**: Refactor `RecAIpeSpark.tsx`
- Remove direct `GEMINI_API_KEY` constant
- Use `GeminiService.getApiKey()` or migrate to `GeminiService.generateContent()`

**Task 4.2**: Update `AudioTranscriptionService.ts`
- Use `GeminiService.getApiKey()` instead of direct env access

### Phase 5: Initialize Remote Config on App Start

**Task 5.1**: Update `App.tsx` or initialization point
- Call `RemoteConfigService.initialize()` on app startup
- Fetch config in background (non-blocking)
- Handle initialization errors gracefully

**Task 5.2**: Add periodic refresh
- Refresh Remote Config every 12 hours
- Refresh on app foreground (if config is stale)

### Phase 6: Firebase Console Setup

**Task 6.1**: Configure Remote Config in Firebase Console

**Steps**:
1. Navigate to Firebase Console → Remote Config
2. Add parameter:
   - **Key**: `gemini_api_key`
   - **Data type**: String
   - **Default value**: `<current-exposed-key>` (temporary, will rotate)
   - **Description**: "Gemini API key for AI features. Can be rotated remotely."
3. Set fetch interval: 1 hour minimum
4. Publish configuration

**Task 6.2**: Set up new rotated key
1. Generate new Gemini API key in Google Cloud Console
2. Update `gemini_api_key` in Firebase Remote Config
3. Publish changes
4. All users will receive new key within 1 hour (or on next app open)

### Phase 7: Testing

**Task 7.1**: Local Testing
- [ ] Test with Remote Config disabled (should use env fallback)
- [ ] Test with Remote Config enabled (should use remote key)
- [ ] Test offline behavior (should use cached remote config)
- [ ] Test key rotation (update Remote Config, verify app picks it up)
- [ ] Test all Gemini features: RecAIpe, Minute Minder, Speak Spark, Audio Transcription

**Task 7.2**: Error Scenarios
- [ ] Test with invalid Remote Config key
- [ ] Test with missing Remote Config
- [ ] Test with network failure during fetch
- [ ] Test with expired cache

**Task 7.3**: Performance Testing
- [ ] Verify Remote Config fetch doesn't block app startup
- [ ] Verify API calls work immediately (don't wait for Remote Config)
- [ ] Verify caching works correctly

### Phase 8: Migration & Rollout

**Task 8.1**: Immediate Actions (Emergency Rotation)
1. Generate new Gemini API key
2. Add to Firebase Remote Config as `gemini_api_key`
3. Publish Remote Config
4. Deploy code changes (Phases 1-5)
5. Build and publish app updates (users will get new key via Remote Config)

**Task 8.2**: Gradual Migration
- Keep old key in Remote Config temporarily (for users on old app version)
- New app version uses Remote Config
- Old app version continues using env variable (until users update)

**Task 8.3**: Cleanup (After Migration Complete)
- Remove old exposed key from environment variables
- Update documentation
- Set up monitoring/alerts for key rotation needs

## File Changes Summary

### New Files
- `src/services/RemoteConfigService.ts` - Remote Config management

### Modified Files
- `src/services/GeminiService.ts` - Add key resolution logic
- `src/sparks/RecAIpeSpark.tsx` - Use GeminiService instead of direct API calls
- `src/services/AudioTranscriptionService.ts` - Use GeminiService.getApiKey()
- `App.tsx` or initialization point - Initialize Remote Config on startup

### Configuration Files
- Firebase Console - Add Remote Config parameter

## Security Considerations

### ✅ Best Practices
- Remote Config keys are still exposed to clients (same as env vars)
- This is acceptable for API keys (they're meant to be client-side)
- Remote rotation allows quick response to exposure

### ⚠️ Important Notes
- **Don't** log full API keys in console
- **Don't** send keys to analytics
- **Do** monitor API usage for abuse
- **Do** set up rate limiting on API keys
- **Do** rotate keys regularly as preventive measure

### 🔒 Future Enhancements
- Consider backend proxy for API calls (keys never exposed)
- Implement usage quotas per user
- Add key rotation alerts/monitoring

## Rollback Plan

If Remote Config causes issues:

1. **Immediate**: Update Firebase Remote Config with working key
2. **Short-term**: Revert code changes, rebuild with new env var
3. **Long-term**: Fix Remote Config issues, re-deploy

## Monitoring & Alerts

### Recommended Monitoring
- Remote Config fetch success rate
- API key usage/errors
- Failed API calls (may indicate key issues)
- App version distribution (to know when old versions are phased out)

### Alerts to Set Up
- Remote Config fetch failures > 5%
- API quota exceeded errors
- Unusual API usage patterns

## Timeline Estimate

- **Phase 1-2** (Remote Config Service): 2-3 hours
- **Phase 3-4** (Update Services): 2-3 hours
- **Phase 5** (App Initialization): 1 hour
- **Phase 6** (Firebase Setup): 30 minutes
- **Phase 7** (Testing): 2-3 hours
- **Phase 8** (Deployment): 1-2 hours

**Total**: ~10-15 hours of development + testing

## Success Criteria

✅ App can fetch API key from Remote Config  
✅ Key rotation works without app update  
✅ All Gemini features work with Remote Config key  
✅ Graceful fallback to env variable if Remote Config fails  
✅ No performance degradation  
✅ Works offline (uses cached config)  

## Next Steps

1. **Immediate**: Generate new API key and add to Remote Config
2. **This Week**: Implement Remote Config service and update code
3. **This Week**: Test thoroughly
4. **Next Week**: Deploy app updates
5. **Ongoing**: Monitor and rotate keys proactively

## References

- [Firebase Remote Config Documentation](https://firebase.google.com/docs/remote-config)
- [Firebase Web SDK Remote Config](https://firebase.google.com/docs/reference/js/remote-config)
- Existing plan: `CONTEXT/GENERAL/GEMINI.md` (similar approach for user custom keys)

---

**Status**: Ready for Implementation  
**Priority**: High (Security Issue)  
**Created**: 2025-01-27  
**Owner**: Matt Dyor

