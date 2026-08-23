// Config plugin: keep the fmt / Apple clang 21 (Xcode 26.x) workaround alive
// across `expo prebuild`, which regenerates ios/Podfile from the Expo template
// and would otherwise drop the post_install hook we added by hand.
//
// Background: fmt 11.0.2 (vendored by React Native 0.79) enables `consteval`
// for every Apple clang >= 14. Apple clang 21 is stricter about requiring
// consteval call sites to themselves be constant expressions, so fmt's own
// FMT_STRING(...) uses inside format-inl.h fail to compile:
//
//   call to consteval function 'fmt::basic_format_string<...>' is not a
//   constant expression
//
// -DFMT_USE_CONSTEVAL=0 does not help because base.h unconditionally
// redefines the macro, so the fix patches the compiler-detection line in
// Pods/fmt/include/fmt/base.h after pods are installed. See fmtlib/fmt#4740.
//
// Remove this plugin (and the matching block in ios/Podfile) once React
// Native ships fmt >= 11.1.x.

const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MARKER = 'FMT_CONSTEVAL_FIX';
const ANCHOR = '  post_install do |installer|\n';

const BLOCK = `    # -------------------------------------------------------------------
    # fmt + Apple clang 21 (Xcode 26.x) workaround  [${MARKER}]
    # Injected by withFmtConstevalFix.js — see that file for the rationale.
    # -------------------------------------------------------------------
    fmt_base_h = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      fmt_src = File.read(fmt_base_h)
      fmt_needle = '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L'
      if fmt_src.include?(fmt_needle)
        File.write(
          fmt_base_h,
          fmt_src.sub(
            fmt_needle,
            '#elif defined(__apple_build_version__)  // consteval is broken in Apple clang < 14 and >= 21 (Xcode 26).'
          )
        )
        Pod::UI.puts '[fmt] FMT_USE_CONSTEVAL disabled for Apple clang (Xcode 26 workaround)'
      end
    end

`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfile)) {
        console.warn('[withFmtConstevalFix] no ios/Podfile found; skipping');
        return cfg;
      }

      const contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return cfg;

      if (!contents.includes(ANCHOR)) {
        console.warn(
          '[withFmtConstevalFix] could not find "post_install do |installer|" ' +
            'in ios/Podfile — the fmt workaround was NOT applied. Patch it by hand.'
        );
        return cfg;
      }

      fs.writeFileSync(podfile, contents.replace(ANCHOR, ANCHOR + BLOCK));
      console.log('[withFmtConstevalFix] injected fmt consteval workaround into ios/Podfile');
      return cfg;
    },
  ]);
};
