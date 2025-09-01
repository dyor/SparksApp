import React from 'react';
import styled from 'styled-components/native';
import { TouchableOpacityProps } from 'react-native';
import { lightTheme } from '../../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const getButtonStyles = (variant: ButtonVariant, size: ButtonSize, theme = lightTheme) => {
  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      textColor: '#ffffff',
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
      textColor: '#ffffff',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary,
      textColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.colors.primary,
    },
  };

  const sizes = {
    small: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      fontSize: 14,
    },
    medium: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      fontSize: 16,
    },
    large: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      fontSize: 18,
    },
  };

  return {
    ...variants[variant],
    ...sizes[size],
  };
};

const StyledButton = styled.TouchableOpacity<{
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth: boolean;
}>`
  ${({ variant, size }) => {
    const styles = getButtonStyles(variant, size);
    return `
      background-color: ${styles.backgroundColor};
      border-color: ${styles.borderColor};
      padding-vertical: ${styles.paddingVertical}px;
      padding-horizontal: ${styles.paddingHorizontal}px;
    `;
  }}
  border-width: 1px;
  border-radius: ${lightTheme.borderRadius.md}px;
  align-items: center;
  justify-content: center;
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  ${lightTheme.shadows.sm}
`;

const ButtonText = styled.Text<{ variant: ButtonVariant; size: ButtonSize }>`
  ${({ variant, size }) => {
    const styles = getButtonStyles(variant, size);
    return `
      color: ${styles.textColor};
      font-size: ${styles.fontSize}px;
    `;
  }}
  font-weight: 600;
  text-align: center;
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  children,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      {...props}
    >
      <ButtonText variant={variant} size={size}>
        {children}
      </ButtonText>
    </StyledButton>
  );
};