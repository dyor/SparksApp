import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useBusinessEngine } from './useBusinessEngine';
import { NarrativeFeed } from './components/NarrativeFeed';
import { ActionDeck } from './components/ActionDeck';
import { IncomeStatement, BalanceSheet, CashFlowStatement } from './components/FinancialStatements';
import { LedgerEngine } from './services/LedgerEngine';
import { useSparkStore } from '../../store';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SettingsButton,
} from '../../components/SettingsComponents';

interface BusinessSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
    onStateChange?: (state: any) => void;
    onComplete?: (result: any) => void;
}

const LoadingOverlay = ({ onCancel }: { onCancel?: () => void }) => (
    <View style={styles.loadingOverlay}>
        <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>The accountants are calculating...</Text>
            {onCancel && (
                <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Emergency Cancel</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

const BusinessSpark: React.FC<BusinessSparkProps> = ({
    showSettings = false,
    onCloseSettings,
    onStateChange,
    onComplete
}) => {
    const { getSparkData, setSparkData } = useSparkStore();
    const [dataLoaded, setDataLoaded] = useState(false);
    const { state, error, processTurn, resetGame, loadState, stopLoading } = useBusinessEngine();
    const [activePanel, setActivePanel] = useState<'books' | 'narrative' | 'options'>('options');
    const [activeStatement, setActiveStatement] = useState<'income' | 'balance' | 'cashflow'>('income');

    // Load saved data on mount
    useEffect(() => {
        const savedData = getSparkData('empire');
        if (savedData?.businessState) {
            loadState(savedData.businessState);
        }
        setDataLoaded(true);
    }, [getSparkData]);

    // Save data whenever state changes (but strip transient UI state like is_loading)
    useEffect(() => {
        if (!dataLoaded) return;
        const stateToSave = { ...state, is_loading: false };
        setSparkData('empire', { businessState: stateToSave });
    }, [state, dataLoaded, setSparkData]);

    const handleRestartWithConfirm = () => {
        Alert.alert(
            'Restart Empire',
            'Are you sure you want to start from zero? Your current empire will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restart',
                    style: 'destructive',
                    onPress: () => {
                        resetGame();
                        setActivePanel('options');
                        if (onCloseSettings) onCloseSettings();
                    }
                }
            ]
        );
    };

    // Settings view
    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Empire Settings"
                        subtitle="Build your 3D printing business empire"
                        icon="💼"
                        sparkId="empire"
                    />
                    <SettingsFeedbackSection sparkName="Empire" sparkId="empire" />

                    <View style={{ padding: 20 }}>
                        <SettingsButton
                            title="Restart Empire"
                            onPress={handleRestartWithConfirm}
                            variant="danger"
                        />
                    </View>

                    <SettingsButton
                        title="Close"
                        onPress={onCloseSettings || (() => { })}
                        variant="secondary"
                    />
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    const handleOptionSelect = (option: any) => {
        processTurn(option.label);
        // Force the narrative panel open so result is visible
        setActivePanel('narrative');
    };

    const currentOptions = state.turn_history.length > 0
        ? state.turn_history[state.turn_history.length - 1].next_options
        : [];

    const incomeRows = LedgerEngine.getIncomeStatement(state.ledger);
    const bsData = LedgerEngine.getBalanceSheet(state.ledger);
    const cfRows = LedgerEngine.getCashFlowStatement(state.ledger);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* 1. BOOKS PANEL */}
                <TouchableOpacity
                    style={[styles.panelHeader, activePanel === 'books' && styles.activePanelHeader]}
                    onPress={() => setActivePanel(activePanel === 'books' ? 'options' : 'books')}
                >
                    <Text style={styles.panelTitle}>📚 Books</Text>
                    <View style={styles.headerStats}>
                        <Text style={styles.headerValue}>{LedgerEngine.formatCurrency(state.cash)}</Text>
                    </View>
                </TouchableOpacity>

                {activePanel === 'books' && (
                    <View style={styles.panelContent}>
                        <View style={styles.tabsRow}>
                            <TouchableOpacity onPress={() => setActiveStatement('income')} style={[styles.tab, activeStatement === 'income' && styles.activeTab]}>
                                <Text style={[styles.tabText, activeStatement === 'income' && styles.activeTabText]}>P&L</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveStatement('balance')} style={[styles.tab, activeStatement === 'balance' && styles.activeTab]}>
                                <Text style={[styles.tabText, activeStatement === 'balance' && styles.activeTabText]}>Balance Sheet</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveStatement('cashflow')} style={[styles.tab, activeStatement === 'cashflow' && styles.activeTab]}>
                                <Text style={[styles.tabText, activeStatement === 'cashflow' && styles.activeTabText]}>Cash Flow</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.statementScroll}>
                            {activeStatement === 'income' && <IncomeStatement rows={incomeRows} />}
                            {activeStatement === 'balance' && <BalanceSheet {...bsData} />}
                            {activeStatement === 'cashflow' && <CashFlowStatement rows={cfRows} />}
                        </ScrollView>
                    </View>
                )}

                {/* 2. NARRATIVE PANEL */}
                <TouchableOpacity
                    style={[styles.panelHeader, activePanel === 'narrative' && styles.activePanelHeader]}
                    onPress={() => setActivePanel(activePanel === 'narrative' ? 'options' : 'narrative')}
                >
                    <Text style={styles.panelTitle}>🎭 Narrative</Text>
                    <Text style={styles.weekText}>{state.week === 0 ? 'The Inception' : `Week ${state.week}`}</Text>
                </TouchableOpacity>

                {activePanel === 'narrative' && (
                    <View style={styles.panelContent}>
                        {error && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>🚨 {error}</Text>
                            </View>
                        )}
                        <NarrativeFeed history={state.turn_history} />
                    </View>
                )}

                {/* 3. OPTIONS PANEL */}
                <TouchableOpacity
                    style={[styles.panelHeader, activePanel === 'options' && styles.activePanelHeader]}
                    onPress={() => setActivePanel(activePanel === 'options' ? (state.turn_history.length > 0 ? 'narrative' : 'options') : 'options')}
                >
                    <Text style={styles.panelTitle}>⚡ Options</Text>
                </TouchableOpacity>

                {activePanel === 'options' && (
                    <View style={[styles.panelContent, styles.optionsPanel]}>
                        {error && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>🚨 {error}</Text>
                            </View>
                        )}
                        <ActionDeck
                            options={currentOptions}
                            onSelectOption={handleOptionSelect}
                            isLoading={state.is_loading}
                            gameStarted={state.turn_history.length > 0}
                        />
                    </View>
                )}

                {state.is_loading && <LoadingOverlay onCancel={stopLoading} />}

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    container: {
        flex: 1,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    activePanelHeader: {
        backgroundColor: '#f9fafb',
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    panelContent: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    optionsPanel: {
        justifyContent: 'flex-end',
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
    },
    weekText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    tabsRow: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 4,
    },
    activeTab: {
        backgroundColor: '#eff6ff',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    activeTabText: {
        color: '#2563eb',
    },
    statementScroll: {
        flex: 1,
        padding: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingBox: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#dc2626',
        fontSize: 12,
        fontWeight: '700',
    },
    errorBanner: {
        backgroundColor: '#fee2e2',
        padding: 12,
        margin: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        color: '#b91c1c',
        fontSize: 13,
        fontWeight: '600',
    }
});

export default BusinessSpark;
