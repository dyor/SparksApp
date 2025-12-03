import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';

export interface CommonModalProps {
    visible: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    scrollable?: boolean;
    footer?: React.ReactNode;
}

/**
 * Reusable modal component with consistent styling and keyboard handling
 * @param visible - Whether the modal is visible
 * @param title - Modal title
 * @param onClose - Function to call when modal should close
 * @param children - Modal content
 * @param scrollable - Whether content should be scrollable (default: true)
 * @param footer - Optional footer content (buttons, etc.)
 */
export const CommonModal: React.FC<CommonModalProps> = ({
    visible,
    title,
    onClose,
    children,
    scrollable = true,
    footer,
}) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);

    const ContentWrapper = scrollable ? ScrollView : View;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableOpacity
                        style={commonStyles.modalOverlay}
                        activeOpacity={1}
                        onPress={onClose}
                    >
                        <View
                            style={commonStyles.modalContent}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={commonStyles.modalTitle}>{title}</Text>
                            <ContentWrapper
                                showsVerticalScrollIndicator={scrollable}
                                keyboardShouldPersistTaps="handled"
                            >
                                {children}
                            </ContentWrapper>
                            {footer && <View style={{ marginTop: 16 }}>{footer}</View>}
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};
