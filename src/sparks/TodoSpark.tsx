import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';
import { StyleTokens } from '../styles/StyleTokens';
import { CommonModal } from '../components/CommonModal';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SettingsButton
} from '../components/SettingsComponents';
import { FeedbackModal } from '../components/FeedbackModal';
import { FeedbackService } from '../services/FeedbackService';
import { ServiceFactory } from '../services/ServiceFactory';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completedDate?: string; // ISO date string when completed
  createdDate: string; // ISO date string when created
  category?: string; // Parsed category from text (e.g., "work" from "work: finish project")
  displayText: string; // Text without category prefix
  // Hidden field used only for ordering within the same day/completed group
  // We store a local timestamp in ms captured at edit/create/complete time
  sortTimeMs?: number;
}

interface TodoSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

// Settings Component
const TodoSettings: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Todo List Settings"
          subtitle="Manage your task organization preferences"
          icon="📝"
          sparkId="todo"
        />

        <SettingsFeedbackSection sparkName="Todo List" sparkId="todo" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              Todo List helps you organize tasks with due dates and categories.{'\n'}
              Add tasks, set deadlines, and track your progress.
            </SettingsText>
          </View>
        </SettingsSection>
        <SettingsButton title="Close" variant="secondary" onPress={onClose} />
      </SettingsScrollView>
    </SettingsContainer>
  );
};

export const TodoSpark: React.FC<TodoSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [editCompleted, setEditCompleted] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFutureTodos, setShowFutureTodos] = useState(false);
  const [showOlderDoneTodos, setShowOlderDoneTodos] = useState(false);
  const taskInputRef = useRef<TextInput>(null);

  // Feedback system state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [completedActions, setCompletedActions] = useState<string[]>([]);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('todo');
    if (savedData.todos) {
      // Migrate existing todos to include displayText and category
      const migratedTodos = savedData.todos.map((todo: any) => {
        if (!todo.displayText) {
          const { category, displayText } = parseTaskText(todo.text);
          return {
            ...todo,
            displayText,
            category,
          };
        }
        return todo;
      });
      setTodos(migratedTodos);
    }
    // Restore selected category if it was saved
    if (savedData.selectedCategory !== undefined) {
      setSelectedCategory(savedData.selectedCategory);
    }
  }, [getSparkData]);

  // Initialize session tracking
  useEffect(() => {
    const startSession = () => {
      setSessionStartTime(Date.now());
      FeedbackService.startSession('todo');
      const AnalyticsService = ServiceFactory.getAnalyticsService();
      AnalyticsService.trackSparkOpen('todo', 'Todo List');
    };

    startSession();

    // Cleanup on unmount
    return () => {
      FeedbackService.endSession();
    };
  }, []);

  // Save data whenever todos change
  useEffect(() => {
    const savedData = getSparkData('todo');
    setSparkData('todo', {
      ...savedData,
      todos,
      lastUpdated: new Date().toISOString(),
    });
  }, [todos, getSparkData, setSparkData]);

  // Save selected category whenever it changes
  useEffect(() => {
    const savedData = getSparkData('todo');
    setSparkData('todo', {
      ...savedData,
      selectedCategory,
    });
  }, [selectedCategory, getSparkData, setSparkData]);

  // Pre-fill input with category prefix when category is selected (only if input is empty)
  useEffect(() => {
    if (selectedCategory && !newTaskText.trim()) {
      setNewTaskText(`${selectedCategory}: `);
    }
  }, [selectedCategory]);

  // Helper functions for category parsing
  const parseTaskText = (text: string) => {
    const colonIndex = text.indexOf(':');
    if (colonIndex === -1 || colonIndex === 0) {
      // No category or colon at start
      return {
        category: undefined,
        displayText: text.trim()
      };
    }

    const category = text.substring(0, colonIndex).trim().toLowerCase();
    const displayText = text.substring(colonIndex + 1).trim();

    return {
      category: category || undefined,
      displayText: displayText || text.trim()
    };
  };

  // Helper functions for date handling
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getYesterdayDateString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today, yesterday, or tomorrow for context
    const isToday = dateString === getTodayDateString();
    const isYesterday = dateString === getYesterdayDateString();
    const isTomorrow = dateString === getTomorrowDateString();

    // Always show the actual date, with optional context
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    if (isToday) return `${formattedDate} (today)`;
    if (isTomorrow) return `${formattedDate} (tomorrow)`;
    return formattedDate;
  };

  // Add new task
  const addTask = async () => {
    // Blur the input to dismiss keyboard immediately
    taskInputRef.current?.blur();

    if (isAddingTask) {
      return; // Prevent double-clicks
    }

    if (!newTaskText.trim()) {
      Alert.alert('Error', 'Please enter a task');
      return;
    }

    setIsAddingTask(true);

    const taskText = newTaskText.trim();
    const { category, displayText } = parseTaskText(taskText);

    // Prevent duplicate tasks with same display text
    const existingTask = todos.find(task => task.displayText === displayText && !task.completed);
    if (existingTask) {
      Alert.alert('Notice', 'This task already exists');
      setIsAddingTask(false);
      return;
    }

    const newTask: TodoItem = {
      id: Math.max(...todos.map(t => t.id), 0) + 1,
      text: taskText,
      displayText,
      category,
      completed: false,
      dueDate: getTodayDateString(),
      createdDate: new Date().toISOString(),
      sortTimeMs: Date.now(),
    };

    setTodos(prev => [...prev, newTask]);

    // Track analytics
    const AnalyticsService = ServiceFactory.getAnalyticsService();
    AnalyticsService.trackFeatureUsage('add_task', 'todo', 'Todo List', {
      category: category || 'none',
      hasDueDate: false
    });

    // If a category is selected, pre-fill the input with the category prefix
    if (selectedCategory) {
      setNewTaskText(`${selectedCategory}: `);
    } else {
      setNewTaskText('');
    }

    HapticFeedback.light();

    // Small delay to prevent rapid successive clicks
    setTimeout(() => {
      setIsAddingTask(false);
    }, 300);
  };

  // Toggle task completion
  const toggleTask = (id: number) => {
    const today = getTodayDateString();

    setTodos(prev => prev.map(task => {
      if (task.id === id) {
        const newCompleted = !task.completed;
        return {
          ...task,
          completed: newCompleted,
          completedDate: newCompleted ? today : undefined,
          dueDate: newCompleted ? today : task.dueDate, // Set due date to today when completed
          sortTimeMs: Date.now(), // refresh ordering time
        };
      }
      return task;
    }));

    HapticFeedback.light();
  };

  // Handle long press for editing
  const handleLongPress = (task: TodoItem) => {
    setEditingTask(task);
    setEditText(task.text);
    setSelectedDate(task.dueDate);
    setEditCompleted(task.completed);
    setEditModalVisible(true);
    HapticFeedback.medium();
  };

  // Save edited task
  const saveEditedTask = () => {
    if (!editingTask || !editText.trim()) {
      Alert.alert('Error', 'Task text cannot be empty');
      return;
    }

    const { category, displayText } = parseTaskText(editText.trim());

    const today = getTodayDateString();
    setTodos(prev => prev.map(task =>
      task.id === editingTask.id
        ? {
          ...task,
          text: editText.trim(),
          displayText,
          category,
          dueDate: selectedDate,
          completed: editCompleted,
          completedDate: editCompleted ? today : undefined,
          sortTimeMs: Date.now(),
        }
        : task
    ));

    setEditModalVisible(false);
    setEditingTask(null);
    HapticFeedback.success();
  };

  // Save edited task with specific date (for quick date selection)
  const saveEditedTaskWithDate = (dateString: string) => {
    if (!editingTask || !editText.trim()) {
      Alert.alert('Error', 'Task text cannot be empty');
      return;
    }

    const { category, displayText } = parseTaskText(editText.trim());

    const today = getTodayDateString();
    setTodos(prev => prev.map(task =>
      task.id === editingTask.id
        ? {
          ...task,
          text: editText.trim(),
          displayText,
          category,
          dueDate: dateString,
          completed: editCompleted,
          completedDate: editCompleted ? today : undefined,
          sortTimeMs: Date.now(),
        }
        : task
    ));

    setEditModalVisible(false);
    setEditingTask(null);
    HapticFeedback.success();
  };

  const deleteEditedTask = () => {
    if (!editingTask) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTodos(prev => prev.filter(task => task.id !== editingTask.id));
            setEditModalVisible(false);
            setEditingTask(null);
            HapticFeedback.light();
          },
        },
      ]
    );
  };

  // Quick date selection
  const selectQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const newDateString = date.toISOString().split('T')[0];
    setSelectedDate(newDateString);

    // Auto-save and close modal when quick date is selected
    setTimeout(() => {
      saveEditedTaskWithDate(newDateString);
    }, 100); // Small delay to ensure state is updated
  };

  // Determine category status for chip styling and ordering
  type CategoryStatus = 'active' | 'future' | 'completedOnly';
  interface CategoryInfo { name: string; status: CategoryStatus }
  const getCategoryInfos = (): CategoryInfo[] => {
    const today = getTodayDateString();
    const map: Record<string, CategoryInfo> = {};
    todos.forEach(todo => {
      if (!todo.category) return;
      const name = todo.category;
      if (!map[name]) map[name] = { name, status: 'completedOnly' };
      if (!todo.completed) {
        if (todo.dueDate <= today) {
          map[name].status = 'active';
        } else if (map[name].status !== 'active') {
          map[name].status = 'future';
        }
      } else {
        // keep completedOnly unless we later see an incomplete
      }
    });
    const list = Object.values(map);
    // Sort: active first, then future, then completedOnly; each alpha
    const rank: Record<CategoryStatus, number> = { active: 0, future: 1, completedOnly: 2 };
    return list.sort((a, b) => (rank[a.status] - rank[b.status]) || a.name.localeCompare(b.name));
  };

  // Handle category chip press
  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      // Toggle off - show all todos
      setSelectedCategory(null);
      // Clear the category prefix from the input if it matches
      if (newTaskText.startsWith(`${category}: `)) {
        setNewTaskText('');
      }
    } else {
      // Filter by this category
      setSelectedCategory(category);
      // Pre-fill the input with the category prefix
      setNewTaskText(`${category}: `);
    }
    HapticFeedback.light();
  };

  // Filter and sort todos
  const getFilteredAndSortedTodos = () => {
    const today = getTodayDateString();

    return todos
      .filter(task => {
        // First filter by category if selected
        if (selectedCategory && task.category !== selectedCategory) {
          return false;
        }

        // Then filter by completion status and date
        if (!task.completed) {
          // For incomplete tasks, only show today and earlier unless showFutureTodos is true
          if (showFutureTodos) return true;
          return task.dueDate <= today;
        }
        // For completed tasks, show today's completed tasks always
        if (task.completedDate === today) return true;
        // Show older completed tasks only if showOlderDoneTodos is true
        return showOlderDoneTodos;
      })
      .sort((a, b) => {
        // Completed tasks go to bottom
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;

        // Among incomplete tasks, sort by due date
        if (!a.completed && !b.completed) {
          const dateCmp = a.dueDate.localeCompare(b.dueDate);
          if (dateCmp !== 0) return dateCmp;
          // Then by hidden time field ascending (older first)
          return (a.sortTimeMs || 0) - (b.sortTimeMs || 0);
        }

        // Among completed tasks, sort by completion time (most recent first)
        const cmp = (b.completedDate || '').localeCompare(a.completedDate || '');
        if (cmp !== 0) return cmp;
        // Then by hidden time field descending (newer completed first)
        return (b.sortTimeMs || 0) - (a.sortTimeMs || 0);
      });
  };

  const filteredTodos = getFilteredAndSortedTodos();

  // Check if there are future todos to show
  const hasFutureTodos = () => {
    const today = getTodayDateString();

    return todos.some(task => {
      // First filter by category if selected
      if (selectedCategory && task.category !== selectedCategory) {
        return false;
      }

      // Check if it's a future todo (incomplete and due date is after today)
      return !task.completed && task.dueDate > today;
    });
  };

  // Check if there are older done todos to show
  const hasOlderDoneTodos = () => {
    const today = getTodayDateString();

    return todos.some(task => {
      // First filter by category if selected
      if (selectedCategory && task.category !== selectedCategory) {
        return false;
      }

      // Check if it's an older done todo (completed but not from today)
      return task.completed && task.completedDate !== today;
    });
  };

  const commonStyles = createCommonStyles(colors);
  const styles = StyleSheet.create({
    ...commonStyles,
    header: {
      alignItems: 'center',
      marginTop: StyleTokens.spacing.xl,
      marginBottom: StyleTokens.spacing.xl,
    },
    addSection: {
      ...commonStyles.card,
    },
    addRow: {
      flexDirection: 'row',
      gap: 12,
    },
    taskInput: {
      ...commonStyles.input,
    },
    categoriesSection: {
      ...commonStyles.card,
    },
    categoryChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      backgroundColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipFuture: {
      backgroundColor: '#F3E8FF', // light purple
      borderColor: '#E9D5FF',
    },
    categoryChipCompleted: {
      backgroundColor: '#FF8C00', // burnt orange
      borderColor: '#FF8C00',
    },
    selectedCategoryChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      textTransform: 'capitalize',
    },
    selectedCategoryChipText: {
      color: '#fff',
    },
    todosSection: {
      ...commonStyles.card,
    },
    todoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    todoItemToday: {
      backgroundColor: colors.surface,
    },
    todoItemTomorrow: {
      backgroundColor: '#F3E8FF', // light purple
    },
    todoItemFuture: {
      backgroundColor: colors.background,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkedBox: {
      backgroundColor: colors.primary,
    },
    checkmark: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    todoContent: {
      flex: 1,
    },
    todoText: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 2,
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    dueDateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Modal styles
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
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
    },
    quickDateSection: {
      marginBottom: 20,
    },
    quickDateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    manualDateLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginTop: 12,
      marginBottom: 8,
    },
    quickDateButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickDateButton: {
      backgroundColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
    },
    selectedDateButton: {
      backgroundColor: colors.primary,
    },
    quickDateButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    selectedDateButtonText: {
      color: '#fff',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteButton: {
      backgroundColor: '#F44336',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    toggleButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginTop: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    // Done toggle styles
    doneToggleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    doneToggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    doneToggle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    doneToggleActive: {
      backgroundColor: colors.primary,
    },
    doneToggleText: {
      color: 'transparent',
      fontSize: 16,
      fontWeight: 'bold',
    },
    doneToggleTextActive: {
      color: '#fff',
    },
  });

  if (showSettings) {
    return (
      <TodoSettings
        onClose={onCloseSettings || (() => { })}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Todo List</Text>
        <Text style={styles.subtitle}>Stay organized and get things done</Text>
      </View>

      {/* Add Task Section */}
      <View style={styles.addSection}>
        <TextInput
          ref={taskInputRef}
          style={styles.taskInput}
          placeholder="Add a new task... (use category: task format)"
          placeholderTextColor={colors.textSecondary}
          value={newTaskText}
          onChangeText={setNewTaskText}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
      </View>

      {/* Category Filter Chips */}
      {getCategoryInfos().length > 0 && (
        <View style={styles.categoriesSection}>
          <View style={styles.categoryChips}>
            {getCategoryInfos().map(({ name, status }) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.categoryChip,
                  status === 'future' && styles.categoryChipFuture,
                  status === 'completedOnly' && styles.categoryChipCompleted,
                  selectedCategory === name && styles.selectedCategoryChip
                ]}
                onPress={() => handleCategoryPress(name)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === name && styles.selectedCategoryChipText
                ]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Todos Section */}
      <View style={styles.todosSection}>
        <Text style={styles.sectionTitle}>
          Tasks ({filteredTodos.filter(t => !t.completed).length} pending)
        </Text>

        {filteredTodos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No tasks yet. Add one above to get started! 🚀
            </Text>
          </View>
        ) : (
          filteredTodos.map((todo, index) => (
            <TouchableOpacity
              key={todo.id}
              style={[
                styles.todoItem,
                // background color by due date
                todo.dueDate === getTodayDateString()
                  ? styles.todoItemToday
                  : (todo.dueDate === getTomorrowDateString()
                    ? styles.todoItemTomorrow
                    : styles.todoItemFuture),
                index === filteredTodos.length - 1 && styles.lastItem
              ]}
              onPress={() => toggleTask(todo.id)}
              onLongPress={() => handleLongPress(todo)}
            >
              <View style={[styles.checkbox, todo.completed && styles.checkedBox]}>
                {todo.completed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.todoContent}>
                <Text style={[styles.todoText, todo.completed && styles.completedText]}>
                  {todo.displayText}
                </Text>
                <Text style={styles.dueDateText}>
                  {formatRelativeDate(todo.dueDate)}
                  {todo.category && ` • ${todo.category}`}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Toggle Future Todos Button - only show if there are future todos */}
        {hasFutureTodos() && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setShowFutureTodos(!showFutureTodos);
              HapticFeedback.light();
            }}
          >
            <Text style={styles.toggleButtonText}>
              {showFutureTodos ? "Today's Todos" : "Show Future Todos"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Toggle Older Done Todos Button - only show if there are older done todos */}
        {hasOlderDoneTodos() && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setShowOlderDoneTodos(!showOlderDoneTodos);
              HapticFeedback.light();
            }}
          >
            <Text style={styles.toggleButtonText}>
              {showOlderDoneTodos ? "Hide Older Done" : "Show Older Done Todos"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Task Modal */}
      <CommonModal
        visible={editModalVisible}
        title="Edit Todo"
        onClose={() => setEditModalVisible(false)}
        footer={
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              onPress={deleteEditedTask}
            >
              <Text style={styles.saveButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={saveEditedTask}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <TextInput
          style={styles.modalInput}
          placeholder="Task text"
          placeholderTextColor={colors.textSecondary}
          value={editText}
          onChangeText={setEditText}
          multiline={true}
          onSubmitEditing={saveEditedTask}
          returnKeyType="done"
          blurOnSubmit={true}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Enter') {
              saveEditedTask();
            }
          }}
        />

        {/* Done Toggle */}
        <View style={styles.doneToggleSection}>
          <Text style={styles.doneToggleLabel}>Done</Text>
          <TouchableOpacity
            style={[styles.doneToggle, editCompleted && styles.doneToggleActive]}
            onPress={() => setEditCompleted(!editCompleted)}
          >
            <Text style={[styles.doneToggleText, editCompleted && styles.doneToggleTextActive]}>
              {editCompleted ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickDateSection}>
          <Text style={styles.quickDateTitle}>Due Date</Text>
          <View style={styles.quickDateButtons}>
            {(() => {
              const today = new Date();
              const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

              // Build base options
              const baseOptions = [
                { label: 'Today', days: 0 },
                { label: '+1 Day', days: 1 },
                { label: '+2 Days', days: 2 },
                { label: '+3 Days', days: 3 },
                { label: '+1 Week', days: 7 },
              ];

              // Add "Next Monday" if today is not Monday
              if (dayOfWeek !== 1) {
                const daysUntilMonday = (8 - dayOfWeek) % 7;
                baseOptions.push({ label: 'Next Monday', days: daysUntilMonday });
              }

              return baseOptions.map((option) => {
                const targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + option.days);
                const dateString = targetDate.toISOString().split('T')[0];
                const isSelected = selectedDate === dateString;

                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.quickDateButton,
                      isSelected && styles.selectedDateButton,
                    ]}
                    onPress={() => selectQuickDate(option.days)}
                  >
                    <Text
                      style={[
                        styles.quickDateButtonText,
                        isSelected && styles.selectedDateButtonText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              });
            })()}
          </View>

          {/* Manual Date Input */}
          <Text style={styles.manualDateLabel}>Or enter date manually (YYYY-MM-DD):</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="2024-12-25"
            placeholderTextColor={colors.textSecondary}
            value={selectedDate}
            onChangeText={setSelectedDate}
          />
        </View>
      </CommonModal>
    </ScrollView>
  );
};