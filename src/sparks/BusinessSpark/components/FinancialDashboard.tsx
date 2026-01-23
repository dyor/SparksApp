import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BusinessState } from '../types';
import { LedgerEngine } from '../services/LedgerEngine';

interface FinancialDashboardProps {
    state: BusinessState;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ state }) => {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {/* Metric Card 1: Cash */}
                <View style={styles.metricCard}>
                    <Text style={styles.label}>Cash</Text>
                    <Text style={[styles.value, state.cash < 0 ? styles.negative : styles.positive]}>
                        {LedgerEngine.formatCurrency(state.cash)}
                    </Text>
                </View>

                {/* Metric Card 2: Inventory */}
                <View style={styles.metricCard}>
                    <Text style={styles.label}>Inventory</Text>
                    <Text style={styles.value}>{state.inventory_kg} kg</Text>
                </View>

                {/* Metric Card 3: Health */}
                <View style={styles.metricCard}>
                    <Text style={styles.label}>Machine Health</Text>
                    <Text style={[styles.value, state.machine_health < 50 ? styles.warning : undefined]}>
                        {Math.round(state.machine_health)}%
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricCard: {
        alignItems: 'center',
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#6b7280',
        fontFamily: 'Inter-Medium',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#111827',
    },
    positive: {
        color: '#059669', // Green
    },
    negative: {
        color: '#DC2626', // Red
    },
    warning: {
        color: '#D97706', // Amber
    },
});
