import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface VoiceTranscriptProps {
    transcript: string;
    isListening: boolean;
    isActive?: boolean;
}

/**
 * Shared component for displaying live voice transcriptions.
 * Providing visual feedback to the user while they are speaking.
 */
export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({
    transcript,
    isListening,
    isActive = true
}) => {
    const { colors } = useTheme();

    if (!isActive || (!isListening && !transcript)) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.transcript, { color: colors.text }]}>
                {transcript ? `"${transcript}"` : isListening ? "Listening..." : ""}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 40,
    },
    transcript: {
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        opacity: 0.8,
    },
});
