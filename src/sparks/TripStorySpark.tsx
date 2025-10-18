import React, { useState, useEffect } from 'react';
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
  FlatList,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';

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
  origin: string;
  destination: string;
  lodging?: string;
  activities: Activity[];
  photos: TripPhoto[];
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  tripId: string;
  name: string;
  startDate: string;
  time: string;
  description?: string;
  photos: TripPhoto[];
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

interface Lodging {
  id: string;
  tripId: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

const TripStorySpark: React.FC<TripStorySparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showTripDetail, setShowTripDetail] = useState(false);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [showActivitySelector, setShowActivitySelector] = useState(false);

  // New trip form
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripStartDate, setNewTripStartDate] = useState('');
  const [newTripEndDate, setNewTripEndDate] = useState('');
  const [newTripOrigin, setNewTripOrigin] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripLodging, setNewTripLodging] = useState('');

  // New activity form
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [newActivityTime, setNewActivityTime] = useState('');

  // Photo detail form
  const [photoName, setPhotoName] = useState('');
  const [photoDate, setPhotoDate] = useState('');
  const [photoActivityId, setPhotoActivityId] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        trips,
        currentTrip,
        selectedDate,
        selectedActivity
      });
    }
  }, [trips, currentTrip, selectedDate, selectedActivity, onStateChange]);

  const loadTrips = async () => {
    try {
      const data = await getSparkData('trip-story');
      if (data?.trips) {
        setTrips(data.trips);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const saveTrips = async (updatedTrips: Trip[]) => {
    try {
      await setSparkData('trip-story', { trips: updatedTrips });
      setTrips(updatedTrips);
    } catch (error) {
      console.error('Error saving trips:', error);
    }
  };

  const createTrip = async () => {
    if (!newTripTitle || !newTripStartDate || !newTripEndDate || !newTripOrigin || !newTripDestination) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const newTrip: Trip = {
      id: Date.now().toString(),
      title: newTripTitle,
      startDate: newTripStartDate,
      endDate: newTripEndDate,
      origin: newTripOrigin,
      destination: newTripDestination,
      lodging: newTripLodging || undefined,
      activities: [],
      photos: [],
      status: new Date(newTripStartDate + 'T00:00:00') > new Date() ? 'planned' : 
              new Date(newTripEndDate + 'T00:00:00') < new Date() ? 'completed' : 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTrips = [...trips, newTrip];
    await saveTrips(updatedTrips);
    
    // Reset form
    setNewTripTitle('');
    setNewTripStartDate('');
    setNewTripEndDate('');
    setNewTripOrigin('');
    setNewTripDestination('');
    setNewTripLodging('');
    setShowCreateTrip(false);
    
    HapticFeedback.success();
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
      description: newActivityDescription || undefined,
      photos: [],
      createdAt: new Date().toISOString(),
    };

    const updatedTrips = trips.map(trip => 
      trip.id === currentTrip.id 
        ? { ...trip, activities: [...trip.activities, newActivity], updatedAt: new Date().toISOString() }
        : trip
    );

    await saveTrips(updatedTrips);
    setCurrentTrip(updatedTrips.find(t => t.id === currentTrip.id) || null);
    
    // Reset form
    setNewActivityName('');
    setNewActivityDescription('');
    setNewActivityTime('');
    setSelectedDate('');
    setShowAddActivity(false);
    
    HapticFeedback.success();
  };

  const capturePhoto = async () => {
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

        const photoDate = selectedDate ? new Date(selectedDate + 'T12:00:00').toISOString() : new Date().toISOString();
        
        const newPhoto: TripPhoto = {
          id: Date.now().toString(),
          tripId: currentTrip!.id,
          activityId: selectedActivity?.id,
          uri: asset.uri,
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
        setCurrentTrip(updatedTrips.find(t => t.id === currentTrip!.id) || null);
        
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

  const addFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        Alert.alert('Error', 'No photo was selected. Please try again.');
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

        const photoDate = selectedDate ? new Date(selectedDate + 'T12:00:00').toISOString() : new Date().toISOString();
        
        const newPhoto: TripPhoto = {
          id: Date.now().toString(),
          tripId: currentTrip!.id,
          activityId: selectedActivity?.id,
          uri: asset.uri,
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
        setCurrentTrip(updatedTrips.find(t => t.id === currentTrip!.id) || null);
        
        setShowPhotoCapture(false);
        setSelectedActivity(null);
        setSelectedDate('');
        HapticFeedback.success();
      }
    } catch (error) {
      console.error('Error adding photo from gallery:', error);
      Alert.alert('Error', 'Failed to add photo from gallery.');
    }
  };

  const handlePhotoPress = (photo: TripPhoto) => {
    setSelectedPhoto(photo);
    setPhotoName(photo.caption || '');
    setPhotoDate(new Date(photo.timestamp).toISOString().split('T')[0]);
    setPhotoActivityId(photo.activityId || null);
    setShowPhotoDetail(true);
  };

  const updatePhotoDetails = async () => {
    if (!selectedPhoto || !currentTrip) return;

    const updatedPhoto: TripPhoto = {
      ...selectedPhoto,
      caption: photoName,
      timestamp: new Date(photoDate + 'T00:00:00').toISOString(),
      activityId: photoActivityId || undefined,
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

  const openInMaps = () => {
    if (!selectedPhoto?.location) return;
    
    const { latitude, longitude } = selectedPhoto.location;
    const url = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  const selectActivityForPhoto = (activityId: string | null) => {
    setPhotoActivityId(activityId);
    setShowActivitySelector(false);
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle both YYYY-MM-DD and other formats
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  const getTripDates = () => {
    if (!currentTrip) return [];
    
    const startDate = new Date(currentTrip.startDate + 'T00:00:00');
    const endDate = new Date(currentTrip.endDate + 'T00:00:00');
    const dates = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const getTripStatus = (trip: Trip) => {
    const now = new Date();
    const startDate = new Date(trip.startDate + 'T00:00:00');
    const endDate = new Date(trip.endDate + 'T00:00:00');
    
    if (now < startDate) return 'planned';
    if (now > endDate) return 'completed';
    return 'active';
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

  const getSortedTrips = () => {
    const now = new Date();
    const plannedTrips = trips.filter(trip => {
      const startDate = new Date(trip.startDate + 'T00:00:00');
      return startDate > now;
    }).sort((a, b) => {
      const dateA = new Date(a.startDate + 'T00:00:00');
      const dateB = new Date(b.startDate + 'T00:00:00');
      return dateA.getTime() - dateB.getTime(); // Next planned to furthest
    });

    const pastTrips = trips.filter(trip => {
      const endDate = new Date(trip.endDate + 'T00:00:00');
      return endDate <= now;
    }).sort((a, b) => {
      const dateA = new Date(a.endDate + 'T00:00:00');
      const dateB = new Date(b.endDate + 'T00:00:00');
      return dateB.getTime() - dateA.getTime(); // Most recent to oldest
    });

    return [...plannedTrips, ...pastTrips];
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
          setShowTripDetail(true);
        }}
      >
        <View style={styles.tripHeader}>
          <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        <Text style={[styles.tripDates, { color: colors.textSecondary }]}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>
        <Text style={[styles.tripRoute, { color: colors.textSecondary }]}>
          {trip.origin} → {trip.destination}
        </Text>
        <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
          {trip.photos.length} photos • {trip.activities.length} activities
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCreateTripModal = () => (
    <Modal visible={showCreateTrip} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Trip</Text>
          <TouchableOpacity onPress={() => setShowCreateTrip(false)}>
            <Text style={[styles.modalClose, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
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
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={newTripStartDate}
                onChangeText={setNewTripStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
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

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Origin *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={newTripOrigin}
                onChangeText={setNewTripOrigin}
                placeholder="From where?"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Destination *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={newTripDestination}
                onChangeText={setNewTripDestination}
                placeholder="To where?"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Lodging (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={newTripLodging}
              onChangeText={setNewTripLodging}
              placeholder="Hotel, Airbnb, etc."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={createTrip}
          >
            <Text style={[styles.createButtonText, { color: colors.background }]}>Create Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAddActivityModal = () => (
    <Modal visible={showAddActivity} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Activity</Text>
          <TouchableOpacity onPress={() => setShowAddActivity(false)}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
              {getTripDates().map(date => (
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
              ))}
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={newActivityDescription}
              onChangeText={setNewActivityDescription}
              placeholder="Enter activity description"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={addActivity}
          >
            <Text style={[styles.createButtonText, { color: colors.background }]}>Add Activity</Text>
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
              onPress={capturePhoto}
            >
              <Text style={[styles.photoButtonText, { color: colors.background }]}>📸 Snap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoButton, styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={addFromGallery}
            >
              <Text style={[styles.photoButtonText, { color: colors.primary }]}>📷 Add</Text>
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


            {/* Location Info */}
            {selectedPhoto.location && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
                <TouchableOpacity 
                  style={[styles.locationContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={openInMaps}
                >
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    📍 {selectedPhoto.location.latitude.toFixed(6)}, {selectedPhoto.location.longitude.toFixed(6)}
                  </Text>
                  <Text style={[styles.locationSubtext, { color: colors.textSecondary }]}>
                    Tap to open in maps
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Current Activity Info */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Currently Associated With</Text>
              <TouchableOpacity 
                style={[styles.currentActivityContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowActivitySelector(true)}
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
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={updatePhotoDetails}
            >
              <Text style={[styles.createButtonText, { color: colors.background }]}>Save Changes</Text>
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

  const renderTripDetailView = () => {
    if (!currentTrip) return null;

    const tripDates = getTripDates();
    
    return (
      <View style={[styles.tripDetailContainer, { backgroundColor: colors.background }]}>
        <View style={styles.tripDetailHeader}>
          <TouchableOpacity 
            style={styles.backButtonContainer}
            onPress={() => {
              setShowTripDetail(false);
              setCurrentTrip(null);
            }}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.tripDetailTitle, { color: colors.text }]}>{currentTrip.title}</Text>
        </View>

        <ScrollView style={styles.tripDetailContent}>
          {tripDates.map((date, index) => {
            const dayActivities = currentTrip.activities.filter(activity => activity.startDate === date);
            const dayPhotos = currentTrip.photos.filter(photo => {
              const photoDate = new Date(photo.timestamp).toISOString().split('T')[0];
              return photoDate === date;
            });

            return (
              <View key={date} style={[styles.dayContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: colors.text }]}>
                    Day {index + 1} - {formatDate(date)}
                  </Text>
                </View>

                {/* Day-level buttons */}
                <View style={styles.dayButtons}>
                  <TouchableOpacity
                    style={[styles.dayButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setSelectedDate(date);
                      setShowAddActivity(true);
                    }}
                  >
                    <Text style={[styles.dayButtonText, { color: colors.background }]}>+ Activity</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addPictureButton, { borderColor: colors.primary }]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedActivity(null);
                      setShowPhotoCapture(true);
                    }}
                  >
                    <Text style={[styles.addPictureButtonText, { color: colors.primary }]}>+ Add Picture</Text>
                  </TouchableOpacity>
                </View>

                {/* Activities for this day */}
                {dayActivities.map((activity) => (
                  <View key={activity.id} style={[styles.activityContainer, { borderColor: colors.border }]}>
                    <View style={styles.activityHeader}>
                      <Text style={[styles.activityName, { color: colors.text }]}>{activity.name}</Text>
                      {activity.time && (
                        <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{activity.time}</Text>
                      )}
                    </View>
                    {activity.description && (
                      <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
                        {activity.description}
                      </Text>
                    )}
                    
                    {/* Activity photos */}
                    {dayPhotos.filter(photo => photo.activityId === activity.id).length > 0 && (
                      <View style={styles.activityPhotos}>
                        {dayPhotos
                          .filter(photo => photo.activityId === activity.id)
                          .map((photo) => (
                            <TouchableOpacity key={photo.id} onPress={() => handlePhotoPress(photo)}>
                              <Image source={{ uri: photo.uri }} style={styles.activityPhoto} />
                            </TouchableOpacity>
                          ))
                        }
                      </View>
                    )}

                    {/* Activity-level photo buttons */}
                    <View style={styles.activityPhotoButtons}>
                      <TouchableOpacity
                        style={[styles.snapButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setSelectedActivity(activity);
                          setSelectedDate(activity.startDate);
                          capturePhoto();
                        }}
                      >
                        <Text style={[styles.snapButtonText, { color: colors.background }]}>📸 Snap</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addButton, { borderColor: colors.primary }]}
                        onPress={() => {
                          setSelectedActivity(activity);
                          setSelectedDate(activity.startDate);
                          addFromGallery();
                        }}
                      >
                        <Text style={[styles.addButtonText, { color: colors.primary }]}>📷 Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Day photos (not associated with activities) */}
                {dayPhotos.filter(photo => !photo.activityId).length > 0 && (
                  <View style={styles.dayPhotos}>
                    <Text style={[styles.dayPhotosTitle, { color: colors.text }]}>Day Photos</Text>
                    <View style={styles.dayPhotosGrid}>
                      {dayPhotos
                        .filter(photo => !photo.activityId)
                        .map((photo) => (
                          <TouchableOpacity key={photo.id} onPress={() => handlePhotoPress(photo)}>
                            <Image source={{ uri: photo.uri }} style={styles.dayPhoto} />
                          </TouchableOpacity>
                        ))
                      }
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {renderCreateTripModal()}
        {renderAddActivityModal()}
        {renderPhotoCaptureModal()}
        {renderPhotoDetailModal()}
        {renderActivitySelectorModal()}
      </View>
    );
  };

  if (showSettings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>📸✈️ TripStory Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your trip documentation preferences
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.primary }]}
          onPress={onCloseSettings}
        >
          <Text style={[styles.closeButtonText, { color: colors.background }]}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }


  if (showTripDetail) {
    return renderTripDetailView();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>📸✈️ TripStory</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Capture and share your trip
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

      <TouchableOpacity
        style={[styles.createTripButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateTrip(true)}
      >
        <Text style={[styles.createTripButtonText, { color: colors.background }]}>+ Create New Trip</Text>
      </TouchableOpacity>

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
  tripRoute: {
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
  createTripButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createTripButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButtonContainer: {
    marginBottom: 8,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripTitleContainer: {
    marginBottom: 16,
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
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 18,
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
  tripDetailHeader: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginHorizontal: 16,
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
    padding: 16,
  },
  dayContainer: {
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayButtons: {
    flexDirection: 'row',
    gap: 12,
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
    marginBottom: 6,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
  },
  activityDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityPhotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginBottom: 2,
  },
  activityPhoto: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 4,
  },
  activityPhotoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  snapButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
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
    borderRadius: 6,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  dayPhoto: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 4,
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
});

export default TripStorySpark;
