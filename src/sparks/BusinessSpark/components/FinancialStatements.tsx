import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FinancialStatementRow, LedgerEngine } from '../services/LedgerEngine';

interface StatementRowsProps {
    rows: FinancialStatementRow[];
    level?: number;
}

const StatementRows: React.FC<StatementRowsProps> = ({ rows, level = 0 }) => {
    const { formatCurrency } = LedgerEngine;

    return (
        <>
            {rows.map((row, index) => (
                <View key={index}>
                    <View style={[
                        styles.row,
                        level > 0 && styles.subRow,
                        row.isTotal && styles.totalRow
                    ]}>
                        <Text style={[
                            styles.label,
                            row.isTotal && styles.totalLabel
                        ]}>{row.label}</Text>
                        <Text style={[
                            styles.value,
                            row.isTotal && styles.totalValue,
                            row.value < 0 && styles.negativeValue
                        ]}>{formatCurrency(row.value)}</Text>
                    </View>
                    {row.subRows && <StatementRows rows={row.subRows} level={level + 1} />}
                </View>
            ))}
        </>
    );
};

export const IncomeStatement: React.FC<{ rows: FinancialStatementRow[] }> = ({ rows }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Income Statement</Text>
            <StatementRows rows={rows} />
        </View>
    );
};

export const BalanceSheet: React.FC<{ assets: FinancialStatementRow[], liabilities: FinancialStatementRow[], equity: FinancialStatementRow[] }> = ({ assets, liabilities, equity }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Balance Sheet</Text>

            <Text style={styles.subHeader}>Assets</Text>
            <StatementRows rows={assets} />

            <Text style={[styles.subHeader, { marginTop: 12 }]}>Liabilities</Text>
            <StatementRows rows={liabilities} />

            <Text style={[styles.subHeader, { marginTop: 12 }]}>Shareholder's Equity</Text>
            <StatementRows rows={equity} />
        </View>
    );
};

export const CashFlowStatement: React.FC<{ rows: FinancialStatementRow[] }> = ({ rows }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Cash Flow Statement</Text>
            <StatementRows rows={rows} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#111827',
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 8,
    },
    subHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        backgroundColor: '#f3f4f6',
        padding: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    subRow: {
        paddingLeft: 24,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        marginTop: 4,
        paddingTop: 8,
        paddingBottom: 8,
    },
    label: {
        fontSize: 13,
        color: '#4b5563',
    },
    totalLabel: {
        fontWeight: '700',
        color: '#111827',
    },
    value: {
        fontSize: 13,
        fontFamily: 'Courier',
        color: '#111827',
    },
    totalValue: {
        fontWeight: 'bold',
    },
    negativeValue: {
        color: '#dc2626',
    }
});
