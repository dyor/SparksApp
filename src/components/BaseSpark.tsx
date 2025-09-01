import React from 'react';
import styled from 'styled-components/native';
import { SparkProps } from '../types/spark';

const Container = styled.View`
  flex: 1;
  background-color: #f5f5f5;
`;

const Header = styled.View`
  background-color: white;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: #e0e0e0;
`;

const Title = styled.Text`
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
`;

const Description = styled.Text`
  font-size: 14px;
  color: #666;
`;

const Content = styled.View`
  flex: 1;
  padding: 20px;
`;

interface BaseSparkProps extends SparkProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const BaseSpark: React.FC<BaseSparkProps> = ({
  title,
  description,
  children,
  config,
  onStateChange,
  onComplete,
}) => {
  return (
    <Container>
      {(title || description) && (
        <Header>
          {title && <Title>{title}</Title>}
          {description && <Description>{description}</Description>}
        </Header>
      )}
      <Content>
        {children}
      </Content>
    </Container>
  );
};