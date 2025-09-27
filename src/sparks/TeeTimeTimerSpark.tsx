import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, PanResponder, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import Svg, { Circle } from 'react-native-svg';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsButton,
  SaveCancelButtons,
} from '../components/SettingsComponents';

interface Activity {
  id: string;
  name: string;
  duration: number; // minutes
  order: number;
}

interface TimerState {
  teeTime: Date | null;
  startTime: Date | null;
  isActive: boolean;
  currentActivityIndex: number;
  completedActivities: Set<string>;
}

const defaultActivities: Activity[] = [
  { id: '1', name: '⛳️ 20 Putts', duration: 8, order: 1 },
  { id: '2', name: '⛳️ 15 Chips', duration: 8, order: 2 },
  { id: '3', name: '🏌️‍♂️ 15 Drives', duration: 7, order: 3 },
  { id: '4', name: '🏌️‍♂️ 20 Irons', duration: 7, order: 4 },
  { id: '5', name: '🚙 Drive to Course', duration: 15, order: 5 },
  { id: '6', name: '☕️ Make Coffee', duration: 5, order: 6 },
];

// SVG-based circular progress that works perfectly with exact degrees
const TeeTimeCircularProgress: React.FC<{
  progress: number; // 0-1
  size: number;
  strokeWidth: number;
  children?: React.ReactNode;
}> = ({ progress, size, strokeWidth, children }) => {
  const { colors } = useTheme();

  // Calculate remaining progress: (100% - % complete)
  const remainingProgress = 1 - progress;

  // SVG circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash offset for countdown
  // When progress = 0 (0% done), remainingProgress = 1 (show full circle)
  // When progress = 1 (100% done), remainingProgress = 0 (show no circle)
  const strokeDashoffset = circumference * (1 - remainingProgress);

  return (
    <View style={{
      width: size,
      height: size,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* SVG Circular Progress */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
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
          transform={`rotate(-90 ${size / 2} ${size / 2})`} // Start from top
        />
      </Svg>

      {/* Custom children overlay */}
      <View style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
};

// Activity Card Component
const ActivityCard: React.FC<{
  activity: Activity;
  status: 'completed' | 'current' | 'future';
  timeRemaining?: number; // seconds
  currentTime: Date;
  activityStartTime: Date;
}> = ({ activity, status, timeRemaining, currentTime, activityStartTime }) => {
  const { colors } = useTheme();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeDisplay = (): string => {
    if (status === 'completed') {
      // Check if this was auto-completed due to late start
      const activityEndTime = new Date(activityStartTime.getTime() + activity.duration * 60 * 1000);
      const wasAutoCompleted = currentTime.getTime() < activityEndTime.getTime();
      return wasAutoCompleted ? '⏭ Skipped' : '✓ Complete';
    } else {
      // Always show countdown until the activity ENDS (not starts)
      const activityEndTime = new Date(activityStartTime.getTime() + activity.duration * 60 * 1000);
      const secondsUntilEnd = Math.floor((activityEndTime.getTime() - currentTime.getTime()) / 1000);

      if (secondsUntilEnd > 0) {
        return formatTime(secondsUntilEnd);
      } else {
        return '✓ Complete';
      }
    }
  };

  const cardStyles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      marginVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: status === 'current' ? colors.primary : colors.border,
      opacity: status === 'completed' ? 0.6 : 1,
    },
    activityInfo: {
      flex: 1,
    },
    activityName: {
      fontSize: 16,
      fontWeight: '600',
      color: status === 'completed' ? colors.textSecondary : colors.text,
      textDecorationLine: status === 'completed' ? 'line-through' : 'none',
    },
    timeDisplay: {
      fontSize: 16,
      fontWeight: '600',
      color: status === 'current' ? colors.primary :
             status === 'completed' ? (getTimeDisplay().includes('Skipped') ? colors.warning : colors.success) : colors.text,
      minWidth: 80,
      textAlign: 'right',
    },
  });

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.activityInfo}>
        <Text style={cardStyles.activityName}>{activity.name}</Text>
      </View>
      <Text style={cardStyles.timeDisplay}>{getTimeDisplay()}</Text>
    </View>
  );
};

// Draggable Activity Item Component
const DraggableActivityItem: React.FC<{
  activity: Activity;
  index: number;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: string, updates: Partial<Activity>) => void;
  totalActivities: number;
  onDragStart: () => void;
  onDragEnd: () => void;
}> = ({ activity, index, onRemove, onMove, onUpdate, totalActivities, onDragStart, onDragEnd }) => {
  const { colors } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editName, setEditName] = useState(activity.name);
  const [editDuration, setEditDuration] = useState(activity.duration.toString());

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Always respond to drag handle touches if not editing
        return !isEditingName && !isEditingDuration;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Start drag on any vertical movement if not editing
        return !isEditingName && !isEditingDuration && Math.abs(gestureState.dy) > 3;
      },
      onPanResponderTerminationRequest: () => false, // Never allow termination
      onShouldBlockNativeResponder: () => true, // Always block native responders
      onPanResponderGrant: (_, gestureState) => {
        console.log('Drag started');
        setIsDragging(true);
        onDragStart();
        HapticFeedback.light();
        // Reset pan value to current offset
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow vertical movement for reordering
        pan.setValue({ x: 0, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log(`Drag ended: dy=${gestureState.dy}`);
        setIsDragging(false);
        onDragEnd();
        pan.flattenOffset();

        // Calculate new position based on gesture - each item is roughly 96px tall (including margins)
        const itemHeight = 96;
        const moved = Math.round(gestureState.dy / itemHeight);
        const newIndex = Math.max(0, Math.min(index + moved, totalActivities - 1));

        console.log(`Drag calculation: dy=${gestureState.dy}, itemHeight=${itemHeight}, moved=${moved}, fromIndex=${index}, toIndex=${newIndex}`);

        // Only reorder if moved to a different position and gesture was significant
        if (newIndex !== index && Math.abs(gestureState.dy) > 30) {
          console.log(`Executing move: item ${index} to ${newIndex}`);
          onMove(index, newIndex);
          HapticFeedback.success();
        } else {
          console.log(`No move: newIndex=${newIndex}, index=${index}, dy=${gestureState.dy}`);
        }

        // Reset position with animation
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 300,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const handleNameSubmit = () => {
    if (editName.trim()) {
      onUpdate(activity.id, { name: editName.trim() });
    } else {
      setEditName(activity.name); // Reset if empty
    }
    setIsEditingName(false);
  };

  const handleDurationSubmit = () => {
    const duration = parseInt(editDuration);
    if (duration > 0 && duration <= 120) { // Max 2 hours
      onUpdate(activity.id, { duration });
    } else {
      setEditDuration(activity.duration.toString()); // Reset if invalid
    }
    setIsEditingDuration(false);
  };

  const itemStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDragging ? colors.primary : colors.border,
      elevation: isDragging ? 8 : 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: isDragging ? 4 : 2 },
      shadowOpacity: isDragging ? 0.3 : 0.1,
      shadowRadius: isDragging ? 8 : 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    dragHandle: {
      paddingRight: 12,
      paddingLeft: 8,
      paddingVertical: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 32,
      backgroundColor: isDragging ? colors.primary + '20' : 'transparent',
      borderRadius: 8,
    },
    dragIcon: {
      fontSize: 24,
      color: isDragging ? colors.primary : colors.textSecondary,
      fontWeight: 'bold',
      lineHeight: 24,
    },
    activityInfo: {
      flex: 1,
    },
    activityName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    nameInput: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
    },
    durationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    durationText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    durationInput: {
      fontSize: 14,
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
      minWidth: 40,
      textAlign: 'center',
    },
    removeButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <Animated.View
      style={[
        itemStyles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
    >
      <View style={itemStyles.header}>
        <View style={itemStyles.dragHandle} {...panResponder.panHandlers}>
          <Text style={itemStyles.dragIcon}>☰</Text>
        </View>
        <View style={itemStyles.activityInfo}>
          {isEditingName ? (
            <TextInput
              style={itemStyles.nameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleNameSubmit}
              onSubmitEditing={handleNameSubmit}
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditingName(true)}>
              <Text style={itemStyles.activityName}>{activity.name}</Text>
            </TouchableOpacity>
          )}
          <View style={itemStyles.durationContainer}>
            {isEditingDuration ? (
              <>
                <TextInput
                  style={itemStyles.durationInput}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  onBlur={handleDurationSubmit}
                  onSubmitEditing={handleDurationSubmit}
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={itemStyles.durationText}> minutes</Text>
              </>
            ) : (
              <TouchableOpacity onPress={() => setIsEditingDuration(true)}>
                <Text style={itemStyles.durationText}>{activity.duration} minutes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={itemStyles.removeButton}
          onPress={() => onRemove(activity.id)}
        >
          <Text style={itemStyles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Settings Component
const TeeTimeTimerSettings: React.FC<{
  activities: Activity[];
  onSave: (activities: Activity[]) => void;
  onClose: () => void;
}> = ({ activities, onSave, onClose }) => {
  const { colors } = useTheme();
  const [editingActivities, setEditingActivities] = useState<Activity[]>([...activities]);
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);

  const addActivity = () => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      name: 'New Activity',
      duration: 5,
      order: editingActivities.length + 1,
    };
    setEditingActivities([...editingActivities, newActivity]);
  };

  const removeActivity = (id: string) => {
    if (editingActivities.length <= 1) {
      Alert.alert('Error', 'You must have at least one activity');
      return;
    }
    setEditingActivities(editingActivities.filter(a => a.id !== id));
  };

  const moveActivity = (fromIndex: number, toIndex: number) => {
    console.log(`moveActivity called: from ${fromIndex} to ${toIndex}`);

    if (fromIndex === toIndex) return;

    const newActivities = [...editingActivities];
    const movedActivity = newActivities[fromIndex];

    // Remove the item from its current position
    newActivities.splice(fromIndex, 1);

    // Insert it at the new position
    newActivities.splice(toIndex, 0, movedActivity);

    // Update order values to match new positions
    const reorderedActivities = newActivities.map((activity, index) => ({
      ...activity,
      order: index + 1
    }));

    console.log('Reordered activities:', reorderedActivities.map(a => a.name));
    setEditingActivities(reorderedActivities);
    HapticFeedback.success();
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setEditingActivities(editingActivities.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ));
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will replace all activities with the default golf preparation activities. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => setEditingActivities([...defaultActivities]) }
      ]
    );
  };

  const handleSave = () => {
    const reorderedActivities = editingActivities.map((activity, index) => ({
      ...activity,
      order: index + 1
    }));
    onSave(reorderedActivities);
    onClose();
  };

  const settingsStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
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
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    activityItem: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    activityName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    removeButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    durationText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    addButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    resetButton: {
      backgroundColor: colors.border,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 24,
    },
    resetButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const settingsSubStyles = StyleSheet.create({
    dragInstruction: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginBottom: 16,
    },
    activitiesContainer: {
      backgroundColor: 'transparent',
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SettingsContainer>
        <SettingsScrollView>
            <SettingsHeader
              title="Tee Time Timer Settings"
              subtitle="Customize your golf preparation activities"
              icon="⚙️"
            />

            <SettingsSection title={`Activities (${editingActivities.length})`}>
              <Text style={settingsSubStyles.dragInstruction}>
                Drag the ☰ handle to reorder activities
              </Text>
              <View style={settingsSubStyles.activitiesContainer}>
                {editingActivities.map((activity, index) => (
                  <DraggableActivityItem
                    key={`${activity.id}-${index}-${activity.order}`}
                    activity={activity}
                    index={index}
                    onRemove={removeActivity}
                    onMove={moveActivity}
                    onUpdate={updateActivity}
                    totalActivities={editingActivities.length}
                    onDragStart={() => setIsAnyItemDragging(true)}
                    onDragEnd={() => setIsAnyItemDragging(false)}
                  />
                ))}
              </View>
              <SettingsButton
                title="+ Add Activity"
                onPress={addActivity}
                variant="primary"
              />
              <SettingsButton
                title="Reset to Defaults"
                onPress={resetToDefaults}
                variant="outline"
              />
            </SettingsSection>

            <SaveCancelButtons onSave={handleSave} onCancel={onClose} />
        </SettingsScrollView>
      </SettingsContainer>
    </KeyboardAvoidingView>
  );
};

// Main Component
interface TeeTimeTimerSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const TeeTimeTimerSpark: React.FC<TeeTimeTimerSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [activities, setActivities] = useState<Activity[]>(defaultActivities);
  const [timerState, setTimerState] = useState<TimerState>({
    teeTime: null,
    startTime: null,
    isActive: false,
    currentActivityIndex: 0,
    completedActivities: new Set(),
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('tee-time-timer');
    if (savedData.activities && savedData.activities.length > 0) {
      setActivities(savedData.activities);
    }
    // Load saved timer state
    if (savedData.timerState) {
      const savedTimerState = savedData.timerState;
      setTimerState({
        ...savedTimerState,
        teeTime: savedTimerState.teeTime ? new Date(savedTimerState.teeTime) : null,
        startTime: savedTimerState.startTime ? new Date(savedTimerState.startTime) : null,
        completedActivities: new Set(savedTimerState.completedActivities || []),
      });
    }
  }, [getSparkData]);

  // Save data whenever activities or timer state change
  useEffect(() => {
    if (activities.length > 0) {
      setSparkData('tee-time-timer', {
        activities,
        timerState: {
          ...timerState,
          teeTime: timerState.teeTime ? timerState.teeTime.toISOString() : null,
          startTime: timerState.startTime ? timerState.startTime.toISOString() : null,
          completedActivities: Array.from(timerState.completedActivities),
        },
        lastUsed: new Date().toISOString(),
      });
    }
  }, [activities, timerState, setSparkData]);

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

  // Calculate total duration
  const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0);

  // Calculate activity start times
  const getActivityStartTime = (activityIndex: number): Date => {
    if (!timerState.startTime) return new Date();

    // Activities are in reverse order, so we need to calculate from the end
    // The last activity (highest index) starts at startTime
    // Earlier activities start later
    const minutesFromStart = activities
      .slice(activityIndex + 1)
      .reduce((sum, activity) => sum + activity.duration, 0);

    return new Date(timerState.startTime.getTime() + minutesFromStart * 60 * 1000);
  };

  // Get current activity and progress
  const getCurrentActivityIndex = (): number => {
    if (!timerState.isActive || !timerState.startTime) return 0;

    const elapsedMinutes = (currentTime.getTime() - timerState.startTime.getTime()) / (1000 * 60);
    let currentIndex = 0;
    let cumulativeTime = 0;

    for (let i = 0; i < activities.length; i++) {
      if (elapsedMinutes >= cumulativeTime && elapsedMinutes < cumulativeTime + activities[i].duration) {
        currentIndex = i;
        break;
      }
      cumulativeTime += activities[i].duration;
      currentIndex = i + 1; // If we've passed all activities
    }

    return Math.min(currentIndex, activities.length - 1);
  };

  const getActivityStatus = (activityIndex: number): 'completed' | 'current' | 'future' => {
    if (!timerState.isActive || !timerState.startTime) return 'future';

    const now = currentTime.getTime();
    const activityStartTime = getActivityStartTime(activityIndex).getTime();
    const activityEndTime = activityStartTime + (activities[activityIndex].duration * 60 * 1000);

    // Mark as completed if the activity's completion time has passed
    if (now >= activityEndTime) return 'completed';

    // Mark as current if start time has passed but completion time hasn't
    if (now >= activityStartTime && now < activityEndTime) return 'current';

    // Otherwise it's a future activity
    return 'future';
  };

  const getTimeRemaining = (activityIndex: number): number => {
    if (!timerState.isActive || !timerState.startTime) return 0;

    const activityStartTime = getActivityStartTime(activityIndex);
    const activityEndTime = new Date(activityStartTime.getTime() + activities[activityIndex].duration * 60 * 1000);

    return Math.max(0, Math.floor((activityEndTime.getTime() - currentTime.getTime()) / 1000));
  };

  const getOverallProgress = (): number => {
    if (!timerState.isActive || !timerState.startTime || !timerState.teeTime) return 0;

    const now = currentTime.getTime();
    const originalStartTime = timerState.startTime.getTime();
    const teeTime = timerState.teeTime.getTime();
    const totalTime = totalDuration * 60 * 1000;

    // Calculate progress based on how much time has passed since the original start time
    // This ensures late starts show correct progress
    const elapsedTime = now - originalStartTime;
    const progress = Math.min(1, Math.max(0, elapsedTime / totalTime));

    return progress;
  };

  const formatTimeRemaining = (): string => {
    if (!timerState.teeTime) return '0:00';

    const remaining = Math.max(0, Math.floor((timerState.teeTime.getTime() - currentTime.getTime()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSkippedActivities = (): string[] => {
    if (!timerState.isActive || !timerState.startTime) return [];

    const skipped: string[] = [];
    activities.forEach((activity, index) => {
      const status = getActivityStatus(index);
      const activityStartTime = getActivityStartTime(index);
      const activityEndTime = new Date(activityStartTime.getTime() + activity.duration * 60 * 1000);

      if (status === 'completed' && currentTime.getTime() < activityEndTime.getTime()) {
        skipped.push(activity.name);
      }
    });

    return skipped;
  };

  const handleTimePickerChange = (event: any, time?: Date) => {
    if (time) {
      setSelectedTime(time);
    }
  };

  const handleConfirmTeeTime = () => {
    setShowTimePicker(false);

    const today = new Date();
    const teeTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                             selectedTime.getHours(), selectedTime.getMinutes());

    // If tee time is in the past, assume tomorrow
    if (teeTime < today) {
      teeTime.setDate(teeTime.getDate() + 1);
    }

    const startTime = new Date(teeTime.getTime() - totalDuration * 60 * 1000);

    // Check if we're starting late
    const now = new Date();
    const isLate = now > startTime;
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);
    const isTooLate = now > endTime;

    if (isTooLate) {
      // Started after all activities should be complete
      Alert.alert(
        'Too Late to Start',
        `Your tee time is in ${Math.floor((teeTime.getTime() - now.getTime()) / (1000 * 60))} minutes, but all preparation activities should already be complete. Please choose a later tee time.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    } else if (isLate) {
      // Started late but still within the preparation window
      const lateMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate which activities will be marked as complete
      const completedActivities: string[] = [];
      let elapsedTime = 0;

      for (const activity of activities) {
        const activityEndTime = startTime.getTime() + (elapsedTime + activity.duration) * 60 * 1000;
        if (now.getTime() >= activityEndTime) {
          completedActivities.push(activity.name);
        }
        elapsedTime += activity.duration;
      }

      const message = completedActivities.length > 0
        ? `You're starting ${lateMinutes} minutes late. These activities will be marked complete: ${completedActivities.join(', ')}.`
        : `You're starting ${lateMinutes} minutes late, but you're still within the current activity window.`;

      Alert.alert(
        'Late Start',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => startTimer(teeTime, startTime) }
        ]
      );
    } else {
      Alert.alert(
        'Confirm Tee Time',
        `Tee time: ${teeTime.toLocaleTimeString()}\nStart preparation: ${startTime.toLocaleTimeString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Timer', onPress: () => startTimer(teeTime, startTime) }
        ]
      );
    }
  };

  const handleCancelTimePicker = () => {
    setShowTimePicker(false);
  };

  const startTimer = (teeTime: Date, startTime: Date) => {
    setTimerState({
      teeTime,
      startTime,
      isActive: true,
      currentActivityIndex: 0,
      completedActivities: new Set(),
    });
    HapticFeedback.success();
  };

  const stopTimer = () => {
    setTimerState({
      teeTime: null,
      startTime: null,
      isActive: false,
      currentActivityIndex: 0,
      completedActivities: new Set(),
    });
    HapticFeedback.medium();
  };

  const saveActivities = (newActivities: Activity[]) => {
    setActivities(newActivities);
    HapticFeedback.success();
  };

  const styles = StyleSheet.create({
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
    timerSection: {
      alignItems: 'center',
      marginBottom: 30,
    },
    progressContainer: {
      marginBottom: 20,
    },
    timeText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    circleContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    teeTimeLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    teeTimeValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    timeUntilTeeTime: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
      marginBottom: 4,
    },
    activitiesContainer: {
      flex: 1,
      marginBottom: 20,
    },
    activitiesTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    setupContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timePickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      margin: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    timePickerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 20,
    },
    timePickerButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      width: '100%',
    },
    setupCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 40,
      alignItems: 'center',
      marginBottom: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    setupText: {
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    totalTimeText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
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
    setTeeTimeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      alignItems: 'center',
      minWidth: 150,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.border,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    skippedAlert: {
      backgroundColor: colors.warning + '20',
      borderColor: colors.warning,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      marginHorizontal: 20,
    },
    skippedAlertText: {
      color: colors.warning,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

  if (showSettings) {
    return (
      <TeeTimeTimerSettings
        activities={activities}
        onSave={saveActivities}
        onClose={onCloseSettings || (() => {})}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>⛳ Tee Time Timer</Text>
        <Text style={styles.subtitle}>Nail your golf prep routine</Text>
      </View>

      {!timerState.isActive ? (
        <View style={styles.setupContainer}>
          <View style={styles.setupCard}>
            <Text style={styles.setupText}>Ready to prepare for your round?</Text>
            <Text style={styles.totalTimeText}>
              {activities.length} activities • {totalDuration} minutes total
            </Text>
          </View>

          <TouchableOpacity
            style={styles.setTeeTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.primaryButtonText}>Set Tee Time</Text>
          </TouchableOpacity>

          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerTitle}>Select Tee Time</Text>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={handleTimePickerChange}
              />
              <View style={styles.timePickerButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleCancelTimePicker}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleConfirmTeeTime}
                >
                  <Text style={styles.primaryButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <>
          {getSkippedActivities().length > 0 && (
            <View style={styles.skippedAlert}>
              <Text style={styles.skippedAlertText}>
                ⏭ Skipped due to late start: {getSkippedActivities().join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.timerSection}>
            <View style={styles.progressContainer}>
              <TeeTimeCircularProgress
                progress={getOverallProgress()}
                size={200}
                strokeWidth={12}
              >
                <View style={styles.circleContent}>
                  <Text style={styles.teeTimeLabel}>Tee Time</Text>
                  <Text style={styles.teeTimeValue}>
                    {timerState.teeTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.timeUntilTeeTime}>
                    {formatTimeRemaining()} to go
                  </Text>
                  <Text style={styles.progressText}>
                    {Math.round(getOverallProgress() * 100)}% done
                  </Text>
                </View>
              </TeeTimeCircularProgress>
            </View>
          </View>

          <View style={styles.activitiesContainer}>
            {activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                status={getActivityStatus(index)}
                timeRemaining={getTimeRemaining(index)}
                currentTime={currentTime}
                activityStartTime={getActivityStartTime(index)}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={stopTimer}
            >
              <Text style={styles.primaryButtonText}>Stop Timer</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};