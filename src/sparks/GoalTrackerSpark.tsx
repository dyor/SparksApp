import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Svg, Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import { useNavigation } from '@react-navigation/native';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsInput,
  SettingsButton,
  SettingsFeedbackSection,
  SaveCancelButtons,
} from '../components/SettingsComponents';
import { HapticFeedback } from '../utils/haptics';
import ConfettiCannon from 'react-native-confetti-cannon';

interface GoalEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD format for easy comparison)
}

interface Goal {
  id: string;
  name: string;
  targetPerYear: number;
  entries: GoalEntry[];
  createdAt: string;
  updatedAt: string;
}

interface GoalTrackerData {
  goals: Goal[];
  currentGoalId: string | null; // Track which goal user was viewing
  currentScreen: 'home' | 'goal-detail'; // Track which screen user was on
}

const DEFAULT_DATA: GoalTrackerData = {
  goals: [],
  currentGoalId: null,
  currentScreen: 'home',
};

export const GoalTrackerSpark: React.FC<SparkProps> = ({
  showSettings,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  const navigation = useNavigation();

  // Load data
  const [data, setData] = useState<GoalTrackerData>(() => {
    const saved = getSparkData('goal-tracker');
    return saved ? { ...DEFAULT_DATA, ...saved } : DEFAULT_DATA;
  });

  const [currentScreen, setCurrentScreen] = useState<'home' | 'goal-detail'>(data.currentScreen || 'home');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GoalEntry | null>(null);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiRef = React.useRef<any>(null);

  // Save data wrapper
  const saveData = (newData: GoalTrackerData) => {
    setData(newData);
    setSparkData('goal-tracker', newData);
  };

  // Handle screen changes and persistence
  const handleSetScreen = (screen: 'home' | 'goal-detail', goalId: string | null = data.currentGoalId) => {
    setCurrentScreen(screen);
    saveData({ ...data, currentScreen: screen, currentGoalId: goalId });
  };

  // Get current goal
  const currentGoal = useMemo(() => {
    if (!data.currentGoalId) return null;
    return data.goals.find(g => g.id === data.currentGoalId) || null;
  }, [data.goals, data.currentGoalId]);

  // Navigate to goal detail
  const handleGoalPress = (goal: Goal) => {
    handleSetScreen('goal-detail', goal.id);
    HapticFeedback.light();
  };

  // Navigate back to home
  const handleBackToHome = () => {
    handleSetScreen('home', null);
    HapticFeedback.light();
  };

  // Navigate back to sparks home
  const handleBackToSparks = () => {
    (navigation as any).navigate('MySparks', {
      screen: 'MySparksList',
    });
    HapticFeedback.light();
  };

  // Add new goal
  const handleAddGoal = () => {
    const name = newGoalName.trim();
    const target = parseInt(newGoalTarget.trim());

    if (!name) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target (must be greater than 0)');
      return;
    }

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      name,
      targetPerYear: target,
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveData({
      ...data,
      goals: [...data.goals, newGoal],
      currentGoalId: newGoal.id,
      currentScreen: 'goal-detail',
    });

    setNewGoalName('');
    setNewGoalTarget('');
    setShowAddGoalModal(false);
    setCurrentScreen('goal-detail');
    HapticFeedback.success();
    triggerCelebration();
  };

  // Add +1 entry
  const handleAddEntry = () => {
    if (!currentGoal) return;

    const today = formatDateString(new Date()); // YYYY-MM-DD format
    const todayEntries = currentGoal.entries.filter(e => e.date === today);

    if (todayEntries.length > 0) {
      Alert.alert(
        'Duplicate Entry',
        `You already have ${todayEntries.length} entr${todayEntries.length === 1 ? 'y' : 'ies'} for today. Would you like to add another one or delete the existing one?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Another',
            onPress: () => {
              const newEntry: GoalEntry = {
                id: `entry_${Date.now()}`,
                date: today,
              };
              updateGoalEntries([...currentGoal.entries, newEntry]);
              HapticFeedback.success();
              triggerCelebration();
            },
          },
          {
            text: 'Delete Existing',
            style: 'destructive',
            onPress: () => {
              const updatedEntries = currentGoal.entries.filter(e => e.date !== today);
              updateGoalEntries(updatedEntries);
              HapticFeedback.medium();
            },
          },
        ]
      );
      return;
    }

    const newEntry: GoalEntry = {
      id: `entry_${Date.now()}`,
      date: today,
    };

    updateGoalEntries([...currentGoal.entries, newEntry]);
    HapticFeedback.success();
    triggerCelebration();
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    // Use setTimeout to ensure the ref is set and component is mounted, especially on iOS release builds
    setTimeout(() => {
      confettiRef.current?.start();
    }, 100);
    HapticFeedback.success();
  };

  // Helper to check for today's entry
  const hasEntryForToday = (goal: Goal): boolean => {
    const today = formatDateString(new Date());
    return goal.entries.some(e => e.date === today);
  };

  // Quick add entry for today from home screen
  const handleQuickAddEntry = (goal: Goal) => {
    const today = formatDateString(new Date());
    const newEntry: GoalEntry = {
      id: `entry_${Date.now()}`,
      date: today,
    };

    const updatedGoal: Goal = {
      ...goal,
      entries: [...goal.entries, newEntry],
      updatedAt: new Date().toISOString(),
    };

    const updatedGoals = data.goals.map(g => g.id === goal.id ? updatedGoal : g);
    saveData({ ...data, goals: updatedGoals });
    HapticFeedback.success();
    triggerCelebration();
  };

  // Update goal entries
  const updateGoalEntries = (entries: GoalEntry[]) => {
    if (!currentGoal) return;

    const updatedGoal: Goal = {
      ...currentGoal,
      entries,
      updatedAt: new Date().toISOString(),
    };

    const updatedGoals = data.goals.map(g => g.id === currentGoal.id ? updatedGoal : g);
    saveData({ ...data, goals: updatedGoals });
  };

  // Edit entry date
  const handleEditEntry = (entry: GoalEntry) => {
    setEditingEntry(entry);
    setEditEntryDate(entry.date);
    setShowEditEntryModal(true);
    HapticFeedback.light();
  };

  // Save edited entry
  const handleSaveEditEntry = () => {
    if (!editingEntry || !currentGoal) return;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editEntryDate)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format (e.g., 2025-01-15)');
      return;
    }

    // Validate date is valid by parsing as local date
    let dateObj: Date;
    try {
      dateObj = parseLocalDate(editEntryDate);
      if (isNaN(dateObj.getTime())) {
        Alert.alert('Error', 'Invalid date');
        return;
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid date format');
      return;
    }

    const updatedEntries = currentGoal.entries.map(e =>
      e.id === editingEntry.id ? { ...e, date: editEntryDate } : e
    );

    updateGoalEntries(updatedEntries);
    setShowEditEntryModal(false);
    setEditingEntry(null);
    setEditEntryDate('');
    HapticFeedback.success();
  };

  // Delete entry
  const handleDeleteEntry = (entryId: string) => {
    if (!currentGoal) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedEntries = currentGoal.entries.filter(e => e.id !== entryId);
            updateGoalEntries(updatedEntries);
            HapticFeedback.medium();
          },
        },
      ]
    );
  };

  // Delete goal
  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? All entries will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedGoals = data.goals.filter(g => g.id !== goalId);
            const updatedCurrentGoalId = data.currentGoalId === goalId ? null : data.currentGoalId;
            const updatedScreen = data.currentGoalId === goalId ? 'home' : data.currentScreen;
            saveData({
              ...data,
              goals: updatedGoals,
              currentGoalId: updatedCurrentGoalId,
              currentScreen: updatedScreen
            });
            if (data.currentGoalId === goalId) {
              setCurrentScreen('home');
            }
            HapticFeedback.medium();
          },
        },
      ]
    );
  };

  // Helper function to parse YYYY-MM-DD as local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate statistics for a goal
  const calculateStats = (goal: Goal) => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    // Days since start of year (including today) - so Jan 1 = 1, Jan 2 = 2, etc.
    const daysSinceStartOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = (new Date(now.getFullYear(), 11, 31).getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1;

    // Actual count up to today
    const todayStr = formatDateString(now);
    const actualCount = goal.entries.filter(e => {
      const entryDate = parseLocalDate(e.date);
      const todayDate = parseLocalDate(todayStr);
      return entryDate <= todayDate && entryDate.getFullYear() === now.getFullYear();
    }).length;

    // Forecast for entire year (based on current pace)
    // If we have 2 entries in 2 days, pace is 1 per day, so forecast is 365
    const currentPace = daysSinceStartOfYear > 0 ? (actualCount / daysSinceStartOfYear) : 0;
    const forecastForYear = Math.floor(currentPace * daysInYear);

    // Determine forecast color: green if hitting/exceeding goal, red if missing, black if exact
    let forecastColor = '#000000'; // black for exact match
    if (forecastForYear > goal.targetPerYear) {
      forecastColor = '#34C759'; // green for exceeding
    } else if (forecastForYear < goal.targetPerYear) {
      forecastColor = '#FF3B30'; // red for missing
    }

    return {
      actualCount,
      targetPerYear: goal.targetPerYear,
      forecastForYear,
      forecastColor,
      daysSinceStartOfYear,
      daysInYear,
    };
  };

  // Get recent entries (last 20)
  const recentEntries = useMemo(() => {
    if (!currentGoal) return [];
    return [...currentGoal.entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [currentGoal]);

  // Chart component - Full Year View
  const GoalChart = ({ goal }: { goal: Goal }) => {
    const stats = calculateStats(goal);
    const width = Dimensions.get('window').width - 40;
    const height = 200;
    const padding = 30;

    // Create data points for the year so far (up to today)
    const dataPoints: Array<{
      day: number;
      actual: number;
      target: number;
    }> = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const todayDate = parseLocalDate(formatDateString(now));
    const daysToShow = stats.daysSinceStartOfYear; // Truncate to today

    for (let day = 0; day < daysToShow; day++) {
      const dayDate = new Date(currentYear, 0, 1);
      dayDate.setDate(dayDate.getDate() + day);
      const dayStr = formatDateString(dayDate);

      // Target value: starts at 1 on Jan 1, increases linearly
      // Formula: 1 + (targetPerYear - 1) * (dayNumber / daysInYear)
      // day + 1 because day 0 is Jan 1 (first day)
      const targetValue = 1 + ((goal.targetPerYear - 1) * (day + 1) / stats.daysInYear);

      // Actual value: cumulative count of entries up to this day
      const actualValue = goal.entries.filter(e => {
        const entryDate = parseLocalDate(e.date);
        return entryDate <= dayDate && entryDate.getFullYear() === currentYear;
      }).length;

      dataPoints.push({
        day,
        actual: actualValue,
        target: targetValue,
      });
    }

    // Find max value for Y-axis scaling
    const allValues = [
      ...dataPoints.map(d => d.actual),
      ...dataPoints.map(d => d.target),
    ];
    const maxValue = Math.max(...allValues, 1);
    const minValue = 0;

    const getX = (day: number) => {
      if (daysToShow <= 1) return padding + (width - 2 * padding) / 2;
      return padding + (day / (daysToShow - 1)) * (width - 2 * padding);
    };
    const getY = (value: number) => height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

    // Create path data for each line
    // Target line
    const targetPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.target)}`
    ).join(' ');

    // Actual line
    const actualPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.actual)}`
    ).join(' ');

    // Find today's index for marking
    const todayIndex = stats.daysSinceStartOfYear;

    return (
      <View style={{ marginVertical: 20, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 10 }}>
        <Svg width={width} height={height}>
          {/* Axis lines */}
          <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />
          <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />

          {/* Target line (dashed) - Black */}
          <Path
            d={targetPath}
            stroke="#000000"
            strokeWidth="2"
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Actual line (solid) - Green if forecast exceeds goal, red otherwise */}
          {dataPoints.length > 0 && (
            <Path
              d={actualPath}
              stroke={stats.forecastForYear >= goal.targetPerYear ? '#34C759' : '#FF3B30'}
              strokeWidth="3"
              fill="none"
            />
          )}

          {/* Today marker (vertical line) */}
          {todayIndex < daysToShow && (
            <Line
              x1={getX(todayIndex)}
              y1={padding}
              x2={getX(todayIndex)}
              y2={height - padding}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity={0.5}
            />
          )}

          {/* Final point circles */}
          {dataPoints.length > 0 && (
            <>
              <Circle
                cx={getX(dataPoints[dataPoints.length - 1].day)}
                cy={getY(dataPoints[dataPoints.length - 1].actual)}
                r="4"
                fill={stats.forecastForYear >= goal.targetPerYear ? '#34C759' : '#FF3B30'}
              />
              <Circle
                cx={getX(dataPoints[dataPoints.length - 1].day)}
                cy={getY(dataPoints[dataPoints.length - 1].target)}
                r="4"
                fill="#000000"
              />
            </>
          )}
        </Svg>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: stats.forecastForYear >= goal.targetPerYear ? '#34C759' : '#FF3B30', marginRight: 6 }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Actual</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: '#000000', marginRight: 6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#000000' }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Target</Text>
          </View>
        </View>
      </View>
    );
  };

  // OLD CHART - Commented out but kept for reference
  // Chart component - Days Since Start of Year View
  /*
  const GoalChartOld = ({ goal }: { goal: Goal }) => {
    const stats = calculateStats(goal);
    const width = Dimensions.get('window').width - 40;
    const height = 200;
    const padding = 30;

    // Create data points for each day of the year so far
    const dataPoints: Array<{
      day: number;
      actual: number;
      target: number;
      forecast: number;
    }> = [];

    for (let day = 0; day <= stats.daysSinceStartOfYear; day++) {
      const targetValue = Math.floor((goal.targetPerYear / stats.daysInYear) * day);
      const forecastValue = stats.daysSinceStartOfYear > 0
        ? Math.floor((stats.actualCount / stats.daysSinceStartOfYear) * day)
        : 0;

      // Count actual entries up to this day
      const dayDate = new Date(new Date().getFullYear(), 0, 1);
      dayDate.setDate(dayDate.getDate() + day);
      const dayStr = formatDateString(dayDate);
      const actualValue = goal.entries.filter(e => {
        const entryDate = parseLocalDate(e.date);
        return entryDate <= dayDate && entryDate.getFullYear() === new Date().getFullYear();
      }).length;

      dataPoints.push({
        day,
        actual: actualValue,
        target: targetValue,
        forecast: forecastValue,
      });
    }

    const allValues = [
      ...dataPoints.map(d => d.actual),
      ...dataPoints.map(d => d.target),
      ...dataPoints.map(d => d.forecast),
    ];
    const maxValue = Math.max(...allValues, 1);
    const minValue = 0;

    const getX = (day: number) => padding + (day / stats.daysSinceStartOfYear) * (width - 2 * padding);
    const getY = (value: number) => height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

    // Create path data for each line
    const actualPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.actual)}`
    ).join(' ');

    const targetPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.target)}`
    ).join(' ');

    const forecastPath = dataPoints.map((d, i) =>
      `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.forecast)}`
    ).join(' ');

    return (
      <View style={{ marginVertical: 20, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 10 }}>
        <Svg width={width} height={height}>
          <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />
          <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />

          <Path
            d={targetPath}
            stroke="#007AFF"
            strokeWidth="2"
            strokeDasharray="4,4"
            fill="none"
          />

          <Path
            d={forecastPath}
            stroke="#34C759"
            strokeWidth="2"
            strokeDasharray="2,2"
            fill="none"
          />

          <Path
            d={actualPath}
            stroke="#FF3B30"
            strokeWidth="3"
            fill="none"
          />

          {dataPoints.length > 0 && (
            <>
              <Circle
                cx={getX(dataPoints[dataPoints.length - 1].day)}
                cy={getY(dataPoints[dataPoints.length - 1].actual)}
                r="4"
                fill="#FF3B30"
              />
              <Circle
                cx={getX(dataPoints[dataPoints.length - 1].day)}
                cy={getY(dataPoints[dataPoints.length - 1].target)}
                r="4"
                fill="#007AFF"
              />
            </>
          )}
        </Svg>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: '#FF3B30', marginRight: 6 }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Actual</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: '#007AFF', marginRight: 6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#007AFF' }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Target</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 12, height: 3, backgroundColor: '#34C759', marginRight: 6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#34C759' }} />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Forecast</Text>
          </View>
        </View>
      </View>
    );
  };
  */

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    goalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    goalName: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    goalStats: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    goalActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.text,
    },
    addGoalButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
    },
    addGoalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      padding: 8,
      marginBottom: 10,
    },
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    goalDetailHeader: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    goalDetailTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 12,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    addEntryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
    },
    addEntryButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    entriesList: {
      marginTop: 20,
    },
    entriesTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    entryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    entryDate: {
      fontSize: 14,
      color: colors.text,
    },
    entryActions: {
      flexDirection: 'row',
      gap: 12,
    },
    editButton: {
      padding: 6,
    },
    deleteButton: {
      padding: 6,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
  });

  // Settings screen
  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Goal Tracker Settings"
            subtitle="Manage your goals"
            icon="🎯"
            sparkId="goal-tracker"
          />
          <SettingsFeedbackSection sparkName="Goal Tracker" sparkId="goal-tracker" />
          <SettingsSection title="Goals">
            {data.goals.map(goal => {
              const stats = calculateStats(goal);
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalStats}>
                    {stats.actualCount} / {stats.targetPerYear} (goal: {goal.targetPerYear} per year)
                  </Text>
                  <Text style={[styles.goalStats, { color: stats.forecastColor }]}>
                    Forecast: {stats.forecastForYear} for the year
                  </Text>
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={() => {
                        onCloseSettings?.();
                        handleGoalPress(goal);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error }]}
                      onPress={() => handleDeleteGoal(goal.id)}
                    >
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {data.goals.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                No goals yet. Create one from the home screen!
              </Text>
            )}
          </SettingsSection>
          <SaveCancelButtons
            onSave={onCloseSettings || (() => { })}
            onCancel={onCloseSettings || (() => { })}
            saveText="Done"
            cancelText="Close"
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  // Goal detail screen
  if (currentScreen === 'goal-detail' && currentGoal) {
    const stats = calculateStats(currentGoal);

    return (
      <View style={styles.container}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
            <Text style={styles.backButtonText}>← Back to Goals</Text>
          </TouchableOpacity>

          <View style={styles.goalDetailHeader}>
            <Text style={styles.goalDetailTitle}>{currentGoal.name}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.actualCount}</Text>
                <Text style={styles.statLabel}>Actual</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.targetPerYear}</Text>
                <Text style={styles.statLabel}>Goal</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.forecastColor }]}>{stats.forecastForYear}</Text>
                <Text style={styles.statLabel}>Forecast</Text>
              </View>
            </View>
          </View>

          <GoalChart goal={currentGoal} />

          <TouchableOpacity style={styles.addEntryButton} onPress={handleAddEntry}>
            <Text style={styles.addEntryButtonText}>+1</Text>
          </TouchableOpacity>

          <View style={styles.entriesList}>
            <Text style={styles.entriesTitle}>Recent Entries (Last 20)</Text>
            {recentEntries.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                No entries yet. Tap +1 to add your first entry!
              </Text>
            ) : (
              recentEntries.map(entry => {
                const dateObj = parseLocalDate(entry.date);
                const todayStr = formatDateString(new Date());
                const isToday = entry.date === todayStr;
                return (
                  <View key={entry.id} style={styles.entryItem}>
                    <Text style={styles.entryDate}>
                      {isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditEntry(entry)}
                      >
                        <Text style={{ color: colors.primary, fontSize: 14 }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteEntry(entry.id)}
                      >
                        <Text style={{ color: colors.error, fontSize: 14 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Celebration Confetti */}
        {showCelebration && (
          <ConfettiCannon
            ref={confettiRef}
            count={50}
            origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
            autoStart={false}
            fadeOut={true}
            onAnimationEnd={() => setShowCelebration(false)}
          />
        )}

        {/* Edit Entry Modal */}
        <Modal visible={showEditEntryModal} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Entry Date</Text>
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-01-15"
                placeholderTextColor={colors.textSecondary}
                value={editEntryDate}
                onChangeText={setEditEntryDate}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <SaveCancelButtons
                onSave={handleSaveEditEntry}
                onCancel={() => {
                  setShowEditEntryModal(false);
                  setEditingEntry(null);
                  setEditEntryDate('');
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Home screen
  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Goal Tracker 🎯</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToSparks}>
            <Text style={styles.backButtonText}>← Home</Text>
          </TouchableOpacity>
        </View>

        {data.goals.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              No Goals Yet
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Create your first goal to start tracking!
            </Text>
          </View>
        ) : (
          data.goals.map(goal => {
            const stats = calculateStats(goal);
            return (
              <View key={goal.id} style={[styles.goalCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => handleGoalPress(goal)}
                >
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalStats}>
                    {stats.actualCount} / {stats.targetPerYear} (goal: {goal.targetPerYear} per year)
                  </Text>
                  <Text style={[styles.goalStats, { color: stats.forecastColor, marginBottom: 0 }]}>
                    Forecast: {stats.forecastForYear} for the year
                  </Text>
                </TouchableOpacity>

                {!hasEntryForToday(goal) && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => handleQuickAddEntry(goal)}
                  >
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>+1</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.addGoalButton} onPress={() => setShowAddGoalModal(true)}>
          <Text style={styles.addGoalButtonText}>+ Add New Goal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddGoalModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Goal</Text>
            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Golf"
              placeholderTextColor={colors.textSecondary}
              value={newGoalName}
              onChangeText={setNewGoalName}
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Target Per Year</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 100"
              placeholderTextColor={colors.textSecondary}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              keyboardType="numeric"
            />
            <SaveCancelButtons
              onSave={handleAddGoal}
              onCancel={() => {
                setShowAddGoalModal(false);
                setNewGoalName('');
                setNewGoalTarget('');
              }}
            />
          </View>
        </View>
      </Modal>

      {showCelebration && (
        <ConfettiCannon
          ref={confettiRef}
          count={50}
          origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
          autoStart={false}
          fadeOut={true}
          onAnimationEnd={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
};

