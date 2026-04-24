# Golf Sparks Plan — Publishing a Golf-Only Variant from the Shared Codebase

**Purpose**: Define how to ship a second app, **Golf Sparks**, that contains only the golf-category sparks, while continuing to develop and publish the full **Sparks** app from the same codebase.

**Status**: Proposal (not started)

**Last Updated**: 2026-04-23

---

## 🎯 Goal

Produce two separately-published apps from one source tree:

| | Full Sparks (today) | Golf Sparks (new) |
|---|---|---|
| App name | Sparks | Golf Sparks |
| Bundle ID (iOS) | `com.mattdyor.sparks` | `com.dyor.golfsparks` |
| Package (Android) | `com.mattdyor.sparks` | `com.dyor.golfsparks` |
| EAS projectId | `18230acd-…209c7` | `78f77b31-8f3c-4c6e-9821-918e51bd817b` |
| Firebase project | `sparks-app` (existing) | **same project, same plist/json** — see V1 Firebase note below |
| Contents | all ~40 sparks | golf-category sparks only |
| Icon / splash | current | new golf-themed assets |
| Store listings | App Store + Play | separate App Store + Play listings |

Design constraints:
- One git repo, one source tree, no fork. Both variants build from `main`.
- Zero duplication of spark code. Golf Sparks is a **filtered view** of the same registry.
- Adding a new golf spark should require only registry/metadata work — no variant-specific edits.
- Non-golf sparks should not ship in the Golf Sparks binary (app size + App Store review surface area).
- Keep both apps' data isolated (different bundle IDs → different `AsyncStorage` sandboxes → no cross-contamination).

---

## 📋 The Golf Subset

The canonical source of truth is `sparkMetadata.ts`. A spark is in the Golf variant if **either**:

- its primary `category: "golf"` (the spark is fundamentally about golf), OR
- its optional `secondaryCategory: "golf"` (the spark's primary use lives elsewhere but it's also useful to golfers)

Today's set:

**Primary `category: "golf"` (8) — the headline golf experiences:**

| id | title | iOS | Android | Notes |
|---|---|---|---|---|
| `tee-time-timer` | Tee Time Timer | ✅ | ✅ | |
| `golfWisdom` | Golf Wisdom | ✅ | ✅ | uses `golfWisdomService`, `GolfWisdomNotificationService` |
| `skins` | Skins | ✅ | ✅ | |
| `scorecard` | Scorecard | ✅ | ✅ | |
| `tripod-spark` | The Wolverine | ✅ | ✅ | tripod product spark |
| `share-golf-sparks` | Share Golf Sparks | ✅ | ✅ | promotion spark; URLs/QRs currently still point at Sparks (see note below) |
| `golf-brain` | Golf Brain | ✅ | ❌ | currently iOS-only in registry |
| `record-swing` | Record Swing (Beta) | ✅ | ❌ | currently iOS-only, uses `expo-speech-recognition`, `expo-video` |

**Note on `share-golf-sparks`**: cloned from `share-sparks` with golf-themed copy and ⛳️ icon. All App Store / Play Store / web URLs and the QR images still point at the existing Sparks app, on purpose — once Golf Sparks publishes (Phase 4), swap those four touch points (`apps.apple.com/...`, `play.google.com/...`, `sparks.febak.com/...`, and the two QR PNGs) to the Golf Sparks listings. It currently appears in **both** Sparks and Golf Sparks variants since it's primary `category: "golf"` and we don't yet exclude golf sparks from the full variant; if that becomes undesirable, we'd add an `excludeFromFull` opt-out or invert the variant filter logic.

**`secondaryCategory: "golf"` (7) — useful adjacencies (not seeded into My Sparks by default; user opts in via Marketplace):**

| id | title | Primary category | Why golf-relevant |
|---|---|---|---|
| `todo` | Todo List | productivity | pre-round prep checklists, gear |
| `minute-minder` | Minute Minder | productivity | range-session timing, stretch routines |
| `trip-story` | TripStory | travel | golf-trip recaps |
| `short-saver` | Short Saver | media | save swing tips / coaching YouTubes |
| `goal-tracker` | Goal Tracker | productivity | season goals, handicap targets |
| `coming-up` | Coming Up | utility | tournament dates, member-guest |
| `card-score` | Score Keeper | utility | post-round Wolf/Skins side games at the bar |

**Decision needed**: do we keep `golf-brain` and `record-swing` iOS-only in the Golf app, or invest in Android support for these? Recommend shipping Golf v1 with the same iOS/Android matrix as today and treat Android parity as a separate effort.

---

## 🏗 Architecture: build-time variant flag

Pick **single-variable, build-time flag** over other approaches because:

- **No runtime cost** — filtered registry is baked into the bundle.
- **App size stays small** — unused sparks are tree-shakeable from the filtered registry.
- **Cleanest store story** — two bundle IDs, two listings, two sets of reviews.
- **No monorepo refactor** — keeps current layout; only touches config and the registry.

The flag: `EXPO_PUBLIC_APP_VARIANT=full | golf` (default `full`).

Six things read it:
1. `app.config.ts` — app name, slug, bundle ID, icon, splash, Firebase file, EAS projectId.
2. `eas.json` — new `*-golf` profiles set the env var.
3. `src/variants/variantConfig.ts` — single source of truth for what the running app is allowed to show.
4. `sparkRegistryData.tsx` — filters the registry against `variantConfig.allowedSparkIds`.
5. `package.json` scripts — `ios:golf`, `android:golf`, `build:ios:golf`, etc.
6. `MarketplaceScreen.tsx` — hides category pills + the "All Sparks" subheader (and everything above it) in the `golf` variant, since those affordances are meaningless with a single category. Details in Phase 1b.

Everything else downstream (`SparkSelectionScreen`, `SparkStatsSpark`, `sparkStore`) already calls `getAllSparks()` / `sparkRegistry` — they don't need to know a variant exists.

---

## 🧩 Implementation Phases

### Phase 0 — Decisions (before touching code)

- [x] Bundle ID: `com.dyor.golfsparks` (iOS + Android)
- [x] EAS projectId: `78f77b31-8f3c-4c6e-9821-918e51bd817b` (`eas init --id 78f77b31-8f3c-4c6e-9821-918e51bd817b`)
- [x] App Store Connect / Play Console apps: separate (required by distinct bundle ID)
- [x] Privacy policy: shared (keep current)
- [x] Firebase: **same project, same plist/json** for V1. The codebase routes all Firestore/Analytics calls through `WebFirebaseService` (see `ServiceFactory.ts:32` — `isNativeFirebaseAvailable = false` with comment "All Firestore operations use the Firebase Web SDK"). The Web SDK reads its config from `EXPO_PUBLIC_FIREBASE_*` env vars, **not** from the bundled `GoogleService-Info.plist`. Reusing the existing plist means `[FIRApp configure]` will log a bundle-ID-mismatch warning at startup but is otherwise functionally inert — Golf Wisdom reads, SparkStats writes, etc. all flow through the web SDK and work unchanged. Defer creating new Firebase app entries until we actually need native Firebase features.
- [x] Assets: golf icon (`assets/icon-golf.png`, 1024×1024), adaptive icon (`assets/adaptive-icon-golf.png`, 1024×1024), splash (`assets/splash-icon-golf.png`, 2048×2048), favicon (`assets/favicon-golf.png`, 64×64). Source: `assets/Gemini_Generated_Image_c6a2cgc6a2cgc6a2.png` (2048×2048 square stick-figure golfer with lightning).
   - **Asset path gotcha**: keep variant assets as siblings of the existing ones (e.g. `assets/icon-golf.png`), not in a nested `assets/variants/golf/` subdirectory. Expo's asset resolver expects each declared image's parent directory to contain the project's `package.json` walk path; nesting one level deeper triggers `ConfigError: The expected package.json path: …/variants/golf/package.json does not exist`.

### Phase 1 — Introduce the variant flag without shipping anything

Goal: land the scaffolding behind the default `full` variant so nothing changes for the current app.

- [ ] Add `secondaryCategory?: 'golf'` to `SparkMetadata` in `src/types/spark.ts`. Tagging a spark with this opts it into the Golf variant without changing its primary category (which still drives Discover-page grouping in the full variant).
- [ ] Create `src/variants/variantConfig.ts`:
  ```ts
  import Constants from 'expo-constants';
  import { sparkMetadata } from '../components/sparkMetadata';

  export type AppVariant = 'full' | 'golf';

  export const variant: AppVariant =
    (process.env.EXPO_PUBLIC_APP_VARIANT as AppVariant) ||
    (Constants.expoConfig?.extra?.variant as AppVariant) ||
    'full';

  // Golf Sparks includes any spark whose primary category is "golf" OR whose
  // optional secondaryCategory is "golf".
  const golfIds = Object.values(sparkMetadata)
    .filter(m => m.category === 'golf' || m.secondaryCategory === 'golf')
    .map(m => m.id);

  export const allowedSparkIds: ReadonlySet<string> | null =
    variant === 'golf' ? new Set(golfIds) : null; // null = allow all

  export const isAllowed = (id: string) =>
    allowedSparkIds === null || allowedSparkIds.has(id);
  ```
- [ ] In `src/components/sparkRegistryData.tsx`, wrap the exported `sparkRegistry` with a filter:
  ```ts
  import { isAllowed } from '../variants/variantConfig';
  const rawRegistry: Record<string, BaseSpark> = { /* …existing… */ };
  export const sparkRegistry = Object.fromEntries(
    Object.entries(rawRegistry).filter(([id]) => isAllowed(id))
  );
  ```
  Keep the existing Platform-gated spreads for `golf-brain`/`record-swing`/`video` intact — those are an orthogonal axis.
- [ ] Add `EXPO_PUBLIC_APP_VARIANT=full` to existing EAS profiles' `env` so the flag is always explicit.
- [ ] Run `npm test` + iOS smoke test: registry unchanged, all ~40 sparks still present.
- [ ] Commit: `feat: add variant scaffolding (full-only, no behavior change)`

### Phase 1b — Trim Discover Sparks for the Golf variant

The Discover Sparks page (`src/screens/MarketplaceScreen.tsx`) renders, top-to-bottom:
header → New Sparks grid → Top Rated grid → Property pills → Category pills → "All Sparks" subheader → alphabetical grid. In the Golf variant most of these either collapse to the same content or filter on a single value, so hide "All Sparks" and everything above it. Keep the page header and the alphabetical grid.

- [ ] In `MarketplaceScreen.tsx`, import `variant` from `src/variants/variantConfig.ts` and derive `const showDiscoverChrome = variant !== 'golf';`.
- [ ] Wrap these blocks with `{showDiscoverChrome && ( … )}`:
  - New Sparks section (currently lines 121–151)
  - Top Rated section (currently lines 153–189)
  - Property Filter Pills (currently lines 193–214)
  - Category Filter Pills (currently lines 216–235)
  - "All Sparks" subheader (currently lines 237–240) — keep the grid that follows
- [ ] Leave `<Text style={styles.title}>Discover Sparks</Text>` + subtitle in place as the page header. The alphabetical grid of golf sparks immediately follows.
- [ ] Verify: with `EXPO_PUBLIC_APP_VARIANT=full`, the page is visually unchanged. With `golf`, only header + grid render.
- [ ] Commit: `feat(marketplace): collapse Discover UI for golf variant`

**Note**: the grid displays `allSparksAlphabetical` which is derived from `allSparks = getAllSparks()`. Because Phase 1's registry filter already excludes non-golf sparks from `getAllSparks()`, the grid will contain exactly the golf subset with no extra filtering here.

### Phase 1c — Seed default My Sparks for the Golf variant

The home screen ("My Sparks") is driven by `sparkStore.userSparkIds` (initial value `[]` at `sparkStore.ts:67`). A fresh install of Sparks lands on an empty home; the user discovers and adds sparks from the Marketplace. For Golf Sparks we want a non-empty first-run home featuring the flagship trio — **Golf Brain**, **Record Swing**, **Tee Time Timer** — so the app feels populated the moment it opens.

Because Zustand's `persist` middleware rehydrates from AsyncStorage on re-launches, changing the store's initial value only affects installs with no persisted state (= first install, or after a data reset). Existing users' custom "My Sparks" ordering is preserved.

- [ ] In `src/store/sparkStore.ts`, import `variant` from `../variants/variantConfig.ts`.
- [ ] Replace the literal `userSparkIds: []` initial value with:
  ```ts
  const GOLF_DEFAULT_SPARKS = ['golf-brain', 'record-swing', 'tee-time-timer'];
  // ...
  userSparkIds: variant === 'golf' ? [...GOLF_DEFAULT_SPARKS] : [],
  ```
- [ ] Keep the order in `GOLF_DEFAULT_SPARKS` intentional — it's the display order on the home screen. Current pick: Golf Brain (round tracking), Record Swing (video), Tee Time Timer (pre-round prep).
- [ ] Verify first-install seeding: `npm run ios:golf`, fully delete the app from the simulator (`xcrun simctl uninstall booted com.mattdyor.golfsparks`), reinstall. Home should show the three sparks in order.
- [ ] Verify preservation: install, remove one of the three from My Sparks, kill and relaunch → removal persists (store wasn't re-seeded).
- [ ] Commit: `feat(store): seed golf variant My Sparks with golf-brain, record-swing, tee-time-timer`

**Open question — existing Golf Sparks users after an update.** If Golf Sparks is already shipped and a user has an empty `userSparkIds`, they'll stay empty; the seed only fires on *fresh* installs. If we want to retro-seed, we'd need a migration step (e.g., bump a schema version in the store and re-seed on upgrade). For v1 this is probably fine — users with empty collections explicitly cleared them.

**Why these three, not all seven?** Leaving Golf Wisdom, Skins, Scorecard, and card-score out of the default keeps the home uncluttered and invites discovery from the Marketplace grid (Phase 1b leaves that intact). Revisit after user feedback — the constant is trivial to edit.

### Phase 2 — Dynamic app config

Add an `app.config.ts` that **keeps `app.json` as the base** (Expo passes its contents in via `ConfigContext.config`) and overlays only the golf-variant overrides. Avoids translating 150+ lines of permissions/plugins/infoPlist into TS.

When variant is `full`, the config returns `app.json` essentially unchanged. When `golf`, it overrides name, slug, bundle ID, package, EAS projectId, icons, Firebase files, description, and keywords — leaving plugins, permissions, and infoPlist untouched.

For files that may not exist yet (golf assets, golf-bundle-ID Firebase plist/json), the config does an `fs.existsSync` check and falls back to the Sparks files. This lets `npm run ios:golf` build immediately with placeholder branding, and seamlessly upgrade once the proper files land.

- [ ] Create `app.config.ts` at repo root (Expo prefers `.ts`/`.js` over `.json` when both exist):
  ```ts
  import { ExpoConfig, ConfigContext } from 'expo/config';
  import * as fs from 'fs';
  import * as path from 'path';

  const variant = (process.env.EXPO_PUBLIC_APP_VARIANT || 'full') as 'full' | 'golf';
  const isGolf = variant === 'golf';

  const fileExists = (p: string) => fs.existsSync(path.resolve(__dirname, p));
  const pickFile = (preferred: string, fallback: string) =>
    fileExists(preferred) ? preferred : fallback;

  export default ({ config }: ConfigContext): ExpoConfig => {
    if (!isGolf) {
      // Full variant — preserve app.json as-is, only stamp `extra.variant`.
      return {
        ...(config as ExpoConfig),
        extra: { ...(config.extra || {}), variant },
      };
    }

    return {
      ...(config as ExpoConfig),
      name: 'Golf Sparks',
      slug: 'golf-sparks',
      icon: pickFile('./assets/variants/golf/icon.png', './assets/icon.png'),
      splash: {
        ...(config.splash || {}),
        image: pickFile('./assets/variants/golf/splash.png', './assets/splash-icon.png'),
      },
      description: 'Golf utilities — round tracking, skins, swing recording, tee-time prep.',
      keywords: ['golf', 'scorecard', 'skins', 'swing', 'tee time'],
      ios: {
        ...(config.ios || {}),
        bundleIdentifier: 'com.dyor.golfsparks',
        googleServicesFile: pickFile(
          './GoogleService-Info-golf.plist',
          './GoogleService-Info.plist',
        ),
      },
      android: {
        ...(config.android || {}),
        package: 'com.dyor.golfsparks',
        googleServicesFile: pickFile('./google-services-golf.json', './google-services.json'),
        adaptiveIcon: {
          ...(config.android?.adaptiveIcon || { backgroundColor: '#ffffff' }),
          foregroundImage: pickFile(
            './assets/variants/golf/adaptive-icon.png',
            './assets/adaptive-icon.png',
          ),
        },
      },
      web: {
        ...(config.web || {}),
        favicon: pickFile('./assets/variants/golf/favicon.png', './assets/favicon.png'),
      },
      extra: {
        ...(config.extra || {}),
        eas: { projectId: '78f77b31-8f3c-4c6e-9821-918e51bd817b' },
        variant,
      },
    };
  };
  ```
- [ ] Keep `app.json` — do not delete. It remains the source of truth for the full variant's shared values (permissions, plugins, infoPlist, version, etc.).
- [ ] Smoke test full: `npm run ios` (or just `npx expo prebuild --no-install`) — name, icon, bundleId unchanged from before. iOS plist still has the same `CFBundleIdentifier`.
- [ ] Smoke test golf with placeholder assets: `EXPO_PUBLIC_APP_VARIANT=golf npx expo prebuild --no-install --platform ios` (or the new `npm run ios:golf` from Phase 3) — name "Golf Sparks", bundle ID `com.dyor.golfsparks`, falls back to Sparks icon/plist with a console note.
- [ ] Commit: `feat: dynamic app config keyed on EXPO_PUBLIC_APP_VARIANT`

**Note — Firebase bundle-ID mismatch is harmless in V1.** The existing Sparks plist stays in place permanently for V1. `[FIRApp configure]` will log a bundle-ID-mismatch warning at startup, but the codebase doesn't use any native Firebase APIs — every Firestore/Analytics call is routed through `WebFirebaseService` which reads `EXPO_PUBLIC_FIREBASE_*` env vars and bypasses the plist entirely. If we later need native Firebase features (Crashlytics, push via FCM, etc.), drop a new plist named `GoogleService-Info-golf.plist` at the repo root — the `pickFile` fallback in `app.config.ts` will pick it up automatically.

### Phase 3 — EAS + local run scripts for the Golf variant

- [ ] Add Golf profiles to `eas.json`:
  ```json
  "development-golf": {
    "extends": "development",
    "env": { "EXPO_PUBLIC_APP_VARIANT": "golf" }
  },
  "preview-golf": {
    "extends": "preview",
    "env": { "EXPO_PUBLIC_APP_VARIANT": "golf" }
  },
  "production-golf": {
    "extends": "production",
    "env": { "EXPO_PUBLIC_APP_VARIANT": "golf", "NODE_ENV": "production" }
  }
  ```
  (EAS supports `extends` — if not, duplicate the profile bodies.)
- [ ] Add scripts to `package.json`:
  ```json
  "ios:golf": "EXPO_PUBLIC_APP_VARIANT=golf expo run:ios",
  "android:golf": "EXPO_PUBLIC_APP_VARIANT=golf expo run:android",
  "start:golf": "EXPO_PUBLIC_APP_VARIANT=golf expo start",
  "build:ios:golf": "npx eas-cli build --platform ios --profile production-golf",
  "build:android:golf": "npx eas-cli build --platform android --profile production-golf",
  "submit:ios:golf": "npx eas-cli submit --platform ios --profile production-golf",
  "submit:android:golf": "npx eas-cli submit --platform android --profile production-golf"
  ```
- [ ] Sanity check: `npm run ios:golf` installs a *second* app on the simulator (different bundle ID), with the name **Golf Sparks** and only the six golf sparks visible.
- [ ] Commit: `feat: EAS + script wiring for Golf Sparks variant`

### Phase 4 — Apple + Google Console onboarding (required for device builds & shipping)

V1 development happens entirely on the iOS simulator (see Phase 4a below) — no Apple Console work is needed for that. This phase is the paperwork required before the Golf Sparks build can be installed on a physical device or submitted to TestFlight / Play Store.

Firebase work is intentionally **not** part of this phase — see Phase 0's Firebase note for why.

**Apple Developer Console (apple.com/developer):**
- [ ] Register App ID `com.dyor.golfsparks` (Identifiers → App IDs → +)
- [ ] Enable capabilities on the new App ID:
  - Sign In with Apple (matches `usesAppleSignIn: true` from `app.json`)
  - Push Notifications (matches `expo-notifications` plugin's APNS entitlement)
  - App Groups
- [ ] Create App Group `group.com.dyor.golfsparks.screen-recorder` (Identifiers → App Groups → +). The BroadcastExtension target in `ios/Sparks.xcodeproj` references `group.com.mattdyor.sparks.screen-recorder` — that string is hardcoded in `Sparks.entitlements` and `BroadcastExtension.entitlements` for the Sparks bundle. For Golf Sparks we need either:
  - **(recommended)** an Expo config plugin that rewrites the App Group identifier per variant, OR
  - hand-edit the entitlements files post-prebuild for golf builds (brittle), OR
  - drop the BroadcastExtension entirely from the golf variant if screen recording isn't a V1 golf feature
- [ ] Add the new App Group to the App ID's App Groups capability config
- [ ] Create / regenerate provisioning profile that includes all three capabilities + the new App Group
- [ ] Refresh Xcode signing (`Sparks` target → Signing & Capabilities → Team → Automatically manage signing should pick up the regenerated profile)

**App Store Connect:**
- [ ] Create new app for `com.dyor.golfsparks` (My Apps → +)
- [ ] Run TestFlight internal test with the `production-golf` build (`npm run build:ios:golf` then `npm run submit:ios:golf`)

**Google Play Console:**
- [ ] Create new app for `com.dyor.golfsparks`
- [ ] Internal testing track for `production-golf` builds

**Privacy policy:** Phase 0 already decided to keep the existing Sparks privacy policy URL.

### Phase 4a — V1 simulator-only path (no Apple Console required)

Until Phase 4 is complete, work happens on the iOS simulator. The simulator does not validate provisioning profiles or entitlements, so the App Groups / Push Notifications / Sign In with Apple errors that block device builds are bypassed.

- [x] `npm run ios:golf` from the project root builds and installs Golf Sparks on the booted simulator
- [ ] Sanity-check: only the 14 golf sparks (8 primary + 6 secondary, since `record-swing` is iOS) appear in Marketplace; My Sparks home shows the seeded trio
- [ ] Bundle ID `com.dyor.golfsparks` confirmed in `xcrun simctl listapps booted | grep golfsparks`
- [ ] Firebase: open Golf Wisdom and SparkStats — both should work (they use the web SDK and are unaffected by the bundle-ID mismatch warning in console)

**Known limitation in V1:** physical-device deploys (`xcodebuild -destination id=<device-udid>`) will fail with provisioning-profile errors. EAS device installs (`build:ios:golf` profile development-golf) likewise fail until Phase 4. Stay on simulator until Apple Console work lands.

### Phase 5 — Trim the binary (optional but worth it)

The registry filter hides non-golf sparks at runtime, but the code still ships in the bundle. To shrink the Golf app:

- [ ] Convert the non-golf imports in `sparkRegistryData.tsx` to lazy `require()` inside a variant-gated block (same pattern already used for `golf-brain`/`record-swing`/`video` on Android). Under Metro, inline `require()`s inside a conditional branch are not bundled when the branch is provably dead.
- [ ] Verify with `npx expo export --platform ios --dev false` and inspect bundle size before/after.
- [ ] Also consider: plugins in `app.config.ts` that only non-golf sparks need (e.g. `expo-apple-authentication` if nothing in the golf subset uses sign-in) can be omitted for `golf` — this reduces native build size too. Audit each plugin against the six sparks before removing.

---

## 🧪 Testing Strategy

Adapt `TESTPLAN.md`'s Level 1/2/3 model per variant.

### Per-commit (any change)
- [ ] `npm test` — unchanged
- [ ] `npm run ios` — full variant, smoke
- [ ] `npm run ios:golf` — golf variant, confirm only 6 sparks appear

### Per golf-only change
- [ ] `npm run ios:golf` and `npm run android:golf`
- [ ] All 7 golf sparks open, persist data, match current iOS/Android support matrix
- [ ] Discover Sparks page shows only the page header + the alphabetical grid — no New/Top Rated sections, no category or property pills, no "All Sparks" subheader
- [ ] Fresh install (simulator uninstall → reinstall) shows Golf Brain, Record Swing, Tee Time Timer on the home screen in that order; removing one persists across relaunch

### Before publishing Golf Sparks
- [ ] TestFlight / internal track install on real devices
- [ ] Confirm icon, splash, app name, about page all say "Golf Sparks"
- [ ] Privacy policy link resolves
- [ ] Push notifications fire from the *new* Firebase project, not the old one
- [ ] No stray references to non-golf sparks (e.g. SparkStatsSpark aggregating over hidden sparks)

### Regression for the full app
- [ ] After every Phase-1/2/3 change, run the existing `TESTPLAN.md` Level 1 smoke on the full variant. The variant work should be invisible there.

---

## 🔄 Adding a new spark after launch

The common case — adding a new non-golf spark — should require **zero** variant-specific work:

1. Add `sparkMetadata` entry with its normal category (e.g. `productivity`).
2. Add to `rawSparkRegistry` in `sparkRegistryData.tsx`.
3. Build both variants. Golf Sparks silently excludes it because neither `category` nor `secondaryCategory` is `"golf"`.

Adding a new **headliner golf** spark (lives in the golf section of Discover in the full variant):

1. Same three steps, with `category: "golf"`.
2. It appears in Golf Sparks automatically.

**Including an existing spark in Golf without changing its primary category**:

1. Add `secondaryCategory: "golf"` to its `sparkMetadata` entry. That's it — no registry edits, no variant-specific list to maintain.

This is how the cross-over sparks (todo, minute-minder, trip-story, short-saver, goal-tracker, coming-up, card-score) make it into Golf Sparks without leaving their natural categories in the full app.

---

## ⚠️ Risks & Open Questions

1. **Shared store state**. If two golf sparks share state via `sparkStore`, that continues to work. But if any spark references a hidden spark by ID (e.g. `SparkStatsSpark` aggregating over `flashcards`), it will silently skip the missing entry in the golf build. Audit consumers of `getSparkById` for hard-coded IDs — if any hit a non-golf id, the golf build gets a `undefined`. Existing iOS-Android gating already has this property, so the code should be robust, but worth grepping.
2. **Shared version number**. Phase 2 keeps `version` shared. That simplifies releases but means every Golf release bumps when Sparks bumps. If golf ships on a different cadence, add `version` and `buildNumber` / `versionCode` to the variant branch in `app.config.ts`. Recommend staying shared initially.
3. **Shared Firebase project + reused plist**. Both apps point at the same Firebase project AND share the same `GoogleService-Info.plist` / `google-services.json` (no new app entries inside Firebase for V1). Works because the codebase only uses the Firebase **Web SDK** via `WebFirebaseService`, which reads `EXPO_PUBLIC_FIREBASE_*` env vars and ignores the bundled plist. The native `[FIRApp configure]` will log a bundle-ID-mismatch warning at startup but is otherwise inert. Pros: zero Firebase ops work for V1; shared Firestore/Auth/Remote Config across both apps. Cons: web-SDK Analytics events from Golf Sparks land in the Sparks Analytics dashboard with no easy way to filter; if we ever add native Firebase features (Crashlytics, FCM), we'll need to register the new bundle ID in Firebase Console and drop a new plist named `GoogleService-Info-golf.plist` (the `pickFile` in `app.config.ts` is already wired to pick it up).
4. **Apple App Group is hardcoded to the Sparks bundle ID.** `Sparks.entitlements` references `group.com.mattdyor.sparks.screen-recorder` — required by the BroadcastExtension target for screen recording (used by the Wolverine tripod-spark). Device builds of Golf Sparks fail until either we (a) create a per-variant App Group via an Expo config plugin, (b) hand-edit the entitlements file post-prebuild, or (c) drop the BroadcastExtension from the golf variant. Tracked in Phase 4. Simulator builds bypass entitlement checks so V1 dev is unaffected.
4. **App Store review**. Apple may reject Golf Sparks as "minimum viable content" if only 3 of the 6 are substantive. Worth reviewing 4.2 / 4.3 guidelines before submission. Mitigation: ensure at least 3 golf sparks are polished + shippable (scorecard, skins, golf-wisdom are strong candidates).
5. **`expo-apple-authentication` and other per-spark plugins**. Plugins in `app.config.ts` are applied to every build. Non-golf-relevant plugins inflate the golf binary. Phase 5 addresses this but needs per-plugin audit.
6. **Shared patches**. `patches/` applies to `node_modules` regardless of variant. Confirm none of the patched modules is non-golf-only — if one is only used by (say) `SpanishReaderSpark`, the patch is dead weight in Golf Sparks but harmless.
7. **Codegen / new-arch**. New Architecture is enabled. Confirm the filtered registry doesn't change which Turbo Modules are expected (it shouldn't — module registration is native-side and only depends on installed pods, not JS imports).

---

## ✅ Definition of Done

**V1 (simulator only):**
- [x] `npm run ios:golf` builds, installs as a second app on the simulator, shows only golf sparks
- [ ] My Sparks home seeded with Golf Brain / Record Swing / Tee Time Timer on first install
- [ ] Marketplace displays the 14-spark golf subset (no chrome, just header + grid)
- [ ] Golf Wisdom + SparkStats work via the web Firebase SDK despite bundle-ID-mismatch warning
- [ ] `TESTPLAN.md` Level 1 smoke still passes for the full variant, unchanged
- [ ] A new non-golf spark added after this work ships in Sparks without any Golf-Sparks-side change
- [ ] A new golf spark added after this work ships in **both** apps without registry duplication

**V1.1 (device + ship) — blocked on Phase 4:**
- [ ] `npm run build:ios:golf` produces an IPA that uploads to App Store Connect under `com.dyor.golfsparks`
- [ ] Same for Android via `build:android:golf`
- [ ] TestFlight internal install on a physical device

---

## 📅 Rough Effort Estimate

| Phase | Estimate | Status / Blocking? |
|---|---|---|
| 0 — Decisions | ½ day | ✅ done (Firebase deferred for V1) |
| 1 — Variant scaffolding | 2–3 hours | ✅ done |
| 1b — Discover Sparks UI trim | 30 min | ✅ done |
| 1c — Seed default My Sparks | 30 min | ✅ done |
| 2 — Dynamic app config | 3–4 hours | ✅ done |
| 3 — EAS + scripts + local verify | 2–3 hours | ✅ done |
| 4 — Apple + Play Console onboarding | 1–2 days (Apple review + capability config) | ⏳ user — required for device & ship |
| 4a — V1 simulator smoke | < 1 hour | 🟡 user — `npm run ios:golf` |
| 5 — Binary trimming | ½ day | optional, defer |

Engineering remaining (V1 simulator): ~0 — code is in place; just run `npm run ios:golf`.
Calendar to first TestFlight: ~1 week from Apple Console kickoff (Phase 4 dominates).
