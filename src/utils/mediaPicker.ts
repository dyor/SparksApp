import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * On Android 13+, expo-image-picker uses the system photo picker and does not
 * need READ_MEDIA_IMAGES / READ_MEDIA_VIDEO. iOS still requires library permission.
 */
export async function ensurePhotoLibraryAccess(
  deniedMessage = 'Please grant permission to access your photos.',
): Promise<boolean> {
  if (Platform.OS === 'android') {
    return true;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', deniedMessage);
    return false;
  }

  return true;
}
