import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { GameTurnResponse } from '../types';

interface NarrativeFeedProps {
    history: GameTurnResponse[];
}

export const NarrativeFeed: React.FC<NarrativeFeedProps> = ({ history }) => {
    const scrollViewRef = useRef<ScrollView>(null);

    // Auto-scroll to bottom when history changes
    useEffect(() => {
        if (history.length > 0) {
            // Small delay to ensure layout is computed
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [history.length]);

    if (history.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Tap the 'Options' panel below and invest your first $1,000 to begin your journey. The empire awaits.</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            {history.map((turn, index) => (
                <View key={index} style={styles.bubble}>
                    <Text style={styles.weekLabel}>Week {index + 1}</Text>
                    <Text style={styles.narrative}>{turn.narrative_outcome}</Text>

                    {turn.mentor_feedback && (
                        <View style={styles.mentorBox}>
                            <Text style={styles.mentorTitle}>👩‍🏫 Mentor Insight:</Text>
                            <Text style={styles.mentorText}>{turn.mentor_feedback}</Text>
                        </View>
                    )}

                    <View style={styles.ledgerPreview}>
                        <Text style={styles.ledgerLabel}>Financial Impact</Text>
                        {turn.journal_entries.map((entry, idx) => (
                            <Text key={idx} style={styles.ledgerRow}>
                                • {entry.description}
                            </Text>
                        ))}
                    </View>

                    <Text style={styles.reviewHint}>💡 Tip: Check the 'Books' panel to see how this affected your statements.</Text>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        color: '#9ca3af',
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
    },
    bubble: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    weekLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        color: '#6b7280',
        fontFamily: 'Inter-Bold',
        marginBottom: 8,
    },
    narrative: {
        fontSize: 16,
        lineHeight: 24,
        color: '#1f2937',
        fontFamily: 'Inter-Regular',
        marginBottom: 12,
    },
    mentorBox: {
        backgroundColor: '#eff6ff', // Light blue
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    mentorTitle: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#1e40af',
        marginBottom: 4,
    },
    mentorText: {
        fontSize: 14,
        color: '#1e3a8a',
        fontFamily: 'Inter-Medium',
    },
    ledgerPreview: {
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6'
    },
    ledgerLabel: {
        fontSize: 10,
        color: '#9ca3af',
        marginBottom: 4
    },
    ledgerRow: {
        fontSize: 10,
        fontFamily: 'SpaceMono-Regular',
        color: '#6b7280'
    },
    reviewHint: {
        marginTop: 12,
        fontSize: 11,
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
    }
});
