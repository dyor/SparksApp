/**
 * Design tokens for consistent styling across the app
 */

export const StyleTokens = {
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
    },
    fontSize: {
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 20,
        title: 28,
    },
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
    },
} as const;
