import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Sparklet } from '../types/sparklet';
import { HapticFeedback } from '../utils/haptics';
import { SparkletService } from '../services/SparkletService';
import { SimpleAnalyticsService } from '../services/SimpleAnalyticsService';
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

    const handleDeleteSparklet = (sparklet: Sparklet) => {
        HapticFeedback.warning();
        Alert.alert(
            'Delete Sparklet',
            `Are you sure you want to delete "${sparklet.metadata.title}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await SparkletService.deleteSparklet(sparklet.metadata.id);
                            HapticFeedback.success();
                            loadSparklets();
                        } catch (err: any) {
                            console.error('Failed to delete sparklet:', err);
                            Alert.alert('Error', 'Failed to delete sparklet. Please try again.');
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
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

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
                >
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
                </KeyboardAvoidingView>
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
                    <Text style={[styles.discoverSubtitle, { color: colors.textSecondary }]}>An ever-expanding collection of good stuff.</Text>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Text style={[styles.errorText, { color: '#dc2626' }]}>{error}</Text>
                        <TouchableOpacity onPress={loadSparklets} style={styles.retryButton}>
                            <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* My Sparklets Section */}
                {sparklets.filter(s => s.metadata.ownerId === (SimpleAnalyticsService.getUserId() || SimpleAnalyticsService.getDeviceId())).length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Sparklets</Text>
                        <View style={styles.grid}>
                            {sparklets
                                .filter(s => s.metadata.ownerId === (SimpleAnalyticsService.getUserId() || SimpleAnalyticsService.getDeviceId()))
                                .map((sparklet) => (
                                    <TouchableOpacity
                                        key={sparklet.metadata.id}
                                        style={[styles.card, { backgroundColor: colors.surface }]}
                                        onPress={() => handleSparkletPress(sparklet)}
                                        onLongPress={() => handleDeleteSparklet(sparklet)}
                                        delayLongPress={600}
                                    >
                                        <View style={styles.cardContent}>
                                            <Text style={styles.cardIcon}>{sparklet.metadata.icon}</Text>
                                            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                                {sparklet.metadata.title} {sparklet.metadata.isBeta && <Text style={styles.betaBadge}>b</Text>}
                                            </Text>
                                            {sparklet.metadata.status && sparklet.metadata.status !== 'published' && (
                                                <View style={[styles.statusBadge, { backgroundColor: sparklet.metadata.status === 'pending' ? colors.warning + '20' : colors.border }]}>
                                                    <Text style={[styles.statusText, { color: sparklet.metadata.status === 'pending' ? colors.warning : colors.textSecondary }]}>
                                                        {sparklet.metadata.status.toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    </View>
                )}

                {/* Community Sparklets Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Sparklets</Text>
                    <View style={styles.grid}>
                        {sparklets
                            .filter(s => s.metadata.isPublished)
                            .map((sparklet) => (
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
            const parsed = JSON.parse(definitionJson);
            // Safeguard: Handle double-wrapped definitions (e.g. from previous AI generation bugs)
            if (parsed && parsed.definition && parsed.definition.view) {
                return parsed.definition;
            }
            return parsed;
        } catch (e) {
            console.error('Failed to parse definition:', e);
            return {};
        }
    }, [definitionJson]);

    const [state, setState] = useState(config.initialState || {});
    const stateRef = useRef(state);
    const timers = useRef<{ [key: string]: NodeJS.Timeout }>({});

    // Sync ref with state
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Cleanup timers on unmount
    useEffect(() => {
        const currentTimers = timers.current;
        return () => {
            Object.values(currentTimers).forEach(t => clearTimeout(t));
        };
    }, []);

    // Helper Evaluator
    const runHelper = (name: string, payload: any = {}) => {
        if (!config.helpers || !config.helpers[name]) return null;
        try {
            const fn = new Function('state', 'params', 'helpers', config.helpers[name]);
            return fn(stateRef.current, payload, {});
        } catch (e) {
            console.error('Helper failed:', e);
            return null;
        }
    };

    // Action Evaluator
    const executeAction = (name: string, params: any = {}) => {
        if (!config.actions || !config.actions[name]) return;
        try {
            const helpersProxy: any = {};
            if (config.helpers) {
                Object.keys(config.helpers).forEach(hName => {
                    helpersProxy[hName] = (p: any) => runHelper(hName, p);
                });
            }

            // Built-in helpers
            helpersProxy.scheduleAction = (actionName: string, actionParams: any, delay: number) => {
                if (timers.current[actionName]) clearTimeout(timers.current[actionName]);
                timers.current[actionName] = setTimeout(() => {
                    executeAction(actionName, actionParams);
                }, delay);
            };

            helpersProxy.cancelAction = (actionName: string) => {
                if (timers.current[actionName]) {
                    clearTimeout(timers.current[actionName]);
                    delete timers.current[actionName];
                }
            };

            // NEW: Helper to run other actions synchronously
            helpersProxy.runAction = (actionName: string, actionParams: any) => {
                const actionBody = config.actions[actionName];
                if (!actionBody) return stateRef.current;
                const actionFn = new Function('state', 'params', 'helpers', actionBody);
                const result = actionFn(stateRef.current, actionParams, helpersProxy);
                // Return the full state that WOULD result from this action
                return result && typeof result === 'object' ? { ...stateRef.current, ...result } : stateRef.current;
            };

            const fn = new Function('state', 'params', 'helpers', config.actions[name]);
            const result = fn(stateRef.current, params, helpersProxy);
            if (result && typeof result === 'object') {
                const newState = { ...stateRef.current, ...result };
                stateRef.current = newState;
                setState(newState);
            }
        } catch (e) {
            console.error('Action execution failed:', e);
        }
    };

    // Value Interpolator (e.g. {{state.status}} or {{element.label}})
    const interpolate = (val: any, context: any = {}): any => {
        if (typeof val !== 'string') return val;

        const expressionRegex = /{{([^}]+)}}/g;

        // Combine state and context (support both 'element' and 'item' aliases)
        const evalContext = {
            state: stateRef.current,
            ...context,
            element: context.element || context.item,
            item: context.item || context.element
        };

        // Check if the entire string is a single interpolation (to return raw objects)
        const matchFull = val.match(/^{{([^}]+)}}$/);
        if (matchFull) {
            try {
                const keys = Object.keys(evalContext);
                const values = Object.values(evalContext);
                const fn = new Function(...keys, `return ${matchFull[1].trim()}`);
                return fn(...values);
            } catch (e) {
                console.warn('Interpolation failed:', matchFull[1], e);
                return undefined;
            }
        }

        // Otherwise replace matches in the string
        return val.replace(expressionRegex, (match, expression) => {
            try {
                const keys = Object.keys(evalContext);
                const values = Object.values(evalContext);
                const fn = new Function(...keys, `return ${expression.trim()}`);
                const result = fn(...values);
                return result !== undefined ? String(result) : '';
            } catch (e) {
                console.warn('Interpolation failed:', expression, e);
                return '';
            }
        });
    };

    const renderElement = (el: any, index: number, context: any = {}): React.ReactNode => {
        // Handle conditional visibility
        if (el.visible !== undefined) {
            const isVisible = interpolate(el.visible, context);
            if (!isVisible || isVisible === 'false') return null;
        }
        if (el.hidden !== undefined) {
            const isHidden = interpolate(el.hidden, context);
            if (isHidden === true || isHidden === 'true') return null;
        }

        const styleName = interpolate(el.style, context);
        const rawStyle = config.view?.styles?.[styleName] || {};
        const customStyle: any = {};
        Object.keys(rawStyle).forEach(key => {
            let val = interpolate(rawStyle[key], context);

            // Basic web-to-native mapping
            if (typeof val === 'string') {
                // Remove px
                if (val.endsWith('px')) {
                    val = parseFloat(val);
                } else if (val.endsWith('em')) {
                    // Rough em to px approximation
                    val = parseFloat(val) * 16;
                } else if (/^-?\d+(\.\d+)?$/.test(val)) {
                    // If it's just a number string, convert to Number
                    val = parseFloat(val);
                }
            }

            // Specific property mappings
            if (key === 'display' && val === 'none') {
                customStyle.height = 0;
                customStyle.opacity = 0;
                customStyle.overflow = 'hidden';
            } else if (key === 'transform' && typeof val === 'string') {
                // Parser for "translate(-50%, -50%)"
                const match = val.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (match) {
                    customStyle.transform = [
                        { translateX: match[1].includes('%') ? match[1] : parseFloat(match[1]) },
                        { translateY: match[2].includes('%') ? match[2] : parseFloat(match[2]) }
                    ];
                }
            } else if (key === 'boxShadow' && typeof val === 'string') {
                // Parser for "0px 4px 8px rgba(0,0,0,0.2)"
                const parts = val.split(' ');
                if (parts.length >= 4) {
                    customStyle.shadowOffset = { width: parseFloat(parts[0]), height: parseFloat(parts[1]) };
                    customStyle.shadowRadius = parseFloat(parts[2]);
                    const colorPart = val.substring(val.indexOf('rgba'));
                    customStyle.shadowColor = colorPart || '#000';
                    customStyle.shadowOpacity = 0.3; // Default
                    customStyle.elevation = 5;
                }
            } else if (key === 'cursor') {
                // Ignore web-only cursor
            } else {
                customStyle[key] = val;
            }
        });

        switch (el.type) {
            case 'text':
                return (
                    <Text key={index} style={[styles.engineText, { color: colors.text }, customStyle]}>
                        {interpolate(el.value, context)}
                    </Text>
                );
            case 'button':
                const buttonStyle: any = {};
                const textStyle: any = {};
                const textProps = ['color', 'fontSize', 'fontWeight', 'textAlign', 'fontFamily', 'lineHeight'];

                Object.keys(customStyle).forEach(key => {
                    if (textProps.includes(key)) {
                        textStyle[key] = customStyle[key];
                    } else {
                        buttonStyle[key] = customStyle[key];
                    }
                });

                // Intelligent default text color for contrast
                const bBg = buttonStyle.backgroundColor;
                const isLightBg = bBg && (bBg === '#eee' || bBg === '#f3f4f6' || bBg === '#fff' || bBg === '#ffffff' || bBg === 'white' || bBg === 'rgba(255,255,255,1)');
                const defaultTextStyle = isLightBg ? { color: '#000' } : {};

                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.engineButton, buttonStyle]}
                        onPress={() => {
                            HapticFeedback.light();
                            // Interpolate individual params
                            const finalParams: any = {};
                            if (el.params) {
                                Object.keys(el.params).forEach(k => {
                                    finalParams[k] = interpolate(el.params[k], context);
                                });
                            }
                            executeAction(el.onPress, finalParams);
                        }}
                    >
                        <Text style={[styles.engineButtonText, defaultTextStyle, textStyle]}>{interpolate(el.label || el.value, context)}</Text>
                    </TouchableOpacity>
                );
            case 'grid': {
                if (el.dataSource) {
                    const fieldName = el.dataSource.replace(/^state\./, '');
                    const items = state[fieldName] || [];

                    // IMPROVED MATH:
                    // Use a 'columns' property from the element, or fallback to gridTemplateColumns
                    let numCols = 2;
                    const gridStyle = config.view?.styles?.[el.style] || {};

                    if (el.columns) {
                        numCols = parseInt(interpolate(el.columns, context));
                    } else if (gridStyle.gridTemplateColumns) {
                        const match = String(gridStyle.gridTemplateColumns).match(/repeat\((\d+),/);
                        if (match) numCols = parseInt(match[1]);
                    }

                    // Calculate percentage width (subtracting a tiny bit for margins/borders)
                    const columnWidth = `${(100 / numCols) - 0.5}%`;

                    return (
                        <View key={index} style={[styles.engineGrid, { width: '100%' }, customStyle]}>
                            {items.map((item: any, i: number) => (
                                <View key={i} style={{ width: columnWidth as any, padding: 1 }}>
                                    {el.elements && el.elements.length > 0 ? (
                                        el.elements.map((template: any, subIndex: number) =>
                                            renderElement(template, i * 100 + subIndex, { item, index: i })
                                        )
                                    ) : (
                                        // Fallback cell if no template elements provided
                                        <TouchableOpacity
                                            style={[styles.engineCell, { borderColor: colors.border, backgroundColor: colors.surface, width: '100%', height: 50 }]}
                                            onPress={() => executeAction(el.onPress, { index: i, item })}
                                        >
                                            <Text style={[styles.engineCellText, { color: colors.text, fontSize: 16 }]}>
                                                {String(item)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    );
                }
            }
            case 'view':
            case 'container':
                return (
                    <View key={index} style={[customStyle]}>
                        {el.elements?.map((child: any, i: number) => renderElement(child, i, context))}
                        {el.children?.map((child: any, i: number) => renderElement(child, i, context))}
                    </View>
                );
            case 'input': {
                if (!el.binding) {
                    console.warn('Input element missing binding');
                    return null;
                }
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
            }
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        marginLeft: 4,
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
    statusBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
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
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        paddingBottom: 100,
    },
    engineText: {
        fontSize: 16,
        marginBottom: 10,
    },
    engineButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#3b82f6', // Default blue
        borderRadius: 4,
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
        marginBottom: 15,
        fontSize: 16,
    },
    // Common layout helpers for AI
    engineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 10,
    },
    engineStatBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    }
});
