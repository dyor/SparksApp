# RESOLVEFLICKERINGSPARKERROR

Summary
- Symptom: When opening a Spark (Hangman), the app briefly shows the home screen and then reverts to a blank/white screen (flicker). In some runs, the UI stays blank (render crash).
- Cause: runtime render errors (e.g., undefined Spark component or other exceptions) were causing React to fail to render the Spark. TypeScript compile-time issues and unhandled runtime errors increase probability of failures.

What I observed so far
- I added the `HangmanSpark` component and registered it (`spark-hangman` branch).
- The preview action initially failed due to unsupported Expo flags (`--no-open` / `--non-interactive`) — I patched `scripts/start-web.js` and `.vscode/preview.sh` so Codespaces preview uses our start script and sets `CI=true`.
- The app was flickering/blank. I added an ErrorBoundary wrapper to `SparkScreen` to surface render errors and avoided rendering an undefined `SparkComponent` (fixed `spark` null handling).
- Type checking (`npx tsc --noEmit`) revealed unrelated errors in other files (AnalyticsService, DreamCatcher, tests). These type errors could prevent a clean dev build or hide runtime issues.

Repro steps (recommended for debugging)
1. Start web preview (preferably with watch mode off/CI off while debugging):
   - To see watch mode (and faster dev reloads), run without CI:
     ```bash
     npm run web
     # or
     CI= npm run web
     ```
2. Open the app in the browser and navigate to the `Hangman` spark (I temporarily added `hangman` to user sparks for testing in `App.tsx`).
3. If the screen flickers or goes blank, check both:
   - Browser console (DevTools > Console) for stack trace
   - Terminal where `npm run web` is running (I added global `window.error` and `unhandledrejection` handlers)
4. If the ErrorBoundary displays an error message, copy the message + stack and attach it here.

Short-term mitigations (done)
- Added `SparkErrorBoundary` to `src/screens/SparkScreen.tsx` to show render errors instead of blank screen.
- Fixed the pattern where we used `SparkComponent` before confirming `spark` exists; now we check `if (!spark)` first and show an error message.
- Patched `scripts/start-web.js` and `.vscode/preview.sh` to avoid unsupported flags in Codespaces.

Recommended next steps (priority order)
1. Capture the runtime error stack from the browser console or from terminal logs (this is the most important next step).
2. Run `npx tsc --noEmit` and fix the remaining TypeScript errors (these can block a clean dev experience and hide subtle runtime issues):
   - `src/services/AnalyticsService.ts` (missing variable references `firebaseAnalytics`)
   - `src/services/FriendInvitationNotificationService.ts` (explicit param typing)
   - `src/sparks/DreamCatcherSpark.tsx` (avoid possibly undefined `onCloseSettings` where a function is required)
   - Tests / mocks that don't match `ThemeColors`
3. Add targeted console.debug() lines to `HangmanSpark` render and lifecycle (or try/catch around render-critical code) to identify the failing line (e.g., in constructor, state init, hooks, JSX). Example spots:
   - `useMemo` and `useEffect` bodies
   - any usage of platform-specific modules (e.g., missing expo lib imports)
4. If the error happens immediately on mount, try temporarily replacing `HangmanSpark`'s content with a minimal render to confirm the issue is inside the component vs upstream navigation: 
   - Render a simple placeholder in `HangmanSpark` ("Hello Hangman") and check if flicker stops.
5. Write a tiny unit test or story (if you use Storybook) mounting the `HangmanSpark` to reproduce in isolation.
6. After root cause fix, revert these test-only changes:
   - Remove `addSparkToUser('hangman')` from `App.tsx` (I left it for convenience).
   - Remove temporary debug logs and duplicate checks.

Commands & checks
- Type check:
  ```bash
  npx tsc --noEmit
  ```
- Start web preview (normal):
  ```bash
  npm run web
  ```
- Start with CI mode (non-interactive codespace/pipelines):
  ```bash
  CI=true npm run web
  ```

Notes / Safety
- The ErrorBoundary avoids showing a blank screen but does not fix the underlying error — please attach full stack traces so I can fix the source.
- There were some unrelated TypeScript errors present before the Hangman work; resolving them will make debugging cleaner.

Next actions I can take (pick one)
- I can add temporary try/catch blocks and console.debug in `HangmanSpark` to capture where it fails and report back with a patch.
- I can continue to fix the TypeScript errors so the dev build is clean and easier to debug.
- I can add a minimal isolate test that mounts `HangmanSpark` in jsdom to catch synchronous render errors.

Assigning
- Owner: @you (please confirm) — I can continue working on this branch if you want me to proceed to the root-cause debugging.

---

(End of file)
