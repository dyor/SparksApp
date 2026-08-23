const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

const STRIPPER_MARKER = '[ANTIGRAVITY] Nuclear Manifest Stripper';

const STRIPPER_GRADLE = `
/**
 * ${STRIPPER_MARKER}
 * Runs after manifest merge and strips foreground-service nodes/permissions.
 * Use Java string regexes (not Groovy /slashy/ strings) — \`/g\` flags and
 * patterns containing \`/>\` break Groovy parsing of this file.
 */
afterEvaluate {
    android.applicationVariants.configureEach { variant ->
        variant.outputs.configureEach { output ->
            output.processResourcesProvider.get().doFirst {
                def manifestFiles = fileTree(dir: project.buildDir, include: "**/intermediates/merged_manifests/**/AndroidManifest.xml")

                manifestFiles.each { File manifestFile ->
                    if (manifestFile.exists()) {
                        println "[AG] Stripping Foreground Services from final manifest: " + manifestFile.absolutePath
                        def content = manifestFile.getText('UTF-8')

                        content = content.replaceAll('<service[^>]*?ExpoVideoPlaybackService[^>]*?>[\\\\s\\\\S]*?</service>', '')
                        content = content.replaceAll('<service[^>]*?LocationTaskService[^>]*?>[\\\\s\\\\S]*?</service>', '')
                        content = content.replaceAll('<service[^>]*?ScreenRecordingService[^>]*?>[\\\\s\\\\S]*?</service>', '')
                        content = content.replaceAll('android:foregroundServiceType="[^"]*"', '')
                        content = content.replaceAll('<uses-permission[^>]+?android:name="android\\\\.permission\\\\.FOREGROUND_SERVICE[^"]*"[^>]*?/>', '')

                        manifestFile.write(content, 'UTF-8')
                        println "[AG] Manifest cleaned successfully."
                    }
                }
            }
        }
    }
}
`;

module.exports = function withRemoveForegroundServices(config) {
  // Step 1: Standard Manifest Removal Pins (Source Level)
  config = withAndroidManifest(config, (config) => {
    const mainManifest = config.modResults.manifest;
    mainManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (mainManifest.application && mainManifest.application[0]) {
      const application = mainManifest.application[0];
      if (!application.service) application.service = [];

      const servicesToRemove = [
        'expo.modules.video.playbackService.ExpoVideoPlaybackService',
        'expo.modules.location.services.LocationTaskService',
        'com.margelo.nitro.nitroscreenrecorder.ScreenRecordingService'
      ];

      servicesToRemove.forEach((serviceName) => {
        const existingService = application.service.find(s => s.$ && s.$['android:name'] === serviceName);
        if (existingService) {
          existingService.$['tools:node'] = 'remove';
        } else {
          application.service.push({
            $: { 'android:name': serviceName, 'tools:node': 'remove' }
          });
        }
      });
    }
    return config;
  });

  // Step 2: Post-merge Gradle stripper (idempotent append)
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      if (!config.modResults.contents.includes(STRIPPER_MARKER)) {
        config.modResults.contents += STRIPPER_GRADLE;
      }
    }
    return config;
  });

  return config;
};
