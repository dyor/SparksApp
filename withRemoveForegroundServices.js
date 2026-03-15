const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemoveForegroundServices(config) {
    return withAndroidManifest(config, (config) => {
        const mainManifest = config.modResults.manifest;

        // Ensure we have the tools namespace
        mainManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        if (mainManifest.application && mainManifest.application[0]) {
            const application = mainManifest.application[0];
            if (!application.service) {
                application.service = [];
            }

            // Services to remove to satisfy Google Play check
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
                        $: {
                            'android:name': serviceName,
                            'tools:node': 'remove'
                        }
                    });
                }
            });
        }

        console.log('✅ withRemoveForegroundServices: Explicitly removed problematic foreground service tags.');
        return config;
    });
};
