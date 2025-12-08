import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CommonModal } from '../../components/CommonModal';
import { createCommonStyles } from '../../styles/CommonStyles';
import { HapticFeedback } from '../../utils/haptics';
import { submitWisdomSuggestion } from '../../services/golfWisdomService';

interface SuggestWisdomModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SuggestWisdomModal: React.FC<SuggestWisdomModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const [content, setContent] = useState('');
    const [contributor, setContributor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter the wisdom content.');
            return;
        }

        if (!contributor.trim()) {
            Alert.alert('Error', 'Please enter your name.');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitWisdomSuggestion({
                content: content.trim(),
                contributor: contributor.trim(),
            });

            HapticFeedback.success();
            Alert.alert(
                'Thank You!',
                'Your wisdom suggestion has been submitted. It will be reviewed and may be added to the collection.',
                [{ text: 'OK', onPress: handleClose }]
            );
        } catch (error) {
            console.error('Error submitting wisdom suggestion:', error);
            HapticFeedback.error();
            Alert.alert('Error', 'Failed to submit suggestion. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setContent('');
        setContributor('');
        onClose();
    };

    const footer = (
        <View style={styles.footer}>
            <TouchableOpacity
                style={[commonStyles.secondaryButton, styles.button]}
                onPress={handleClose}
                disabled={isSubmitting}
            >
                <Text style={commonStyles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[commonStyles.primaryButton, styles.button, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting || !content.trim() || !contributor.trim()}
            >
                <Text style={commonStyles.primaryButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <CommonModal
            visible={visible}
            title="Suggest Wisdom"
            onClose={handleClose}
            footer={footer}
        >
            <View style={styles.content}>
                <Text style={[styles.label, { color: colors.text }]}>Wisdom</Text>
                <TextInput
                    style={[commonStyles.input, styles.textArea]}
                    placeholder="Enter your golf wisdom..."
                    placeholderTextColor={colors.textSecondary}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                />

                <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Your Name</Text>
                <TextInput
                    style={commonStyles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textSecondary}
                    value={contributor}
                    onChangeText={setContributor}
                />
            </View>
        </CommonModal>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingVertical: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
    },
});
