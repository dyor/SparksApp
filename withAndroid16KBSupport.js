const { withProjectBuildGradle, withGradleProperties, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure Android 15 (API 35) and 16KB page alignment support.
 */
const withAndroid16KBSupport = (config) => {
    // 1. Update ndkVersion and targetSdkVersion in root build.gradle
    config = withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            let content = config.modResults.contents;

            // Update targetSdkVersion to 35
            // This matches both the versioned and non-versioned formats
            content = content.replace(
                /targetSdkVersion\s*=\s*(?:Integer\.parseInt\(findProperty\('android\.targetSdkVersion'\)\s*\?:\s*'\d+'\)|34)/g,
                "targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '35')"
            );

            // Update ndkVersion to 27.0.12077973
            content = content.replace(
                /ndkVersion\s*=\s*".*"/g,
                'ndkVersion = "27.0.12077973"'
            );

            config.modResults.contents = content;
        }
        return config;
    });

    // 2. Add 16KB alignment flag to gradle.properties
    config = withGradleProperties(config, (config) => {
        config.modResults = config.modResults.filter(
            (item) => item.key !== 'android.bundle.enableUncompressedNativeLibs'
        );
        config.modResults.push({
            type: 'property',
            key: 'android.bundle.enableUncompressedNativeLibs',
            value: 'true',
        });
        return config;
    });

    // 3. Ensure extractNativeLibs="false" in AndroidManifest.xml
    config = withAndroidManifest(config, (config) => {
        const application = config.modResults.manifest.application[0];
        application.$['android:extractNativeLibs'] = 'false';
        return config;
    });

    return config;
};

module.exports = withAndroid16KBSupport;
