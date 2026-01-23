import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NextOption } from '../types';

interface ActionDeckProps {
    options: NextOption[];
    onSelectOption: (option: NextOption) => void;
    isLoading: boolean;
    gameStarted: boolean; // Helper to show a "Start Game" button if history is empty
}

export const ActionDeck: React.FC<ActionDeckProps> = ({ options, onSelectOption, isLoading, gameStarted }) => {

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Accountants are calculating...</Text>
            </View>
        );
    }

    // Initial State: Offer start
    if (!gameStarted) {
        return (
            <View style={styles.container}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => onSelectOption({ id: 'start', label: 'Open for Business ($1000 Capital)', type: 'strategic', estimated_cost_preview: '$0' })}
                >
                    <Text style={styles.buttonText}>Start Business</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option.id}
                    style={styles.button}
                    onPress={() => onSelectOption(option)}
                >
                    <Text style={styles.buttonLabel}>{option.label}</Text>
                    <Text style={styles.buttonCost}>{option.estimated_cost_preview}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Inter-Medium',
        color: '#666',
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    primaryButton: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'Inter-Bold',
        fontSize: 16,
    },
    buttonLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        color: '#1f2937',
        flex: 1,
    },
    buttonCost: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
});
