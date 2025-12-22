import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import { CommonModal } from '../components/CommonModal';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SaveCancelButtons,
} from '../components/SettingsComponents';
import { HapticFeedback } from '../utils/haptics';

interface ShopData {
    items: string[];
    checked: number[];
}

const DEFAULT_DATA: ShopData = { items: [], checked: [] };

export const ShopSpark: React.FC<SparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    const [data, setData] = useState<ShopData>(DEFAULT_DATA);
    const [showEdit, setShowEdit] = useState(false);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        const saved = getSparkData('shop') as any;
        if (saved && Array.isArray(saved.items)) {
            setData({ items: saved.items, checked: saved.checked || [] });
        } else {
            setSparkData('shop', DEFAULT_DATA);
        }
    }, []);

    const saveData = (newData: ShopData) => {
        setData(newData);
        setSparkData('shop', newData);
    };

    const toggleChecked = (index: number) => {
        const isChecked = data.checked.includes(index);
        const newChecked = isChecked ? data.checked.filter(i => i !== index) : [...data.checked, index];
        saveData({ ...data, checked: newChecked });
        HapticFeedback.selection();
    };

    const openEditor = () => {
        setEditText(data.items.join('\n'));
        setShowEdit(true);
    };

    const handleSaveEdit = () => {
        const newItems = editText.split('\n').map(l => l.trim()).filter(Boolean);
        const newChecked = data.checked.filter(i => i < newItems.length);
        saveData({ items: newItems, checked: newChecked });
        setShowEdit(false);
        HapticFeedback.success();
    };

    // Settings view
    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Shop Settings"
                        subtitle="Simple shopping list stored locally"
                        icon="🛒"
                        sparkId="shop"
                    />

                    <View style={{ padding: 20 }}>
                        <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8, fontWeight: '600' }}>
                            About Shop
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                            Maintain a simple shopping list. Edit items, then tap to mark them done.
                        </Text>
                    </View>

                    <SettingsFeedbackSection sparkName="Shop" sparkId="shop" />

                    <SaveCancelButtons
                        onSave={onCloseSettings || (() => {})}
                        onCancel={onCloseSettings || (() => {})}
                        saveText="Done"
                        cancelText="Close"
                    />
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
        content: { padding: 20, paddingTop: 0 },
        checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
        checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginRight: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
        checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
        checkboxCheck: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
        checkboxText: { flex: 1, fontSize: 16, color: colors.text },
        checkboxTextStrike: { textDecorationLine: 'line-through', color: colors.textSecondary },
        button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
        buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        editInput: { minHeight: 200, backgroundColor: colors.surface, borderRadius: 12, padding: 12, color: colors.text, textAlignVertical: 'top' },
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🛒 Shop</Text>
            </View> 

            <ScrollView style={styles.content}>
                {data.items.length === 0 ? (
                    <View style={{ alignItems: 'center', padding: 40, marginTop: 40 }}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🛒</Text>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>No items yet</Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                            Tap Edit to add items — one per line.
                        </Text>
                    </View>
                ) : (
                    data.items.map((item, i) => {
                        const isChecked = data.checked.includes(i);
                        return (
                            <TouchableOpacity key={i} style={styles.checkboxRow} onPress={() => toggleChecked(i)}>
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Text style={styles.checkboxCheck}>✓</Text>}
                                </View>
                                <Text style={[styles.checkboxText, isChecked && styles.checkboxTextStrike]}>{item}</Text>
                            </TouchableOpacity>
                        );
                    })
                )}

                <TouchableOpacity style={styles.button} onPress={() => { saveData({ items: [], checked: [] }); HapticFeedback.success(); }}>
                    <Text style={styles.buttonText}>Clear List</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={openEditor}>
                    <Text style={[styles.buttonText, { color: colors.text }]}>Edit List</Text>
                </TouchableOpacity>
            </ScrollView>

            <CommonModal
                visible={showEdit}
                title="Edit Shopping List"
                onClose={() => setShowEdit(false)}
                scrollable={false}
                footer={
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={[{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => setShowEdit(false)}>
                            <Text style={{ textAlign: 'center', color: colors.text }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary }]} onPress={handleSaveEdit}>
                            <Text style={{ textAlign: 'center', color: '#fff' }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                }
            >
                <TextInput
                    multiline
                    value={editText}
                    onChangeText={setEditText}
                    style={styles.editInput}
                    placeholder="One item per line"
                    placeholderTextColor={colors.textSecondary}
                />
            </CommonModal>
        </View>
    );
};

export default ShopSpark;
