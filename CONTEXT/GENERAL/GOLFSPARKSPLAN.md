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
| Firebase project | `sparks-app` (existing) | **same project** — new iOS+Android app entries within it for the new bundle ID |
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

The canonical source of truth is `sparkMetadata.ts` — any entry with `category: "golf"` is in. Today that is:

| id | title | iOS | Android | Notes |
|---|---|---|---|---|
| `tee-time-timer` | Tee Time Timer | ✅ | ✅ | |
| `golfWisdom` | Golf Wisdom | ✅ | ✅ | uses `golfWisdomService`, `GolfWisdomNotificationService` |
| `skins` | Skins | ✅ | ✅ | |
| `scorecard` | Scorecard | ✅ | ✅ | |
| `golf-brain` | Golf Brain | ✅ | ❌ | currently iOS-only in registry |
| `record-swing` | Record Swing (Beta) | ✅ | ❌ | currently iOS-only, uses `expo-speech-recognition`, `expo-video` |

**Decision needed**: do we keep `golf-brain` and `record-swing` iOS-only in the Golf app, or invest in Android support for these? Recommend shipping Golf v1 with the same iOS/Android matrix as today and treat Android parity as a separate effort.

**Non-golf sparks categorized in a golf-adjacent way**: `card-score` (`utility`) is not in the golf category despite plausible golfer use. Include it in the Golf Sparks app.

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
- [x] Firebase: **same project** as Sparks. Need to register a new iOS app and a new Android app within the existing Firebase project (each requires the new bundle ID `com.dyor.golfsparks`); this lets Golf Sparks share Firestore/Auth/Remote Config but get its own bundle-ID-matched plist/json.
- [ ] Assets: commission/design golf icon, splash, adaptive icon, favicon (`assets/variants/golf/`) — in progress; Phase 2 below falls back to existing Sparks assets until these land.

### Phase 1 — Introduce the variant flag without shipping anything

Goal: land the scaffolding behind the default `full` variant so nothing changes for the current app.

- [ ] Create `src/variants/variantConfig.ts`:
  ```ts
  import Constants from 'expo-constants';
  import { sparkMetadata } from '../components/sparkMetadata';

  export type AppVariant = 'full' | 'golf';

  export const variant: AppVariant =
    (process.env.EXPO_PUBLIC_APP_VARIANT as AppVariant) ||
    (Constants.expoConfig?.extra?.variant as AppVariant) ||
    'full';

  const golfIds = Object.values(sparkMetadata)
    .filter(m => m.category === 'golf')
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

**Caveat — Firebase bundle-ID mismatch during placeholder period.** Until the new `GoogleService-Info-golf.plist` is downloaded from Firebase Console, the golf build uses the Sparks plist whose `BUNDLE_ID` is `com.mattdyor.sparks` — but the actual app bundle ID is `com.dyor.golfsparks`. `[FIRApp configure]` will warn and may refuse to initialize Analytics / Crashlytics / Remote Config. App will still launch and JS-only sparks will work, but Firebase-dependent features (notifications, remote config) will be silently broken. Drop the new plist in to fix.

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

### Phase 4 — Firebase + store onboarding

This is paperwork/console work, not code:

- [ ] In the **existing** `sparks-app` Firebase Console project, register a new iOS app with bundle ID `com.dyor.golfsparks` → download plist as `GoogleService-Info-golf.plist` and place at repo root.
- [ ] Same project: register a new Android app with package `com.dyor.golfsparks` → download as `google-services-golf.json` and place at repo root.
- [ ] Verify both files commit (they're not secrets — match repo convention of committing the Sparks plist/json).
- [ ] Create App Store Connect app for `com.dyor.golfsparks`; run TestFlight internal test with the `production-golf` build.
- [ ] Create Play Console app for `com.dyor.golfsparks`; internal testing track.
- [ ] Privacy policy reuse — confirmed in Phase 0 to keep current Sparks privacy policy URL.
- [ ] Remote Config: keys live in the same Firebase project, so they're shared across both apps automatically. If a key should diverge by app, gate by Firebase app ID or set up Remote Config conditions on the bundle ID.

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
2. Add to `rawRegistry` in `sparkRegistryData.tsx`.
3. Build both variants. Golf Sparks silently excludes it because category ≠ `golf`.

Adding a new **golf** spark:

1. Same three steps, with `category: "golf"`.
2. It appears in Golf Sparks automatically.
3. No registry edits to the Golf variant — `variantConfig.ts` derives the allowed set from metadata.

Promoting an existing spark into golf: change its `category` to `"golf"`. No other change.

---

## ⚠️ Risks & Open Questions

1. **Shared store state**. If two golf sparks share state via `sparkStore`, that continues to work. But if any spark references a hidden spark by ID (e.g. `SparkStatsSpark` aggregating over `flashcards`), it will silently skip the missing entry in the golf build. Audit consumers of `getSparkById` for hard-coded IDs — if any hit a non-golf id, the golf build gets a `undefined`. Existing iOS-Android gating already has this property, so the code should be robust, but worth grepping.
2. **Shared version number**. Phase 2 keeps `version` shared. That simplifies releases but means every Golf release bumps when Sparks bumps. If golf ships on a different cadence, add `version` and `buildNumber` / `versionCode` to the variant branch in `app.config.ts`. Recommend staying shared initially.
3. **Shared Firebase project**. Both apps live in the same Firebase project (per Phase 0 decision), with separate iOS/Android app entries for each bundle ID. Pros: shared Firestore data (a user's golf rounds are visible from either app, if they sign in to both), shared Auth users, shared Remote Config. Cons: Analytics events and Crashlytics are also pooled — distinguishing "Sparks crashes" from "Golf Sparks crashes" requires filtering by app ID in dashboards. Accept for v1.
4. **App Store review**. Apple may reject Golf Sparks as "minimum viable content" if only 3 of the 6 are substantive. Worth reviewing 4.2 / 4.3 guidelines before submission. Mitigation: ensure at least 3 golf sparks are polished + shippable (scorecard, skins, golf-wisdom are strong candidates).
5. **`expo-apple-authentication` and other per-spark plugins**. Plugins in `app.config.ts` are applied to every build. Non-golf-relevant plugins inflate the golf binary. Phase 5 addresses this but needs per-plugin audit.
6. **Shared patches**. `patches/` applies to `node_modules` regardless of variant. Confirm none of the patched modules is non-golf-only — if one is only used by (say) `SpanishReaderSpark`, the patch is dead weight in Golf Sparks but harmless.
7. **Codegen / new-arch**. New Architecture is enabled. Confirm the filtered registry doesn't change which Turbo Modules are expected (it shouldn't — module registration is native-side and only depends on installed pods, not JS imports).

---

## ✅ Definition of Done

- [ ] `npm run ios:golf` builds, installs as a second app on the simulator, shows only six golf sparks
- [ ] `npm run build:ios:golf` produces an IPA that uploads to App Store Connect under `com.dyor.golfsparks`
- [ ] Same for Android via `build:android:golf`
- [ ] A new non-golf spark added after this work ships in Sparks without any Golf-Sparks-side change
- [ ] A new golf spark added after this work ships in **both** apps without registry duplication
- [ ] `TESTPLAN.md` Level 1 smoke passes for the full variant, unchanged
- [ ] Golf variant has its own smoke pass documented in this plan's Testing Strategy section

---

## 📅 Rough Effort Estimate

| Phase | Estimate | Blocking? |
|---|---|---|
| 0 — Decisions + console accounts | ½ day | yes (Phase 4) |
| 1 — Variant scaffolding | 2–3 hours | no |
| 1b — Discover Sparks UI trim | 30 min | no |
| 1c — Seed default My Sparks | 30 min | no |
| 2 — Dynamic app config | 3–4 hours | no |
| 3 — EAS + scripts + local verify | 2–3 hours | no |
| 4 — Firebase + store onboarding | 1 day (async review wait) | yes (ship) |
| 5 — Binary trimming | ½ day | no (optional) |

Total engineering: ~1.5–2 days. Total calendar to first TestFlight: ~1 week including Apple review.
