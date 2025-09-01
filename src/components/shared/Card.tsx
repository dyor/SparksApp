import React from 'react';
import styled from 'styled-components/native';
import { ViewProps } from 'react-native';
import { lightTheme } from '../../theme/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

const StyledCard = styled.View<{ padding: string; shadow: boolean }>`
  background-color: ${lightTheme.colors.surface};
  border-radius: ${lightTheme.borderRadius.md}px;
  ${({ padding }) => {
    const paddingValue = lightTheme.spacing[padding as keyof typeof lightTheme.spacing];
    return `padding: ${paddingValue}px;`;
  }}
  ${({ shadow }) => shadow && `
    ${lightTheme.shadows.sm.shadowColor}: ${lightTheme.shadows.sm.shadowColor};
    shadow-offset: ${lightTheme.shadows.sm.shadowOffset.width}px ${lightTheme.shadows.sm.shadowOffset.height}px;
    shadow-opacity: ${lightTheme.shadows.sm.shadowOpacity};
    shadow-radius: ${lightTheme.shadows.sm.shadowRadius}px;
    elevation: ${lightTheme.shadows.sm.elevation};
  `}
`;

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  shadow = true,
  ...props
}) => {
  return (
    <StyledCard padding={padding} shadow={shadow} {...props}>
      {children}
    </StyledCard>
  );
};