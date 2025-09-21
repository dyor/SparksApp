import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  completedDate?: string; // ISO date string when completed
  createdDate: string; // ISO date string when created
}

interface TodoSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

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

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('todo');
    if (savedData.todos) {
      setTodos(savedData.todos);
    }
  }, [getSparkData]);

  // Save data whenever todos change
  useEffect(() => {
    setSparkData('todo', {
      todos,
      lastUpdated: new Date().toISOString(),
    });
  }, [todos, setSparkData]);

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
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const tomorrow = getTomorrowDateString();

    if (dateString === today) return 'due today';
    if (dateString === yesterday) return 'due yesterday';
    if (dateString === tomorrow) return 'due tomorrow';
    
    // Format as readable date
    const date = new Date(dateString + 'T00:00:00');
    return `due ${date.toLocaleDateString()}`;
  };

  // Add new task
  const addTask = () => {
    if (!newTaskText.trim()) {
      Alert.alert('Error', 'Please enter a task');
      return;
    }

    const newTask: TodoItem = {
      id: Math.max(...todos.map(t => t.id), 0) + 1,
      text: newTaskText.trim(),
      completed: false,
      dueDate: getTodayDateString(),
      createdDate: new Date().toISOString(),
    };

    setTodos(prev => [...prev, newTask]);
    setNewTaskText('');
    HapticFeedback.light();
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

    setTodos(prev => prev.map(task => 
      task.id === editingTask.id 
        ? { ...task, text: editText.trim(), dueDate: selectedDate }
        : task
    ));

    setEditModalVisible(false);
    setEditingTask(null);
    HapticFeedback.success();
  };

  // Quick date selection
  const selectQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // Filter and sort todos
  const getFilteredAndSortedTodos = () => {
    const today = getTodayDateString();
    
    return todos
      .filter(task => {
        // Show incomplete tasks regardless of date
        if (!task.completed) return true;
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
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
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
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Todo List</Text>
        <Text style={styles.subtitle}>Stay organized and get things done</Text>
      </View>

      {/* Add Task Section */}
      <View style={styles.addSection}>
        <View style={styles.addRow}>
          <TextInput
            style={styles.taskInput}
            placeholder="Add a new task..."
            placeholderTextColor={colors.textSecondary}
            value={newTaskText}
            onChangeText={setNewTaskText}
            onSubmitEditing={addTask}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                  {todo.text}
                </Text>
                <Text style={styles.dueDateText}>
                  {formatRelativeDate(todo.dueDate)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
                  { label: 'Yesterday', days: -1 },
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
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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