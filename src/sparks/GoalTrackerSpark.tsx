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
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { SparkChart, ChartSeries } from '../components/SparkChart';

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
  startDate?: string; // YYYY-MM-DD format, defaults to today
  endDate?: string;   // YYYY-MM-DD format, defaults to startDate + 12 months
  durationLabel?: string; // e.g., "year", "6 months"
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

  // Date picker state for new goal
  const [newGoalStartDate, setNewGoalStartDate] = useState(() => new Date());
  const [newGoalEndDate, setNewGoalEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
      startDate: formatDateString(newGoalStartDate),
      endDate: formatDateString(newGoalEndDate),
      durationLabel: calculateDurationLabel(newGoalStartDate, newGoalEndDate),
    };

    saveData({
      ...data,
      goals: [...data.goals, newGoal],
      currentGoalId: newGoal.id,
      currentScreen: 'goal-detail',
    });

    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalStartDate(new Date());
    setNewGoalEndDate(() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 12);
      return date;
    });
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

  // Helper to get effective start date (with backward compatibility)
  const getGoalStartDate = (goal: Goal): Date => {
    if (goal.startDate) {
      return parseLocalDate(goal.startDate);
    }
    // Backward compatibility: default to start of current year
    return new Date(new Date().getFullYear(), 0, 1);
  };

  // Helper to get effective end date (with backward compatibility)
  const getGoalEndDate = (goal: Goal): Date => {
    if (goal.endDate) {
      return parseLocalDate(goal.endDate);
    }
    // Backward compatibility: default to end of current year
    return new Date(new Date().getFullYear(), 11, 31);
  };

  // Calculate human-readable duration label
  const calculateDurationLabel = (startDate: Date, endDate: Date): string => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.round(diffDays / 30.44); // Average days per month

    // If it's approximately a year (11-13 months), call it "year"
    if (diffMonths >= 11 && diffMonths <= 13) {
      return 'year';
    }

    // Otherwise, return "X months"
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
  };

  // Calculate statistics for a goal
  const calculateStats = (goal: Goal) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const goalStartDate = getGoalStartDate(goal);
    goalStartDate.setHours(0, 0, 0, 0);

    const goalEndDate = getGoalEndDate(goal);
    goalEndDate.setHours(0, 0, 0, 0);

    // Days since start of goal (including today)
    const daysSinceStart = Math.max(0, Math.floor((now.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Total days in goal period
    const totalDays = Math.floor((goalEndDate.getTime() - goalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Actual count up to today (within goal date range)
    const todayStr = formatDateString(now);
    const actualCount = goal.entries.filter(e => {
      const entryDate = parseLocalDate(e.date);
      const todayDate = parseLocalDate(todayStr);
      return entryDate >= goalStartDate && entryDate <= todayDate && entryDate <= goalEndDate;
    }).length;

    // Forecast for entire goal period (based on current pace)
    const currentPace = daysSinceStart > 0 ? (actualCount / daysSinceStart) : 0;
    const forecastForPeriod = Math.floor(currentPace * totalDays);

    // Determine forecast color: green if hitting/exceeding goal, red if missing, black if exact
    let forecastColor = '#000000'; // black for exact match
    if (forecastForPeriod > goal.targetPerYear) {
      forecastColor = '#34C759'; // green for exceeding
    } else if (forecastForPeriod < goal.targetPerYear) {
      forecastColor = '#FF3B30'; // red for missing
    }

    return {
      actualCount,
      targetPerYear: goal.targetPerYear,
      forecastForYear: forecastForPeriod, // Keep name for compatibility but it's now for the period
      forecastColor,
      daysSinceStartOfYear: daysSinceStart, // Keep name for compatibility
      daysInYear: totalDays, // Keep name for compatibility
      goalStartDate,
      goalEndDate,
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
    const now = new Date();
    const currentYear = now.getFullYear();
    const daysToShow = stats.daysSinceStartOfYear;

    const series: ChartSeries[] = useMemo(() => {
      const dataPoints: Array<{ day: number; actual: number; target: number }> = [];

      for (let day = 0; day < daysToShow; day++) {
        const dayDate = new Date(stats.goalStartDate);
        dayDate.setDate(dayDate.getDate() + day);

        const targetValue = 1 + ((goal.targetPerYear - 1) * (day + 1) / stats.daysInYear);
        const actualValue = goal.entries.filter(e => {
          const entryDate = parseLocalDate(e.date);
          return entryDate >= stats.goalStartDate && entryDate <= dayDate && entryDate <= stats.goalEndDate;
        }).length;

        dataPoints.push({ day, actual: actualValue, target: targetValue });
      }

      const isExceeding = stats.forecastForYear >= goal.targetPerYear;

      return [
        {
          id: 'target',
          label: 'Target',
          data: dataPoints.map(d => ({ x: d.day, y: d.target, label: `Target: ${Math.round(d.target)}` })),
          color: '#000000',
          style: 'dashed',
          strokeWidth: 2,
        },
        {
          id: 'actual',
          label: 'Actual',
          data: dataPoints.map(d => ({ x: d.day, y: d.actual, label: `Actual: ${d.actual}` })),
          color: isExceeding ? '#34C759' : '#FF3B30',
          style: 'solid',
          strokeWidth: 3,
        }
      ];
    }, [goal, daysToShow, stats.daysInYear, stats.forecastForYear, stats.goalStartDate, stats.goalEndDate]);

    return (
      <View style={{ marginVertical: 20, padding: 5, backgroundColor: colors.surface, borderRadius: 12, alignSelf: 'stretch' }}>
        <SparkChart series={series} showZeroLine={false} height={220} />
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
      width: '95%',
      maxWidth: 500,
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
    dateButton: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateButtonText: {
      fontSize: 16,
      color: colors.text,
    },
    datePickerContainer: {
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      alignSelf: 'stretch',
      width: '100%',
    },
    button: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
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
                    {stats.actualCount} / {stats.targetPerYear} (goal: {goal.targetPerYear} per {goal.durationLabel || 'year'})
                  </Text>
                  <Text style={[styles.goalStats, { color: stats.forecastColor }]}>
                    Forecast: {stats.forecastForYear} for the {goal.durationLabel || 'year'}
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
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
              {stats.goalStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {stats.goalEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
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
                    {stats.actualCount} / {stats.targetPerYear} (goal: {goal.targetPerYear} per {goal.durationLabel || 'year'})
                  </Text>
                  <Text style={[styles.goalStats, { color: stats.forecastColor, marginBottom: 0 }]}>
                    Forecast: {stats.forecastForYear} for the {goal.durationLabel || 'year'}
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
            <Text style={styles.inputLabel}>
              Target Per {calculateDurationLabel(newGoalStartDate, newGoalEndDate).charAt(0).toUpperCase() + calculateDurationLabel(newGoalStartDate, newGoalEndDate).slice(1)}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 100"
              placeholderTextColor={colors.textSecondary}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(!showStartDatePicker)}
            >
              <Text style={styles.dateButtonText}>
                {newGoalStartDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Text>📅</Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={newGoalStartDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowStartDatePicker(false);
                    }
                    if (selectedDate) {
                      setNewGoalStartDate(selectedDate);
                      // Auto-adjust end date if it's before the new start date
                      if (selectedDate > newGoalEndDate) {
                        const newEndDate = new Date(selectedDate);
                        newEndDate.setMonth(newEndDate.getMonth() + 12);
                        setNewGoalEndDate(newEndDate);
                      }
                    }
                  }}
                />
              </View>
            )}
            {showStartDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.button, { marginTop: 10 }]}
                onPress={() => setShowStartDatePicker(false)}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(!showEndDatePicker)}
            >
              <Text style={styles.dateButtonText}>
                {newGoalEndDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Text>📅</Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={newGoalEndDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowEndDatePicker(false);
                    }
                    if (selectedDate) setNewGoalEndDate(selectedDate);
                  }}
                />
              </View>
            )}
            {showEndDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.button, { marginTop: 10 }]}
                onPress={() => setShowEndDatePicker(false)}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.inputLabel, { fontSize: 12, fontStyle: 'italic', color: colors.textSecondary, marginTop: 8 }]}>
              Default: 12 months from start date
            </Text>
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

