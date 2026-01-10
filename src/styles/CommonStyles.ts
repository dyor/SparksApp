import { StyleSheet } from 'react-native';
import { ThemeColors } from '../contexts/ThemeContext';
import { StyleTokens } from './StyleTokens';

/**
 * Create common styles that can be reused across Sparks
 * @param colors - Theme colors from ThemeContext
 * @returns StyleSheet object with common styles
 */
export const createCommonStyles = (colors: ThemeColors) => {
    return StyleSheet.create({
        // Containers
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContainer: {
            flexGrow: 1,
            padding: StyleTokens.spacing.xl,
        },

        // Typography
        title: {
            fontSize: StyleTokens.fontSize.title,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: StyleTokens.spacing.sm,
        },
        subtitle: {
            fontSize: StyleTokens.fontSize.lg,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: StyleTokens.spacing.xl,
        },
        sectionTitle: {
            fontSize: StyleTokens.fontSize.xxl,
            fontWeight: '600',
            color: colors.text,
            marginBottom: StyleTokens.spacing.lg,
            textAlign: 'center',
        },

        // Cards/Surfaces
        card: {
            backgroundColor: colors.surface,
            borderRadius: StyleTokens.borderRadius.md,
            padding: StyleTokens.spacing.lg,
            marginBottom: StyleTokens.spacing.xl,
            ...StyleTokens.shadows.small,
        },

        // Buttons
        primaryButton: {
            backgroundColor: colors.primary,
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: StyleTokens.borderRadius.md,
            alignItems: 'center',
        },
        primaryButtonText: {
            color: '#fff',
            fontSize: StyleTokens.fontSize.lg,
            fontWeight: '600',
        },
        secondaryButton: {
            backgroundColor: colors.border,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: StyleTokens.borderRadius.sm,
            alignItems: 'center',
        },
        secondaryButtonText: {
            color: colors.text,
            fontSize: StyleTokens.fontSize.lg,
            fontWeight: '600',
        },

        // Inputs
        input: {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: StyleTokens.borderRadius.sm,
            padding: StyleTokens.spacing.md,
            fontSize: StyleTokens.fontSize.lg,
            color: colors.text,
        },

        // Modal styles
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: colors.surface,
            borderRadius: StyleTokens.borderRadius.lg,
            padding: StyleTokens.spacing.xxl,
            width: '90%',
            maxWidth: 400,
        },
        modalTitle: {
            fontSize: StyleTokens.fontSize.xxl,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: StyleTokens.spacing.xl,
            textAlign: 'center',
        },
        modalButtons: {
            flexDirection: 'row',
            gap: StyleTokens.spacing.md,
        },
        modalButton: {
            flex: 1,
            paddingVertical: StyleTokens.spacing.md,
            paddingHorizontal: StyleTokens.spacing.xl,
            borderRadius: StyleTokens.borderRadius.sm,
            alignItems: 'center',
        },

        modalContentKeyboardVisible: {
            width: '100%',
            maxWidth: '100%',
            marginBottom: 0,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingBottom: 0,
        },

        // Empty states
        emptyState: {
            alignItems: 'center',
            paddingVertical: 40,
        },
        emptyText: {
            fontSize: StyleTokens.fontSize.lg,
            color: colors.textSecondary,
            textAlign: 'center',
        },
    });
};
