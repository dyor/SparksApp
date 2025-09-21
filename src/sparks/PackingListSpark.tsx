import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';

interface PackingItem {
  id: number;
  item: string;
  count: number;
  packed: boolean;
}

const defaultItems: PackingItem[] = [
  { id: 1, item: "T-shirts", count: 3, packed: false },
  { id: 2, item: "Pairs of underwear", count: 4, packed: false },
  { id: 3, item: "Pairs of socks", count: 4, packed: false },
  { id: 4, item: "Jeans", count: 2, packed: false },
  { id: 5, item: "Toothbrush", count: 1, packed: false },
  { id: 6, item: "Phone charger", count: 1, packed: false },
  { id: 7, item: "Shoes", count: 2, packed: false },
  { id: 8, item: "Jacket", count: 1, packed: false },
];

interface NewItem {
  item: string;
  count: string;
}

const PackingListSettings: React.FC<{
  items: PackingItem[];
  onSave: (items: PackingItem[]) => void;
  onClose: () => void;
}> = ({ items, onSave, onClose }) => {
  const { colors } = useTheme();
  const [packingItems, setPackingItems] = useState<PackingItem[]>(items);
  const [newItem, setNewItem] = useState<NewItem>({ item: '', count: '1' });

  const addNewItem = () => {
    if (!newItem.item.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const count = parseInt(newItem.count) || 1;
    if (count < 1) {
      Alert.alert('Error', 'Count must be at least 1');
      return;
    }

    const newPackingItem: PackingItem = {
      id: Math.max(...packingItems.map(i => i.id), 0) + 1,
      item: newItem.item.trim(),
      count: count,
      packed: false,
    };

    setPackingItems([...packingItems, newPackingItem]);
    setNewItem({ item: '', count: '1' });
    HapticFeedback.success();
  };

  const removeItem = (id: number) => {
    if (packingItems.length <= 1) {
      Alert.alert('Error', 'You must have at least one item');
      return;
    }
    setPackingItems(packingItems.filter(item => item.id !== id));
    HapticFeedback.medium();
  };

  const updateItem = (id: number, field: 'item' | 'count', value: string) => {
    setPackingItems(packingItems.map(item => {
      if (item.id === id) {
        if (field === 'count') {
          const count = parseInt(value) || 1;
          return { ...item, count: Math.max(1, count) };
        } else {
          return { ...item, item: value };
        }
      }
      return item;
    }));
  };

  const saveSettings = () => {
    onSave(packingItems);
    onClose();
  };

  const styles = StyleSheet.create({
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
    addSection: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    addRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
    },
    itemInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    countInput: {
      width: 80,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    addButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    itemsSection: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemInputInline: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
      paddingVertical: 4,
      marginRight: 10,
    },
    countInputInline: {
      width: 60,
      fontSize: 16,
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
      textAlign: 'center',
      marginRight: 10,
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
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Packing List Settings</Text>
          <Text style={styles.subtitle}>Manage your packing items</Text>
        </View>

        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add New Item</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.itemInput}
              placeholder="Item name"
              placeholderTextColor={colors.textSecondary}
              value={newItem.item}
              onChangeText={(text) => setNewItem({ ...newItem, item: text })}
            />
            <TextInput
              style={styles.countInput}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              value={newItem.count}
              onChangeText={(text) => setNewItem({ ...newItem, count: text })}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addNewItem}>
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Your Items ({packingItems.length})</Text>
          {packingItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <TextInput
                style={styles.itemInputInline}
                value={item.item}
                onChangeText={(text) => updateItem(item.id, 'item', text)}
              />
              <TextInput
                style={styles.countInputInline}
                value={item.count.toString()}
                onChangeText={(text) => updateItem(item.id, 'count', text)}
                keyboardType="numeric"
              />
              <TouchableOpacity 
                style={styles.removeButton} 
                onPress={() => removeItem(item.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveSettings}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

interface PackingListSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const PackingListSpark: React.FC<PackingListSparkProps> = ({ 
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete 
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();
  
  const [items, setItems] = useState<PackingItem[]>(defaultItems);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('packing-list');
    if (savedData.items) {
      setItems(savedData.items);
    }
  }, [getSparkData]);

  // Save data whenever items change
  useEffect(() => {
    setSparkData('packing-list', {
      items,
      lastUpdated: new Date().toISOString(),
    });
  }, [items, setSparkData]);

  const toggleItemPacked = (id: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newPacked = !item.packed;
        HapticFeedback.light();
        return { ...item, packed: newPacked };
      }
      return item;
    }));
  };

  const uncheckAll = () => {
    setItems(items.map(item => ({ ...item, packed: false })));
    HapticFeedback.medium();
  };

  const saveCustomItems = (newItems: PackingItem[]) => {
    setItems(newItems);
    HapticFeedback.success();
  };

  const packedCount = items.filter(item => item.packed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

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
    progressContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    progressText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    progressBar: {
      width: '100%',
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success,
      borderRadius: 4,
    },
    progressLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    listContainer: {
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
    listTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    itemText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    itemTextPacked: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    countBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginLeft: 8,
      minWidth: 24,
      alignItems: 'center',
    },
    countBadgePacked: {
      backgroundColor: colors.success,
    },
    countText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    checkmark: {
      marginLeft: 8,
      fontSize: 18,
    },
    bottomButtons: {
      gap: 12,
      marginTop: 'auto',
      paddingTop: 20,
    },
    uncheckAllButton: {
      backgroundColor: colors.warning,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    uncheckAllButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    settingsButton: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    settingsButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <PackingListSettings
        items={items}
        onSave={saveCustomItems}
        onClose={onCloseSettings}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>🎒 Packing List</Text>
        <Text style={styles.subtitle}>Tap items to mark as packed</Text>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {packedCount} of {totalCount} items packed
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round(progressPercentage)}% Complete
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>📝 Items to Pack</Text>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.listItem, index === items.length - 1 && styles.lastItem]}
            onPress={() => toggleItemPacked(item.id)}
          >
            <Text 
              style={[
                styles.itemText, 
                item.packed && styles.itemTextPacked
              ]}
            >
              {item.item}
            </Text>
            <View style={[
              styles.countBadge, 
              item.packed && styles.countBadgePacked
            ]}>
              <Text style={styles.countText}>{item.count}</Text>
            </View>
            <Text style={styles.checkmark}>
              {item.packed ? '✅' : '⬜'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={styles.uncheckAllButton} 
          onPress={uncheckAll}
        >
          <Text style={styles.uncheckAllButtonText}>Uncheck All Items</Text>
        </TouchableOpacity>
        
      </View>
    </ScrollView>
  );
};