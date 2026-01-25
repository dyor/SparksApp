import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/appStore';
import { CommonModal } from './CommonModal';
import { createCommonStyles } from '../styles/CommonStyles';
import { Ionicons } from '@expo/vector-icons';
import { HapticFeedback } from '../utils/haptics';

interface GeminiApiKeyModalProps {
    visible: boolean;
    onClose: () => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const { preferences, setPreferences } = useAppStore();

    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    // Load existing key when modal opens
    useEffect(() => {
        if (visible) {
            setApiKey(preferences.customGeminiApiKey || '');
            setTestResult(null);
        }
    }, [visible, preferences.customGeminiApiKey]);

    const handleSave = () => {
        setPreferences({ customGeminiApiKey: apiKey.trim() });
        HapticFeedback.success();
        onClose();
    };

    const handleClear = () => {
        setApiKey('');
        setPreferences({ customGeminiApiKey: undefined });
        setTestResult(null);
        HapticFeedback.light();
    };

    const testKey = async () => {
        if (!apiKey.trim()) return;

        setIsTesting(true);
        setTestResult(null);

        try {
            // Simple test call to Gemini API
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Say 'Success'" }] }]
                    })
                }
            );

            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                setTestResult('success');
                HapticFeedback.success();
            } else {
                setTestResult('error');
                HapticFeedback.error();
                Alert.alert('Invalid Key', data.error?.message || 'The API key provided is not valid.');
            }
        } catch (error) {
            setTestResult('error');
            HapticFeedback.error();
            Alert.alert('Connection Error', 'Failed to connect to Gemini API. Check your internet connection.');
        } finally {
            setIsTesting(false);
        }
    };

    const footer = (
        <View style={commonStyles.modalButtons}>
            <TouchableOpacity
                style={[commonStyles.modalButton, { backgroundColor: colors.border }]}
                onPress={onClose}
            >
                <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[commonStyles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Key</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <CommonModal visible={visible} title="🤖 AI Configuration" onClose={onClose} footer={footer}>
            <View style={styles.container}>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Sparks uses Google's Gemini AI. By default, we provide a shared key,
                    but you can add your own to avoid shared rate limits.
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Gemini API Key</Text>
                    <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Paste your API key here"
                            placeholderTextColor={colors.textSecondary}
                            value={apiKey}
                            onChangeText={(text) => {
                                setApiKey(text);
                                setTestResult(null);
                            }}
                            secureTextEntry={!showKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowKey(!showKey)} style={styles.iconButton}>
                            <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.testButton, { borderColor: colors.primary }]}
                        onPress={testKey}
                        disabled={isTesting || !apiKey.trim()}
                    >
                        {isTesting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <>
                                <Ionicons
                                    name={testResult === 'success' ? "checkmark-circle" : testResult === 'error' ? "close-circle" : "flask-outline"}
                                    size={16}
                                    color={testResult === 'success' ? "#4CAF50" : testResult === 'error' ? colors.error : colors.primary}
                                />
                                <Text style={[styles.testButtonText, { color: testResult === 'success' ? "#4CAF50" : testResult === 'error' ? colors.error : colors.primary }]}>
                                    {testResult === 'success' ? 'Key Valid' : testResult === 'error' ? 'Key Invalid' : 'Test Key'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {preferences.customGeminiApiKey && (
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <Text style={{ color: colors.error, fontSize: 13 }}>Reset to Default</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.linkContainer, { backgroundColor: colors.primary + '10' }]}
                    onPress={() => Linking.openURL('https://makersuite.google.com/app/apikey')}
                >
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary }]}>Get Your Own Key at Google AI Studio</Text>
                </TouchableOpacity>

                <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Your key is stored locally on this device and is only used to connect directly to Google's servers.
                    </Text>
                </View>
            </View>
        </CommonModal>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 20,
        paddingBottom: 10,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
    },
    iconButton: {
        padding: 8,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    testButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    clearButton: {
        padding: 8,
    },
    linkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    }
});
