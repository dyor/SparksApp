import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  Share,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SettingsButton,
} from '../components/SettingsComponents';
import { NotificationService } from '../utils/notifications';

const { width } = Dimensions.get('window');

interface TripStorySparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
  photos: TripPhoto[];
  status: 'planned' | 'active' | 'completed';
  mode: 'record' | 'remember';
  createdAt: string;
  updatedAt: string;
}

const calculateTripStatus = (startDateStr: string, endDateStr: string): 'planned' | 'active' | 'completed' => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(startDateStr + 'T00:00:00');
  const endDate = new Date(endDateStr + 'T23:59:59.999');

  if (today < startDate) return 'planned';
  if (today > endDate) return 'completed';
  return 'active';
};

interface Activity {
  id: string;
  tripId: string;
  name: string;
  startDate: string;
  time: string;
  photos: TripPhoto[];
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: string;
}

interface TripPhoto {
  id: string;
  tripId: string;
  activityId?: string;
  uri: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  caption?: string;
  createdAt: string;
}

const TripStorySpark: React.FC<TripStorySparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();

  const [isLoaded, setIsLoaded] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Form state
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripStartDate, setNewTripStartDate] = useState('');
  const [newTripEndDate, setNewTripEndDate] = useState('');
  const [activitiesListText, setActivitiesListText] = useState('');

  // Activity state
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityTime, setNewActivityTime] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showManageActivities, setShowManageActivities] = useState(false);

  // Photo state
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoCaptureMode, setPhotoCaptureMode] = useState<'camera' | 'library'>('camera');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Custom picker state
  const [customPickerPhotos, setCustomPickerPhotos] = useState<any[]>([]);
  const [customPickerPhotoUris, setCustomPickerPhotoUris] = useState<Map<string, string>>(new Map());
  const [selectedPickerPhotos, setSelectedPickerPhotos] = useState<Set<string>>(new Set());
  const [customPickerDate, setCustomPickerDate] = useState<string | null>(null);
  const [customPickerAllowMultiple, setCustomPickerAllowMultiple] = useState(false);
  const [customPickerActivity, setCustomPickerActivity] = useState<Activity | null>(null);
  const [showCustomPhotoPicker, setShowCustomPhotoPicker] = useState(false);
  const [loadingPhotosByDate, setLoadingPhotosByDate] = useState<string | null>(null);

  // Detail view state
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<Trip | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false); // Renamed from photoDetail to match usage
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);

  // Map View State
  const [showMapView, setShowMapView] = useState(false);
  const [selectedMapDay, setSelectedMapDay] = useState<string | null>(null);
  const [showMapDayDropdown, setShowMapDayDropdown] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  // Photo Detail State
  const [photoName, setPhotoName] = useState('');
  const [photoDate, setPhotoDate] = useState('');
  const [photoLocation, setPhotoLocation] = useState('');
  const [photoLat, setPhotoLat] = useState('');
  const [photoLng, setPhotoLng] = useState('');
  const [photoGeoStatus, setPhotoGeoStatus] = useState<'idle' | 'geocoding' | 'success' | 'failed'>('idle');
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const [photoActivityId, setPhotoActivityId] = useState<string | null>(null);

  // Edit Activity State
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActivityName, setEditActivityName] = useState('');
  const [editActivityTime, setEditActivityTime] = useState('');
  const [editActivityLocation, setEditActivityLocation] = useState('');
  const [editActivityLat, setEditActivityLat] = useState('');
  const [editActivityLng, setEditActivityLng] = useState('');
  const [editActivityGeoStatus, setEditActivityGeoStatus] = useState<'idle' | 'geocoding' | 'success' | 'failed'>('idle');

  // Edit Trip State
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [editTripTitle, setEditTripTitle] = useState('');
  const [editTripStartDate, setEditTripStartDate] = useState('');
  const [editTripEndDate, setEditTripEndDate] = useState('');
  const [editTripMode, setEditTripMode] = useState<'record' | 'remember'>('record');

  // Aliases for showAddActivity to match usage in some parts of the code
  const showAddActivityModal = showAddActivity;
  const setShowAddActivityModal = setShowAddActivity;

  const scrollViewRef = useRef<ScrollView>(null);
  const dateScrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const dayPositions = useRef<Map<string, number>>(new Map());
  const activityPositions = useRef<Map<string, number>>(new Map());
  const dayPhotoScrollRefs = useRef<Map<string, React.RefObject<ScrollView | null>>>(new Map());
  const activityPhotoScrollRefs = useRef<Map<string, React.RefObject<ScrollView | null>>>(new Map());
  const currentScrollPosition = useRef(0);

  // Animate border for loading states
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  useEffect(() => {
    loadTrips();
  }, []);

  const savePhotoPermanently = async (uri: string, tripId: string, photoId: string): Promise<string> => {
    try {
      // If already in document directory, return as is
      if (uri.includes(FileSystem.documentDirectory!)) {
        return uri;
      }

      const filename = `trip_${tripId}_${photoId}.jpg`;
      const destPath = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: uri,
        to: destPath
      });

      return destPath;
    } catch (error) {
      console.error('Error saving photo permanently:', error);
      return uri; // Fallback to original URI if copy fails
    }
  };

  const migrateAllPhotos = async (tripsToMigrate: Trip[]): Promise<Trip[]> => {
    const updatedTrips = [...tripsToMigrate];
    let hasChanges = false;

    for (let i = 0; i < updatedTrips.length; i++) {
      const trip = updatedTrips[i];
      const updatedPhotos = [...trip.photos];
      let tripChanged = false;

      for (let j = 0; j < updatedPhotos.length; j++) {
        const photo = updatedPhotos[j];
        // If photo has no URI but has ID (migration case) OR needs moving to permanent storage
        if (!photo.uri || !photo.uri.includes(FileSystem.documentDirectory!)) {
          try {
            // If we have an ID but no URI, we might be able to recover or it's lost
            // For this implementation, we'll assume we're migrating from a state where we have the URI
            if (photo.uri) {
              const newUri = await savePhotoPermanently(photo.uri, trip.id, photo.id);
              if (newUri !== photo.uri) {
                updatedPhotos[j] = { ...photo, uri: newUri };
                tripChanged = true;
                hasChanges = true;
              }
            }
          } catch (error) {
            console.error('Error migrating photo:', error);
          }
        }
      }

      if (tripChanged) {
        updatedTrips[i] = { ...trip, photos: updatedPhotos };
      }
    }

    if (hasChanges) {
      await setSparkData('trip-story', {
        trips: updatedTrips,
        activeDayDate,
        activeActivityId,
        activeTripId: currentTrip?.id || activeTripId || null
      });
    }

    return updatedTrips;
  };

  const saveTrips = async (newTrips: Trip[]) => {
    try {
      await setSparkData('trip-story', {
        trips: newTrips,
        activeDayDate,
        activeActivityId,
        activeTripId: currentTrip?.id || activeTripId || null
      });
      setTrips(newTrips);
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  };

  const loadTrips = async () => {
    try {
      const data = await getSparkData('trip-story');
      if (data?.trips) {
        // Check if migration is needed (if photos don't have URIs but have IDs)
        // This is a simplified check - in production we'd check version or specific fields
        const needsMigration = data.trips.some((t: Trip) =>
          t.photos.some(p => !p.uri && p.id)
        );

        let updatedTrips = data.trips;
        if (needsMigration) {
          console.log('🔄 Migrating photos to permanent storage...');
          updatedTrips = await migrateAllPhotos(data.trips);
        }

        // Update trip statuses based on current date
        updatedTrips = updatedTrips.map((trip: Trip) => ({
          ...trip,
          status: calculateTripStatus(trip.startDate, trip.endDate)
        }));

        setTrips(updatedTrips);

        // Restore active state
        if (data.activeTripId) {
          const activeTrip = updatedTrips.find((t: Trip) => t.id === data.activeTripId);
          if (activeTrip) {
            setCurrentTrip(activeTrip);
            setActiveTripId(data.activeTripId);
          }
        }

        if (data.activeDayDate) {
          setActiveDayDate(data.activeDayDate);
        }

        if (data.activeActivityId) {
          setActiveActivityId(data.activeActivityId);
        }
      }
      setIsLoaded(true); // Mark as loaded
    } catch (error) {
      console.error('Error loading trips:', error);
      setIsLoaded(true); // Mark as loaded even on error to allow recovery/new trips
    }
  };

  // Save active state whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Prevent saving before load completes

    const saveActiveState = async () => {
      try {
        const currentData = await getSparkData('trip-story');
        await setSparkData('trip-story', {
          ...currentData,
          trips: trips, // Use current trips state
          activeDayDate: activeDayDate,
          activeActivityId: activeActivityId,
          activeTripId: currentTrip?.id || activeTripId || null,
        });
      } catch (error) {
        console.error('Error saving active state:', error);
      }
    };
    saveActiveState();
  }, [activeDayDate, activeActivityId, activeTripId, currentTrip, trips, isLoaded]);

  const activateDay = (date: string) => {
    if (!currentTrip) return;
    // Deactivate any active activity
    setActiveActivityId(null);
    // Toggle day activation (if already active, deactivate it)
    if (activeDayDate === date && activeTripId === currentTrip.id) {
      setActiveDayDate(null);
      setActiveTripId(null);
    } else {
      setActiveDayDate(date);
      setActiveTripId(currentTrip.id);
      // Scrolling is handled by useEffect that watches activeDayDate
    }
  };

  const activateActivity = (activityId: string) => {
    if (!currentTrip) return;
    // Deactivate any active day
    setActiveDayDate(null);
    // Toggle activity activation (if already active, deactivate it)
    if (activeActivityId === activityId && activeTripId === currentTrip.id) {
      setActiveActivityId(null);
      setActiveTripId(null);
    } else {
      setActiveActivityId(activityId);
      setActiveTripId(currentTrip.id);
      // Scrolling is handled by useEffect that watches activeActivityId
    }
  };

  const createTrip = async () => {
    if (!newTripTitle || !newTripStartDate || !newTripEndDate) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const tripId = Date.now().toString();

    // Parse activities from text input if provided
    let parsedActivities: Activity[] = [];
    if (activitiesListText.trim()) {
      parsedActivities = parseActivitiesList(activitiesListText, tripId);
      if (parsedActivities.length === 0 && activitiesListText.trim()) {
        Alert.alert('Invalid Activities', 'No valid activities found. Please check the format. Trip will be created without activities.');
      }
    }

    const newTrip: Trip = {
      id: tripId,
      title: newTripTitle,
      startDate: newTripStartDate,
      endDate: newTripEndDate,
      activities: parsedActivities,
      photos: [],
      status: calculateTripStatus(newTripStartDate, newTripEndDate),
      mode: 'record',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrips = [...trips, newTrip];
    await saveTrips(updatedTrips);

    // Schedule notifications if it's a planned trip (day before and day of at 8 AM)
    if (newTrip.status === 'planned') {
      const tripDate = new Date(newTrip.startDate + 'T08:00:00');
      const dayBefore = new Date(tripDate);
      dayBefore.setDate(dayBefore.getDate() - 1);

      // Schedule day-before notification
      await NotificationService.scheduleActivityNotification(
        `${newTrip.title} starts tomorrow`,
        dayBefore,
        `trip-${newTrip.id}-before`,
        'Upcoming Trip',
        'trip-story',
        '✈️'
      );

      // Schedule day-of notification
      await NotificationService.scheduleActivityNotification(
        `${newTrip.title} is today`,
        tripDate,
        `trip-${newTrip.id}-day`,
        'Trip Today',
        'trip-story',
        '✈️'
      );
    }

    // Reset form
    setNewTripTitle('');
    setNewTripStartDate('');
    setNewTripEndDate('');
    setActivitiesListText('');
    setShowCreateTrip(false);

    HapticFeedback.success();
    if (parsedActivities.length > 0) {
      Alert.alert('Success', `Trip created with ${parsedActivities.length} activities.`);
    }
  };

  const addActivity = async () => {
    if (!currentTrip || !newActivityName || !selectedDate) {
      Alert.alert('Missing Information', 'Please select a trip, date, and enter activity name.');
      return;
    }

    const newActivity: Activity = {
      id: Date.now().toString(),
      tripId: currentTrip.id,
      name: newActivityName,
      startDate: selectedDate,
      time: newActivityTime || '12:00',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    const updatedTrips = trips.map(trip =>
      trip.id === currentTrip.id
        ? { ...trip, activities: [...trip.activities, newActivity], updatedAt: new Date().toISOString() }
        : trip
    );

    await saveTrips(updatedTrips);
    const updatedTrip = updatedTrips.find(t => t.id === currentTrip.id) || null;
    setCurrentTrip(updatedTrip);

    // Reset form
    setNewActivityName('');
    setNewActivityTime('');
    setSelectedDate('');
    setShowAddActivity(false);

    HapticFeedback.success();
  };

  const capturePhoto = async (activity?: Activity, date?: string) => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
        return;
      }

      // Check if camera is available
      const cameraAvailable = await ImagePicker.getCameraPermissionsAsync();
      if (!cameraAvailable.granted) {
        Alert.alert('Camera Not Available', 'Camera access is not available on this device.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled) {
        setShowPhotoCapture(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No photo was captured. Please try again.');
        return;
      }

      if (result.assets[0]) {
        const asset = result.assets[0];

        // Get location
        let location = null;
        try {
          const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
          if (locationStatus === 'granted') {
            const locationData = await Location.getCurrentPositionAsync({});
            location = {
              latitude: locationData.coords.latitude,
              longitude: locationData.coords.longitude,
            };
          }
        } catch (error) {
          console.log('Location not available:', error);
        }

        // ALWAYS use the passed date parameter if provided (from button click)
        // This ensures photos are associated with the day of the button, not when they were taken
        let dateToUse: string;
        if (date) {
          // Explicitly use the date from the button click
          dateToUse = date;
        } else if (activity?.startDate) {
          dateToUse = activity.startDate;
        } else if (selectedDate) {
          dateToUse = selectedDate;
        } else {
          dateToUse = new Date().toISOString().split('T')[0];
        }
        // Create timestamp at noon UTC to ensure consistent date extraction regardless of timezone
        const photoDate = new Date(dateToUse + 'T12:00:00Z').toISOString();
        console.log('📸 capturePhoto - date parameter:', date, 'dateToUse:', dateToUse, 'photoDate (timestamp):', photoDate);

        // Save photo permanently
        const photoId = Date.now().toString();
        const permanentUri = await savePhotoPermanently(asset.uri, currentTrip!.id, photoId);

        const newPhoto: TripPhoto = {
          id: photoId,
          tripId: currentTrip!.id,
          activityId: (activity || selectedActivity)?.id,
          uri: permanentUri,
          timestamp: photoDate,
          location: location || undefined,
          caption: '',
          createdAt: new Date().toISOString(),
        };

        const updatedTrips = trips.map(trip =>
          trip.id === currentTrip!.id
            ? {
              ...trip,
              photos: [...trip.photos, newPhoto],
              updatedAt: new Date().toISOString()
            }
            : trip
        );

        await saveTrips(updatedTrips);
        const updatedTrip = updatedTrips.find(t => t.id === currentTrip!.id) || null;
        setCurrentTrip(updatedTrip);

        setShowPhotoCapture(false);
        setSelectedActivity(null);
        setSelectedDate('');
        HapticFeedback.success();
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      if (error instanceof Error && error.message && error.message.includes('simulator')) {
        Alert.alert(
          'Camera Not Available',
          'Camera functionality is not available in emulators. Please test on a physical device or use "Add" to select from gallery.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    }
  };

  // Load photos from media library filtered by date
  const loadPhotosByDate = async (targetDate: string): Promise<MediaLibrary.Asset[]> => {
    try {
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to filter photos by date.');
        return [];
      }

      // Calculate date range (start and end of target date)
      const startOfDay = new Date(targetDate + 'T00:00:00');
      const endOfDay = new Date(targetDate + 'T23:59:59.999');
      const startTimestamp = startOfDay.getTime(); // Milliseconds
      const endTimestamp = endOfDay.getTime(); // Milliseconds

      // Query photos from media library
      const assets = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1000, // Get up to 1000 photos
        sortBy: MediaLibrary.SortBy.creationTime,
        createdAfter: startTimestamp,
        createdBefore: endTimestamp,
      });

      console.log(`📷 Found ${assets.assets.length} photos for date ${targetDate}`);
      return assets.assets;
    } catch (error) {
      console.error('Error loading photos by date:', error);
      Alert.alert('Error', 'Failed to load photos. Please try again.');
      return [];
    }
  };

  const addFromGallery = async (activity?: Activity, date?: string, allowMultiple: boolean = false) => {
    console.log('📷 addFromGallery called with activity:', activity?.id, activity?.name, 'date:', date, 'allowMultiple:', allowMultiple);

    // Only use custom picker for "Add Many" (multiple selection) with date filtering
    // For "Add 1", use regular picker which allows cropping
    const dateToUse = date || activity?.startDate;
    if (dateToUse && allowMultiple) {
      // Create a unique key for this loading operation
      const loadingKey = dateToUse + (activity?.id || '');
      setLoadingPhotosByDate(loadingKey);

      try {
        // Load photos for the target date
        const photos = await loadPhotosByDate(dateToUse);

        if (photos.length === 0) {
          setLoadingPhotosByDate(null);
          Alert.alert(
            'No Photos Found',
            `No photos found for ${dateToUse}. Would you like to browse all photos instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Browse All',
                onPress: () => addFromGallery(activity, undefined, allowMultiple) // Fallback to regular picker
              }
            ]
          );
          return;
        }

        // Load URIs for display (thumbnails)
        const uriMap = new Map<string, string>();
        for (const photo of photos) {
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(photo);
            // Use localUri for display if available, otherwise use uri
            const displayUri = assetInfo.localUri || assetInfo.uri || photo.uri;
            if (displayUri) {
              uriMap.set(photo.id, displayUri);
            }
          } catch (error) {
            console.warn('⚠️ Could not get URI for asset:', photo.id, error);
            // Fallback to asset.uri
            if (photo.uri) {
              uriMap.set(photo.id, photo.uri);
            }
          }
        }

        // Show custom picker for multiple selection
        setCustomPickerPhotos(photos);
        setCustomPickerPhotoUris(uriMap);
        setSelectedPickerPhotos(new Set());
        setCustomPickerDate(dateToUse);
        setCustomPickerAllowMultiple(allowMultiple);
        setCustomPickerActivity(activity || null);
        setShowCustomPhotoPicker(true);
        setLoadingPhotosByDate(null);
        return;
      } catch (error) {
        console.error('Error loading photos by date:', error);
        setLoadingPhotosByDate(null);
        // Fall through to regular picker
      }
    }

    // Fallback to regular image picker (no date filter)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: !allowMultiple, // Disable editing when selecting multiple
        allowsMultipleSelection: allowMultiple,
        aspect: allowMultiple ? undefined : [1, 1], // No aspect ratio when multiple
        quality: 0.8,
        exif: false,
      });

      if (result.canceled) {
        setShowPhotoCapture(false);
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No photo was selected. Please try again.');
        return;
      }

      // Process all selected assets
      // Note: expo-image-picker doesn't support filtering by date in the picker UI,
      // but we'll assign the activity's date to all selected photos
      const assetsToProcess = result.assets;

      // ALWAYS use the passed date parameter if provided (from button click)
      // This ensures photos are associated with the day of the button, not when they were taken
      let dateToUse: string;
      if (date) {
        // Explicitly use the date from the button click
        dateToUse = date;
      } else if (activity?.startDate) {
        dateToUse = activity.startDate;
      } else if (selectedDate) {
        dateToUse = selectedDate;
      } else {
        dateToUse = new Date().toISOString().split('T')[0];
      }
      // Create timestamp at noon UTC to ensure consistent date extraction regardless of timezone
      const photoDate = new Date(dateToUse + 'T12:00:00Z').toISOString();
      console.log('📷 addFromGallery - date parameter:', date, 'dateToUse:', dateToUse, 'photoDate (timestamp):', photoDate);

      // Get location once (will be same for all photos in bulk add)
      let location = null;
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          const locationData = await Location.getCurrentPositionAsync({});
          location = {
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
          };
        }
      } catch (error) {
        console.log('Location not available:', error);
      }

      // Process all assets and create photos
      const newPhotos: TripPhoto[] = [];
      for (let i = 0; i < assetsToProcess.length; i++) {
        const asset = assetsToProcess[i];

        // Save photo permanently with unique ID
        const photoId = `${Date.now()}-${i}`;
        const permanentUri = await savePhotoPermanently(asset.uri, currentTrip!.id, photoId);

        const newPhoto: TripPhoto = {
          id: photoId,
          tripId: currentTrip!.id,
          activityId: (activity || selectedActivity)?.id,
          uri: permanentUri,
          timestamp: photoDate,
          location: location || undefined,
          caption: '',
          createdAt: new Date().toISOString(),
        };

        newPhotos.push(newPhoto);
      }

      // Add all photos at once
      const updatedTrips = trips.map(trip =>
        trip.id === currentTrip!.id
          ? {
            ...trip,
            photos: [...trip.photos, ...newPhotos],
            updatedAt: new Date().toISOString()
          }
          : trip
      );

      await saveTrips(updatedTrips);
      const updatedTrip = updatedTrips.find(t => t.id === currentTrip!.id) || null;
      setCurrentTrip(updatedTrip);

      setShowPhotoCapture(false);
      setSelectedActivity(null);
      setSelectedDate('');
      HapticFeedback.success();

      if (newPhotos.length > 1) {
        Alert.alert('Success', `Added ${newPhotos.length} photos to ${activity?.name || 'the activity'}.`);
      }
    } catch (error) {
      console.error('Error adding photo from gallery:', error);
      Alert.alert('Error', 'Failed to add photo from gallery.');
    }
  };

  // Handle photo selection from custom picker
  const handleCustomPickerSelection = async () => {
    if (selectedPickerPhotos.size === 0) {
      Alert.alert('No Selection', 'Please select at least one photo.');
      return;
    }

    if (!customPickerDate || !currentTrip) return;

    // Get selected assets
    const selectedAssets = customPickerPhotos.filter(photo =>
      selectedPickerPhotos.has(photo.id)
    );

    // Get location once (will be same for all photos in bulk add)
    let location = null;
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        const locationData = await Location.getCurrentPositionAsync({});
        location = {
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        };
      }
    } catch (error) {
      console.log('Location not available:', error);
    }

    // Process all selected assets
    const newPhotos: TripPhoto[] = [];
    for (let i = 0; i < selectedAssets.length; i++) {
      const asset = selectedAssets[i];

      try {
        // Get the full URI for the asset - request localUri which is the actual file path
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);

        // Use localUri if available (this is the actual file path)
        let photoUri = assetInfo.localUri;

        // If localUri is not available, we need to handle it differently
        if (!photoUri) {
          // Try to get the URI from the asset directly
          // On iOS, we might need to use a different approach
          if (Platform.OS === 'ios') {
            // For iOS, try to use the asset's URI and convert it
            // We'll need to use copyAssetToAlbumAsync or similar, but for now let's try the uri
            photoUri = asset.uri;
            console.warn('⚠️ No localUri found, using asset.uri:', photoUri);
          } else {
            // Android - use the uri directly
            photoUri = asset.uri;
          }
        }

        // Ensure we have a valid URI
        if (!photoUri) {
          console.error('❌ No valid URI found for asset:', asset.id);
          continue;
        }

        // If we still have a ph:// URI, we need to handle it specially
        if (photoUri.startsWith('ph://')) {
          console.warn('⚠️ Received ph:// URI, attempting to get localUri with download option');
          // Try again with download option
          const assetInfoWithDownload = await MediaLibrary.getAssetInfoAsync(asset, {
            shouldDownloadFromNetwork: true,
          });
          photoUri = assetInfoWithDownload.localUri || assetInfoWithDownload.uri;

          if (!photoUri || photoUri.startsWith('ph://')) {
            console.error('❌ Could not get valid file URI for asset:', asset.id);
            continue;
          }
        }

        // Save photo permanently with unique ID
        const photoId = `${Date.now()}-${i}`;
        const permanentUri = await savePhotoPermanently(photoUri, currentTrip.id, photoId);

        // Create timestamp at noon UTC for the target date
        const photoDate = new Date(customPickerDate + 'T12:00:00Z').toISOString();

        const newPhoto: TripPhoto = {
          id: photoId,
          tripId: currentTrip.id,
          activityId: (customPickerActivity || selectedActivity)?.id,
          uri: permanentUri,
          timestamp: photoDate,
          location: location || undefined,
          caption: '',
          createdAt: new Date().toISOString(),
        };

        newPhotos.push(newPhoto);
      } catch (error) {
        console.error(`❌ Error processing asset ${asset.id}:`, error);
        // Continue with next asset instead of failing completely
      }
    }

    // Add all photos at once
    const updatedTrips = trips.map(trip =>
      trip.id === currentTrip.id
        ? {
          ...trip,
          photos: [...trip.photos, ...newPhotos],
          updatedAt: new Date().toISOString()
        }
        : trip
    );

    await saveTrips(updatedTrips);
    const updatedTrip = updatedTrips.find(t => t.id === currentTrip.id) || null;
    setCurrentTrip(updatedTrip);

    // Close picker and reset state
    setShowCustomPhotoPicker(false);
    setSelectedPickerPhotos(new Set());
    setCustomPickerPhotos([]);
    setCustomPickerPhotoUris(new Map());
    setShowPhotoCapture(false);
    setSelectedActivity(null);
    setSelectedDate('');
    HapticFeedback.success();

    if (newPhotos.length > 1) {
      Alert.alert('Success', `Added ${newPhotos.length} photos to ${customPickerActivity?.name || 'the activity'}.`);
    }
  };

  const handlePhotoPress = (photo: TripPhoto) => {
    setSelectedPhoto(photo);
    setPhotoName(photo.caption || '');
    setPhotoDate(new Date(photo.timestamp).toISOString().split('T')[0]);
    setPhotoActivityId(photo.activityId || null);
    setPhotoLocation(photo.location?.address || '');
    setPhotoLat(photo.location?.latitude?.toString() || '');
    setPhotoLng(photo.location?.longitude?.toString() || '');
    setPhotoGeoStatus('idle');
    setShowPhotoDetail(true);
  };

  const updatePhotoDetails = async () => {
    if (!selectedPhoto || !currentTrip) return;

    // Build location object if we have address or coordinates
    let location: { latitude: number; longitude: number; address?: string } | undefined = undefined;
    if (photoLat && photoLng) {
      // Only add location if we have valid coordinates
      const loc: { latitude: number; longitude: number; address?: string } = {
        latitude: parseFloat(photoLat),
        longitude: parseFloat(photoLng),
      };

      if (photoLocation) {
        loc.address = photoLocation;
      }

      location = loc;
    }

    const updatedPhoto: TripPhoto = {
      ...selectedPhoto,
      caption: photoName,
      timestamp: new Date(photoDate + 'T00:00:00').toISOString(),
      activityId: photoActivityId || undefined,
      location,
    };

    const updatedTrips = trips.map(trip =>
      trip.id === currentTrip.id
        ? {
          ...trip,
          photos: trip.photos.map(p => p.id === selectedPhoto.id ? updatedPhoto : p),
          updatedAt: new Date().toISOString()
        }
        : trip
    );

    await saveTrips(updatedTrips);
    setCurrentTrip(updatedTrips.find(t => t.id === currentTrip.id) || null);
    setShowPhotoDetail(false);
    setSelectedPhoto(null);


    HapticFeedback.success();
  };

  const deletePhoto = async () => {
    if (!selectedPhoto || !currentTrip) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTrips = trips.map(trip =>
              trip.id === currentTrip.id
                ? {
                  ...trip,
                  photos: trip.photos.filter(p => p.id !== selectedPhoto.id),
                  updatedAt: new Date().toISOString()
                }
                : trip
            );

            await saveTrips(updatedTrips);
            setCurrentTrip(updatedTrips.find(t => t.id === currentTrip.id) || null);
            setShowPhotoDetail(false);
            setSelectedPhoto(null);


            HapticFeedback.success();
          }
        }
      ]
    );
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setEditActivityName(activity.name);
    setEditActivityTime(activity.time);
    setEditActivityLocation(activity.location?.address || '');
    setEditActivityLat(activity.location?.latitude?.toString() || '');
    setEditActivityLng(activity.location?.longitude?.toString() || '');
    setEditActivityGeoStatus('idle');
    setShowEditActivity(true);
  };

  const updateActivity = async () => {
    if (!editingActivity || !currentTrip) return;

    // Build location object if we have address or coordinates
    let location = undefined;
    if (editActivityLocation || editActivityLat || editActivityLng) {
      const loc: { address?: string; latitude?: number; longitude?: number } = {
        address: editActivityLocation || undefined,
      };

      // Add coordinates if provided
      if (editActivityLat && editActivityLng) {
        loc.latitude = parseFloat(editActivityLat);
        loc.longitude = parseFloat(editActivityLng);
      }

      location = loc;
    }

    const updatedActivity: Activity = {
      ...editingActivity,
      name: editActivityName,
      time: editActivityTime,
      location,
    };

    const updatedTrips = trips.map(trip =>
      trip.id === currentTrip.id
        ? {
          ...trip,
          activities: trip.activities.map(a => a.id === editingActivity.id ? updatedActivity : a),
          updatedAt: new Date().toISOString()
        }
        : trip
    );

    await saveTrips(updatedTrips);
    setCurrentTrip(updatedTrips.find(t => t.id === currentTrip.id) || null);
    setShowEditActivity(false);
    setEditingActivity(null);
    HapticFeedback.success();
  };

  const deleteActivity = async () => {
    if (!editingActivity || !currentTrip) return;

    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This will also delete all associated photos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTrips = trips.map(trip =>
              trip.id === currentTrip.id
                ? {
                  ...trip,
                  activities: trip.activities.filter(a => a.id !== editingActivity.id),
                  photos: trip.photos.filter(p => p.activityId !== editingActivity.id),
                  updatedAt: new Date().toISOString()
                }
                : trip
            );

            await saveTrips(updatedTrips);
            setCurrentTrip(updatedTrips.find(t => t.id === currentTrip.id) || null);
            setShowEditActivity(false);
            setEditingActivity(null);
            HapticFeedback.success();
          }
        }
      ]
    );
  };

  const geocodeLocation = async (locationText: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      setEditActivityGeoStatus('geocoding');
      // Use OpenStreetMap Nominatim API (free, no key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'SparksApp/1.0' // Required by Nominatim
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        setEditActivityGeoStatus('success');
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } else {
        setEditActivityGeoStatus('failed');
        return null;
      }
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      setEditActivityGeoStatus('failed');
      return null;
    }
  };

  const openEditTrip = () => {
    if (!currentTrip) return;
    setEditTripTitle(currentTrip.title);
    setEditTripStartDate(currentTrip.startDate);
    setEditTripEndDate(currentTrip.endDate);
    setEditTripMode(currentTrip.mode || 'record');
    // Initialize selectedDate to first date of trip for Add Activity section
    const tripDates = getTripDates();
    if (tripDates.length > 0 && !selectedDate) {
      setSelectedDate(tripDates[0]);
    }
    // Initialize activities list text for Manage Activities
    const activitiesText = currentTrip.activities
      .sort((a, b) => {
        const dateCompare = a.startDate.localeCompare(b.startDate);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '23:59').localeCompare(b.time || '23:59');
      })
      .map(activity => {
        const timeStr = activity.time || '';
        return `${activity.name}, ${activity.startDate}, ${timeStr}`;
      })
      .join('\n');
    setActivitiesListText(activitiesText);
    setShowEditTrip(true);
  };

  const updateTrip = async () => {
    if (!currentTrip) return;

    const newStatus = calculateTripStatus(editTripStartDate, editTripEndDate);
    let newMode = editTripMode;

    // Auto-switch to remember mode if trip becomes completed
    if (currentTrip.status !== 'completed' && newStatus === 'completed') {
      newMode = 'remember';
    }

    // Clear active state if switching to remember mode
    if (newMode === 'remember') {
      setActiveDayDate(null);
      setActiveActivityId(null);
    }

    const updatedTrip: Trip = {
      ...currentTrip,
      title: editTripTitle,
      startDate: editTripStartDate,
      endDate: editTripEndDate,
      status: newStatus,
      mode: newMode,
      updatedAt: new Date().toISOString()
    };

    const updatedTrips = trips.map(trip => trip.id === currentTrip.id ? updatedTrip : trip);
    await saveTrips(updatedTrips);

    // Update notifications if status changes
    if (currentTrip.status === 'planned' && newStatus !== 'planned') {
      // Trip is no longer planned, notifications will auto-expire
      // No explicit cancel needed
    } else if (newStatus === 'planned') {
      // Trip is now or still planned, schedule/reschedule notifications
      const tripDate = new Date(updatedTrip.startDate + 'T08:00:00');
      const dayBefore = new Date(tripDate);
      dayBefore.setDate(dayBefore.getDate() - 1);

      // Schedule day-before notification
      await NotificationService.scheduleActivityNotification(
        `${updatedTrip.title} starts tomorrow`,
        dayBefore,
        `trip-${updatedTrip.id}-before`,
        'Upcoming Trip',
        'trip-story',
        '✈️'
      );

      // Schedule day-of notification
      await NotificationService.scheduleActivityNotification(
        `${updatedTrip.title} is today`,
        tripDate,
        `trip-${updatedTrip.id}-day`,
        'Trip Today',
        'trip-story',
        '✈️'
      );
    }

    setCurrentTrip(updatedTrip);
    setShowEditTrip(false);
    HapticFeedback.success();
  };

  const deleteTrip = async () => {
    if (!currentTrip) return;

    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This will also delete all activities and photos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTrips = trips.filter(trip => trip.id !== currentTrip.id);
            await saveTrips(updatedTrips);

            // Notifications will auto-expire if time has passed
            // No explicit cancel needed

            setCurrentTrip(null);
            setShowTripDetail(false);
            setShowEditTrip(false);
            HapticFeedback.success();
          }
        }
      ]
    );
  };

  const selectActivityForPhoto = (activityId: string | null) => {
    setPhotoActivityId(activityId);
    setShowActivitySelector(false);
  };

  const generateTripStoryImage = async () => {
    if (!currentTrip) return;

    try {
      console.log('📄 Starting PDF generation for trip:', currentTrip.title);
      console.log('📊 Trip stats:', {
        photoCount: currentTrip.photos.length,
        activityCount: currentTrip.activities.length,
        tripDays: getTripDates().length,
      });

      // Show loading alert
      Alert.alert(
        'Generating PDF',
        `Processing ${currentTrip.photos.length} photos... This may take a moment.`,
        [{ text: 'OK' }]
      );

      // Helper function to resize and compress image for PDF
      const resizeImageForPDF = async (photoUri: string): Promise<string> => {
        try {
          // Resize image to max 400px width (maintains aspect ratio)
          // Compress to 0.7 quality to reduce file size
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photoUri,
            [{ resize: { width: 400 } }], // Max width 400px, height auto
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          return manipulatedImage.uri;
        } catch (error) {
          console.warn('⚠️ Could not resize image, using original:', error);
          return photoUri; // Return original if resize fails
        }
      };

      // Helper function to convert photo URI to base64 data URI
      const photoToDataUri = async (photoUri: string, photoIndex: number, totalPhotos: number): Promise<string> => {
        try {
          // Check if it's already a data URI
          if (photoUri.startsWith('data:')) {
            console.log(`✅ Photo ${photoIndex + 1}/${totalPhotos}: Already data URI`);
            return photoUri;
          }

          // Resize and compress image first to reduce memory usage
          console.log(`🔄 Photo ${photoIndex + 1}/${totalPhotos}: Resizing and compressing...`);
          const resizedUri = await resizeImageForPDF(photoUri);

          // Try to read the resized file - if it fails, the file doesn't exist or isn't accessible
          try {
            console.log(`🔄 Photo ${photoIndex + 1}/${totalPhotos}: Converting to base64...`);
            const base64 = await FileSystem.readAsStringAsync(resizedUri, {
              encoding: 'base64' as any,
            });

            const dataUriSize = base64.length;
            console.log(`✅ Photo ${photoIndex + 1}/${totalPhotos}: Converted (${(dataUriSize / 1024).toFixed(1)}KB base64)`);

            // Return as data URI
            return `data:image/jpeg;base64,${base64}`;
          } catch (readError) {
            console.warn(`⚠️ Photo ${photoIndex + 1}/${totalPhotos}: File does not exist or cannot be read: ${resizedUri}`, readError);
            return ''; // Return empty string for broken images
          }
        } catch (error) {
          console.error(`❌ Photo ${photoIndex + 1}/${totalPhotos}: Error converting to base64: ${photoUri}`, error);
          return ''; // Return empty string on error
        }
      };

      // Convert all photos to base64 data URIs with progress tracking
      console.log('🔄 Starting photo conversion...');
      const photoDataUriMap = new Map<string, string>();
      const totalPhotos = currentTrip.photos.length;
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const photo of currentTrip.photos) {
        if (photo.uri) {
          const dataUri = await photoToDataUri(photo.uri, processedCount, totalPhotos);
          if (dataUri) {
            photoDataUriMap.set(photo.id, dataUri);
            successCount++;
          } else {
            errorCount++;
          }
        }
        processedCount++;

        // Log progress every 10 photos
        if (processedCount % 10 === 0 || processedCount === totalPhotos) {
          console.log(`📊 Progress: ${processedCount}/${totalPhotos} photos processed (${successCount} success, ${errorCount} errors)`);
        }
      }

      console.log(`✅ Photo conversion complete: ${successCount} successful, ${errorCount} errors`);

      // Calculate total HTML size estimate
      const estimatedHtmlSize = Array.from(photoDataUriMap.values()).reduce((sum, uri) => sum + uri.length, 0);
      console.log(`📏 Estimated HTML size: ${(estimatedHtmlSize / 1024 / 1024).toFixed(2)}MB (after compression)`);

      if (estimatedHtmlSize > 20 * 1024 * 1024) { // 20MB (reduced from 50MB since we're compressing)
        console.warn('⚠️ WARNING: HTML size is very large, may cause memory issues');
      } else {
        console.log('✅ HTML size is within safe limits');
      }

      // Create a simple HTML template for the trip story
      console.log('🔄 Generating HTML template...');
      const tripDates = getTripDates();
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              page-break-after: avoid;
              break-after: avoid;
            }
            .title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .dates { font-size: 16px; color: #666; }
            .day { 
              margin-bottom: 30px; 
              border: 1px solid #e0e0e0; 
              border-radius: 8px; 
              padding: 15px;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-before: auto;
              break-before: auto;
            }
                        .day-title { 
              background-color: #6a0dad; /* purple */
              color: #ffffff; /* white text */
              font-size: 18px; 
              font-weight: bold; 
              text-align: center; 
              padding: 10px; 
              margin: -15px -15px 15px -15px; /* extend to full width of .day container */
              border-radius: 8px 8px 0 0; 
            }
            .activity { 
              margin-bottom: 15px; 
              padding: 10px; 
              background: #f8f9fa; 
              border-radius: 6px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .activity-name { 
              font-weight: bold; 
              margin-bottom: 5px;
              page-break-after: avoid;
              break-after: avoid;
            }
            .activity-time { color: #666; font-size: 14px; }
            .photos { 
              display: flex; 
              flex-wrap: wrap; 
              gap: 10px; 
              margin-top: 10px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .photo { 
              max-width: 400px; 
              max-height: 400px; 
              width: auto; 
              height: auto; 
              object-fit: contain; 
              border-radius: 8px;
              page-break-inside: avoid;
              break-inside: avoid;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${currentTrip.title || 'Untitled Trip'}</div>
            <div class="dates">${formatDate(currentTrip.startDate || '')} - ${formatDate(currentTrip.endDate || '')}</div>
          </div>
          ${tripDates.map((date, index) => {
        const dayActivities = currentTrip.activities
          .filter(activity => activity.startDate === date)
          .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
        const dayPhotos = currentTrip.photos.filter(photo => {
          const photoDate = new Date(photo.timestamp).toISOString().split('T')[0];
          return photoDate === date;
        });

        // Filter activities to only those with photos
        const activitiesWithPhotos = dayActivities.filter(activity =>
          dayPhotos.some(photo => photo.activityId === activity.id)
        );

        return `
              <div class="day">
                <div class="day-title">${formatDateWithDayNumber(date, index + 1, tripDates.length)}</div>
                
                ${/* Day Photos Section - Moved to top and label removed */ ''}
                ${dayPhotos.filter(photo => !photo.activityId).length > 0 ? `
                  <div class="photos" style="margin-bottom: 20px;">
                    ${dayPhotos.filter(photo => !photo.activityId).map(photo => {
          const dataUri = photoDataUriMap.get(photo.id) || '';
          return dataUri ? `<img src="${dataUri}" class="photo" alt="Trip photo" />` : '';
        }).join('')}
                  </div>
                ` : ''}

                ${/* Activities Section */ ''}
                ${activitiesWithPhotos.map(activity => `
                  <div class="activity">
                    <div class="activity-name">${activity.name || 'Untitled Activity'}</div>
                    <div class="photos">
                      ${dayPhotos.filter(photo => photo.activityId === activity.id).map(photo => {
          const dataUri = photoDataUriMap.get(photo.id) || '';
          return dataUri ? `<img src="${dataUri}" class="photo" alt="Trip photo" />` : '';
        }).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
      }).join('')}
        </body>
        </html>
      `;

      // Generate PDF using expo-print
      console.log('🔄 Generating PDF from HTML...');
      console.log(`📏 HTML length: ${(html.length / 1024 / 1024).toFixed(2)}MB`);

      try {
        const startTime = Date.now();
        const { uri } = await Print.printToFileAsync({ html });
        const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ PDF generated at: ${uri} (took ${generationTime}s)`);

        // Rename PDF to trip name
        const sanitizedTripName = currentTrip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const documentDir = (FileSystem as any).documentDirectory;
        if (documentDir) {
          const newFileName = `${sanitizedTripName}_trip_story.pdf`;
          const newUri = `${documentDir}${newFileName}`;
          try {
            await FileSystem.moveAsync({ from: uri, to: newUri });
            console.log('✅ PDF renamed to:', newUri);

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
              Alert.alert(
                'Sharing Not Available',
                'Sharing is not available on this device. The PDF has been generated but cannot be shared.',
                [{ text: 'OK' }]
              );
              return;
            }

            // Share the renamed PDF
            const result = await Sharing.shareAsync(newUri, {
              mimeType: 'application/pdf',
              dialogTitle: `Share ${currentTrip.title} Trip Story`,
              UTI: 'com.adobe.pdf',
            });
            console.log('✅ PDF shared:', result);
            HapticFeedback.success();
            return;
          } catch (renameError) {
            console.warn('⚠️ Could not rename PDF, using original:', renameError);
            // Fall through to use original URI
          }
        }

        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            'Sharing Not Available',
            'Sharing is not available on this device. The PDF has been generated but cannot be shared.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Share the PDF with original name
        const result = await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${currentTrip.title} Trip Story`,
          UTI: 'com.adobe.pdf',
        });

      } catch (printError) {
        console.error('❌ Print/Share error:', printError);
        console.error('❌ Error details:', {
          message: printError instanceof Error ? printError.message : 'Unknown error',
          stack: printError instanceof Error ? printError.stack : undefined,
          name: printError instanceof Error ? printError.name : undefined,
        });
        Alert.alert(
          'PDF Generation Error',
          `Failed to generate or share PDF: ${printError instanceof Error ? printError.message : 'Unknown error'}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error generating trip story:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        tripTitle: currentTrip?.title,
        photoCount: currentTrip?.photos.length,
      });
      Alert.alert(
        'Error',
        `Failed to generate trip story: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  const shareTripAsImage = async () => {
    if (!currentTrip) return;

    try {
      // For now, we'll create a simple text-based share
      const tripSummary = currentTrip.activities
        .sort((a, b) => {
          const dateCompare = a.startDate.localeCompare(b.startDate);
          if (dateCompare !== 0) return dateCompare;
          return (a.time || '23:59').localeCompare(b.time || '23:59');
        })
        .map(activity => {
          const timeStr = activity.time || '';
          return `${activity.name}, ${activity.startDate}, ${timeStr}`;
        })
        .join('\n');

      await Share.share({
        message: tripSummary,
        title: `Share ${currentTrip.title} Trip Story`,
      });

      HapticFeedback.success();
    } catch (error) {
      console.error('Error sharing trip:', error);
      Alert.alert('Error', 'Failed to share trip story. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle both YYYY-MM-DD and other formats
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDayYear = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `${dayOfWeek} ${monthDayYear}`;
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  const formatDateWithDayNumber = (dateString: string, dayNumber: number, totalDays: number) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return `${dateString} (Day ${dayNumber}/${totalDays})`;
      }
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDayYear = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `${dayOfWeek} ${monthDayYear} (Day ${dayNumber}/${totalDays})`;
    } catch (error) {
      return `${dateString} (Day ${dayNumber}/${totalDays})`;
    }
  };

  const getTripDates = () => {
    if (!currentTrip || !currentTrip.startDate || !currentTrip.endDate) return [];

    try {
      const startDate = new Date(currentTrip.startDate + 'T00:00:00');
      const endDate = new Date(currentTrip.endDate + 'T00:00:00');

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('⚠️ Invalid trip dates:', { startDate: currentTrip.startDate, endDate: currentTrip.endDate });
        return [];
      }

      const dates = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      return dates;
    } catch (error) {
      console.error('❌ Error in getTripDates:', error, currentTrip);
      return [];
    }
  };

  const getTripStatus = (trip: Trip) => {
    try {
      if (!trip || !trip.startDate || !trip.endDate) {
        console.warn('⚠️ Invalid trip data in getTripStatus:', trip);
        return 'active'; // Default to active if data is invalid
      }

      const now = new Date();
      // Get today's date at start of day for comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(trip.startDate + 'T00:00:00');
      // Set end date to end of day (23:59:59.999) so trip is active on the end date itself
      const endDate = new Date(trip.endDate + 'T23:59:59.999');

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('⚠️ Invalid date in getTripStatus:', { startDate: trip.startDate, endDate: trip.endDate });
        return 'active';
      }

      if (today < startDate) return 'planned';
      if (today > endDate) return 'completed';
      return 'active';
    } catch (error) {
      console.error('❌ Error in getTripStatus:', error, trip);
      return 'active'; // Default to active on error
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return '#FFA500';
      case 'active': return '#00FF00';
      case 'completed': return '#808080';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Planned';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getDaysRemaining = (targetDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate + 'T00:00:00');
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProximityText = (days: number): string => {
    if (days < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;

    const weeks = Math.round(days / 7);
    if (days < 30) return `In ${weeks} week${weeks > 1 ? 's' : ''}`;

    const months = Math.round(days / 30);
    if (days < 365) return `In ${months} month${months > 1 ? 's' : ''}`;

    return 'In 1 year+';
  };

  const getProximityColor = (days: number): string => {
    if (days === 0) return '#FF3B30'; // Red for Today
    if (days === 1) return '#FF9500'; // Orange for Tomorrow
    if (days < 7) return '#FFCC00'; // Yellow for this week
    if (days < 30) return '#34C759'; // Green for this month
    return colors.textSecondary; // Gray for later
  };

  const getSortedTrips = () => {
    try {
      if (!trips || !Array.isArray(trips)) {
        console.warn('⚠️ trips is not a valid array:', trips);
        return [];
      }

      const now = new Date();

      // Filter and sort trips by status
      const plannedTrips = trips.filter(trip => {
        if (!trip || !trip.startDate) return false;
        try {
          const startDate = new Date(trip.startDate + 'T00:00:00');
          return !isNaN(startDate.getTime()) && startDate > now; // Planned
        } catch (error) {
          console.warn('⚠️ Error filtering planned trip:', error, trip);
          return false;
        }
      }).sort((a, b) => {
        const dateA = new Date(a.startDate + 'T00:00:00');
        const dateB = new Date(b.startDate + 'T00:00:00');
        return dateA.getTime() - dateB.getTime(); // Next planned to furthest
      });

      const activeTrips = trips.filter(trip => {
        if (!trip || !trip.startDate || !trip.endDate) return false;
        try {
          const startDate = new Date(trip.startDate + 'T00:00:00');
          // Set end date to end of day so trip is active on the end date itself
          const endDate = new Date(trip.endDate + 'T23:59:59.999');
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
          return startDate <= now && endDate >= now; // Active (includes end date)
        } catch (error) {
          console.warn('⚠️ Error filtering active trip:', error, trip);
          return false;
        }
      }).sort((a, b) => {
        const dateA = new Date(a.startDate + 'T00:00:00');
        const dateB = new Date(b.startDate + 'T00:00:00');
        return dateA.getTime() - dateB.getTime(); // Earliest to latest
      });

      const completedTrips = trips.filter(trip => {
        if (!trip || !trip.endDate) return false;
        try {
          // Set end date to end of day - trip is only completed after the end date has passed
          const endDate = new Date(trip.endDate + 'T23:59:59.999');
          if (isNaN(endDate.getTime())) return false;
          return endDate < now; // Completed (only after end date has fully passed)
        } catch (error) {
          console.warn('⚠️ Error filtering completed trip:', error, trip);
          return false;
        }
      }).sort((a, b) => {
        const dateA = new Date(a.endDate + 'T00:00:00');
        const dateB = new Date(b.endDate + 'T00:00:00');
        return dateB.getTime() - dateA.getTime(); // Most recent to oldest
      });

      // Order: Active trips first, then pending (planned) trips, then completed trips
      return [...activeTrips, ...plannedTrips, ...completedTrips];
    } catch (error) {
      console.error('❌ Error in getSortedTrips:', error);
      return trips || []; // Return original array or empty array on error
    }
  };

  const renderTripCard = (trip: Trip) => {
    const status = getTripStatus(trip);
    const statusColor = getStatusColor(status);
    const statusText = getStatusText(status);

    return (
      <TouchableOpacity
        key={trip.id}
        style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setCurrentTrip(trip);
          setActiveTripId(trip.id); // Set active trip when opening
          setShowTripDetail(true);
        }}
        activeOpacity={0.7}
      >
        {/* dyornote: this is the trip card */}
        <View style={styles.tripHeader}>
          <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
          <View style={styles.tripHeaderRight}>
            {trip.status === 'planned' ? (
              <View style={[styles.statusBadge, { backgroundColor: getProximityColor(getDaysRemaining(trip.startDate)) }]}>
                <Text style={[styles.statusText, { color: colors.background }]}>{getProximityText(getDaysRemaining(trip.startDate))}</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.tripDates, { color: colors.textSecondary }]}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>
        {trip.status !== 'planned' && (
          <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
            {trip.photos.length} photos • {trip.activities.length} activities
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderCreateTripModal = () => (
    <Modal visible={showCreateTrip} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Trip</Text>
            <TouchableOpacity onPress={() => setShowCreateTrip(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Trip Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={newTripTitle}
                onChangeText={setNewTripTitle}
                placeholder="Enter trip title"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={newTripStartDate}
                  onChangeText={setNewTripStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.inputGroup, styles.inputGroupHalf]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>End Date *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={newTripEndDate}
                  onChangeText={setNewTripEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Manage Activities Section */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 8 }]}>
                Add Activities (Optional):
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                    minHeight: 150,
                    textAlignVertical: 'top',
                    paddingTop: 12,
                  }
                ]}
                value={activitiesListText}
                onChangeText={setActivitiesListText}
                placeholder="Activity Name, 2025-11-08, 23:00-23:30"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={8}
              />
              <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: 12, marginTop: 8 }]}>
                Format: Activity Name, YYYY-MM-DD, HH:MM{'\n'}
                Example:{'\n'}
                Breakfast, 2025-11-08, 08:00{'\n'}
                Museum Visit, 2025-11-08, 14:00{'\n'}
                Dinner, 2025-11-08, 19:00-20:30
              </Text>
            </View>

          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={{ width: '100%', paddingHorizontal: 20, paddingVertical: 20 }}>
              <SettingsButton
                title="Create Trip"
                variant="primary"
                onPress={createTrip}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Initialize selectedDate when Add Activity modal opens
  useEffect(() => {
    if (showAddActivityModal && currentTrip) {
      const tripDates = getTripDates();
      if (tripDates.length > 0 && !selectedDate) {
        setSelectedDate(tripDates[0]);
      }

      // Scroll to selected date
      if (dateScrollViewRef.current && selectedDate) {
        const dateIndex = tripDates.indexOf(selectedDate);
        if (dateIndex >= 0) {
          const buttonWidth = 120;
          const scrollX = Math.max(0, (dateIndex * buttonWidth) - 40);
          setTimeout(() => {
            if (dateScrollViewRef.current) {
              dateScrollViewRef.current.scrollTo({ x: scrollX, animated: true });
            }
          }, 300);
        }
      }
    }
  }, [showAddActivityModal, currentTrip]);

  const renderAddActivityModal = () => (
    <Modal visible={showAddActivityModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Activity</Text>
          <TouchableOpacity onPress={() => {
            setShowAddActivityModal(false);
            setNewActivityName('');
            setNewActivityTime('');
            setSelectedDate('');
          }}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Activity Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={newActivityName}
              onChangeText={setNewActivityName}
              placeholder="Enter activity name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Date *</Text>
            <ScrollView
              ref={dateScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScrollView}
            >
              {currentTrip ? getTripDates().map(date => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateOption,
                    {
                      backgroundColor: selectedDate === date ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    { color: selectedDate === date ? colors.background : colors.text }
                  ]}>
                    {formatDate(date)}
                  </Text>
                </TouchableOpacity>
              )) : null}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Time</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={newActivityTime}
              onChangeText={setNewActivityTime}
              placeholder="HH:MM (e.g., 14:30)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

        </ScrollView>

        <View style={styles.modalFooter}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={async () => {
                await addActivity();
                setShowAddActivityModal(false);
              }}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={async () => {
                await addActivity();
                // Keep modal open and clear form for next activity
                setNewActivityName('');
                setNewActivityTime('');
                // Keep selectedDate so user can add multiple activities to same day
              }}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>Add Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const parseActivitiesList = (text: string, tripId: string): Activity[] => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const activities: Activity[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const date = parts[1];
        const time = parts[2] || '12:00';

        // Validate date format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          activities.push({
            id: `activity-${Date.now()}-${index}`,
            name,
            startDate: date,
            time,
            photos: [],
            tripId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return activities;
  };

  const saveActivitiesFromList = async () => {
    if (!currentTrip) return;

    const newActivities = parseActivitiesList(activitiesListText, currentTrip.id);

    if (newActivities.length === 0) {
      Alert.alert('Error', 'No valid activities found. Please check the format.');
      return;
    }

    const updatedTrips = trips.map(trip =>
      trip.id === currentTrip.id
        ? { ...trip, activities: newActivities, updatedAt: new Date().toISOString() }
        : trip
    );

    await saveTrips(updatedTrips);
    const updatedTrip = updatedTrips.find(t => t.id === currentTrip.id) || null;
    setCurrentTrip(updatedTrip);
    setShowManageActivities(false);
    setActivitiesListText('');

    HapticFeedback.success();
    Alert.alert('Success', `Saved ${newActivities.length} activities.`);
  };

  const renderManageActivitiesModal = () => (
    <Modal visible={showManageActivities} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Activities</Text>
          <TouchableOpacity onPress={() => {
            setShowManageActivities(false);
            setActivitiesListText('');
          }}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 8 }]}>
              Enter activities (one per line):{'\n'}
              Format: Activity Name, YYYY-MM-DD, HH:MM
            </Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, fontSize: 12, marginBottom: 8 }]}>
              Example:{'\n'}
              Breakfast, 2025-11-08, 08:00{'\n'}
              Museum Visit, 2025-11-08, 14:00{'\n'}
              Dinner, 2025-11-08, 19:00-20:30
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                  minHeight: 200,
                  textAlignVertical: 'top',
                  paddingTop: 12,
                }
              ]}
              value={activitiesListText}
              onChangeText={setActivitiesListText}
              placeholder="Activity Name, 2025-11-08, 23:00-23:30"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={10}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={saveActivitiesFromList}
          >
            <Text style={[styles.createButtonText, { color: colors.background }]}>Save Activities</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPhotoCaptureModal = () => (
    <Modal visible={showPhotoCapture} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Photo</Text>
          <TouchableOpacity onPress={() => setShowPhotoCapture(false)}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Select Activity (Optional)</Text>
          <ScrollView style={styles.activityList}>
            <TouchableOpacity
              style={[
                styles.activityOption,
                {
                  backgroundColor: selectedActivity === null ? colors.primary : colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setSelectedActivity(null)}
            >
              <Text style={[
                styles.activityOptionText,
                { color: selectedActivity === null ? colors.background : colors.text }
              ]}>No Activity</Text>
            </TouchableOpacity>
            {currentTrip?.activities.map(activity => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityOption,
                  {
                    backgroundColor: selectedActivity?.id === activity.id ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setSelectedActivity(activity)}
              >
                <Text style={[
                  styles.activityOptionText,
                  { color: selectedActivity?.id === activity.id ? colors.background : colors.text }
                ]}>{activity.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.modalFooter}>
          <View style={styles.photoButtonContainer}>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: colors.primary }]}
              onPress={() => capturePhoto()}
            >
              <Text style={[styles.photoButtonText, { color: colors.background }]}>📸 Snap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoButton, styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => addFromGallery()}
            >
              <Text style={[styles.photoButtonText, { color: colors.primary }]}>Add 1</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPhotoDetailModal = () => {
    if (!selectedPhoto) return null;

    const associatedActivity = currentTrip?.activities.find(a => a.id === selectedPhoto.activityId);
    const photoDate = new Date(selectedPhoto.timestamp).toISOString().split('T')[0];

    return (
      <Modal visible={showPhotoDetail} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Photo Details</Text>
            <TouchableOpacity onPress={() => setShowPhotoDetail(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Photo Preview */}
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreviewFullWidth} />
            </View>

            {/* Photo Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Photo Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={photoName}
                onChangeText={setPhotoName}
                placeholder="Enter photo name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Photo Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={photoDate}
                onChangeText={setPhotoDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>


            {/* Location Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Location (Optional)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[{ flex: 1 }, styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={photoLocation}
                  onChangeText={setPhotoLocation}
                  placeholder="Enter location address"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.geocodeButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (!photoLocation.trim()) {
                      Alert.alert('Missing Location', 'Please enter a location address first.');
                      return;
                    }

                    setPhotoGeoStatus('geocoding');
                    const coords = await geocodeLocation(photoLocation);
                    if (coords) {
                      setPhotoLat(coords.lat.toString());
                      setPhotoLng(coords.lng.toString());
                      setPhotoGeoStatus('success');
                      Alert.alert('Success', 'Coordinates updated!');
                    } else {
                      setPhotoGeoStatus('failed');
                      Alert.alert('Geocoding Failed', 'Could not find coordinates for this location. You can enter them manually.');
                    }
                  }}
                >
                  <Text style={[styles.geocodeButtonText, { color: colors.background }]}>
                    {photoGeoStatus === 'geocoding' ? '...' : '📍'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Coordinates Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Coordinates (Optional)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={photoLat}
                  onChangeText={setPhotoLat}
                  placeholder="Latitude"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={photoLng}
                  onChangeText={setPhotoLng}
                  placeholder="Longitude"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* View in Maps Link */}
            {(selectedPhoto.location || (photoLat && photoLng)) && (
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.locationContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    const lat = selectedPhoto.location?.latitude || parseFloat(photoLat);
                    const lng = selectedPhoto.location?.longitude || parseFloat(photoLng);
                    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
                    Linking.openURL(url).catch(err => {
                      console.error('Error opening maps:', err);
                      Alert.alert('Error', 'Could not open maps application');
                    });
                  }}
                >
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    📍 {selectedPhoto.location?.latitude?.toFixed(6) || photoLat}, {selectedPhoto.location?.longitude?.toFixed(6) || photoLng}
                  </Text>
                  <Text style={[styles.locationSubtext, { color: colors.textSecondary }]}>
                    Tap to open in maps
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Current Activity Info */}
            {!showActivitySelector ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Currently Associated With</Text>
                <TouchableOpacity
                  style={[styles.currentActivityContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowActivitySelector(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.currentActivityText, { color: colors.text }]}>
                    {associatedActivity ? associatedActivity.name : 'No Activity'}
                  </Text>
                  {associatedActivity && (
                    <Text style={[styles.currentActivitySubtext, { color: colors.textSecondary }]}>
                      {formatDate(associatedActivity.startDate)} at {associatedActivity.time}
                    </Text>
                  )}
                  <Text style={[styles.tapToChangeText, { color: colors.textSecondary }]}>
                    Tap to change
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <View style={styles.activitySelectorHeader}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Select Activity</Text>
                  <TouchableOpacity onPress={() => setShowActivitySelector(false)}>
                    <Text style={[styles.tapToChangeText, { color: colors.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.activitySelectorList}>
                  <TouchableOpacity
                    style={[
                      styles.activityOption,
                      {
                        backgroundColor: photoActivityId === null ? colors.primary : colors.surface,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => {
                      setPhotoActivityId(null);
                      setShowActivitySelector(false);
                    }}
                  >
                    <Text style={[
                      styles.activityOptionText,
                      { color: photoActivityId === null ? colors.background : colors.text }
                    ]}>
                      No Activity
                    </Text>
                  </TouchableOpacity>
                  {currentTrip?.activities.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityOption,
                        {
                          backgroundColor: photoActivityId === activity.id ? colors.primary : colors.surface,
                          borderColor: colors.border
                        }
                      ]}
                      onPress={() => {
                        setPhotoActivityId(activity.id);
                        setShowActivitySelector(false);
                      }}
                    >
                      <Text style={[
                        styles.activityOptionText,
                        { color: photoActivityId === activity.id ? colors.background : colors.text }
                      ]}>
                        {activity.name}
                      </Text>
                      <Text style={[
                        styles.activityOptionSubtext,
                        { color: photoActivityId === activity.id ? colors.background : colors.textSecondary }
                      ]}>
                        {formatDate(activity.startDate)} at {activity.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
              onPress={deletePhoto}
            >
              <Text style={[styles.deleteButtonText, { color: 'white' }]}>Delete Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.primary }]}
              onPress={updatePhotoDetails}
            >
              <Text style={[styles.deleteButtonText, { color: colors.background }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderActivitySelectorModal = () => {
    return (
      <Modal visible={showActivitySelector} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Activity</Text>
            <TouchableOpacity onPress={() => setShowActivitySelector(false)}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.activityOption,
                {
                  backgroundColor: photoActivityId === null ? colors.primary : colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={() => selectActivityForPhoto(null)}
            >
              <Text style={[
                styles.activityOptionText,
                { color: photoActivityId === null ? colors.background : colors.text }
              ]}>
                No Activity
              </Text>
            </TouchableOpacity>
            {currentTrip?.activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityOption,
                  {
                    backgroundColor: photoActivityId === activity.id ? colors.primary : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => selectActivityForPhoto(activity.id)}
              >
                <Text style={[
                  styles.activityOptionText,
                  { color: photoActivityId === activity.id ? colors.background : colors.text }
                ]}>
                  {activity.name}
                </Text>
                <Text style={[
                  styles.activityOptionSubtext,
                  { color: photoActivityId === activity.id ? colors.background : colors.textSecondary }
                ]}>
                  {formatDate(activity.startDate)} at {activity.time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderEditActivityModal = () => (
    <Modal visible={showEditActivity} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Activity</Text>
          <TouchableOpacity onPress={() => setShowEditActivity(false)}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Activity Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editActivityName}
              onChangeText={setEditActivityName}
              placeholder="Enter activity name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Time</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editActivityTime}
              onChangeText={setEditActivityTime}
              placeholder="HH:MM (e.g., 14:30)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Location (Optional)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[{ flex: 1 }, styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={editActivityLocation}
                onChangeText={setEditActivityLocation}
                placeholder="Enter location address"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.geocodeButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!editActivityLocation.trim()) {
                    Alert.alert('Missing Location', 'Please enter a location address first.');
                    return;
                  }

                  const coords = await geocodeLocation(editActivityLocation);
                  if (coords) {
                    setEditActivityLat(coords.lat.toString());
                    setEditActivityLng(coords.lng.toString());
                    Alert.alert('Success', 'Coordinates updated!');
                  } else {
                    Alert.alert('Geocoding Failed', 'Could not find coordinates for this location. You can enter them manually.');
                  }
                }}
              >
                <Text style={[styles.geocodeButtonText, { color: colors.background }]}>
                  {editActivityGeoStatus === 'geocoding' ? '...' : 'Locate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Coordinates (Optional)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={editActivityLat}
                onChangeText={setEditActivityLat}
                placeholder="Latitude"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.coordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={editActivityLng}
                onChangeText={setEditActivityLng}
                placeholder="Longitude"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, flex: 1, paddingVertical: 12 }]}
              onPress={updateActivity}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#FF3B30', flex: 1, paddingVertical: 12 }]}
              onPress={deleteActivity}
            >
              <Text style={[styles.deleteButtonText, { color: 'white' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditTripModal = () => (
    <Modal visible={showEditTrip} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Trip</Text>
          <TouchableOpacity onPress={() => setShowEditTrip(false)}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Trip Title *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editTripTitle}
              onChangeText={setEditTripTitle}
              placeholder="Enter trip title"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editTripStartDate}
              onChangeText={setEditTripStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>End Date *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editTripEndDate}
              onChangeText={setEditTripEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Mode *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, { backgroundColor: editTripMode === 'record' ? colors.surface : 'transparent' }]}
                onPress={() => setEditTripMode('record')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: colors.border }]}>
                  {editTripMode === 'record' && (
                    <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, { color: colors.text }]}>Record</Text>
                  <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                    Planning mode - add photos and activities
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, { backgroundColor: editTripMode === 'remember' ? colors.surface : 'transparent' }]}
                onPress={() => setEditTripMode('remember')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: colors.border }]}>
                  {editTripMode === 'remember' && (
                    <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, { color: colors.text }]}>Remember</Text>
                  <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>
                    Viewing mode - optimized for browsing photos
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, flex: 1, paddingHorizontal: 4 }]}
              onPress={updateTrip}
            >
              <Text style={[styles.createButtonText, { color: colors.background, fontSize: 14 }]} numberOfLines={1}>Update Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary, flex: 1, paddingHorizontal: 4 }]}
              onPress={() => {
                setShowEditTrip(false);
                setShowAddActivityModal(true);
              }}
            >
              <Text style={[styles.createButtonText, { color: colors.background, fontSize: 14 }]} numberOfLines={1}>Add Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#FF3B30', flex: 1, paddingHorizontal: 4, marginBottom: 0 }]}
              onPress={deleteTrip}
            >
              <Text style={[styles.deleteButtonText, { color: 'white', fontSize: 14 }]} numberOfLines={1}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCustomPhotoPickerModal = () => {
    const photoSize = (screenWidth - 48) / 3; // 3 columns with padding

    const togglePhotoSelection = (photoId: string) => {
      setSelectedPickerPhotos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(photoId)) {
          newSet.delete(photoId);
        } else {
          if (!customPickerAllowMultiple && newSet.size > 0) {
            // Single selection mode - replace selection
            newSet.clear();
          }
          newSet.add(photoId);
        }
        return newSet;
      });
    };

    return (
      <Modal
        visible={showCustomPhotoPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Photos {customPickerDate ? `(${formatDate(customPickerDate)})` : ''}
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {customPickerPhotos.length === 0 ? (
              <View style={[styles.emptyState, { padding: 40 }]}>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Loading photos...
                </Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {customPickerPhotos.map((asset) => {
                  const isSelected = selectedPickerPhotos.has(asset.id);
                  // Get the display URI from our map, fallback to asset.uri
                  const imageUri = customPickerPhotoUris.get(asset.id) || asset.uri;
                  return (
                    <TouchableOpacity
                      key={asset.id}
                      style={[
                        styles.photoGridItem,
                        {
                          width: photoSize,
                          height: photoSize,
                          borderWidth: isSelected ? 3 : 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: colors.border + '40', // Light background for empty boxes
                        }
                      ]}
                      onPress={() => togglePhotoSelection(asset.id)}
                    >
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={[styles.photoGridImage, { width: photoSize, height: photoSize }]}
                          resizeMode="cover"
                          onError={(error) => {
                            console.error('❌ Error loading thumbnail for asset:', asset.id, imageUri, error);
                          }}
                        />
                      ) : (
                        <View style={[styles.photoGridPlaceholder, { width: photoSize, height: photoSize }]}>
                          <Text style={{ color: colors.textSecondary, fontSize: 24 }}>📷</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.photoGridCheckmark, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.photoGridCheckmarkText, { color: colors.background }]}>
                            ✓
                          </Text>
                        </View>
                      )}
                      {customPickerAllowMultiple && (
                        <View style={[styles.photoGridBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.photoGridBadgeText, { color: colors.background }]}>
                            {Array.from(selectedPickerPhotos).indexOf(asset.id) + 1}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.modalFooterButton,
                {
                  backgroundColor: selectedPickerPhotos.size > 0 ? colors.primary : colors.border,
                  opacity: selectedPickerPhotos.size > 0 ? 1 : 0.5,
                  flex: 1,
                  marginRight: 8,
                }
              ]}
              onPress={handleCustomPickerSelection}
              disabled={selectedPickerPhotos.size === 0}
            >
              <Text style={[styles.modalFooterButtonText, { color: colors.background }]}>
                Add {selectedPickerPhotos.size > 0 ? `(${selectedPickerPhotos.size})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalFooterButton,
                {
                  backgroundColor: colors.border,
                  flex: 1,
                  marginLeft: 8,
                }
              ]}
              onPress={() => {
                setShowCustomPhotoPicker(false);
                setSelectedPickerPhotos(new Set());
                setCustomPickerPhotos([]);
                setCustomPickerPhotoUris(new Map());
              }}
            >
              <Text style={[styles.modalFooterButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMapViewModal = () => {
    if (!currentTrip) return null;

    const tripDates = getTripDates();

    // Helper function to get photo count for a specific day
    const getPhotoCountForDay = (date: string): number => {
      const dayPhotos = currentTrip.photos.filter(photo => {
        if (!photo.timestamp) return false;
        const photoDate = new Date(photo.timestamp).toISOString().split('T')[0];
        return photoDate === date;
      });
      return dayPhotos.length;
    };

    // Get all photos with locations (both activity photos and standalone photos)
    let photosWithLocations = currentTrip.photos
      .filter(photo => photo.location?.latitude && photo.location?.longitude)
      .map(photo => ({
        photo,
        activity: photo.activityId ? currentTrip.activities.find(a => a.id === photo.activityId) : null,
        latitude: photo.location!.latitude,
        longitude: photo.location!.longitude,
      }));

    // Filter by selected day if a day is selected
    if (selectedMapDay) {
      photosWithLocations = photosWithLocations.filter(p => {
        if (!p.photo.timestamp) return false;
        const photoDate = new Date(p.photo.timestamp).toISOString().split('T')[0];
        return photoDate === selectedMapDay;
      });
    }

    // Get activities with explicit locations (but no photos yet)
    let activitiesWithExplicitLocations = currentTrip.activities
      .filter(activity => {
        // Only include if activity has explicit location AND no photos with locations
        if (!activity.location?.latitude || !activity.location?.longitude) return false;
        const hasPhotoWithLocation = photosWithLocations.some(p => p.photo.activityId === activity.id);
        return !hasPhotoWithLocation;
      })
      .map(activity => ({
        activity,
        photo: null,
        latitude: activity.location!.latitude,
        longitude: activity.location!.longitude,
      }));

    // Filter activities by selected day if a day is selected
    if (selectedMapDay) {
      activitiesWithExplicitLocations = activitiesWithExplicitLocations.filter(a =>
        a.activity.startDate === selectedMapDay
      );
    }

    // Get total markers count (before filtering) for dropdown display
    const allPhotosWithLocations = currentTrip.photos.filter(photo => photo.location?.latitude && photo.location?.longitude);
    const allActivitiesWithLocations = currentTrip.activities.filter(activity =>
      activity.location?.latitude && activity.location?.longitude
    );
    const totalMarkersCount = allPhotosWithLocations.length + allActivitiesWithLocations.length;

    // Combine all markers: photos with locations + activities with explicit locations
    const allMarkers = [
      ...photosWithLocations.map(p => ({
        type: 'photo' as const,
        id: p.photo.id,
        activity: p.activity,
        photo: p.photo,
        latitude: p.latitude,
        longitude: p.longitude,
        label: p.activity?.name || 'Photo',
      })),
      ...activitiesWithExplicitLocations.map(a => ({
        type: 'activity' as const,
        id: a.activity.id,
        activity: a.activity,
        photo: null,
        latitude: a.latitude,
        longitude: a.longitude,
        label: a.activity.name,
      })),
    ];

    // Generate OpenStreetMap tile URL
    const generateMapTileUrl = () => {
      if (allMarkers.length === 0) return null;

      // Calculate center point from all markers
      const avgLat = allMarkers.reduce((sum, m) => sum + (m.latitude || 0), 0) / allMarkers.length;
      const avgLng = allMarkers.reduce((sum, m) => sum + (m.longitude || 0), 0) / allMarkers.length;

      // Calculate bounds to determine appropriate zoom
      const lats = allMarkers.map(m => m.latitude || 0).filter(lat => lat !== 0);
      const lngs = allMarkers.map(m => m.longitude || 0).filter(lng => lng !== 0);
      if (lats.length === 0 || lngs.length === 0) return null;
      const latSpan = Math.max(...lats) - Math.min(...lats);
      const lngSpan = Math.max(...lngs) - Math.min(...lngs);
      const maxSpan = Math.max(latSpan, lngSpan);

      // Adjust zoom based on span (closer markers = higher zoom)
      let zoom = 13;
      if (maxSpan > 0.1) zoom = 10; // Very spread out
      else if (maxSpan > 0.05) zoom = 11;
      else if (maxSpan > 0.02) zoom = 12;
      else if (maxSpan > 0.01) zoom = 13;
      else zoom = 14; // Very close together

      const tileX = Math.floor((avgLng + 180) / 360 * Math.pow(2, zoom));
      const tileY = Math.floor((1 - Math.log(Math.tan(avgLat * Math.PI / 180) + 1 / Math.cos(avgLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

      return `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
    };

    // Calculate marker position on the map with better accuracy
    const calculateMarkerPosition = (lat: number, lng: number) => {
      if (allMarkers.length === 0) return { x: 0, y: 0 };

      // Calculate center point and bounds
      const lats = allMarkers.map(m => m.latitude || 0).filter(l => l !== 0);
      const lngs = allMarkers.map(m => m.longitude || 0).filter(l => l !== 0);
      if (lats.length === 0 || lngs.length === 0) return { x: 200, y: 150 };
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latSpan = maxLat - minLat || 0.01; // Avoid division by zero
      const lngSpan = maxLng - minLng || 0.01;

      // Map to screen coordinates (400x300 is our map size, with padding)
      const padding = 20;
      const mapWidth = 400 - (padding * 2);
      const mapHeight = 300 - (padding * 2);

      const x = padding + ((lng - minLng) / lngSpan) * mapWidth;
      const y = padding + ((maxLat - lat) / latSpan) * mapHeight; // Inverted for screen coordinates

      return {
        x: Math.max(padding, Math.min(400 - padding, x)),
        y: Math.max(padding, Math.min(300 - padding, y))
      };
    };

    // Helper function to format day for dropdown
    const formatDayForDropdown = (date: string, dayNumber: number, totalDays: number) => {
      try {
        const dateObj = new Date(date + 'T00:00:00');
        if (isNaN(dateObj.getTime())) return date;
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const photoCount = getPhotoCountForDay(date);
        return `${dayName}, ${dateStr} (${dayNumber}/${totalDays}) - ${photoCount} photo${photoCount !== 1 ? 's' : ''}`;
      } catch (error) {
        return date;
      }
    };

    return (
      <Modal visible={showMapView} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Trip Map</Text>
            <TouchableOpacity onPress={() => {
              setShowMapView(false);
              setSelectedMapDay(null);
              setShowMapDayDropdown(false);
            }}>
              <Text style={[styles.modalClose, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Day Filter Dropdown */}
            <View style={[styles.mapDayFilterContainer, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.mapDayFilterButton, { borderColor: colors.border }]}
                onPress={() => setShowMapDayDropdown(!showMapDayDropdown)}
              >
                <Text style={[styles.mapDayFilterText, { color: colors.text }]}>
                  {selectedMapDay
                    ? formatDayForDropdown(selectedMapDay, tripDates.indexOf(selectedMapDay) + 1, tripDates.length)
                    : `All Days (${totalMarkersCount} marker${totalMarkersCount !== 1 ? 's' : ''})`}
                </Text>
                <Text style={[styles.mapDayFilterArrow, { color: colors.text }]}>
                  {showMapDayDropdown ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showMapDayDropdown && (
                <ScrollView
                  style={[styles.mapDayDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  nestedScrollEnabled={true}
                >
                  <TouchableOpacity
                    style={[styles.mapDayDropdownItem, selectedMapDay === null && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => {
                      setSelectedMapDay(null);
                      setShowMapDayDropdown(false);
                    }}
                  >
                    <Text style={[styles.mapDayDropdownText, { color: colors.text }]}>
                      All Days ({totalMarkersCount} marker{totalMarkersCount !== 1 ? 's' : ''})
                    </Text>
                  </TouchableOpacity>
                  {tripDates.map((date, index) => {
                    const photoCount = getPhotoCountForDay(date);
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[styles.mapDayDropdownItem, selectedMapDay === date && { backgroundColor: colors.primary + '20' }]}
                        onPress={() => {
                          setSelectedMapDay(date);
                          setShowMapDayDropdown(false);
                        }}
                      >
                        <Text style={[styles.mapDayDropdownText, { color: colors.text }]}>
                          {formatDayForDropdown(date, index + 1, tripDates.length)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.mapContainer}>
              {allMarkers.length === 0 ? (
                <View style={[styles.mapImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#666', textAlign: 'center', fontSize: 16 }}>
                    📍 No location data available{'\n'}
                    Take photos with location enabled{'\n'}
                    or add manual locations to activities
                  </Text>
                </View>
              ) : (
                <View style={styles.mapImageContainer}>
                  {/* OpenStreetMap Background */}
                  {generateMapTileUrl() && (
                    <Image
                      source={{ uri: generateMapTileUrl()! }}
                      style={styles.mapBackground}
                      resizeMode="cover"
                    />
                  )}

                  {/* All Markers: Photos and Activities */}
                  {allMarkers.map((marker, index) => {
                    if (!marker.latitude || !marker.longitude) return null;
                    const markerPosition = calculateMarkerPosition(marker.latitude, marker.longitude);

                    return (
                      <View
                        key={`${marker.type}-${marker.id}`}
                        style={[
                          styles.mapMarker,
                          {
                            left: markerPosition.x - 25, // Center the marker
                            top: markerPosition.y - 25
                          }
                        ]}
                      >
                        {marker.photo ? (
                          <TouchableOpacity
                            onPress={() => {
                              // Close map view and open photo detail
                              setShowMapView(false);
                              handlePhotoPress(marker.photo);
                            }}
                          >
                            <Image
                              source={{ uri: marker.photo.uri }}
                              style={styles.markerPhoto}
                            />
                            <View style={styles.markerLabel}>
                              <Text style={styles.markerText} numberOfLines={1}>
                                {marker.activity?.name || 'x'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.markerDot}
                            onPress={() => {
                              const url = `https://maps.apple.com/?q=${marker.latitude},${marker.longitude}`;
                              Linking.openURL(url).catch(err => {
                                console.error('Error opening maps:', err);
                                Alert.alert('Error', 'Could not open maps application');
                              });
                            }}
                          >
                            <Text style={styles.markerDotText}>{index + 1}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.mapActivityList}>
                <Text style={[styles.activityListTitle, { color: colors.text }]}>
                  {selectedMapDay ? `Day ${tripDates.indexOf(selectedMapDay) + 1}/${tripDates.length}` : 'All Days'} ({allMarkers.length} markers):
                </Text>
                {allMarkers.map((marker, index) => (
                  <View key={`${marker.type}-${marker.id}`} style={[styles.activityListItem, { borderColor: colors.border }]}>
                    <View style={[styles.activityMarker, { backgroundColor: marker.photo ? '#FF3B30' : '#007AFF' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mapActivityName, { color: colors.text }]}>
                        {marker.activity?.name || 'Photo'}
                      </Text>
                      {marker.activity?.time && (
                        <Text style={[styles.mapActivityTime, { color: colors.textSecondary }]}>
                          {marker.activity.time}
                        </Text>
                      )}
                      {marker.photo && (
                        <Text style={[styles.mapActivityTime, { color: colors.textSecondary, fontSize: 11 }]}>
                          📷 Photo location
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {allMarkers.length === 0 && (
                  <Text style={[styles.noActivitiesText, { color: colors.textSecondary }]}>
                    No location data found. Add photos with location enabled or set activity locations manually.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const scrollToDay = useCallback((date: string) => {
    const dayY = dayPositions.current.get(date);
    if (dayY !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: dayY - 40, animated: true }); // Account for sticky headers
    }
  }, []);

  // Memoize tripDates to prevent unnecessary recalculations (moved to top level for hooks rules)
  const tripDates = useMemo(() => {
    if (!currentTrip) return [];
    return getTripDates();
  }, [currentTrip]);


  const handleScroll = (event: any) => {
    if (!currentTrip) return;
    const scrollOffset = event.nativeEvent.contentOffset.y;
    currentScrollPosition.current = scrollOffset; // Track current scroll position
  };

  const scrollToActivity = (activityId: string) => {
    const activityY = activityPositions.current.get(activityId);
    if (activityY !== undefined && scrollViewRef.current) {
      const stickyTitleHeight = 40;
      const scrollToY = Math.max(0, activityY - stickyTitleHeight);
      scrollViewRef.current.scrollTo({
        y: scrollToY,
        animated: true
      });
    }
  };

  // Helper functions for horizontal image scrolling
  const scrollImageRow = (ref: any, direction: 'prev' | 'next', imageWidth: number) => {
    if (!ref?.current) return;

    ref.current.getScrollResponder()?.getScrollableNode()?.scrollBy({
      x: direction === 'prev' ? -imageWidth : imageWidth,
      animated: true,
    });
  };

  const scrollImageRowToStart = (ref: any) => {
    if (!ref?.current) return;
    ref.current.scrollTo({ x: 0, animated: false });
  };

  // Refs for tracking scroll state per row
  const imageRowScrollState = useRef<Map<string, { position: number; canPrev: boolean; canNext: boolean }>>(new Map());
  const previousPhotoCounts = useRef<Map<string, number>>(new Map());

  // Component for horizontal image row with prev/next buttons
  const HorizontalImageRow: React.FC<{
    photos: TripPhoto[];
    rowId: string;
    imageWidth?: number;
    imageHeight?: number;
  }> = React.memo(({ photos, rowId, imageWidth = screenWidth - 80, imageHeight = screenWidth - 80 }) => {
    if (photos.length === 0) return null;

    // Get or create ref for this row
    if (!dayPhotoScrollRefs.current.has(rowId) && !activityPhotoScrollRefs.current.has(rowId)) {
      const ref = React.createRef<ScrollView>();
      if (rowId.startsWith('day-')) {
        dayPhotoScrollRefs.current.set(rowId, ref);
      } else {
        activityPhotoScrollRefs.current.set(rowId, ref);
      }
      // Initialize scroll state
      imageRowScrollState.current.set(rowId, { position: 0, canPrev: false, canNext: photos.length > 1 });
      previousPhotoCounts.current.set(rowId, photos.length);
    }

    const scrollRef = rowId.startsWith('day-')
      ? dayPhotoScrollRefs.current.get(rowId)
      : activityPhotoScrollRefs.current.get(rowId);

    const [scrollState, setScrollState] = useState(
      imageRowScrollState.current.get(rowId) || { position: 0, canPrev: false, canNext: photos.length > 1 }
    );
    const [scrollViewWidth, setScrollViewWidth] = useState(screenWidth);

    const handleScroll = (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;

      const newState = {
        position: offsetX,
        canPrev: offsetX > 10,
        canNext: offsetX < contentWidth - layoutWidth - 10,
      };

      // Only update state if it actually changed to reduce re-renders
      const currentState = imageRowScrollState.current.get(rowId);
      if (!currentState ||
        currentState.canPrev !== newState.canPrev ||
        currentState.canNext !== newState.canNext) {
        setScrollState(newState);
        imageRowScrollState.current.set(rowId, newState);
      } else {
        // Still update position in ref even if buttons don't change
        imageRowScrollState.current.set(rowId, newState);
      }
    };

    const scrollPrev = () => {
      if (scrollRef?.current) {
        const currentState = imageRowScrollState.current.get(rowId);
        const newX = Math.max(0, (currentState?.position || 0) - imageWidth);
        scrollRef.current.scrollTo({
          x: newX,
          animated: true,
        });
      }
    };

    const scrollNext = () => {
      if (scrollRef?.current) {
        const currentState = imageRowScrollState.current.get(rowId);
        const currentX = currentState?.position || 0;
        scrollRef.current.scrollTo({
          x: currentX + imageWidth,
          animated: true,
        });
      }
    };

    // Handle scroll position when photos change
    useEffect(() => {
      if (scrollRef?.current) {
        const previousCount = previousPhotoCounts.current.get(rowId) || 0;
        const currentCount = photos.length;

        // Only do something if the count actually changed
        if (currentCount !== previousCount) {
          // If a new photo was added (count increased), scroll to center the last photo
          if (currentCount > previousCount && currentCount > 1) {
            // Wait for vertical scroll to complete, then scroll horizontally
            setTimeout(() => {
              if (scrollRef?.current) {
                // Calculate position to center the last image
                const imageGap = 8; // marginRight from horizontalImageItem style
                const lastImageIndex = currentCount - 1;
                const lastImageStartX = lastImageIndex * (imageWidth + imageGap);

                // Center the image: scroll so the image center aligns with ScrollView center
                // ScrollView center is at scrollViewWidth / 2
                // Image center is at lastImageStartX + imageWidth / 2
                // Scroll position = imageCenter - scrollViewCenter
                const scrollX = lastImageStartX + (imageWidth / 2) - (scrollViewWidth / 2);

                // Make sure we don't scroll past the beginning or end
                const totalContentWidth = currentCount * (imageWidth + imageGap);
                const maxScroll = Math.max(0, totalContentWidth - scrollViewWidth);
                const finalScrollX = Math.max(0, Math.min(scrollX, maxScroll));

                scrollRef.current.scrollTo({ x: finalScrollX, animated: true });

                // Update scroll state after scrolling
                setTimeout(() => {
                  const newState = {
                    position: finalScrollX,
                    canPrev: finalScrollX > 10,
                    canNext: finalScrollX < maxScroll - 10,
                  };
                  setScrollState(newState);
                  imageRowScrollState.current.set(rowId, newState);
                }, 300);
              }
            }, 800); // Wait for vertical scroll (500ms) + buffer dyor: this seems like it should not exist
          } else if (currentCount === 1 && previousCount === 0) {
            // Only reset to start if it's the very first photo (row was empty)
            setTimeout(() => {
              if (scrollRef?.current) {
                scrollRef.current.scrollTo({ x: 0, animated: false });
                const newState = { position: 0, canPrev: false, canNext: currentCount > 1 };
                setScrollState(newState);
                imageRowScrollState.current.set(rowId, newState);
              }
            }, 100);
          }
          // If count decreased (photo deleted), don't change scroll position - keep current position

          // Update previous count
          previousPhotoCounts.current.set(rowId, currentCount);
        }
        // If count didn't change, do nothing - preserve current scroll position
      }
    }, [rowId, photos.length]);

    return (
      <View style={styles.horizontalImageRowContainer}>
        {/* Prev Button */}
        {scrollState.canPrev && (
          <TouchableOpacity
            style={[styles.imageNavButton, styles.imageNavButtonLeft, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={scrollPrev}
          >
            <Text style={[styles.imageNavButtonText, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
        )}

        {/* Horizontal ScrollView */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalImageScrollView}
          contentContainerStyle={styles.horizontalImageScrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={imageWidth + 8}
          snapToAlignment="start"
          disableIntervalMomentum={true}
          removeClippedSubviews={true}
          overScrollMode="never"
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            if (width > 0) {
              setScrollViewWidth(width);
            }
          }}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.horizontalImageItem}>
              <TouchableOpacity
                onPress={() => handlePhotoPress(photo)}
                activeOpacity={1}
                delayPressIn={0}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={[styles.horizontalImage, { width: imageWidth, height: imageHeight }]}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              </TouchableOpacity>
              {photo.caption && (
                <Text style={[styles.photoCaption, { color: colors.text }]}>
                  {photo.caption}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Next Button */}
        {scrollState.canNext && (
          <TouchableOpacity
            style={[styles.imageNavButton, styles.imageNavButtonRight, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={scrollNext}
          >
            <Text style={[styles.imageNavButtonText, { color: colors.text }]}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  });

  const renderTripDetailView = () => {
    if (!currentTrip) return null;

    return (
      // dyor: controls the outer scroll view
      <View style={[styles.tripDetailContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {/* this is just a little shim layer to prevent bleed */}
        <View style={[styles.statusBarBackground, { backgroundColor: colors.surface }]} />
        <View style={[styles.stickyTripTitleContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.tripTitleRow}>
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => {
                setShowTripDetail(false);
                setCurrentTrip(null);
                // Clear active trip when going back to list
                setActiveTripId(null);
                setActiveDayDate(null);
                setActiveActivityId(null);
              }}
            >
              <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.tripDetailTitle, { color: colors.text }]}>{currentTrip.title}</Text>
            <TouchableOpacity
              style={[styles.editButton, { width: 40, alignItems: 'flex-end' }]}
              onPress={() => {
                openEditTrip();
              }}
            >
              <Text style={styles.editButtonText}>✎</Text>
            </TouchableOpacity>
          </View>
        </View>


        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.tripDetailContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false, listener: handleScroll }
          )}
          scrollEventThrottle={100}
          removeClippedSubviews={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        >
          {tripDates.map((date, index) => {
            const dayActivities = (currentTrip?.activities || [])
              .filter(activity => activity?.startDate === date)
              .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'))
              .filter(activity => {
                // In Remember mode, only show activities that have photos
                if (currentTrip?.mode === 'remember') {
                  const activityPhotos = (currentTrip?.photos || []).filter(p => p.activityId === activity.id);
                  return activityPhotos.length > 0;
                }
                return true; // In Record mode, show all activities
              });
            const dayPhotos = (currentTrip?.photos || []).filter(photo => {
              if (!photo?.timestamp) return false;
              try {
                // Extract date from timestamp (always in UTC format, so toISOString() gives consistent result)
                const photoDate = new Date(photo.timestamp).toISOString().split('T')[0];
                const matches = photoDate === date;
                if (!matches && photoDate) {
                  console.log('🔍 Photo date mismatch:', { photoDate, targetDate: date, photoId: photo.id });
                }
                return matches;
              } catch (error) {
                console.warn('⚠️ Invalid photo timestamp:', photo.timestamp);
                return false;
              }
            });

            return (
              <View
                key={date}
                style={[styles.dayContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onLayout={(event) => {
                  const { y } = event.nativeEvent.layout;
                  dayPositions.current.set(date, y);
                }}
              >
                <View style={[styles.dayHeader, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={[styles.dayTitle, { color: '#FFFFFF' }]}>
                    {formatDateWithDayNumber(date, index + 1, tripDates.length)}
                  </Text>
                  {currentTrip.mode === 'record' && (
                    <TouchableOpacity
                      style={[styles.plusButton, { backgroundColor: (activeDayDate === date && activeTripId === currentTrip.id) ? colors.primary : colors.border }]}
                      onPress={() => activateDay(date)}
                    >
                      <Text style={[styles.plusButtonText, { color: (activeDayDate === date && activeTripId === currentTrip.id) ? '#fff' : colors.text }]}>{(activeDayDate === date && activeTripId === currentTrip.id) ? '-' : '+'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Day photos (not associated with activities) - show before activities */}
                {dayPhotos.filter(photo => !photo.activityId).length > 0 && (
                  <View style={styles.dayPhotos}>
                    {currentTrip.mode === 'record' && (
                      <Text style={[styles.dayPhotosTitle, { color: colors.text }]}>
                        Day Photos{dayPhotos.filter(photo => !photo.activityId).length > 0 ? ` (${dayPhotos.filter(photo => !photo.activityId).length})` : ''}
                      </Text>
                    )}

                    {/* Snap/Add buttons above image row - only show when day is active */}
                    {activeDayDate === date && activeTripId === currentTrip.id && (
                      <View style={[styles.activityPhotoButtons, styles.activityPhotoButtonsTop]}>
                        <TouchableOpacity
                          style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                          onPress={() => {
                            setSelectedDate(date);
                            setSelectedActivity(null);
                            capturePhoto(undefined, date);
                          }}
                        >
                          <Text style={[styles.snapButtonText, { color: colors.primary }]}>Snap</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                          onPress={() => {
                            setSelectedDate(date);
                            setSelectedActivity(null);
                            addFromGallery(undefined, date, false);
                          }}
                        >
                          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                        </TouchableOpacity>
                        {(() => {
                          const isLoading = loadingPhotosByDate === (date + '');
                          const animatedBorderColor = isLoading
                            ? borderAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [colors.primary, colors.secondary],
                            })
                            : colors.primary;
                          return (
                            <Animated.View style={{
                              flex: 1,
                              borderColor: animatedBorderColor,
                              borderWidth: isLoading ? 2 : 1,
                              borderRadius: 9999,
                              overflow: 'hidden',
                            }}>
                              <TouchableOpacity
                                style={[
                                  styles.addButton,
                                  {
                                    backgroundColor: '#f5f5f5',
                                    borderWidth: 0,
                                    opacity: isLoading ? 0.7 : 1,
                                    flex: 1,
                                  }
                                ]}
                                onPress={() => {
                                  setSelectedDate(date);
                                  setSelectedActivity(null);
                                  addFromGallery(undefined, date, true);
                                }}
                                disabled={isLoading}
                              >
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                  {isLoading ? 'Searching...' : 'Add Many'}
                                </Text>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        })()}
                      </View>
                    )}

                    <HorizontalImageRow
                      photos={dayPhotos.filter(photo => !photo.activityId)}
                      rowId={`day-${date}`}
                      imageWidth={screenWidth - 80}
                      imageHeight={screenWidth - 80}
                    />

                    {/* Snap/Add buttons below image row - only show when day is active and in Record mode */}
                    {activeDayDate === date && activeTripId === currentTrip.id && currentTrip.mode === 'record' && (
                      <View style={styles.activityPhotoButtons}>
                        <TouchableOpacity
                          style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                          onPress={() => {
                            setSelectedDate(date);
                            setSelectedActivity(null);
                            capturePhoto(undefined, date);
                          }}
                        >
                          <Text style={[styles.snapButtonText, { color: colors.primary }]}>Snap</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                          onPress={() => {
                            setSelectedDate(date);
                            setSelectedActivity(null);
                            addFromGallery(undefined, date, false);
                          }}
                        >
                          <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                        </TouchableOpacity>
                        {(() => {
                          const isLoading = loadingPhotosByDate === (date + '');
                          const animatedBorderColor = isLoading
                            ? borderAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [colors.primary, colors.secondary],
                            })
                            : colors.primary;
                          return (
                            <Animated.View style={{
                              flex: 1,
                              borderColor: animatedBorderColor,
                              borderWidth: isLoading ? 2 : 1,
                              borderRadius: 9999,
                              overflow: 'hidden',
                            }}>
                              <TouchableOpacity
                                style={[
                                  styles.addButton,
                                  {
                                    backgroundColor: '#f5f5f5',
                                    borderWidth: 0,
                                    opacity: isLoading ? 0.7 : 1,
                                    flex: 1,
                                  }
                                ]}
                                onPress={() => {
                                  setSelectedDate(date);
                                  setSelectedActivity(null);
                                  addFromGallery(undefined, date, true);
                                }}
                                disabled={isLoading}
                              >
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                  {isLoading ? 'Searching...' : 'Add Many'}
                                </Text>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        })()}
                      </View>
                    )}
                  </View>
                )}

                {/* Snap/Add buttons when no day photos exist yet - only show when day is active and in Record mode */}
                {dayPhotos.filter(photo => !photo.activityId).length === 0 && activeDayDate === date && activeTripId === currentTrip.id && currentTrip.mode === 'record' && (
                  <View style={[styles.activityPhotoButtons, { marginTop: 8, marginBottom: 8 }]}>
                    <TouchableOpacity
                      style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                      onPress={() => {
                        setSelectedDate(date);
                        setSelectedActivity(null);
                        capturePhoto(undefined, date);
                      }}
                    >
                      <Text style={[styles.snapButtonText, { color: colors.primary }]}>Snap</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                      onPress={() => {
                        setSelectedDate(date);
                        setSelectedActivity(null);
                        addFromGallery(undefined, date, false);
                      }}
                    >
                      <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                    </TouchableOpacity>
                    {(() => {
                      const isLoading = loadingPhotosByDate === (date + '');
                      const animatedBorderColor = isLoading
                        ? borderAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [colors.primary, colors.secondary],
                        })
                        : colors.primary;
                      return (
                        <Animated.View style={{
                          flex: 1,
                          borderColor: animatedBorderColor,
                          borderWidth: isLoading ? 2 : 1,
                          borderRadius: 9999,
                          overflow: 'hidden',
                        }}>
                          <TouchableOpacity
                            style={[
                              styles.addButton,
                              {
                                backgroundColor: '#f5f5f5',
                                borderWidth: 0,
                                opacity: isLoading ? 0.7 : 1,
                              }
                            ]}
                            onPress={() => {
                              setSelectedDate(date);
                              setSelectedActivity(null);
                              addFromGallery(undefined, date, true);
                            }}
                            disabled={isLoading}
                          >
                            <Text style={[styles.addButtonText, { color: colors.primary }]}>
                              {isLoading ? 'Searching...' : 'Add Many'}
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })()}
                  </View>
                )}

                {/* Activities for this day */}
                {dayActivities.map((activity, activityIndex) => {
                  // Check if we should show the date above this activity
                  // Show on every activity EXCEPT the first activity when there are no day photos
                  // Reason: If no day photos, purple date header is visible above first activity (redundant to show grey date)
                  // If there are day photos, purple header might scroll away, so show grey date on all activities
                  const hasDayPhotos = dayPhotos.filter(photo => !photo.activityId).length > 0;
                  const showDateAboveActivity = hasDayPhotos || activityIndex > 0;

                  return (
                    <View
                      key={activity.id}
                      style={[styles.activityContainer, { borderColor: colors.border }]}
                      onLayout={(event) => {
                        const { y } = event.nativeEvent.layout;
                        activityPositions.current.set(activity.id, y);
                      }}
                    >
                      {showDateAboveActivity && currentTrip.mode === 'record' && (
                        <Text style={[styles.activityDateLabel, { color: colors.textSecondary }]}>
                          {formatDate(date)}
                        </Text>
                      )}
                      <View style={styles.activityHeader}>
                        <View style={styles.activityTitleContainer}>
                          <Text style={[styles.activityName, { color: colors.text }]}>
                            {activity.name}{dayPhotos.filter(photo => photo.activityId === activity.id).length > 0 ? ` (${dayPhotos.filter(photo => photo.activityId === activity.id).length})` : ''}
                          </Text>
                          {activeActivityId === activity.id && activeTripId === currentTrip.id && (
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => openEditActivity(activity)}
                            >
                              <Text style={styles.editButtonText}>✎</Text>
                            </TouchableOpacity>
                          )}
                          {currentTrip.mode === 'record' && (
                            <TouchableOpacity
                              style={[styles.plusButton, { backgroundColor: (activeActivityId === activity.id && activeTripId === currentTrip.id) ? colors.primary : colors.border }]}
                              onPress={() => activateActivity(activity.id)}
                            >
                              <Text style={[styles.plusButtonText, { color: (activeActivityId === activity.id && activeTripId === currentTrip.id) ? '#fff' : colors.text }]}>{(activeActivityId === activity.id && activeTripId === currentTrip.id) ? '-' : '+'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {currentTrip.mode === 'record' && activity.time && (
                          <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{activity.time}</Text>
                        )}
                      </View>

                      {/* Activity photos */}
                      {dayPhotos.filter(photo => photo.activityId === activity.id).length > 0 && (
                        <View style={styles.activityPhotos}>
                          {/* Snap/Add buttons above image row - only show when activity is active and in Record mode */}
                          {currentTrip.mode === 'record' && activeActivityId === activity.id && activeTripId === currentTrip.id && (
                            <View style={[styles.activityPhotoButtons, styles.activityPhotoButtonsTop]}>
                              <TouchableOpacity
                                style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                                onPress={() => {
                                  setSelectedActivity(activity);
                                  setSelectedDate(activity.startDate);
                                  capturePhoto(activity);
                                }}
                              >
                                <Text style={[styles.snapButtonText, { color: colors.primary }]}>Snap</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                                onPress={() => {
                                  setSelectedActivity(activity);
                                  setSelectedDate(activity.startDate);
                                  addFromGallery(activity, undefined, false);
                                }}
                              >
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                              </TouchableOpacity>
                              {(() => {
                                const isLoading = loadingPhotosByDate === (activity.startDate + activity.id);
                                const animatedBorderColor = isLoading
                                  ? borderAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [colors.primary, colors.secondary],
                                  })
                                  : colors.primary;
                                return (
                                  <Animated.View style={{
                                    flex: 1,
                                    borderColor: animatedBorderColor,
                                    borderWidth: isLoading ? 2 : 1,
                                    borderRadius: 9999,
                                    overflow: 'hidden',
                                  }}>
                                    <TouchableOpacity
                                      style={[
                                        styles.addButton,
                                        {
                                          backgroundColor: '#f5f5f5',
                                          borderWidth: 0,
                                          opacity: isLoading ? 0.7 : 1,
                                          flex: 1,
                                        }
                                      ]}
                                      onPress={() => {
                                        setSelectedActivity(activity);
                                        setSelectedDate(activity.startDate);
                                        addFromGallery(activity, undefined, true);
                                      }}
                                      disabled={isLoading}
                                    >
                                      <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                        {isLoading ? 'Searching...' : 'Add Many'}
                                      </Text>
                                    </TouchableOpacity>
                                  </Animated.View>
                                );
                              })()}
                            </View>
                          )}

                          <HorizontalImageRow
                            photos={dayPhotos.filter(photo => photo.activityId === activity.id)}
                            rowId={`activity-${activity.id}`}
                            imageWidth={screenWidth - 80}
                            imageHeight={screenWidth - 80}
                          />

                          {/* Snap/Add buttons below image row - only show when activity is active */}
                          {activeActivityId === activity.id && activeTripId === currentTrip.id && (
                            <View style={styles.activityPhotoButtons}>
                              <TouchableOpacity
                                style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                                onPress={() => {
                                  setSelectedActivity(activity);
                                  setSelectedDate(activity.startDate);
                                  capturePhoto(activity);
                                }}
                              >
                                <Text style={[styles.snapButtonText, { color: colors.primary }]}>Snap</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                                onPress={() => {
                                  setSelectedActivity(activity);
                                  setSelectedDate(activity.startDate);
                                  addFromGallery(activity, undefined, false);
                                }}
                              >
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                              </TouchableOpacity>
                              {(() => {
                                const isLoading = loadingPhotosByDate === (activity.startDate + activity.id);
                                const animatedBorderColor = isLoading
                                  ? borderAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [colors.primary, colors.secondary],
                                  })
                                  : colors.primary;
                                return (
                                  <Animated.View style={{
                                    flex: 1,
                                    borderColor: animatedBorderColor,
                                    borderWidth: isLoading ? 2 : 1,
                                    borderRadius: 9999,
                                    overflow: 'hidden',
                                  }}>
                                    <TouchableOpacity
                                      style={[
                                        styles.addButton,
                                        {
                                          backgroundColor: '#f5f5f5',
                                          borderWidth: 0,
                                          opacity: isLoading ? 0.7 : 1,
                                          flex: 1,
                                        }
                                      ]}
                                      onPress={() => {
                                        setSelectedActivity(activity);
                                        setSelectedDate(activity.startDate);
                                        addFromGallery(activity, undefined, true);
                                      }}
                                      disabled={isLoading}
                                    >
                                      <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                        {isLoading ? 'Searching...' : 'Add Many'}
                                      </Text>
                                    </TouchableOpacity>
                                  </Animated.View>
                                );
                              })()}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Snap/Add buttons when no activity photos exist yet - only show when activity is active */}
                      {dayPhotos.filter(photo => photo.activityId === activity.id).length === 0 && activeActivityId === activity.id && activeTripId === currentTrip.id && (
                        <View style={[styles.activityPhotoButtons, { marginTop: 8, marginBottom: 8 }]}>
                          <TouchableOpacity
                            style={[styles.snapButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                            onPress={() => {
                              setSelectedActivity(activity);
                              setSelectedDate(activity.startDate);
                              capturePhoto(activity);
                            }}
                          >
                            <Text style={[styles.snapButtonText, { color: colors.primary }]}>📸 Snap</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                            onPress={() => {
                              setSelectedActivity(activity);
                              setSelectedDate(activity.startDate);
                              addFromGallery(activity, undefined, false);
                            }}
                          >
                            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add 1</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: '#f5f5f5', borderColor: colors.primary }]}
                            onPress={() => {
                              setSelectedActivity(activity);
                              setSelectedDate(activity.startDate);
                              addFromGallery(activity, undefined, true);
                            }}
                          >
                            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Many</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </Animated.ScrollView>

        {/* Share and Map View Buttons - Side by Side */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Alert.alert(
                'Share Trip Story',
                'Choose how you\'d like to share your trip:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Share Memory (PDF)', onPress: generateTripStoryImage },
                  { text: 'Share Plan (Text)', onPress: shareTripAsImage },
                ]
              );
            }}
          >
            <Text style={[styles.bottomButtonText, { color: colors.background }]}>
              Share Story
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              setMapLoadError(false);
              setShowMapView(true);
            }}
          >
            <Text style={[styles.bottomButtonText, { color: colors.background }]}>
              Map Story
            </Text>
          </TouchableOpacity>
        </View>

        {renderCreateTripModal()}
        {renderAddActivityModal()}
        {renderManageActivitiesModal()}
        {renderPhotoCaptureModal()}
        {renderPhotoDetailModal()}
        {renderCustomPhotoPickerModal()}
        {renderMapViewModal()}
        {renderEditActivityModal()}
        {renderEditTripModal()}
      </View>
    );
  };

  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="TripStory Settings"
            subtitle="Manage your trip documentation preferences"
            icon="✈️"
            sparkId="trip-story"
          />

          <SettingsFeedbackSection sparkName="TripStory" sparkId="trip-story" />

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onCloseSettings}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>Done</Text>
          </TouchableOpacity>
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  if (showTripDetail) {
    return renderTripDetailView();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>✈️ TripStory</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Plan, remember, and share your trip
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create your first trip to start documenting your journey
            </Text>
          </View>
        ) : (
          getSortedTrips().map(renderTripCard)
        )}
      </ScrollView>

      <View style={{ padding: 20 }}>
        <SettingsButton
          title="+ Create New Trip"
          onPress={() => setShowCreateTrip(true)}
        />
      </View>

      {renderCreateTripModal()}
      {renderAddActivityModal()}
      {renderPhotoCaptureModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 44,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tripCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,

  },
  tripHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  tripDates: {
    fontSize: 14,
    marginBottom: 4,
  },
  photoCount: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  backButtonContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripTitleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,

  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
  },
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10, // Status bar height on iOS
    zIndex: 1002,
  },
  stickyTripTitleContainer: {
    position: 'absolute',
    top: 10, // Below status bar
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 50,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
    // Ensure background is fully opaque and covers the area
    overflow: 'hidden',

  },
  addButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  tripContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  photoGridItem: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  photoGridImage: {
    borderRadius: 8,
  },
  photoGridPlaceholder: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  photoGridCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGridCheckmarkText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoGridBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGridBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoThumbnail: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 8,
  },
  captureButtonContainer: {
    flexDirection: 'row',
    margin: 20,
    gap: 12,
  },
  captureButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  geocodeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  geocodeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  coordInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  modalFooter: {
    padding: 0,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 14,
  },
  modalFooterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    width: '100%',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  activityList: {
    maxHeight: 200,
    marginTop: 8,
  },
  activityOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  activityOptionText: {
    fontSize: 16,
  },
  dateScrollView: {
    marginTop: 8,
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPhotoButton: {
    borderWidth: 2,
  },
  photoButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Trip Detail View Styles
  tripDetailContainer: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',

  },
  addActivityButton: {
    padding: 8,
  },
  addActivityButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripDetailContent: {
    flex: 1,
    padding: 4,
    paddingTop: 80, // Enough space to clear status bar (44px) + sticky navigation bar (60px + padding)
  },
  dayContainer: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  plusButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityContainer: {
    marginBottom: 4,
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activityHeader: {
    marginBottom: 2,
  },
  activityTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontSize: 16,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
  },
  activityDateLabel: {
    fontSize: 11,
    marginBottom: 4,
    marginTop: 4,
  },
  activityPhotos: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  activityPhoto: {
    width: screenWidth - 40, // Full width minus padding
    aspectRatio: 1,
    borderRadius: 2,
    marginBottom: 8,
  },
  activityPhotoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  activityPhotoButtonsTop: {
    marginBottom: 16,
  },
  snapButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999, // pill shaped
    borderWidth: 1,
    alignItems: 'center',
  },
  snapButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999, // pill shaped
    borderWidth: 1,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addPictureButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  addPictureButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayPhotos: {
    marginTop: 4,
  },
  dayPhotosTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayPhotosGrid: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  dayPhoto: {
    width: screenWidth - 40, // Full width minus padding
    aspectRatio: 1,
    borderRadius: 2,
    marginBottom: 8,
  },
  // Photo Detail Modal Styles
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  photoPreviewFullWidth: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  locationContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
  },
  currentActivityContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  currentActivityText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentActivitySubtext: {
    fontSize: 14,
  },
  tapToChangeText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  activityOptionSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  activitySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activitySelectorList: {
    maxHeight: 300,
    marginTop: 8,
  },
  // Removed sticky header - no longer used
  /*
  stickyHeaderContainer: {
    position: 'absolute',
    top: 70, // Below trip title (40px back button + 60px trip title)
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 60,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    // Ensure background is fully opaque and covers the area
    overflow: 'hidden',
  },
  stickyDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  */
  stickyActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  // dyor buttons
  bottomButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
  },


  bottomButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapContainer: {
    alignItems: 'center',
    padding: 16,
  },
  mapImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  mapImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  mapMarker: {
    position: 'absolute',
    zIndex: 10,
  },
  markerPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerLabel: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'center',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  markerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapLegend: {
    width: '100%',
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
  mapDayFilterContainer: {
    marginBottom: 16,
    zIndex: 1000,
  },
  mapDayFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  mapDayFilterText: {
    fontSize: 14,
    flex: 1,
  },
  mapDayFilterArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  mapDayDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 300,
    overflow: 'hidden',
  },
  mapDayDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  mapDayDropdownText: {
    fontSize: 14,
  },
  mapActivityList: {
    width: '100%',
  },
  activityListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  mapActivityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  mapActivityTime: {
    fontSize: 14,
  },
  noActivitiesText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  // Horizontal Image Row Styles
  horizontalImageRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  horizontalImageScrollView: {
    flex: 1,
  },
  horizontalImageScrollContent: {
    paddingHorizontal: 0,
  },
  horizontalImageItem: {
    marginRight: 8,
    alignItems: 'center',
  },
  photoCaption: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  horizontalImage: {
    borderRadius: 8,
  },
  imageNavButton: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  imageNavButtonLeft: {
    left: 4,
  },
  imageNavButtonRight: {
    right: 4,
  },
  imageNavButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  radioDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default TripStorySpark;
