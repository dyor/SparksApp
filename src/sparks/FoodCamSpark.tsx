import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SettingsButton,
} from '../components/SettingsComponents';

interface FoodPhoto {
  id: string;
  // Store RELATIVE path under documentDirectory (e.g., "foodcam/123.jpg")
  uri: string; // relative path
  originalUri?: string; // Original temporary URI
  mediaLibraryId?: string; // MediaLibrary asset ID
  timestamp: number;
  date: string; // YYYY-MM-DD format
  name?: string; // User-defined name for the food
  calories?: number; // Estimated calories
  time?: string; // HH:MM format for display
}

interface FoodCamData {
  photos: FoodPhoto[];
}

interface FoodCamSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3; // 3 columns with proper padding and gaps

// Settings Component
const FoodCamSettings: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="FoodCam Settings"
          subtitle="Manage your visual food diary preferences"
          icon="📸"
        />

        <SettingsFeedbackSection sparkName="FoodCam" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              FoodCam helps you track your meals with visual photos.{'\n'}
              Take photos, add details, and build your food diary.
            </SettingsText>
          </View>
        </SettingsSection>
        <SettingsButton title="Close" onPress={onClose} variant="secondary" />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

export const FoodCamSpark: React.FC<FoodCamSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [photos, setPhotos] = useState<FoodPhoto[]>([]);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<FoodPhoto | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');


  // Helpers for persistent relative paths
  const FOOD_DIR_NAME = 'foodcam/';
  const toAbsoluteUri = (relativeOrAbsolute: string): string => {
    if (relativeOrAbsolute.startsWith('file://')) return relativeOrAbsolute;
    return `${FileSystem.documentDirectory}${relativeOrAbsolute}`;
  };
  const toRelativePath = (uri: string): string => {
    const idx = uri.lastIndexOf(FOOD_DIR_NAME);
    return idx !== -1 ? uri.substring(idx) : uri;
  };

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('food-cam') as FoodCamData;
    if (savedData?.photos) {
      // TODO TEMPORARY - DELETE AFTER MIGRATION
      const migrated = savedData.photos.map(p => {
        const rel = p.uri.startsWith('file://') ? toRelativePath(p.uri) : p.uri;
        return rel !== p.uri ? { ...p, uri: rel } : p;
      });
      setPhotos(migrated);
      if (JSON.stringify(migrated) !== JSON.stringify(savedData.photos)) {
        setSparkData('food-cam', { photos: migrated });
      }
    }
    requestPermissions();
    // Debug file system status
    checkFileSystemStatus();
  }, [getSparkData]);

  // Save data whenever photos change
  useEffect(() => {
    setSparkData('food-cam', { photos });
    onStateChange?.({ photoCount: photos.length });
  }, [photos]); // Removed setSparkData and onStateChange from dependencies

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();

      setHasPermissions(
        cameraStatus === 'granted' &&
        mediaStatus === 'granted' &&
        mediaLibraryStatus === 'granted'
      );
    } catch (error) {
      console.warn('Permission request failed:', error);
      setHasPermissions(false);
    }
  };

  const generatePhotoId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substring(2);
  };

  // Debug function to check file system status
  const checkFileSystemStatus = async () => {
    try {
      const foodCamDir = `${FileSystem.documentDirectory}foodcam/`;
      const dirInfo = await FileSystem.getInfoAsync(foodCamDir);
      console.log('FoodCam directory exists:', dirInfo.exists);
      
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(foodCamDir);
        console.log('FoodCam files count:', files.length);
        console.log('FoodCam files:', files);
      }
    } catch (error) {
      console.error('Error checking file system:', error);
    }
  };

  const saveImagePermanently = async (tempUri: string, photoId: string): Promise<string> => {
    try {
      // Create the FoodCam directory (intermediates: true creates it if it doesn't exist)
      const foodCamDir = `${FileSystem.documentDirectory}${FOOD_DIR_NAME}`;
      await FileSystem.makeDirectoryAsync(foodCamDir, { intermediates: true });

      // Create permanent file path
      const fileExtension = tempUri.split('.').pop() || 'jpg';
      const fileName = `${photoId}.${fileExtension}`;
      const permanentUri = `${foodCamDir}${fileName}`;

      // Copy the temporary file to permanent storage
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri,
      });

      // Verify the file was copied successfully
      const fileInfo = await FileSystem.getInfoAsync(permanentUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to copy image to permanent storage');
      }

      console.log(`Saved image permanently: ${permanentUri}`);
      return permanentUri;
    } catch (error) {
      console.error('Failed to save image permanently:', error);
      throw error;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Use local date formatting for comparison instead of UTC
    const formatLocalDate = (d: Date) => {
      return d.getFullYear() + '-' + 
        String(d.getMonth() + 1).padStart(2, '0') + '-' + 
        String(d.getDate()).padStart(2, '0');
    };

    const todayStr = formatLocalDate(today);
    const yesterdayStr = formatLocalDate(yesterday);

    if (dateString === todayStr) return 'Today';
    if (dateString === yesterdayStr) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePhotoResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets?.[0]) {
      HapticFeedback.light();

      const asset = result.assets[0];
      const now = new Date();
      const timestamp = now.getTime();
      // Use local date instead of UTC to avoid timezone issues
      const date = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
      const photoId = generatePhotoId();

      try {
        // Save the image permanently to app storage
        const permanentUri = await saveImagePermanently(asset.uri, photoId);

        const newPhoto: FoodPhoto = {
          id: photoId,
          uri: toRelativePath(permanentUri),
          originalUri: asset.uri,
          timestamp,
          date,
          time: now.toTimeString().substring(0, 5), // HH:MM format
        };

        setPhotos(prev => [newPhoto, ...prev]);
      } catch (error) {
        console.error('Failed to save photo:', error);
        Alert.alert('Error', 'Failed to save photo. Please try again.');
      }
    }
  };

  const takePhoto = async () => {
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and photo library permissions to use FoodCam.',
        [{ text: 'OK', onPress: requestPermissions }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping/editing
        quality: 0.8,
        base64: false, // Don't need base64 for file operations
        exif: false, // Don't need EXIF data
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerAssetRepresentationMode?.current || 'current',
      });

      await handlePhotoResult(result);
    } catch (error) {
      console.log('Camera error:', error);
      Alert.alert(
        'Camera Not Available',
        'Camera functionality is not available in emulators. Please test on a physical device or use "Add" to select from gallery.',
        [{ text: 'OK' }]
      );
    }
  };

  const addFromGallery = async () => {
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Please grant photo library permissions to add photos.',
        [{ text: 'OK', onPress: requestPermissions }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping/editing
        quality: 0.8,
        base64: false, // Don't need base64 for file operations
        exif: false, // Don't need EXIF data
        selectionLimit: 1, // Only allow single photo selection
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerAssetRepresentationMode?.current || 'current',
      });

      await handlePhotoResult(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    }
  };

  const deletePhoto = async (photoId: string) => {
    const photoToDelete = photos.find(p => p.id === photoId);

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            HapticFeedback.light();

            // Remove from state first
            setPhotos(prev => prev.filter(photo => photo.id !== photoId));

            // Try to delete the physical file
            if (photoToDelete?.uri) {
              try {
                await FileSystem.deleteAsync(toAbsoluteUri(photoToDelete.uri), { idempotent: true });
              } catch (error) {
                console.warn('Failed to delete physical file:', error);
              }
            }
          },
        },
      ]
    );
  };

  // Handle photo editing
  const handleEditPhoto = (photo: FoodPhoto) => {
    setEditingPhoto(photo);
    setEditName(photo.name || '');
    setEditCalories(photo.calories?.toString() || '');
    setEditDate(photo.date);
    setEditTime(photo.time || '');
    setEditModalVisible(true);
    HapticFeedback.light();
  };

  const savePhotoEdit = () => {
    if (!editingPhoto) return;

    const updatedPhoto: FoodPhoto = {
      ...editingPhoto,
      name: editName.trim() || undefined,
      calories: editCalories ? parseInt(editCalories) : undefined,
      date: editDate,
      time: editTime || undefined,
    };

    setPhotos(prev => prev.map(photo =>
      photo.id === editingPhoto.id ? updatedPhoto : photo
    ));

    setEditModalVisible(false);
    setEditingPhoto(null);
    HapticFeedback.success();
  };

  const deletePhotoFromEdit = async () => {
    if (!editingPhoto) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from state first
            setPhotos(prev => prev.filter(photo => photo.id !== editingPhoto.id));

            // Try to delete the physical file
            try {
              await FileSystem.deleteAsync(toAbsoluteUri(editingPhoto.uri), { idempotent: true });
            } catch (error) {
              console.warn('Failed to delete physical file:', error);
            }

            setEditModalVisible(false);
            setEditingPhoto(null);
            HapticFeedback.light();
          },
        },
      ]
    );
  };

  // Group photos by date and sort by time within each date
  const photosByDate = photos.reduce((groups, photo) => {
    if (!groups[photo.date]) {
      groups[photo.date] = [];
    }
    groups[photo.date].push(photo);
    return groups;
  }, {} as Record<string, FoodPhoto[]>);

  // Sort each date's photos by time (newest to oldest)
  Object.keys(photosByDate).forEach(date => {
    photosByDate[date].sort((a, b) => {
      // First sort by timestamp (most reliable), then by time string as fallback
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp; // Newest first
      }
      // Fallback to time string comparison
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeB.localeCompare(timeA); // Latest time first
    });
  });

  const sortedDates = Object.keys(photosByDate).sort((a, b) => b.localeCompare(a));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    buttonContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    button: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    buttonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: '600',
    },
    addButtonText: {
      color: colors.primary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    dateSection: {
      marginBottom: 24,
    },
    dateHeader: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      gap: 8,
    },
    photoContainer: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: colors.textSecondary,
      fontSize: 24,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    permissionText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginTop: 20,
    },
    // Edit modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
      maxHeight: '90%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalPreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: colors.border,
    },
    fieldLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    deleteButton: {
      backgroundColor: '#ff4444',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <FoodCamSettings
        onClose={onCloseSettings || (() => {})}
      />
    );
  }

  if (!hasPermissions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>FoodCam</Text>
          <Text style={styles.subtitle}>Visual food diary</Text>
        </View>
        <Text style={styles.permissionText}>
          Camera and photo library permissions are required to use FoodCam. Please grant permissions to continue.
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FoodCam</Text>
        <Text style={styles.subtitle}>
          {photos.length > 0 ? `${photos.length} photos captured` : 'Start capturing your meals'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>📸 Snap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.addButton]} onPress={addFromGallery}>
          <Text style={[styles.buttonText, styles.addButtonText]}>📷 Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>
              Take a photo of your food to get started!
            </Text>
          </View>
        ) : (
          sortedDates.map(date => (
            <View key={date} style={styles.dateSection}>
              <Text style={styles.dateHeader}>{formatDate(date)}</Text>
              <View style={styles.photoGrid}>
                {photosByDate[date].map(photo => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.photoContainer}
                    onPress={() => handleEditPhoto(photo)}
                    onLongPress={() => deletePhoto(photo.id)}
                    delayLongPress={500}
                  >
                    {imageErrors.has(photo.id) ? (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.placeholderText}>🍽️</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: toAbsoluteUri(photo.uri) }}
                        style={styles.photo}
                        onError={() => {
                          console.warn('Image failed to load:', toAbsoluteUri(photo.uri));
                          setImageErrors(prev => new Set([...prev, photo.id]));
                        }}
                        resizeMode="cover"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Photo Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Photo</Text>

            {/* Photo preview */}
            {editingPhoto && (
              <Image source={{ uri: toAbsoluteUri(editingPhoto.uri) }} style={styles.modalPreview} />
            )}

            {/* Name field */}
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter food name..."
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
            />

            {/* Calories field */}
            <Text style={styles.fieldLabel}>Calories</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter calories..."
              placeholderTextColor={colors.textSecondary}
              value={editCalories}
              onChangeText={setEditCalories}
              keyboardType="numeric"
            />

            {/* Date field */}
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={editDate}
              onChangeText={setEditDate}
            />

            {/* Time field */}
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              value={editTime}
              onChangeText={setEditTime}
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deletePhotoFromEdit}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={savePhotoEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};