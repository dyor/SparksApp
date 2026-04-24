import { ExpoConfig, ConfigContext } from 'expo/config';
import * as fs from 'fs';
import * as path from 'path';

// Phase 2 of CONTEXT/GENERAL/GOLFSPARKSPLAN.md.
//
// `app.json` remains the source of truth for the full Sparks variant — Expo
// passes its contents in via `ConfigContext.config`. This file overlays only
// the golf-variant overrides on top of that base, so we don't have to
// translate 150+ lines of permissions/plugins/infoPlist into TypeScript.
//
// Variant selection is driven by EXPO_PUBLIC_APP_VARIANT (full|golf), set
// per-profile in eas.json and per-script in package.json.

const variant = (process.env.EXPO_PUBLIC_APP_VARIANT || 'full') as 'full' | 'golf';
const isGolf = variant === 'golf';

const fileExists = (p: string): boolean => fs.existsSync(path.resolve(__dirname, p));
const pickFile = (preferred: string, fallback: string): string =>
  fileExists(preferred) ? preferred : fallback;

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!isGolf) {
    return {
      ...(config as ExpoConfig),
      extra: { ...(config.extra || {}), variant },
    };
  }

  return {
    ...(config as ExpoConfig),
    name: 'Golf Sparks',
    slug: 'golf-sparks',
    icon: pickFile('./assets/icon-golf.png', './assets/icon.png'),
    splash: {
      ...(config.splash || {}),
      image: pickFile('./assets/splash-icon-golf.png', './assets/splash-icon.png'),
    },
    description:
      'Golf utilities — round tracking, skins, swing recording, tee-time prep.',
    keywords: ['golf', 'scorecard', 'skins', 'swing', 'tee time'],
    ios: {
      ...(config.ios || {}),
      bundleIdentifier: 'com.dyor.golfsparks',
      googleServicesFile: pickFile(
        './GoogleService-Info-golf.plist',
        './GoogleService-Info.plist'
      ),
    },
    android: {
      ...(config.android || {}),
      package: 'com.dyor.golfsparks',
      googleServicesFile: pickFile(
        './google-services-golf.json',
        './google-services.json'
      ),
      adaptiveIcon: {
        ...(config.android?.adaptiveIcon || { backgroundColor: '#ffffff' }),
        foregroundImage: pickFile(
          './assets/adaptive-icon-golf.png',
          './assets/adaptive-icon.png'
        ),
      },
    },
    web: {
      ...(config.web || {}),
      favicon: pickFile('./assets/favicon-golf.png', './assets/favicon.png'),
    },
    extra: {
      ...(config.extra || {}),
      eas: { projectId: '78f77b31-8f3c-4c6e-9821-918e51bd817b' },
      variant,
    },
  };
};
