const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Strip every broad media/legacy storage read permission. Android now uses the
 * system photo picker (expo-image-picker -> PickVisualMedia) everywhere, which
 * needs no read access, so no Play Console photo/video declaration is required.
 * expo-media-library autolinks these into the merged manifest, hence the pins.
 */
const PERMISSIONS_TO_REMOVE = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

module.exports = function withRemoveMediaReadPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = manifest['uses-permission'];

    PERMISSIONS_TO_REMOVE.forEach((permissionName) => {
      permissions.forEach((permission) => {
        if (permission.$?.['android:name'] === permissionName) {
          permission.$['tools:node'] = 'remove';
        }
      });

      const alreadyPinned = permissions.some(
        (permission) =>
          permission.$?.['android:name'] === permissionName &&
          permission.$?.['tools:node'] === 'remove',
      );

      if (!alreadyPinned) {
        permissions.push({
          $: {
            'android:name': permissionName,
            'tools:node': 'remove',
          },
        });
      }
    });

    return config;
  });
};
