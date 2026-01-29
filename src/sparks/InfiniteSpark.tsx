import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Sparklet } from '../types/sparklet';
import { HapticFeedback } from '../utils/haptics';
import { SparkletService } from '../services/SparkletService';
import { useSparkStore } from '../store';
import { SparkletWizard } from './InfiniteSpark/SparkletWizard';
import { SparkletEditor } from './InfiniteSpark/SparkletEditor';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SettingsFeedbackSection,
    SettingsButton,
} from '../components/SettingsComponents';
import { getSparkById } from '../components/SparkRegistry';
import { BetaBadge } from '../components/BetaBadge';

interface InfiniteSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

export const InfiniteSpark: React.FC<InfiniteSparkProps> = ({
    showSettings = false,
    onCloseSettings
}) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    // Spark registry data
    const sparkRecord = getSparkById('infinite');
    const displayTitle = sparkRecord?.metadata.title || 'Infinite';
    const isBeta = sparkRecord?.metadata.properties?.includes('Beta');

    // Core State
    const [sparklets, setSparklets] = useState<Sparklet[]>([]);
    const [activeSparkletId, setActiveSparkletId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isFirstLoad = useRef(true);

    // Initial Load & Persistence Recovery
    useEffect(() => {
        const initialize = async () => {
            // Recover last active sparklet from store
            const data = getSparkData('infinite');
            if (data?.activeSparkletId) {
                setActiveSparkletId(data.activeSparkletId);
            }

            await loadSparklets();
            isFirstLoad.current = false;
        };
        initialize();
    }, []);

    // Persist active sparklet state
    useEffect(() => {
        if (!isFirstLoad.current) {
            setSparkData('infinite', {
                ...getSparkData('infinite'),
                activeSparkletId
            });
        }
    }, [activeSparkletId]);

    const loadSparklets = async () => {
        if (!refreshing) setIsLoading(true);
        setError(null);
        try {
            await SparkletService.cleanupLegacyDuplicates();
            await SparkletService.seedInitialSparklets();
            const data = await SparkletService.getAllSparklets();

            const uniqueByTitle = data.reduce((acc: Sparklet[], current) => {
                const existing = acc.find(item => item.metadata.title === current.metadata.title);
                if (!existing) return acc.concat([current]);
                if (current.metadata.id === 'tic-tac-toe' || current.metadata.id === 'sparklets-wizard') {
                    return acc.filter(a => a.metadata.title !== current.metadata.title).concat([current]);
                }
                return acc;
            }, []);

            setSparklets(uniqueByTitle);
        } catch (err: any) {
            console.error('Failed to load sparklets:', err);
            setError('The Infinite cosmos is currently unreachable.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadSparklets();
    };

    const handleSparkletPress = (sparklet: Sparklet) => {
        HapticFeedback.light();
        setActiveSparkletId(sparklet.metadata.id);
    };

    const handleBack = () => {
        HapticFeedback.light();
        setActiveSparkletId(null);
    };

    // --- Settings View Logic ---
    if (showSettings) {
        // If we have an active sparklet, show ITS settings (the Editor)
        if (activeSparkletId && activeSparkletId !== 'sparklets-wizard') {
            const sparklet = sparklets.find(s => s.metadata.id === activeSparkletId);

            // If the sparklets list is still loading, show a loader
            if (isLoading && !sparklet) {
                return (
                    <SettingsContainer>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ marginTop: 10, color: colors.textSecondary }}>Checking dimension {activeSparkletId}...</Text>
                        </View>
                    </SettingsContainer>
                );
            }

            if (sparklet) {
                return (
                    <SparkletEditor
                        sparklet={sparklet}
                        onSave={() => {
                            loadSparklets();
                            if (onCloseSettings) onCloseSettings();
                        }}
                        onCancel={() => {
                            if (onCloseSettings) onCloseSettings();
                        }}
                    />
                );
            }
        }

        // Default Infinite Settings (Discover screen settings)
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <SettingsContainer>
                    <SettingsScrollView>
                        <SettingsHeader
                            title={`${displayTitle} Settings`}
                            subtitle="Manage the expansion zone"
                            icon="♾️"
                            sparkId="infinite"
                        />

                        <SettingsFeedbackSection sparkId="infinite" sparkName="Infinite" />

                        <SettingsSection title="Configuration">
                            <SettingsButton
                                title="Refresh Sparklets"
                                onPress={() => loadSparklets()}
                            />
                        </SettingsSection>

                        <SettingsSection title="About Infinite">
                            <Text style={[styles.infoText, { color: colors.textSecondary, textAlign: 'left', paddingHorizontal: 16 }]}>
                                Infinite is a dynamic platform where sparklets are birthed by AI and shared by the community. You can refine any sparklet by tapping settings while it is active.
                            </Text>
                        </SettingsSection>

                        <View style={styles.settingsFooter}>
                            <SettingsButton
                                title="Close"
                                onPress={() => onCloseSettings?.()}
                                variant="outline"
                            />
                        </View>
                    </SettingsScrollView>
                </SettingsContainer>
            </KeyboardAvoidingView>
        );
    }

    if (activeSparkletId) {
        const sparklet = sparklets.find(s => s.metadata.id === activeSparkletId);

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {sparklet?.metadata.title} {sparklet?.metadata.isBeta && <BetaBadge />}
                    </Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.sparkletContainer}>
                    {activeSparkletId === 'sparklets-wizard' ? (
                        <SparkletWizard
                            onComplete={() => {
                                loadSparklets();
                                handleBack();
                            }}
                            onCancel={handleBack}
                        />
                    ) : sparklet?.definition ? (
                        <UniversalSparkletEngine definitionJson={sparklet.definition} />
                    ) : isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                                {sparklet?.metadata.title || activeSparkletId} definition is missing.
                            </Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {displayTitle} {isBeta && <BetaBadge />}
                </Text>
                <Text style={styles.headerEmoji}>♾️</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                <View style={styles.discoverHeader}>
                    <Text style={[styles.discoverTitle, { color: colors.text }]}>Discover Sparklets</Text>
                    <Text style={[styles.discoverSubtitle, { color: colors.textSecondary }]}>The dynamic expansion zone</Text>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Text style={[styles.errorText, { color: '#dc2626' }]}>{error}</Text>
                        <TouchableOpacity onPress={loadSparklets} style={styles.retryButton}>
                            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.grid}>
                    {sparklets.map((sparklet) => (
                        <TouchableOpacity
                            key={sparklet.metadata.id}
                            style={[styles.card, { backgroundColor: colors.surface }]}
                            onPress={() => handleSparkletPress(sparklet)}
                        >
                            <View style={styles.cardContent}>
                                <Text style={styles.cardIcon}>{sparklet.metadata.icon}</Text>
                                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                    {sparklet.metadata.title} {sparklet.metadata.isBeta && <Text style={styles.betaBadge}>b</Text>}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {isLoading && sparklets.length === 0 && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Sparklets are dynamic, on-demand experiences. Use the Wizard to create something new.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

/**
 * The BRAIN of the Infinite Spark.
 * Evaluates logic and renders UI based on database schema.
 */
const UniversalSparkletEngine: React.FC<{ definitionJson: string }> = ({ definitionJson }) => {
    const { colors } = useTheme();
    const config = useMemo(() => {
        try {
            return JSON.parse(definitionJson);
        } catch (e) {
            console.error('Failed to parse definition:', e);
            return {};
        }
    }, [definitionJson]);

    const [state, setState] = useState(config.initialState || {});

    // Helper Evaluator
    const runHelper = (name: string, payload: any = {}) => {
        if (!config.helpers || !config.helpers[name]) return null;
        try {
            const fn = new Function('state', 'params', 'helpers', config.helpers[name]);
            return fn(state, payload, {});
        } catch (e) {
            console.error('Helper failed:', e);
            return null;
        }
    };

    // Action Evaluator
    const executeAction = (name: string, params: any = {}) => {
        if (!config.actions || !config.actions[name]) return;
        try {
            const fn = new Function('state', 'params', 'helpers', config.actions[name]);

            const helpersProxy: any = {};
            if (config.helpers) {
                Object.keys(config.helpers).forEach(hName => {
                    helpersProxy[hName] = (p: any) => runHelper(hName, p);
                });
            }

            const result = fn(state, params, helpersProxy);
            if (result && typeof result === 'object') {
                setState({ ...result });
            }
        } catch (e) {
            console.error('Action execution failed:', e);
        }
    };

    // Value Interpolator (e.g. {{state.status}} or {{state.list.join(', ')}})
    const interpolate = (val: any): any => {
        if (typeof val !== 'string') return val;

        const expressionRegex = /{{([^}]+)}}/g;

        // Check if the entire string is a single interpolation (to return raw objects)
        const matchFull = val.match(/^{{([^}]+)}}$/);
        if (matchFull) {
            try {
                const fn = new Function('state', `return ${matchFull[1].trim()}`);
                return fn(state);
            } catch (e) {
                console.warn('Interpolation failed:', matchFull[1], e);
                return undefined;
            }
        }

        // Otherwise replace matches in the string
        return val.replace(expressionRegex, (match, expression) => {
            try {
                const fn = new Function('state', `return ${expression.trim()}`);
                const result = fn(state);
                return result !== undefined ? String(result) : '';
            } catch (e) {
                console.warn('Interpolation failed:', expression, e);
                return '';
            }
        });
    };

    const renderElement = (el: any, index: number) => {
        // Handle conditional visibility
        if (el.visible !== undefined) {
            const isVisible = interpolate(el.visible);
            if (!isVisible || isVisible === 'false') return null;
        }

        const rawStyle = config.view?.styles?.[el.style] || {};
        const customStyle: any = {};
        Object.keys(rawStyle).forEach(key => {
            customStyle[key] = interpolate(rawStyle[key]);
            // Web-style display logic mapped to React Native
            if (key === 'display' && customStyle[key] === 'none') {
                customStyle.height = 0;
                customStyle.opacity = 0;
                customStyle.overflow = 'hidden';
            }
        });

        switch (el.type) {
            case 'text':
                return (
                    <Text key={index} style={[styles.engineText, { color: colors.text }, customStyle]}>
                        {interpolate(el.value)}
                    </Text>
                );
            case 'button':
                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.engineButton, { backgroundColor: colors.primary }, customStyle]}
                        onPress={() => {
                            HapticFeedback.light();
                            // Interpolate individual params
                            const finalParams: any = {};
                            if (el.params) {
                                Object.keys(el.params).forEach(k => {
                                    finalParams[k] = interpolate(el.params[k]);
                                });
                            }
                            executeAction(el.onPress, finalParams);
                        }}
                    >
                        <Text style={styles.engineButtonText}>{interpolate(el.label)}</Text>
                    </TouchableOpacity>
                );
            case 'grid':
                const fieldName = el.dataSource.replace(/^state\./, '');
                const items = state[fieldName] || [];
                return (
                    <View key={index} style={[styles.engineGrid, customStyle]}>
                        {items.map((item: any, i: number) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.engineCell, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                onPress={() => executeAction(el.onPress, { index: i })}
                            >
                                <Text style={[styles.engineCellText, { color: item === 'X' ? colors.primary : '#ef4444' }]}>
                                    {String(item)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 'input':
                const bindingField = el.binding.replace(/^state\./, '');
                return (
                    <TextInput
                        key={index}
                        style={[styles.engineInput, { color: colors.text, borderColor: colors.border, height: 50 }, customStyle]}
                        placeholder={el.placeholder}
                        placeholderTextColor={colors.textSecondary}
                        value={String(state[bindingField] || '')}
                        onChangeText={(txt) => {
                            setState((prev: any) => ({ ...prev, [bindingField]: txt }));
                        }}
                        secureTextEntry={el.secureTextEntry}
                        autoCapitalize={el.autoCapitalize || 'none'}
                    />
                );
            default:
                return null;
        }
    };

    if (!config?.view?.elements) {
        return <View style={{ padding: 20 }}><Text style={{ color: colors.textSecondary }}>Empty or invalid definition.</Text></View>;
    }

    return (
        <ScrollView contentContainerStyle={styles.engineContainer}>
            {config.view.elements.map((el: any, i: number) => renderElement(el, i))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerEmoji: {
        fontSize: 24,
    },
    betaLabel: {
        fontSize: 12,
        color: '#ff9500',
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
    },
    discoverHeader: {
        marginBottom: 20,
    },
    discoverTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    discoverSubtitle: {
        fontSize: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 16,
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        alignItems: 'center',
        padding: 10,
    },
    cardIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    betaBadge: {
        fontSize: 10,
        color: '#ff9500',
        fontWeight: 'bold',
    },
    infoBox: {
        marginTop: 20,
        padding: 20,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    infoText: {
        textAlign: 'center',
        fontSize: 13,
        fontStyle: 'italic',
    },
    backButton: {
        width: 100,
    },
    backText: {
        fontSize: 16,
        fontWeight: '600',
    },
    sparkletContainer: {
        flex: 1,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderText: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 28,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorBox: {
        padding: 12,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        fontSize: 13,
        fontWeight: '500',
    },
    retryButton: {
        padding: 8,
    },
    retryText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    settingsFooter: {
        marginTop: 20,
    },
    // Engine Styles
    engineContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    engineText: {
        fontSize: 16,
        marginBottom: 10,
    },
    engineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 20,
        marginBottom: 10,
    },
    engineButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    engineGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    engineCell: {
        width: 80,
        height: 80,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    engineCellText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    engineInput: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
    }
});
