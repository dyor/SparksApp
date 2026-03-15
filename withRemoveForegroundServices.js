const { withAndroidManifest, withAppGradle } = require('@expo/config-plugins');

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

  // Step 2: The Nuclear Option - Post-Merge Gradle Stripper
  // This runs AFTER all libraries have merged their manifests.
  config = withAppGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents += `
/**
 * [ANTIGRAVITY] Nuclear Manifest Stripper
 * This script runs AFTER the manifest merger has finished.
 * It physically deletes problematic nodes from the final merged manifest.
 */
android.applicationVariants.all { variant ->
    variant.outputs.each { output ->
        output.processResourcesProvider.get().doFirst {
            // Find the merged manifest in the intermediate build folders
            def manifestFiles = fileTree(dir: project.buildDir, include: "**/intermediates/merged_manifests/**/AndroidManifest.xml")
            
            manifestFiles.each { File manifestFile ->
                if (manifestFile.exists()) {
                    println "🛡️ [AG] Stripping Foreground Services from final manifest: " + manifestFile.absolutePath
                    def content = manifestFile.getText('UTF-8')
                    
                    // 1. Remove the entire service blocks if they still exist
                    content = content.replaceAll(/<service[^>]*?ExpoVideoPlaybackService[^>]*?>[\\s\\S]*?<\\/service>/, "")
                    content = content.replaceAll(/<service[^>]*?LocationTaskService[^>]*?>[\\s\\S]*?<\\/service>/, "")
                    content = content.replaceAll(/<service[^>]*?ScreenRecordingService[^>]*?>[\\s\\S]*?<\\/service>/, "")
                    
                    // 2. Wipe out ANY foregroundServiceType attribute anywhere in the manifest
                    content = content.replaceAll(/android:foregroundServiceType="[^"]*"/, "")
                    
                    // 3. Ensure the permission itself is gone
                    content = content.replaceAll(/<uses-permission[^>]*?FOREGROUND_SERVICE[^>]*?\\/>/, "")
                    
                    manifestFile.write(content, 'UTF-8')
                    println "✅ [AG] Manifest cleaned successfully."
                }
            }
        }
    }
}
`;
    }
    return config;
  });

  return config;
};
