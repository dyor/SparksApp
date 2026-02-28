import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, PanResponder, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationService } from '../utils/notifications';
import Svg, { Circle } from 'react-native-svg';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsButton,
  SettingsInput,
  SettingsText,
  SaveCancelButtons,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';

interface Activity {
  id: string;
  name: string;
  duration: number; // minutes
  order: number;
}

type HoleTimingMode = 'none' | '9' | '18';

const DEFAULT_HOLE_MINUTES = 13;
const defaultHoleDurations = (n: number): number[] => Array(n).fill(DEFAULT_HOLE_MINUTES);

interface TimerState {
  teeTime: Date | null;
  startTime: Date | null;
  isActive: boolean;
  currentActivityIndex: number;
  completedActivities: Set<string>;
  /** Hole phase: current hole (0-based) and when it started. Only used after tee time when hole timing is on. */
  currentHoleIndex: number;
  holeStartTime: Date | null;
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
    } else if (status === 'future') {
      // Show start time and duration for future activities
      const startTimeStr = activityStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${startTimeStr} (${activity.duration}m)`;
    } else {
      // Current activity - show countdown until the activity ENDS
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
  holeTimingMode: HoleTimingMode;
  holeDurations: number[];
  onSave: (activities: Activity[], holeTimingMode: HoleTimingMode, holeDurations: number[]) => void;
  onClose: () => void;
}> = ({ activities, holeTimingMode: initialHoleMode, holeDurations: initialHoleDurations, onSave, onClose }) => {
  const { colors } = useTheme();
  const [editingActivities, setEditingActivities] = useState<Activity[]>([...activities]);
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);
  const [holeTimingMode, setHoleTimingMode] = useState<HoleTimingMode>(initialHoleMode);
  const [holeDurations, setHoleDurations] = useState<number[]>(() => {
    // Only initialize a fixed-length hole duration array when timing 9 or 18 holes.
    if (initialHoleMode === '9' || initialHoleMode === '18') {
      const n = initialHoleMode === '9' ? 9 : 18;
      if (initialHoleDurations.length >= n) return initialHoleDurations.slice(0, n);
      return [
        ...initialHoleDurations,
        ...Array(n - initialHoleDurations.length).fill(DEFAULT_HOLE_MINUTES),
      ];
    }
    // Hole timing disabled: preserve any stored durations, or start empty.
    return initialHoleDurations.length ? [...initialHoleDurations] : [];
  });

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

  const setHoleMode = (mode: HoleTimingMode) => {
    setHoleTimingMode(mode);
    const n = mode === '9' ? 9 : mode === '18' ? 18 : 0;
    if (n === 0) return;
    setHoleDurations(prev => {
      if (prev.length === n) return prev;
      if (prev.length < n) return [...prev, ...Array(n - prev.length).fill(DEFAULT_HOLE_MINUTES)];
      return prev.slice(0, n);
    });
  };

  const handleSave = () => {
    const reorderedActivities = editingActivities.map((activity, index) => ({
      ...activity,
      order: index + 1
    }));
    console.log('💾 TeeTimeTimerSettings: Saving activities', reorderedActivities.length);
    onSave(reorderedActivities, holeTimingMode, holeDurations);
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
    radioRow: {
      flexDirection: 'column',
      gap: 10,
      marginTop: 12,
      marginBottom: 16,
    },
    radioOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    radioOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    radioLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    radioLabelSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    holeInputsContainer: {
      marginTop: 12,
    },
    holeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 12,
    },
    holeInputLabel: {
      fontSize: 15,
      color: colors.text,
      minWidth: 56,
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

          <SettingsFeedbackSection sparkName="Tee Time Timer" sparkId="tee-time-timer" />

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

          <SettingsSection title="Hole timing">
            <SettingsText>After your tee time, count down each hole.</SettingsText>
            <View style={settingsSubStyles.radioRow}>
              <TouchableOpacity
                style={[settingsSubStyles.radioOption, holeTimingMode === 'none' && settingsSubStyles.radioOptionSelected]}
                onPress={() => setHoleMode('none')}
              >
                <Text style={[settingsSubStyles.radioLabel, holeTimingMode === 'none' && settingsSubStyles.radioLabelSelected]}>Do Not Time Holes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[settingsSubStyles.radioOption, holeTimingMode === '9' && settingsSubStyles.radioOptionSelected]}
                onPress={() => setHoleMode('9')}
              >
                <Text style={[settingsSubStyles.radioLabel, holeTimingMode === '9' && settingsSubStyles.radioLabelSelected]}>Time 9 Holes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[settingsSubStyles.radioOption, holeTimingMode === '18' && settingsSubStyles.radioOptionSelected]}
                onPress={() => setHoleMode('18')}
              >
                <Text style={[settingsSubStyles.radioLabel, holeTimingMode === '18' && settingsSubStyles.radioLabelSelected]}>Time 18 Holes</Text>
              </TouchableOpacity>
            </View>
            {(holeTimingMode === '9' || holeTimingMode === '18') && (
              <View style={settingsSubStyles.holeInputsContainer}>
                <SettingsText variant="caption">Minutes per hole (default 13)</SettingsText>
                {holeDurations.slice(0, holeTimingMode === '9' ? 9 : 18).map((mins, i) => (
                  <View key={i} style={settingsSubStyles.holeInputRow}>
                    <Text style={settingsSubStyles.holeInputLabel}>Hole {i + 1}</Text>
                    <SettingsInput
                      placeholder="13"
                      value={String(mins)}
                      onChangeText={(t) => {
                        const v = parseInt(t, 10);
                        setHoleDurations(prev => {
                          const next = [...prev];
                          next[i] = (t === '' || isNaN(v)) ? DEFAULT_HOLE_MINUTES : Math.min(99, Math.max(1, v));
                          return next;
                        });
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                ))}
              </View>
            )}
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
  const getSparkData = useSparkStore(state => state.getSparkData);
  const setSparkData = useSparkStore(state => state.setSparkData);
  const isHydrated = useSparkStore(state => state.isHydrated);

  const { colors, isDarkMode } = useTheme();

  const [activities, setActivities] = useState<Activity[]>(defaultActivities);
  const [timerState, setTimerState] = useState<TimerState>({
    teeTime: null,
    startTime: null,
    isActive: false,
    currentActivityIndex: 0,
    completedActivities: new Set(),
    currentHoleIndex: 0,
    holeStartTime: null,
  });
  const [holeTimingMode, setHoleTimingMode] = useState<HoleTimingMode>('none');
  const [holeDurations, setHoleDurations] = useState<number[]>(defaultHoleDurations(9));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTeeTimeCard, setShowTeeTimeCard] = useState(true);
  const [showNativePicker, setShowNativePicker] = useState(false);
  // Initialize with default time (current time + total duration + 5 minutes)
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    const totalDuration = defaultActivities.reduce((sum, a) => sum + a.duration, 0);
    return new Date(now.getTime() + (totalDuration + 5) * 60 * 1000);
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data on mount - with proper hydration guard
  useEffect(() => {
    if (!isHydrated) return;
    if (dataLoaded) return;

    try {
      const savedData = getSparkData('tee-time-timer') as any;
      console.log('🔄 TeeTimeTimerSpark: Hydrating from store...', !!savedData);

      if (savedData?.activities && savedData.activities.length > 0) {
        console.log(`📦 TeeTimeTimerSpark: Hydrating ${savedData.activities.length} activities`);
        setActivities(savedData.activities);
      } else {
        console.log('📦 TeeTimeTimerSpark: No activities in store, using defaults');
        // If we have no activities, ensure we save defaults to the store immediately after marking as loaded
      }

      // Load saved timer state
      if (savedData?.timerState) {
        const savedTimerState = savedData.timerState;
        setTimerState({
          ...savedTimerState,
          teeTime: savedTimerState.teeTime ? new Date(savedTimerState.teeTime) : null,
          startTime: savedTimerState.startTime ? new Date(savedTimerState.startTime) : null,
          completedActivities: new Set(savedTimerState.completedActivities || []),
          currentHoleIndex: savedTimerState.currentHoleIndex ?? 0,
          holeStartTime: savedTimerState.holeStartTime ? new Date(savedTimerState.holeStartTime) : null,
        });
        console.log('📦 TeeTimeTimerSpark: Loaded timer state');
      }

      if (savedData?.holeTimingMode && (savedData.holeTimingMode === 'none' || savedData.holeTimingMode === '9' || savedData.holeTimingMode === '18')) {
        setHoleTimingMode(savedData.holeTimingMode);
      }
      if (savedData?.holeDurations && Array.isArray(savedData.holeDurations)) {
        const n = savedData.holeTimingMode === '18' ? 18 : 9;
        const arr = savedData.holeDurations.slice(0, n);
        while (arr.length < n) arr.push(DEFAULT_HOLE_MINUTES);
        setHoleDurations(arr);
      }

      setDataLoaded(true);
    } catch (error) {
      console.error('❌ TeeTimeTimerSpark: Hydration error:', error);
      setDataLoaded(true);
    }
  }, [isHydrated, getSparkData, dataLoaded]);

  // Calculate total duration - must be before useEffect that uses it
  const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0);

  // Set default time when activities change
  useEffect(() => {
    const now = new Date();
    const defaultTime = new Date(now.getTime() + (totalDuration + 5) * 60 * 1000);
    setSelectedTime(defaultTime);
  }, [totalDuration]);

  // Save data whenever activities or timerState change - with dataLoaded guard
  useEffect(() => {
    if (!dataLoaded || !isHydrated) {
      console.log('💾 TeeTimeTimerSpark: Save blocked - not hydrated or not loaded');
      return;
    }

    // Safety check: Don't save empty activities if we had some before
    if (activities.length === 0 && defaultActivities.length > 0) {
      console.warn('⚠️ TeeTimeTimerSpark: Attempted to save empty activities list, blocked.');
      return;
    }

    const saveData = {
      activities,
      holeTimingMode,
      holeDurations,
      timerState: {
        ...timerState,
        teeTime: timerState.teeTime ? (timerState.teeTime instanceof Date ? timerState.teeTime.toISOString() : timerState.teeTime) : null,
        startTime: timerState.startTime ? (timerState.startTime instanceof Date ? timerState.startTime.toISOString() : timerState.startTime) : null,
        completedActivities: Array.from(timerState.completedActivities || []),
        currentHoleIndex: timerState.currentHoleIndex ?? 0,
        holeStartTime: timerState.holeStartTime ? (timerState.holeStartTime instanceof Date ? timerState.holeStartTime.toISOString() : timerState.holeStartTime) : null,
      },
      lastUsed: new Date().toISOString(),
    };

    console.log(`💾 TeeTimeTimerSpark: Auto-saving ${activities.length} activities to store...`);
    setSparkData('tee-time-timer', saveData);

    onStateChange?.({
      activityCount: activities.length,
      isActive: timerState.isActive,
      hasTeeTime: timerState.teeTime !== null,
    });
  }, [activities, timerState, holeTimingMode, holeDurations, dataLoaded, isHydrated]);

  // Timer logic
  useEffect(() => {
    if (timerState.isActive) {
      activateKeepAwakeAsync(); // Keep screen awake when timer is active
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

  const holeCount = holeTimingMode === '9' ? 9 : holeTimingMode === '18' ? 18 : 0;
  const teeTimeHasPassed = timerState.isActive && timerState.teeTime != null && currentTime.getTime() >= timerState.teeTime.getTime();
  const inHolePhase = teeTimeHasPassed && holeCount > 0 && timerState.holeStartTime != null;

  // Start hole phase when tee time passes (one-time init)
  useEffect(() => {
    if (!timerState.isActive || !timerState.teeTime || holeCount === 0) return;
    if (currentTime.getTime() < timerState.teeTime.getTime()) return;
    if (timerState.holeStartTime != null) return;

    setTimerState(prev => ({
      ...prev,
      holeStartTime: prev.teeTime,
      currentHoleIndex: 0,
    }));
  }, [timerState.isActive, timerState.teeTime, timerState.holeStartTime, holeCount, currentTime.getTime()]);

  // Advance to next hole when current hole time expires
  useEffect(() => {
    if (!inHolePhase || holeCount === 0) return;
    const idx = timerState.currentHoleIndex;
    if (idx >= holeCount) return;

    const durationMinutes = holeDurations[idx] ?? DEFAULT_HOLE_MINUTES;
    const holeEndMs = timerState.holeStartTime!.getTime() + durationMinutes * 60 * 1000;
    const now = currentTime.getTime();
    if (now < holeEndMs) return;

    setTimerState(prev => ({
      ...prev,
      currentHoleIndex: Math.min(prev.currentHoleIndex + 1, holeCount),
      // Start the next hole exactly at the previous hole's scheduled end time
      holeStartTime: new Date(holeEndMs),
    }));
    HapticFeedback.light();
  }, [inHolePhase, holeCount, timerState.currentHoleIndex, timerState.holeStartTime, holeDurations, currentTime.getTime()]);

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

  // Check if we're before the last activity starts (bottom of the list)
  const isBeforeLastActivity = (): boolean => {
    if (!timerState.isActive || !timerState.startTime) return false;

    const lastActivityIndex = activities.length - 1;
    const lastActivityStartTime = getActivityStartTime(lastActivityIndex);
    return currentTime.getTime() < lastActivityStartTime.getTime();
  };

  // Get time until last activity starts (bottom of the list)
  const getTimeUntilLastActivity = (): number => {
    if (!timerState.isActive || !timerState.startTime) return 0;

    const lastActivityIndex = activities.length - 1;
    const lastActivityStartTime = getActivityStartTime(lastActivityIndex);
    return Math.max(0, Math.floor((lastActivityStartTime.getTime() - currentTime.getTime()) / 1000));
  };

  // Hole phase: seconds remaining for current hole (0 when round complete or not in hole phase)
  const getCurrentHoleRemainingSeconds = (): number => {
    if (!inHolePhase || holeCount === 0 || !timerState.holeStartTime) return 0;
    const idx = timerState.currentHoleIndex;
    if (idx >= holeCount) return 0;
    const durationMinutes = holeDurations[idx] ?? DEFAULT_HOLE_MINUTES;
    const endMs = timerState.holeStartTime.getTime() + durationMinutes * 60 * 1000;
    return Math.max(0, Math.floor((endMs - currentTime.getTime()) / 1000));
  };

  const holeRoundComplete = inHolePhase && timerState.currentHoleIndex >= holeCount;

  // Time remaining until end of measured round (when tee time is in the past and 9/18 holes selected)
  const getSecondsRemainingInRound = (): number => {
    if (!timerState.isActive || !timerState.teeTime || holeCount === 0) return 0;
    const totalMinutes = holeDurations.slice(0, holeCount).reduce((s, m) => s + (m || DEFAULT_HOLE_MINUTES), 0);
    const roundEndMs = timerState.teeTime.getTime() + totalMinutes * 60 * 1000;
    return Math.max(0, Math.floor((roundEndMs - currentTime.getTime()) / 1000));
  };

  const formatRoundTimeRemaining = (): string => {
    const secs = getSecondsRemainingInRound();
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimePickerChange = (event: any, time?: Date) => {
    if (time) {
      setSelectedTime(time);
    }
  };

  const handleConfirmTeeTime = () => {
    setShowNativePicker(false);

    const now = new Date();
    const baseTeeTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    // Decide whether this tee time should be treated as today or tomorrow
    let teeTime = new Date(baseTeeTime.getTime());
    if (holeTimingMode === 'none') {
      // No hole timing: if tee time is already in the past, treat it as tomorrow
      if (teeTime < now) {
        teeTime.setDate(teeTime.getDate() + 1);
      }
    } else {
      // With hole timing, allow some time after tee time before rolling to tomorrow
      const extraHours = holeTimingMode === '9' ? 2 : 4;
      const sameDayThreshold = new Date(
        baseTeeTime.getTime() + extraHours * 60 * 60 * 1000
      );
      if (sameDayThreshold < now) {
        teeTime.setDate(teeTime.getDate() + 1);
      }
    }

    const startTime = new Date(teeTime.getTime() - totalDuration * 60 * 1000);

    // Check if we're starting late relative to the prep window
    const isLate = now > startTime;

    // Define how late is "too late" based on hole timing mode
    let allowedEnd: Date;
    if (holeTimingMode === '9') {
      allowedEnd = new Date(teeTime.getTime() + 2 * 60 * 60 * 1000);
    } else if (holeTimingMode === '18') {
      allowedEnd = new Date(teeTime.getTime() + 4 * 60 * 60 * 1000);
    } else {
      // Without hole timing, consider it too late once we've passed tee time
      allowedEnd = new Date(teeTime.getTime());
    }
    const isTooLate = now > allowedEnd;

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
      // Start timer directly without confirmation
      startTimer(teeTime, startTime);
    }
  };


  const startTimer = async (teeTime: Date, startTime: Date) => {
    setShowTeeTimeCard(false);
    setTimerState({
      teeTime,
      startTime,
      isActive: true,
      currentActivityIndex: 0,
      completedActivities: new Set(),
    });

    // Schedule notifications for all activities
    await scheduleActivityNotifications(teeTime, startTime);

    // Schedule notifications at the end of each hole (when 9 or 18 holes selected)
    await scheduleHoleEndNotifications(teeTime);

    HapticFeedback.success();
  };

  const scheduleHoleEndNotifications = async (teeTime: Date) => {
    const n = holeTimingMode === '9' ? 9 : holeTimingMode === '18' ? 18 : 0;
    if (n === 0) return;

    const now = new Date();
    let cumulativeMs = teeTime.getTime();

    for (let h = 0; h < n; h++) {
      const mins = holeDurations[h] ?? DEFAULT_HOLE_MINUTES;
      cumulativeMs += mins * 60 * 1000;
      const holeEndTime = new Date(cumulativeMs);
      if (holeEndTime.getTime() <= now.getTime()) continue;

      await NotificationService.scheduleActivityNotification(
        `Hole ${h + 1} complete`,
        holeEndTime,
        `hole-${h + 1}-end`,
        'Tee Time Timer',
        'tee-time-timer',
        '⛳'
      );
    }
  };

  const scheduleActivityNotifications = async (teeTime: Date, startTime: Date) => {
    // Cancel any existing activity notifications first
    await NotificationService.cancelAllActivityNotifications();

    const now = new Date();
    const futureActivities: Array<{ name: string; id: string; startTime: Date }> = [];
    const pastActivities: Array<{ name: string; id: string; startTime: Date }> = [];

    // Check tee time itself
    if (teeTime.getTime() > now.getTime()) {
      futureActivities.push({ name: 'Tee Time!', id: 'tee-time', startTime: teeTime });
    } else {
      pastActivities.push({ name: 'Tee Time!', id: 'tee-time', startTime: teeTime });
    }

    // Categorize activities as future or past
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      // Calculate activity start time (activities are in reverse order)
      const minutesFromStart = activities
        .slice(i + 1)
        .reduce((sum, activity) => sum + activity.duration, 0);

      // Create a new Date object for the activity start time
      const activityStartTime = new Date(startTime.getTime() + minutesFromStart * 60 * 1000);

      if (activityStartTime.getTime() > now.getTime()) {
        futureActivities.push({ name: activity.name, id: activity.id, startTime: activityStartTime });
      } else {
        pastActivities.push({ name: activity.name, id: activity.id, startTime: activityStartTime });
      }
    }

    // If all activities are past, ask user if they want to schedule for tomorrow
    if (futureActivities.length === 0 && pastActivities.length > 0) {
      Alert.alert(
        'All Activities Past',
        'All activities have already started. Would you like to schedule reminders for tomorrow?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Schedule for Tomorrow', onPress: async () => {
              // Schedule all activities for tomorrow
              for (const activity of pastActivities) {
                const tomorrowDate = new Date(activity.startTime);
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);

                await NotificationService.scheduleActivityNotification(
                  activity.name,
                  tomorrowDate,
                  activity.id,
                  'Tee Time Timer',
                  'tee-time-timer',
                  '⛳'
                );
              }
            }
          }
        ]
      );
      return;
    }

    // Schedule notifications for future activities (today)
    for (const activity of futureActivities) {
      await NotificationService.scheduleActivityNotification(
        activity.name,
        activity.startTime,
        activity.id,
        'Tee Time Timer',
        'tee-time-timer',
        '⛳'
      );
    }
  };

  const stopTimer = async () => {
    // Cancel all activity notifications
    await NotificationService.cancelAllActivityNotifications();

    setTimerState({
      teeTime: null,
      startTime: null,
      isActive: false,
      currentActivityIndex: 0,
      completedActivities: new Set(),
      currentHoleIndex: 0,
      holeStartTime: null,
    });
    setShowTeeTimeCard(true);
    HapticFeedback.medium();
  };

  const saveActivitiesWithHoleSettings = useCallback((
    newActivities: Activity[],
    newHoleTimingMode: HoleTimingMode,
    newHoleDurations: number[],
  ) => {
    console.log('💾 TeeTimeTimerSpark: saveActivitiesWithHoleSettings called with', newActivities.length, 'activities');

    setActivities([...newActivities]);
    setHoleTimingMode(newHoleTimingMode);
    setHoleDurations(newHoleDurations);

    const saveData = {
      activities: newActivities,
      holeTimingMode: newHoleTimingMode,
      holeDurations: newHoleDurations,
      timerState: {
        ...timerState,
        teeTime: timerState.teeTime ? (timerState.teeTime instanceof Date ? timerState.teeTime.toISOString() : timerState.teeTime) : null,
        startTime: timerState.startTime ? (timerState.startTime instanceof Date ? timerState.startTime.toISOString() : timerState.startTime) : null,
        completedActivities: Array.from(timerState.completedActivities || []),
        currentHoleIndex: timerState.currentHoleIndex ?? 0,
        holeStartTime: timerState.holeStartTime ? (timerState.holeStartTime instanceof Date ? timerState.holeStartTime.toISOString() : timerState.holeStartTime) : null,
      },
      lastUsed: new Date().toISOString(),
    };

    console.log(`💾 TeeTimeTimerSpark: Explicitly saving ${newActivities.length} activities and hole settings...`);
    setSparkData('tee-time-timer', saveData);

    HapticFeedback.success();
  }, [timerState, setSparkData]);

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
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      marginHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border + '40',
    },
    timePickerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 24,
      letterSpacing: 0.3,
    },
    timeDisplayButton: {
      width: '100%',
      backgroundColor: colors.background,
      paddingVertical: 18,
      paddingHorizontal: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    timeDisplayText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    startButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    timePickerButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      width: '100%',
    },
    setupCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      marginBottom: 24,
      marginHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border + '40',
    },
    setupText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 24,
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
    startsInActivityCard: {
      backgroundColor: colors.surface,
      padding: 16,
      marginVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    startsInActivityInfo: {
      flex: 1,
    },
    startsInActivityName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    startsInActivityTime: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      minWidth: 80,
      textAlign: 'right',
    },
    holePhaseCard: {
      backgroundColor: colors.surface,
      padding: 28,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      minWidth: 260,
    },
    holePhaseTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    holePhaseLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    holePhaseTime: {
      fontSize: 42,
      fontWeight: 'bold',
      color: colors.primary,
    },
    holePhaseRoundRemaining: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

  if (showSettings) {
    return (
      <TeeTimeTimerSettings
        activities={activities}
        holeTimingMode={holeTimingMode}
        holeDurations={holeDurations}
        onSave={saveActivitiesWithHoleSettings}
        onClose={onCloseSettings || (() => { })}
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
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activities.length}</Text>
                <Text style={styles.statLabel}>activities</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalDuration}</Text>
                <Text style={styles.statLabel}>minutes</Text>
              </View>
            </View>
          </View>

          {showTeeTimeCard && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerTitle}>Select Tee Time</Text>

              <TouchableOpacity
                style={styles.timeDisplayButton}
                onPress={() => setShowNativePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.timeDisplayText}>
                  {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              {/* Native Picker Trigger */}
              {Platform.OS === 'android' && showNativePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowNativePicker(false);
                    if (date) setSelectedTime(date);
                  }}
                />
              )}

              {/* iOS Centered Spinner Modal */}
              {Platform.OS === 'ios' && (
                <Modal
                  visible={showNativePicker}
                  transparent={true}
                  animationType="fade"
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNativePicker(false)}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Set Tee Time</Text>
                        <TouchableOpacity onPress={() => setShowNativePicker(false)}>
                          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={selectedTime}
                        mode="time"
                        display="spinner"
                        onChange={(event, date) => {
                          if (date) setSelectedTime(date);
                        }}
                        themeVariant={isDarkMode ? 'dark' : 'light'}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              )}

              <TouchableOpacity
                style={styles.startButton}
                onPress={handleConfirmTeeTime}
                activeOpacity={0.8}
              >
                <Text style={styles.startButtonText}>Start Timer</Text>
              </TouchableOpacity>
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

          {(inHolePhase || (teeTimeHasPassed && holeCount > 0)) ? (
            <View style={styles.timerSection}>
              <View style={styles.holePhaseCard}>
                <Text style={styles.holePhaseTitle}>
                  {holeRoundComplete ? '✅ Round complete' : inHolePhase ? `Hole ${timerState.currentHoleIndex + 1} of ${holeCount}` : `Hole 1 of ${holeCount}`}
                </Text>
                {!holeRoundComplete && inHolePhase && (
                  <>
                    <Text style={styles.holePhaseLabel}>Time remaining</Text>
                    <Text style={styles.holePhaseTime}>
                      {(() => {
                        const secs = getCurrentHoleRemainingSeconds();
                        const m = Math.floor(secs / 60);
                        const s = secs % 60;
                        return `${m}:${s.toString().padStart(2, '0')}`;
                      })()}
                    </Text>
                  </>
                )}
                {holeCount > 0 && (
                  <>
                    <Text style={[styles.holePhaseLabel, { marginTop: 16 }]}>Time left in round</Text>
                    <Text style={styles.holePhaseRoundRemaining}>{formatRoundTimeRemaining()}</Text>
                  </>
                )}
              </View>
            </View>
          ) : (
            <>
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

            {/* Starts In card - shown at bottom when before last activity */}
            {isBeforeLastActivity() && (
              <View style={styles.startsInActivityCard}>
                <View style={styles.startsInActivityInfo}>
                  <Text style={styles.startsInActivityName}>🚥 Starts In</Text>
                </View>
                <Text style={styles.startsInActivityTime}>
                  {(() => {
                    const seconds = getTimeUntilLastActivity();
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                  })()}
                </Text>
              </View>
            )}
              </View>
            </>
          )}

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