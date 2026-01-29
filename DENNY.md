# 📱 Mobile Optimization Guidelines

> [!IMPORTANT]
> **Mobile First:** Future agents must prioritize the mobile experience (iOS/Android) over Web when modifying this codebase.

## 1. Feature Parity & Optimization

- **Enable Native Features by Default:** Features like `playWithChords` or animations that are performant on modern phones should be **enabled by default**, not restricted to Web.
- **WebView Bridges:** If a Web API (like `OfflineAudioContext` or complex Canvas manipulation) is missing on Native, **implement a WebView bridge** to achieve parity. Do not simply disable the feature on native.
  - *Example:* Audio Export in `SongMakerSpark.tsx` uses a hidden WebView to render `.wav` files because React Native lacks `OfflineAudioContext`.
- **Avoid Web-Only Logic:** Crucial features (Export, Playback, advanced logic) must work on Mobile. If `Platform.OS === 'web'` block exists, the `else` block must implement the equivalent functionality.

## 2. Touch & feedback

- **Haptics:** Always use `HapticFeedback` (`src/utils/haptics.ts`) for interactive elements (drags, toggles, success states).
- **Hit Slop:** Ensure touch targets are at least 44x44 points. Use `hitSlop` on small buttons.
- **Keyboard Handling:** Use `KeyboardAvoidingView` or `KeyboardAwareScrollView` to ensure inputs are not hidden.

## 3. Permissions & Hardware

- **Graceful Requests:** Check and request permissions (Audio, Camera) gracefully.
- **Fallbacks:** Provide UI feedback if permissions are denied.
- **Expo Go Compatibility:** Check `isExpoGo()` if using native modules that might not be supported in the Go client (though prioritize Development Builds for full features).

## 4. Performance

- **Lists:** Use `FlashList` or optimized `FlatList` for long lists.
- **Images:** Use `expo-image` for caching and performance.
- **Memoization:** Use `useMemo` and `useCallback` for expensive render logic to keep UI responsive (60fps).

## 5. Assets

- **Bundling:** Ensure assets are properly imported/required so they are bundled with the native binary.

## 6. WebView Audio & Recording (Android Focus)

- **AudioContext Locking:** Android WebViews block `AudioContext` until a real user gesture occurs.
  - *Fix:* Provide a small "Fix Audio" button or ensure `ctx.resume()` is called inside a `touchstart` listener on the WebView body.
- **Reliable Bridge Messaging:** Different Android versions handle `postMessage` differently. Always add listeners to both:
  - `window.addEventListener('message', ...)`
  - `document.addEventListener('message', ...)`
- **Engine Consolidation:** For complex sound engines (like Synths), move the JS logic **directly into the HTML string** rather than using `injectJavaScript`. This avoids bridge initialization delays.
- **Native Logging:** Always redirect WebView logs for visibility in the native terminal:

  ```javascript
  console.log = (m) => window.ReactNativeWebView.postMessage(JSON.stringify({type: 'LOG', data: m}));
  ```

- **Layout (Empty Screen Fix):** WebViews and long lists on Android often "collapse" if their parent doesn't have an explicit height. Always use `flex: 1` combined with `height: '100%'` or `minHeight` on the main container.

## 7. Versioning

- **Spark Versioning:** Every Spark **MUST** include a version number and display it in its settings screen (e.g., "Version 1.0.0").
- **Incrementing:** Increment the version number whenever you make significant logic changes or add features.
