// Config plugin: rewrite the BroadcastExtension's bundle identifier so it
// prefix-matches the golf variant's main app bundle ID. Runs during
// `expo prebuild`.
//
// Why: the BroadcastExtension target (screen recording for The Wolverine
// tripod-spark) was added to the Xcode project manually with a hardcoded
// bundle ID "com.mattdyor.sparks.BroadcastExtension". When app.config.ts
// switches the main app to "com.dyor.golfsparks" for the golf variant,
// Xcode rejects the build with:
//   "Embedded binary's bundle identifier is not prefixed with the parent
//    app's bundle identifier."
//
// This plugin finds any build configuration whose PRODUCT_BUNDLE_IDENTIFIER
// is the Sparks extension and replaces it with the golf-prefixed version.
// No-op when variant != golf.

const { withXcodeProject } = require('@expo/config-plugins');

// All bundle IDs the extension might currently hold (from any prior prebuild).
// The plugin rewrites any of these to the correct one for the active variant.
const KNOWN_EXTENSION_IDS = [
  'com.mattdyor.sparks.BroadcastExtension',
  'com.dyor.golfsparks.BroadcastExtension',
];

const TARGET_BY_VARIANT = {
  full: 'com.mattdyor.sparks.BroadcastExtension',
  golf: 'com.dyor.golfsparks.BroadcastExtension',
};

module.exports = function withGolfBroadcastExtensionBundleId(config) {
  return withXcodeProject(config, (cfg) => {
    const variant = process.env.EXPO_PUBLIC_APP_VARIANT || 'full';
    const target = TARGET_BY_VARIANT[variant] || TARGET_BY_VARIANT.full;

    const xcodeProject = cfg.modResults;
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    let updated = 0;

    for (const key of Object.keys(buildConfigs)) {
      const section = buildConfigs[key];
      if (!section || typeof section.buildSettings !== 'object') continue;
      const current = section.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
      if (!current) continue;
      const unquoted = current.replace(/^"|"$/g, '');
      if (KNOWN_EXTENSION_IDS.includes(unquoted) && unquoted !== target) {
        section.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = target;
        updated++;
      }
    }

    if (updated > 0) {
      console.log(
        `[withGolfBroadcastExtensionBundleId] variant=${variant}: rewrote ` +
          `${updated} BroadcastExtension build config(s) → ${target}`
      );
    }
    return cfg;
  });
};
