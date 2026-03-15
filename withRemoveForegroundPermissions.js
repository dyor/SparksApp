const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemoveForegroundPermissions(config) {
    return withAndroidManifest(config, (config) => {
        const mainManifest = config.modResults.manifest;

        // Ensure we have the tools namespace for 'tools:node="remove"'
        mainManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        if (!mainManifest['uses-permission']) {
            mainManifest['uses-permission'] = [];
        }

        // List of permissions that Google Play is blocking us on
        const permissionsToRemove = [
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
            'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
            'android.permission.FOREGROUND_SERVICE_DATA_SYNC', // Just in case
            'android.permission.FOREGROUND_SERVICE_SPECIAL_USE' // Just in case
        ];

        permissionsToRemove.forEach((perm) => {
            // Find existing entry or create a new one with tools:node="remove"
            const existingIndex = mainManifest['uses-permission'].findIndex(p => p.$['android:name'] === perm);

            if (existingIndex > -1) {
                // Update existing entry to be a removal
                mainManifest['uses-permission'][existingIndex].$['tools:node'] = 'remove';
            } else {
                // Add a new entry that explicitly removes it during manifest merging
                mainManifest['uses-permission'].push({
                    $: {
                        'android:name': perm,
                        'tools:node': 'remove'
                    }
                });
            }
        });

        // Also explicitly remove the ScreenRecordingService from Nitro if it tries to sneak in
        if (mainManifest.application && mainManifest.application[0]) {
            const application = mainManifest.application[0];
            if (!application.service) {
                application.service = [];
            }

            const nitroService = 'com.margelo.nitro.nitroscreenrecorder.ScreenRecordingService';
            const existingService = application.service.find(s => s.$ && s.$['android:name'] === nitroService);

            if (existingService) {
                existingService.$['tools:node'] = 'remove';
            } else {
                application.service.push({
                    $: {
                        'android:name': nitroService,
                        'tools:node': 'remove'
                    }
                });
            }
        }

        console.log('✅ withRemoveForegroundPermissions: Added manifest removal rules for foreground services.');
        return config;
    });
};
