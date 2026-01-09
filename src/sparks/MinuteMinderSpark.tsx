import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Dimensions } from 'react-native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationService } from '../utils/notifications';
import { CommonModal } from '../components/CommonModal';
import { createCommonStyles } from '../styles/CommonStyles';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { GeminiService } from '../services/GeminiService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsButton,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';

interface Activity {
  startTime: string; // HH:MM format
  duration: number; // minutes
  name: string;
  order: number;
}

interface TimerState {
  isActive: boolean;
  startDate: Date | null;
  currentActivityIndex: number;
  completedActivities: Set<number>;
}

const TeeTimeCircularProgress: React.FC<{
  progress: number; // 0-1
  size: number;
  strokeWidth: number;
  children?: React.ReactNode;
}> = ({ progress, size, strokeWidth, children }) => {
  const { colors } = useTheme();

  const remainingProgress = 1 - progress;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - remainingProgress);

  return (
    <View style={{
      width: size,
      height: size,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
};

interface MinuteMinderSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const MinuteMinderSpark: React.FC<MinuteMinderSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);

  const [activitiesText, setActivitiesText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>({
    isActive: false,
    startDate: null,
    currentActivityIndex: 0,
    completedActivities: new Set(),
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [parsedActivities, setParsedActivities] = useState<Activity[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showFlameAnimations, setShowFlameAnimations] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const flameAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const activityRefs = useRef<{ [key: number]: View | null }>({});
  const lastCompletedIndex = useRef<number | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [editingBreak, setEditingBreak] = useState<{ prevIndex: number; nextIndex: number; gap: number } | null>(null);
  const [breakActivityName, setBreakActivityName] = useState('');
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakDuration, setBreakDuration] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const isHydrated = useSparkStore(state => state.isHydrated);

  // Load saved data on mount
  useEffect(() => {
    if (!isHydrated) return;
    if (dataLoaded) return;

    console.log('🔄 MinuteMinderSpark: Loading data, isHydrated:', isHydrated);
    const savedData = getSparkData('minute-minder');
    if (savedData.activitiesText) {
      setActivitiesText(savedData.activitiesText);
    }
    if (savedData.timerState) {
      const savedTimerState = savedData.timerState;
      setTimerState({
        ...savedTimerState,
        startDate: savedTimerState.startDate ? new Date(savedTimerState.startDate) : null,
        completedActivities: new Set(savedTimerState.completedActivities || []),
      });
    }
    setDataLoaded(true);
  }, [getSparkData, isHydrated, dataLoaded]);

  // Handle Scan Schedule
  const handleScanSchedule = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos to scan a schedule.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setIsScanning(true);
        HapticFeedback.light();

        try {
          const prompt = "Turn this image into todays plan using the format HH:MM, mm, Activity such as 13:30, 30, Meet with Joe.";

          interface ScannedActivity {
            originalLine: string;
            startTime: string;
            duration: number;
            activity: string;
          }

          // We ask for a JSON structure to make parsing more robust
          const jsonPrompt = `
            Analyze this image of a schedule. Extract the activities and return them as a JSON array where each item has:
            - "startTime": string in HH:MM format (24h)
            - "duration": number in minutes
            - "activity": string name of the activity
            
            Order them chronologically.
          `;

          const scannedData = await GeminiService.generateJSON<Array<{ startTime: string, duration: number, activity: string }>>(jsonPrompt, [result.assets[0].base64]);

          if (Array.isArray(scannedData) && scannedData.length > 0) {
            const formattedText = scannedData
              .map(item => `${item.startTime}, ${item.duration}, ${item.activity}`)
              .join('\n');

            setActivitiesText(formattedText);
            Alert.alert('Scan Complete', 'Schedule has been updated from the image. Please review and save.');
            HapticFeedback.success();
          } else {
            Alert.alert('Scan Failed', 'Could not extract a valid schedule from the image.');
          }

        } catch (error) {
          console.error('Scan error:', error);
          if (!GeminiService.isApiKeyError(error)) {
            Alert.alert('Scan Error', 'Failed to process the image. Please try again.');
          }
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setIsScanning(false);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // Timer logic
  useEffect(() => {
    if (timerState.isActive) {
      activateKeepAwake(); // Keep screen awake when timer is active
      intervalRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    } else {
      deactivateKeepAwake(); // Allow screen to sleep when timer stops
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      deactivateKeepAwake(); // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isActive]);

  // Check for final 10 seconds and trigger haptics + animation
  useEffect(() => {
    if (!timerState.isActive) {
      setShowFlameAnimations(false);
      setCountdownSeconds(0);
      return;
    }

    const current = getCurrentActivity();
    if (!current || current.status !== 'current') {
      setShowFlameAnimations(false);
      setCountdownSeconds(0);
      return;
    }

    const secondsRemaining = getActivityTime(current.activity, 'current');

    if (secondsRemaining <= 10 && secondsRemaining > 0) {
      setShowFlameAnimations(true);
      setCountdownSeconds(secondsRemaining);

      // Vibrate every second
      HapticFeedback.medium();

      // Animate flame from bottom to top
      flameAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setShowFlameAnimations(false);
      setCountdownSeconds(0);
    }
  }, [currentTime, timerState.isActive]);

  // Save data whenever pharmacies text or timer state change
  useEffect(() => {
    if (!dataLoaded) return;

    setSparkData('minute-minder', {
      activitiesText,
      timerState: {
        ...timerState,
        startDate: timerState.startDate ? timerState.startDate.toISOString() : null,
        completedActivities: Array.from(timerState.completedActivities),
      },
      lastUsed: new Date().toISOString(),
    });
  }, [activitiesText, timerState, setSparkData, dataLoaded]);

  // Parse activities from text input
  const parseActivities = (text: string): Activity[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const activities: Activity[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const startTime = parts[0].trim();
        const duration = parseInt(parts[1].trim());
        const name = parts.slice(2).join(',').trim() || `Activity ${index + 1}`;

        if (/^\d{2}:\d{2}$/.test(startTime) && !isNaN(duration) && duration > 0) {
          activities.push({ startTime, duration, name, order: index });
        }
      }
    });

    // Sort by start time
    activities.sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });

    // Reassign order after sorting
    activities.forEach((activity, index) => {
      activity.order = index;
    });

    return activities;
  };

  // Update parsed activities when text changes
  useEffect(() => {
    if (activitiesText) {
      setParsedActivities(parseActivities(activitiesText));
    } else {
      setParsedActivities([]);
    }
  }, [activitiesText]);

  // Get activity status based on today's schedule
  const getActivityStatus = (activityIndex: number): 'completed' | 'current' | 'future' => {
    if (parsedActivities.length === 0) return 'future';

    // When timer is not active, all activities are considered 'future' for display purposes
    // (they'll be shown as completed based on time, but we want to show them all)
    if (!timerState.isActive) {
      // Still determine if they're actually completed based on time
      const now = currentTime;
      const activity = parsedActivities[activityIndex];
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      const activityStartDate = new Date();
      activityStartDate.setHours(hours, minutes, 0, 0);
      const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);

      if (now.getTime() >= activityEndDate.getTime()) {
        return 'completed';
      }
      if (now.getTime() >= activityStartDate.getTime() && now.getTime() < activityEndDate.getTime()) {
        return 'current';
      }
      return 'future';
    }

    // First check if manually marked as completed
    if (timerState.completedActivities.has(activityIndex)) return 'completed';

    const now = currentTime;
    const activity = parsedActivities[activityIndex];

    // Parse activity start time for today
    const [hours, minutes] = activity.startTime.split(':').map(Number);
    const activityStartDate = new Date();
    activityStartDate.setHours(hours, minutes, 0, 0);

    const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);

    // If the activity has already ended, mark as completed (and add to completed set)
    if (now.getTime() >= activityEndDate.getTime()) {
      return 'completed';
    }
    // If we're currently in the activity window, mark as current
    if (now.getTime() >= activityStartDate.getTime() && now.getTime() < activityEndDate.getTime()) return 'current';
    // Otherwise it's a future activity
    return 'future';
  };

  // Get current or next activity
  const getCurrentActivity = (): { activity: Activity; status: 'current' | 'next' } | null => {
    if (parsedActivities.length === 0) return null;

    // Find current activity
    const currentIndex = parsedActivities.findIndex((_, index) =>
      getActivityStatus(index) === 'current'
    );

    if (currentIndex >= 0) {
      return { activity: parsedActivities[currentIndex], status: 'current' };
    }

    // Find next future activity
    const nextIndex = parsedActivities.findIndex((_, index) =>
      getActivityStatus(index) === 'future'
    );

    if (nextIndex >= 0) {
      return { activity: parsedActivities[nextIndex], status: 'next' };
    }

    return null;
  };

  // Get time until activity starts or remaining time
  const getActivityTime = (activity: Activity, status: 'current' | 'next'): number => {
    const now = currentTime;

    // Parse activity start time for today
    const [hours, minutes] = activity.startTime.split(':').map(Number);
    const activityStartDate = new Date();
    activityStartDate.setHours(hours, minutes, 0, 0);

    if (status === 'current') {
      // Time remaining in current activity
      const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);
      return Math.max(0, Math.floor((activityEndDate.getTime() - now.getTime()) / 1000));
    } else {
      // Time until next activity starts
      return Math.max(0, Math.floor((activityStartDate.getTime() - now.getTime()) / 1000));
    }
  };

  // Get progress for current activity
  const getCurrentActivityProgress = (): number => {
    const current = getCurrentActivity();
    if (!current || current.status !== 'current') return 0;

    const secondsRemaining = getActivityTime(current.activity, 'current');
    const totalSeconds = current.activity.duration * 60;
    return 1 - (secondsRemaining / totalSeconds);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    if (parsedActivities.length === 0) {
      Alert.alert('No Activities', 'Please add at least one activity before starting.');
      return;
    }

    // Cancel any existing activity notifications first
    await NotificationService.cancelAllActivityNotifications();

    // Determine which activities are already completed based on current time
    const now = new Date();
    const completedActivities = new Set<number>();
    const futureActivities: Array<{ index: number; startDate: Date }> = [];
    const activitiesForTomorrow: Array<{ index: number; startDate: Date }> = [];

    // First pass: categorize activities as future (today) or candidates for tomorrow
    parsedActivities.forEach((activity, index) => {
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      const activityStartDate = new Date();
      activityStartDate.setHours(hours, minutes, 0, 0);

      const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);

      // If the activity end time has already passed, mark as completed
      if (now.getTime() >= activityEndDate.getTime()) {
        completedActivities.add(index);
        // Check if this activity could still be scheduled for tomorrow
        const tomorrowStartDate = new Date(activityStartDate);
        tomorrowStartDate.setDate(tomorrowStartDate.getDate() + 1);
        const tomorrowEndDate = new Date(tomorrowStartDate.getTime() + activity.duration * 60 * 1000);
        // Only add to tomorrow list if it hasn't ended even tomorrow
        if (now.getTime() < tomorrowEndDate.getTime()) {
          activitiesForTomorrow.push({ index, startDate: tomorrowStartDate });
        }
      } else if (activityStartDate.getTime() > now.getTime()) {
        // Activity is in the future today
        futureActivities.push({ index, startDate: activityStartDate });
      } else {
        // Activity start time has passed today but hasn't ended yet
        // Check if it could be scheduled for tomorrow
        const tomorrowStartDate = new Date(activityStartDate);
        tomorrowStartDate.setDate(tomorrowStartDate.getDate() + 1);
        const tomorrowEndDate = new Date(tomorrowStartDate.getTime() + activity.duration * 60 * 1000);
        if (now.getTime() < tomorrowEndDate.getTime()) {
          activitiesForTomorrow.push({ index, startDate: tomorrowStartDate });
        }
      }
    });

    // If no future activities remain today, but there are activities that could be scheduled for tomorrow
    if (futureActivities.length === 0 && activitiesForTomorrow.length > 0) {
      Alert.alert(
        'All Activities Past',
        'All activities have already started today. Would you like to schedule reminders for tomorrow?',
        [
          {
            text: 'Cancel', style: 'cancel', onPress: () => {
              setTimerState({
                isActive: true,
                startDate: new Date(),
                currentActivityIndex: 0,
                completedActivities,
              });
              HapticFeedback.success();
            }
          },
          {
            text: 'Schedule for Tomorrow', onPress: async () => {
              // Schedule all activities for tomorrow
              for (const { index, startDate } of activitiesForTomorrow) {
                NotificationService.scheduleActivityNotification(
                  parsedActivities[index].name,
                  startDate,
                  `minute-minder-${index}`,
                  'Minute Minder',
                  'minute-minder',
                  '⏳'
                ).catch(error => {
                  console.error(`Error scheduling notification for ${parsedActivities[index].name}:`, error);
                });
              }

              setTimerState({
                isActive: true,
                startDate: new Date(),
                currentActivityIndex: 0,
                completedActivities,
              });
              HapticFeedback.success();
            }
          }
        ]
      );
      return;
    }

    // Schedule notifications for future activities (today)
    for (const { index, startDate } of futureActivities) {
      NotificationService.scheduleActivityNotification(
        parsedActivities[index].name,
        startDate,
        `minute-minder-${index}`,
        'Minute Minder',
        'minute-minder',
        '⏳'
      ).catch(error => {
        console.error(`Error scheduling notification for ${parsedActivities[index].name}:`, error);
      });
    }

    setTimerState({
      isActive: true,
      startDate: new Date(), // Store when timer started (for reference)
      currentActivityIndex: 0,
      completedActivities,
    });

    HapticFeedback.success();
  };

  const handleStopTimer = async () => {
    // Cancel all activity notifications
    await NotificationService.cancelAllActivityNotifications();

    setTimerState({
      isActive: false,
      startDate: null,
      currentActivityIndex: 0,
      completedActivities: new Set(),
    });

    HapticFeedback.medium();
  };

  const handleSaveActivities = async () => {
    const parsed = parseActivities(activitiesText);
    if (parsed.length === 0) {
      Alert.alert('Invalid Format', 'Please use the format: HH:MM, duration, Activity Name');
      return;
    }
    setIsEditing(false);

    // If timer is active, reschedule notifications
    if (timerState.isActive) {
      await NotificationService.cancelAllActivityNotifications();

      const now = new Date();
      const futureActivities: Array<{ index: number; startDate: Date }> = [];
      const activitiesForTomorrow: Array<{ index: number; startDate: Date }> = [];

      // Categorize activities as future (today) or candidates for tomorrow
      parsed.forEach((activity, index) => {
        const [hours, minutes] = activity.startTime.split(':').map(Number);
        const activityStartDate = new Date();
        activityStartDate.setHours(hours, minutes, 0, 0);

        const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);

        if (activityStartDate.getTime() > now.getTime()) {
          // Activity is in the future today
          futureActivities.push({ index, startDate: activityStartDate });
        } else {
          // Activity has started or ended today - check if it could be scheduled for tomorrow
          const tomorrowStartDate = new Date(activityStartDate);
          tomorrowStartDate.setDate(tomorrowStartDate.getDate() + 1);
          const tomorrowEndDate = new Date(tomorrowStartDate.getTime() + activity.duration * 60 * 1000);
          // Only add to tomorrow list if it hasn't ended even tomorrow
          if (now.getTime() < tomorrowEndDate.getTime()) {
            activitiesForTomorrow.push({ index, startDate: tomorrowStartDate });
          }
        }
      });

      // If no future activities remain today, but there are activities that could be scheduled for tomorrow
      if (futureActivities.length === 0 && activitiesForTomorrow.length > 0) {
        Alert.alert(
          'All Activities Past',
          'All activities have already started today. Would you like to schedule reminders for tomorrow?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Schedule for Tomorrow', onPress: async () => {
                // Schedule all activities for tomorrow
                for (const { index, startDate } of activitiesForTomorrow) {
                  NotificationService.scheduleActivityNotification(
                    parsed[index].name,
                    startDate,
                    `minute-minder-${index}`,
                    'Minute Minder',
                    'minute-minder',
                    '⏳'
                  ).catch(error => {
                    console.error(`Error scheduling notification for ${parsed[index].name}:`, error);
                  });
                }
              }
            }
          ]
        );
      } else {
        // Schedule notifications for future activities (today)
        for (const { index, startDate } of futureActivities) {
          NotificationService.scheduleActivityNotification(
            parsed[index].name,
            startDate,
            `minute-minder-${index}`,
            'Minute Minder',
            'minute-minder',
            '⏳'
          ).catch(error => {
            console.error(`Error scheduling notification for ${parsed[index].name}:`, error);
          });
        }
      }
    }

    HapticFeedback.success();
  };

  const getActivityDisplayStatus = (activityIndex: number): string => {
    const status = getActivityStatus(activityIndex);
    const activity = parsedActivities[activityIndex];

    if (status === 'completed') {
      return '✓ Complete';
    } else if (status === 'current') {
      const secondsRemaining = getActivityTime(activity, 'current');
      return formatTime(secondsRemaining);
    } else {
      // Future activity - show when it starts with start time
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      return `${activity.startTime} (${activity.duration}m)`;
    }
  };

  // Get gap in minutes between two activities (by original index)
  const getGapBetweenActivities = (activityIndex1: number, activityIndex2: number): number | null => {
    if (activityIndex1 < 0 || activityIndex2 >= parsedActivities.length || activityIndex1 >= activityIndex2) return null;

    const activity1 = parsedActivities[activityIndex1];
    const activity2 = parsedActivities[activityIndex2];

    const [hours1, minutes1] = activity1.startTime.split(':').map(Number);
    const [hours2, minutes2] = activity2.startTime.split(':').map(Number);

    const start1 = new Date();
    start1.setHours(hours1, minutes1, 0, 0);
    const end1 = new Date(start1.getTime() + activity1.duration * 60 * 1000);

    const start2 = new Date();
    start2.setHours(hours2, minutes2, 0, 0);

    const gapMs = start2.getTime() - end1.getTime();
    const gapMinutes = Math.floor(gapMs / (60 * 1000));

    return gapMinutes > 0 ? gapMinutes : null;
  };

  // Get start time for a break (end time of previous activity)
  const getBreakStartTime = (prevIndex: number): string => {
    if (prevIndex < 0 || prevIndex >= parsedActivities.length) return '';
    const activity = parsedActivities[prevIndex];
    const [hours, minutes] = activity.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + activity.duration * 60 * 1000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Handle break edit
  const handleBreakEdit = (prevIndex: number, nextIndex: number, gap: number) => {
    const startTime = getBreakStartTime(prevIndex);
    setEditingBreak({ prevIndex, nextIndex, gap });
    setBreakStartTime(startTime);
    setBreakDuration(gap.toString());
    setBreakActivityName('');
    setShowBreakModal(true);
  };

  // Save break as new activity
  const handleSaveBreak = () => {
    if (!editingBreak) return;

    const duration = parseInt(breakDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid positive number for duration.');
      return;
    }

    if (!breakActivityName.trim()) {
      Alert.alert('Missing Name', 'Please enter an activity name.');
      return;
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(breakStartTime)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format.');
      return;
    }

    // Create new activity
    const newActivity: Activity = {
      startTime: breakStartTime,
      duration,
      name: breakActivityName.trim(),
      order: editingBreak.nextIndex, // Insert before next activity
    };

    // Insert the new activity into parsedActivities
    const updatedActivities = [...parsedActivities];
    updatedActivities.splice(editingBreak.nextIndex, 0, newActivity);

    // Reassign order numbers
    updatedActivities.forEach((activity, index) => {
      activity.order = index;
    });

    // Update activities text and re-parse to ensure proper sorting
    const newActivitiesText = updatedActivities
      .map(activity => `${activity.startTime}, ${activity.duration}, ${activity.name}`)
      .join('\n');

    setActivitiesText(newActivitiesText);
    // Re-parse to ensure proper sorting by time
    const reParsed = parseActivities(newActivitiesText);
    setParsedActivities(reParsed);
    setShowBreakModal(false);
    setEditingBreak(null);
    setBreakActivityName('');
    setBreakStartTime('');
    setBreakDuration('');
    HapticFeedback.success();
  };

  // Get organized activities: completed above, current/next at top, future below
  // While timer is active: only show current/next and future (hide completed)
  // When timer is stopped: show all including completed
  const getOrganizedActivities = (): Array<{ activity: Activity; index: number; status: 'completed' | 'current' | 'future' }> => {
    if (parsedActivities.length === 0) return [];

    const completed: Array<{ activity: Activity; index: number; status: 'completed' }> = [];
    const currentOrNext: Array<{ activity: Activity; index: number; status: 'current' | 'future' }> = [];
    const future: Array<{ activity: Activity; index: number; status: 'future' }> = [];

    parsedActivities.forEach((activity, index) => {
      const status = getActivityStatus(index);
      const item = { activity, index, status };

      // While timer is active, filter out completed activities
      if (timerState.isActive && status === 'completed') {
        return; // Skip completed activities when timer is active
      }

      if (status === 'completed') {
        completed.push(item as { activity: Activity; index: number; status: 'completed' });
      } else if (status === 'current' || (status === 'future' && currentOrNext.length === 0)) {
        // Current activity or first future activity (next)
        currentOrNext.push(item as { activity: Activity; index: number; status: 'current' | 'future' });
      } else {
        future.push(item as { activity: Activity; index: number; status: 'future' });
      }
    });

    // Reverse completed so most recent is at top
    completed.reverse();

    // When timer is active, only return current/next and future (no completed)
    if (timerState.isActive) {
      return [...currentOrNext, ...future];
    }

    // When timer is stopped, return all including completed
    return [...completed, ...currentOrNext, ...future];
  };

  // Auto-scroll when activity completes - keep current/next activity at top
  useEffect(() => {
    if (!timerState.isActive || !scrollViewRef.current || parsedActivities.length === 0) return;

    const organized = getOrganizedActivities();
    if (organized.length === 0) return;

    const currentIndex = parsedActivities.findIndex((_, index) => getActivityStatus(index) === 'current');
    const nextIndex = parsedActivities.findIndex((_, index) => getActivityStatus(index) === 'future');

    const targetIndex = currentIndex >= 0 ? currentIndex : nextIndex;

    if (targetIndex >= 0 && targetIndex !== lastCompletedIndex.current) {
      // Find the position of this activity in the organized list
      const organizedIndex = organized.findIndex(item => item.index === targetIndex);

      if (organizedIndex >= 0) {
        // Estimate scroll position based on item height (approximately 80px per item including margins)
        // Scroll to position the current/next activity at the top of the scroll view
        const estimatedY = organizedIndex * 80;

        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, estimatedY - 20), animated: true });
        }, 200);
      }

      lastCompletedIndex.current = targetIndex;
    }
  }, [currentTime, timerState.isActive, parsedActivities]);

  // Initial scroll to current/next activity when timer starts
  useEffect(() => {
    if (timerState.isActive && scrollViewRef.current && parsedActivities.length > 0) {
      const organized = getOrganizedActivities();
      const currentIndex = parsedActivities.findIndex((_, index) => getActivityStatus(index) === 'current');
      const nextIndex = parsedActivities.findIndex((_, index) => getActivityStatus(index) === 'future');
      const targetIndex = currentIndex >= 0 ? currentIndex : nextIndex;

      if (targetIndex >= 0) {
        const organizedIndex = organized.findIndex(item => item.index === targetIndex);
        if (organizedIndex >= 0) {
          setTimeout(() => {
            const estimatedY = organizedIndex * 80;
            scrollViewRef.current?.scrollTo({ y: Math.max(0, estimatedY - 20), animated: false });
          }, 300);
        }
      }
    }
  }, [timerState.isActive]);

  const styles = StyleSheet.create({
    ...commonStyles,
    fixedHeader: {
      backgroundColor: colors.background,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    // Overriding common title to be larger for this specific spark
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    scrollView: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    editButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
      marginBottom: 12,
    },
    editButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    inputContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textInput: {
      fontSize: 14,
      color: colors.text,
      textAlignVertical: 'top',
      minHeight: 120,
      fontFamily: 'monospace',
    },
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    timerSection: {
      alignItems: 'center',
      marginBottom: 30,
    },
    progressContainer: {
      marginBottom: 20,
    },
    circleContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityNameText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    timeText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    activityInfoText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    activitiesContainer: {
      marginBottom: 20,
    },
    activityCard: {
      backgroundColor: colors.surface,
      padding: 16,
      marginVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityCardCurrent: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    activityCardCompleted: {
      opacity: 0.6,
    },
    breakDivider: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      marginVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    breakDividerText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      flex: 1,
    },
    breakEditIcon: {
      fontSize: 18,
      color: colors.primary,
      marginLeft: 8,
    },
    breakModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    breakModalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    breakModalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    breakModalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      backgroundColor: colors.background,
    },
    breakModalLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    breakModalButtonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    breakModalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    breakModalSaveButton: {
      backgroundColor: colors.primary,
    },
    breakModalCancelButton: {
      backgroundColor: colors.border,
    },
    breakModalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    breakModalCancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    activityInfo: {
      flex: 1,
    },
    activityName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    activityTime: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      minWidth: 100,
      textAlign: 'right',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    // We can reuse common buttons, but might want specific overrides or just use commonStyles directly in render
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    flameContainer: {
      position: 'absolute',
      bottom: 0,
      alignSelf: 'center',
      width: 200,
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    },
    flameEmoji: {
      fontSize: 180,
    },
  });

  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Minute Minder Settings"
            subtitle="Make every minute matter"
            icon="⏳"
            sparkId="minute-minder"
          />
          <SettingsFeedbackSection sparkName="Minute Minder" sparkId="minute-minder" />
          <SettingsButton
            title="Close"
            onPress={onCloseSettings || (() => { })}
            variant="primary"
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  const current = getCurrentActivity();
  const organizedActivities = getOrganizedActivities();

  return (
    <View style={styles.container}>
      {/* Fixed header with clock */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>⏳ Minute Minder</Text>
          <Text style={styles.subtitle}>Make every minute matter</Text>
        </View>

        {!isEditing && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>

            {timerState.isActive && current && (
              <View style={styles.timerSection}>
                <TeeTimeCircularProgress
                  progress={getCurrentActivityProgress()}
                  size={200}
                  strokeWidth={12}
                >
                  <View style={styles.circleContent}>
                    <Text style={styles.activityNameText}>
                      {current.status === 'current' ? current.activity.name : `${current.activity.name} starts in`}
                    </Text>
                    <Text style={styles.timeText}>
                      {showFlameAnimations && countdownSeconds > 0 ? countdownSeconds : formatTime(getActivityTime(current.activity, current.status))}
                    </Text>
                    <Text style={styles.activityInfoText}>
                      {showFlameAnimations ? 'seconds' : current.status === 'current' ? 'remaining' : 'minutes'}
                    </Text>
                  </View>
                </TeeTimeCircularProgress>
              </View>
            )}

            {!timerState.isActive && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleStartTimer}
                >
                  <Text style={styles.buttonText}>Start Timer</Text>
                </TouchableOpacity>
              </View>
            )}

            {timerState.isActive && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={handleStopTimer}
                >
                  <Text style={styles.buttonText}>Stop Timer</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Scrollable activities list */}
      {!isEditing ? (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
        >
          {!timerState.isActive && parsedActivities.length === 0 && (
            <View style={styles.inputContainer}>
              <Text style={styles.helpText}>
                Click Edit to add your daily activities in this format:{'\n'}
                HH:MM, duration, Activity Name{'\n'}
                Example: 08:30, 30, Breakfast
              </Text>
            </View>
          )}

          {organizedActivities.length > 0 && (
            <View style={styles.activitiesContainer}>
              {organizedActivities.map((item, organizedIndex) => {
                const { activity, index: originalIndex, status } = item;
                const prevItem = organizedIndex > 0 ? organizedActivities[organizedIndex - 1] : null;

                // Check for gap before this activity
                // Show gap if the previous activity in the organized list ends before this one starts
                // and they are consecutive in the original time-ordered list
                let gap: number | null = null;
                if (prevItem) {
                  const sortedIndices = [prevItem.index, originalIndex].sort((a, b) => a - b);
                  // Only show gap if activities are consecutive in original order
                  if (sortedIndices[1] - sortedIndices[0] === 1) {
                    gap = getGapBetweenActivities(sortedIndices[0], sortedIndices[1]);
                  }
                }

                return (
                  <View key={`${originalIndex}-${organizedIndex}`}>
                    {/* Show break divider if there's a gap */}
                    {gap !== null && gap > 0 && prevItem && (
                      <TouchableOpacity
                        style={styles.breakDivider}
                        onPress={() => handleBreakEdit(prevItem.index, originalIndex, gap!)}
                      >
                        <Text style={styles.breakDividerText}>
                          {gap} minute{gap !== 1 ? 's' : ''} break
                        </Text>
                        <Text style={styles.breakEditIcon}>✎</Text>
                      </TouchableOpacity>
                    )}

                    <View
                      ref={(ref) => {
                        activityRefs.current[originalIndex] = ref;
                      }}
                      style={[
                        styles.activityCard,
                        status === 'current' && styles.activityCardCurrent,
                        status === 'completed' && styles.activityCardCompleted,
                      ]}
                    >
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityName}>{activity.name}</Text>
                      </View>
                      <Text style={styles.activityTime}>{getActivityDisplayStatus(originalIndex)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={activitiesText}
              onChangeText={setActivitiesText}
              placeholder="08:30, 30, Breakfast&#10;09:00, 30, Drive to Work&#10;10:30, 30, Meeting with Dave"
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
            />
            <Text style={styles.helpText}>
              Format: HH:MM, duration (minutes), Activity Name{'\n'}
              One activity per line
            </Text>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: colors.secondary,
                  marginTop: 12,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }
              ]}
              onPress={handleScanSchedule}
              disabled={isScanning}
            >
              <Text style={{ fontSize: 18 }}>📸</Text>
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {isScanning ? 'Scanning...' : 'Scan Schedule'}
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.border }]}
                onPress={() => {
                  setIsEditing(false);
                  setActivitiesText(getSparkData('minute-minder').activitiesText || '');
                }}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSaveActivities}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Flame animation during final 10 seconds - positioned absolutely over everything */}
      {showFlameAnimations && timerState.isActive && current && (
        <Animated.View
          style={[
            styles.flameContainer,
            {
              transform: [{
                translateY: flameAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenHeight + 100, -screenHeight - 200], // Start from below screen, go way above
                })
              }, {
                scale: flameAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1.5, 2], // Scale from small to huge
                })
              }],
              opacity: flameAnim.interpolate({
                inputRange: [0, 0.2, 0.8, 1],
                outputRange: [0, 1, 1, 0],
              }),
            },
          ]}
        >
          <Text style={styles.flameEmoji}>🔥</Text>
        </Animated.View>
      )}

      {/* Break Edit Modal */}
      <CommonModal
        visible={showBreakModal}
        title="Fill Break"
        onClose={() => setShowBreakModal(false)}
        footer={
          <View style={commonStyles.modalButtons}>
            <TouchableOpacity
              style={[commonStyles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => {
                setShowBreakModal(false);
                setEditingBreak(null);
                setBreakActivityName('');
                setBreakStartTime('');
                setBreakDuration('');
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[commonStyles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveBreak}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>Activity Name</Text>
          <TextInput
            style={commonStyles.input}
            value={breakActivityName}
            onChangeText={setBreakActivityName}
            placeholder="e.g., Coffee Break"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8, marginTop: 16 }}>Start Time (HH:MM)</Text>
          <TextInput
            style={commonStyles.input}
            value={breakStartTime}
            onChangeText={setBreakStartTime}
            placeholder="21:15"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8, marginTop: 16 }}>Duration (minutes)</Text>
          <TextInput
            style={commonStyles.input}
            value={breakDuration}
            onChangeText={setBreakDuration}
            placeholder="18"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>
      </CommonModal>
    </View>
  );
};

