import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, Dimensions } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
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

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('minute-minder');
    if (savedData.activitiesText) {
      setActivitiesText(savedData.activitiesText);
      parseActivities(savedData.activitiesText);
    }
    if (savedData.timerState) {
      const savedTimerState = savedData.timerState;
      setTimerState({
        ...savedTimerState,
        startDate: savedTimerState.startDate ? new Date(savedTimerState.startDate) : null,
        completedActivities: new Set(savedTimerState.completedActivities || []),
      });
    }
  }, [getSparkData]);

  // Timer logic
  useEffect(() => {
    if (timerState.isActive) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
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

  // Save data whenever activities text or timer state change
  useEffect(() => {
    setSparkData('minute-minder', {
      activitiesText,
      timerState: {
        ...timerState,
        startDate: timerState.startDate ? timerState.startDate.toISOString() : null,
        completedActivities: Array.from(timerState.completedActivities),
      },
      lastUsed: new Date().toISOString(),
    });
  }, [activitiesText, timerState, setSparkData]);

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
    if (!timerState.isActive || parsedActivities.length === 0) return 'future';

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

  const handleStartTimer = () => {
    if (parsedActivities.length === 0) {
      Alert.alert('No Activities', 'Please add at least one activity before starting.');
      return;
    }
    
    // Determine which activities are already completed based on current time
    const now = new Date();
    const completedActivities = new Set<number>();
    
    parsedActivities.forEach((activity, index) => {
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      const activityStartDate = new Date();
      activityStartDate.setHours(hours, minutes, 0, 0);
      const activityEndDate = new Date(activityStartDate.getTime() + activity.duration * 60 * 1000);
      
      // If the activity end time has already passed, mark as completed
      if (now.getTime() >= activityEndDate.getTime()) {
        completedActivities.add(index);
      }
    });
    
    setTimerState({
      isActive: true,
      startDate: new Date(), // Store when timer started (for reference)
      currentActivityIndex: 0,
      completedActivities,
    });
    
    HapticFeedback.success();
  };

  const handleStopTimer = () => {
    setTimerState({
      isActive: false,
      startDate: null,
      currentActivityIndex: 0,
      completedActivities: new Set(),
    });
    
    HapticFeedback.medium();
  };

  const handleSaveActivities = () => {
    const parsed = parseActivities(activitiesText);
    if (parsed.length === 0) {
      Alert.alert('Invalid Format', 'Please use the format: HH:MM, duration, Activity Name');
      return;
    }
    setIsEditing(false);
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

  const styles = StyleSheet.create({
    fullScreenContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
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
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
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
          />
          <SettingsFeedbackSection sparkName="Minute Minder" sparkId="minute-minder" />
          <SettingsButton
            title="Close"
            onPress={onCloseSettings || (() => {})}
            variant="primary"
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  const current = getCurrentActivity();

  return (
    <View style={styles.fullScreenContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
              <Text style={styles.title}>⏳ Minute Minder</Text>
          <Text style={styles.subtitle}>Make every minute matter</Text>
        </View>

        {!isEditing ? (
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

          {!timerState.isActive && parsedActivities.length === 0 && (
            <View style={styles.inputContainer}>
              <Text style={styles.helpText}>
                Click Edit to add your daily activities in this format:{'\n'}
                HH:MM, duration, Activity Name{'\n'}
                Example: 08:30, 30, Breakfast
              </Text>
            </View>
          )}

          {parsedActivities.length > 0 && (
            <View style={styles.activitiesContainer}>
              {parsedActivities.map((activity, index) => {
                const status = getActivityStatus(index);
                return (
                  <View
                    key={index}
                    style={[
                      styles.activityCard,
                      status === 'current' && styles.activityCardCurrent,
                      status === 'completed' && styles.activityCardCompleted,
                    ]}
                  >
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{activity.name}</Text>
                    </View>
                    <Text style={styles.activityTime}>{getActivityDisplayStatus(index)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!timerState.isActive ? (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleStartTimer}
              >
                <Text style={styles.buttonText}>Start Timer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleStopTimer}
              >
                <Text style={styles.buttonText}>Stop Timer</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
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
      )}
      </ScrollView>
      
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
    </View>
  );
};

