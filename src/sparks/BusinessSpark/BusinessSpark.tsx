import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, Alert } from 'react-native';
import { useBusinessEngine } from './useBusinessEngine';
import { FinancialDashboard } from './components/FinancialDashboard';
import { NarrativeFeed } from './components/NarrativeFeed';
import { ActionDeck } from './components/ActionDeck';

const BusinessSpark: React.FC = () => {
    const { state, error, processTurn, resetGame } = useBusinessEngine();

    // Handle Game Over
    if (state.game_over) {
        Alert.alert(
            "Bankruptcy!",
            "Your cash has run out. The business is closed.",
            [{ text: "Restart", onPress: resetGame }]
        );
    }

    // Handle Logic Errors (e.g. AI hallucinations)
    if (error) {
        Alert.alert(
            "System Error",
            error,
            [{ text: "Acknowledge", onPress: () => { } }]
        );
    }

    const handleOptionSelect = (option: any) => {
        processTurn(option.label); // Send the text of the action to the AI
    };

    // Get current options from the last turn, or default ones if start
    // Note: logic for 'start' is handled inside ActionDeck if list is empty/initial
    const currentOptions = state.turn_history.length > 0
        ? state.turn_history[state.turn_history.length - 1].next_options
        : [];

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* Header Dashboard */}
                <FinancialDashboard state={state} />

                {/* Main Feed */}
                <NarrativeFeed history={state.turn_history} />

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <ActionDeck
                        options={currentOptions}
                        onSelectOption={handleOptionSelect}
                        isLoading={state.is_loading}
                        gameStarted={state.turn_history.length > 0}
                    />
                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#fff',
        paddingBottom: 20, // Extra padding for iPhone home indicator
    }
});

export default BusinessSpark;
