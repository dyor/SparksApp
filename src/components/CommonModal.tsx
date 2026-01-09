import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const ContentWrapper = scrollable ? ScrollView : View;

    // When keyboard is visible, extend modal content to full width and bottom to avoid white space on sides
    const modalContentStyle = keyboardVisible
        ? [commonStyles.modalContent, { 
            width: '100%', 
            maxWidth: '100%',
            marginBottom: 0, 
            borderBottomLeftRadius: 0, 
            borderBottomRightRadius: 0 
        }]
        : commonStyles.modalContent;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={commonStyles.modalOverlay}>
                        <TouchableWithoutFeedback testID="modal-backdrop" onPress={onClose}>
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        </TouchableWithoutFeedback>
                        <View
                            style={modalContentStyle}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={commonStyles.modalTitle}>{title}</Text>
                            <ContentWrapper
                                showsVerticalScrollIndicator={scrollable}
                                keyboardShouldPersistTaps="always"
                            >
                                {children}
                            </ContentWrapper>
                            {footer && <View style={{ marginTop: 16 }}>{footer}</View>}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};
