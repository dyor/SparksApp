import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText
} from '../components/SettingsComponents';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completedDate?: string; // ISO date string when completed
  createdDate: string; // ISO date string when created
  category?: string; // Parsed category from text (e.g., "work" from "work: finish project")
  displayText: string; // Text without category prefix
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
        />

        <SettingsFeedbackSection sparkName="Todo List" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              Todo List helps you organize tasks with due dates and categories.{'\n'}
              Add tasks, set deadlines, and track your progress.
            </SettingsText>
          </View>
        </SettingsSection>
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
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFutureTodos, setShowFutureTodos] = useState(false);
  const taskInputRef = useRef<TextInput>(null);

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
  }, [getSparkData]);

  // Save data whenever todos change
  useEffect(() => {
    setSparkData('todo', {
      todos,
      lastUpdated: new Date().toISOString(),
    });
  }, [todos, setSparkData]);

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
    };

    setTodos(prev => [...prev, newTask]);
    setNewTaskText('');
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

    setTodos(prev => prev.map(task =>
      task.id === editingTask.id
        ? {
            ...task,
            text: editText.trim(),
            displayText,
            category,
            dueDate: selectedDate
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
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // Get unique categories from todos
  const getCategories = (): string[] => {
    const categories = new Set<string>();
    todos.forEach(todo => {
      if (todo.category) {
        categories.add(todo.category);
      }
    });
    return Array.from(categories).sort();
  };

  // Handle category chip press
  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      // Toggle off - show all todos
      setSelectedCategory(null);
    } else {
      // Filter by this category
      setSelectedCategory(category);
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
        // Only show completed tasks from today
        return task.completedDate === today;
      })
      .sort((a, b) => {
        // Completed tasks go to bottom
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;

        // Among incomplete tasks, sort by due date
        if (!a.completed && !b.completed) {
          return a.dueDate.localeCompare(b.dueDate);
        }

        // Among completed tasks, sort by completion time (most recent first)
        return (b.completedDate || '').localeCompare(a.completedDate || '');
      });
  };

  const filteredTodos = getFilteredAndSortedTodos();

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
      marginTop: 20,
      marginBottom: 20,
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
      marginBottom: 20,
    },
    addSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    addRow: {
      flexDirection: 'row',
      gap: 12,
    },
    taskInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    categoriesSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    todoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
  });

  if (showSettings) {
    return (
      <TodoSettings
        onClose={onCloseSettings || (() => {})}
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
      {getCategories().length > 0 && (
        <View style={styles.categoriesSection}>
          <View style={styles.categoryChips}>
            {getCategories().map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.selectedCategoryChip
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.selectedCategoryChipText
                ]}>
                  {category}
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
              style={[styles.todoItem, index === filteredTodos.length - 1 && styles.lastItem]}
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

        {/* Toggle Future Todos Button */}
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
      </View>

      {/* Edit Task Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Task text"
              placeholderTextColor={colors.textSecondary}
              value={editText}
              onChangeText={setEditText}
              multiline={true}
            />

            <View style={styles.quickDateSection}>
              <Text style={styles.quickDateTitle}>Due Date</Text>
              <View style={styles.quickDateButtons}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'Next Week', days: 7 },
                ].map((option) => {
                  const optionDate = new Date();
                  optionDate.setDate(optionDate.getDate() + option.days);
                  const optionDateString = optionDate.toISOString().split('T')[0];
                  const isSelected = selectedDate === optionDateString;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.quickDateButton, isSelected && styles.selectedDateButton]}
                      onPress={() => selectQuickDate(option.days)}
                    >
                      <Text style={[styles.quickDateButtonText, isSelected && styles.selectedDateButtonText]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteEditedTask}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEditedTask}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};