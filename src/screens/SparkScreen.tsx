import React, { useEffect } from 'react';
import styled from 'styled-components/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MySparkStackParamList, MarketplaceStackParamList } from '../types/navigation';
import { getSparkById } from '../components/SparkRegistry';
import { useSparkStore, useAppStore } from '../store';
import { lightTheme } from '../theme/theme';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';

type SparkScreenNavigationProp = 
  | StackNavigationProp<MySparkStackParamList, 'Spark'>
  | StackNavigationProp<MarketplaceStackParamList, 'Spark'>;
type SparkScreenRouteProp = 
  | RouteProp<MySparkStackParamList, 'Spark'>
  | RouteProp<MarketplaceStackParamList, 'Spark'>;

interface Props {
  navigation: SparkScreenNavigationProp;
  route: SparkScreenRouteProp;
}

const Container = styled.View`
  flex: 1;
  background-color: ${lightTheme.colors.background};
`;

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${lightTheme.spacing.lg}px;
`;

const ErrorText = styled.Text`
  font-size: 18px;
  color: ${lightTheme.colors.error};
  text-align: center;
  margin-bottom: ${lightTheme.spacing.md}px;
`;

const ErrorDetail = styled.Text`
  font-size: 14px;
  color: ${lightTheme.colors.textSecondary};
  text-align: center;
`;

const ButtonsContainer = styled.View`
  flex-direction: row;
  padding: 16px;
  gap: 12px;
  background-color: ${lightTheme.colors.surface};
  border-top-width: 1px;
  border-top-color: ${lightTheme.colors.border};
`;

const ActionButton = styled.TouchableOpacity<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  align-items: center;
  background-color: ${({ variant = 'primary' }) => {
    switch (variant) {
      case 'secondary': return lightTheme.colors.border;
      case 'danger': return lightTheme.colors.error;
      default: return lightTheme.colors.primary;
    }
  }};
`;

const ActionButtonText = styled.Text<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  color: ${({ variant = 'primary' }) => 
    variant === 'secondary' ? lightTheme.colors.text : '#fff'};
  font-size: 16px;
  font-weight: 600;
`;

export const SparkScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sparkId } = route.params;
  const { updateSparkProgress, isUserSpark, addSparkToUser, removeSparkFromUser } = useSparkStore();
  const { setCurrentSparkId } = useAppStore();
  const { colors } = useTheme();
  
  const spark = getSparkById(sparkId);
  
  // Detect if we're in the marketplace or my sparks
  const isFromMarketplace = navigation.getState().routes[0]?.name === 'Marketplace';
  const isInUserCollection = isUserSpark(sparkId);

  useEffect(() => {
    setCurrentSparkId(sparkId);
    
    if (spark) {
      // Update play count when spark is accessed
      updateSparkProgress(sparkId, {});
    }

    return () => {
      setCurrentSparkId(null);
    };
  }, [sparkId, spark, setCurrentSparkId, updateSparkProgress]);

  const handleClose = () => {
    HapticFeedback.light();
    navigation.goBack();
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Spark",
      `Are you sure you want to remove "${spark?.metadata.title}" from your collection?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            HapticFeedback.medium();
            removeSparkFromUser(sparkId);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleAdd = () => {
    HapticFeedback.success();
    addSparkToUser(sparkId);
  };

  if (!spark) {
    return (
      <Container>
        <ErrorContainer>
          <ErrorText>Spark Not Found</ErrorText>
          <ErrorDetail>The spark "{sparkId}" could not be loaded.</ErrorDetail>
        </ErrorContainer>
      </Container>
    );
  }

  const SparkComponent = spark.component;

  return (
    <Container>
      <View style={{ flex: 1 }}>
        <SparkComponent
          onStateChange={(state) => {
            // Handle spark state changes
            console.log('Spark state changed:', state);
          }}
          onComplete={(result) => {
            // Handle spark completion
            console.log('Spark completed:', result);
            updateSparkProgress(sparkId, {
              completionPercentage: 100,
              customData: result,
            });
          }}
        />
      </View>
      
      <ButtonsContainer>
        <ActionButton variant="secondary" onPress={handleClose}>
          <ActionButtonText variant="secondary">Close</ActionButtonText>
        </ActionButton>
        
        {isFromMarketplace ? (
          // In marketplace - show Add/Remove based on collection status
          isInUserCollection ? (
            <ActionButton variant="danger" onPress={handleRemove}>
              <ActionButtonText variant="danger">Remove</ActionButtonText>
            </ActionButton>
          ) : (
            <ActionButton variant="primary" onPress={handleAdd}>
              <ActionButtonText variant="primary">Add to My Sparks</ActionButtonText>
            </ActionButton>
          )
        ) : (
          // In My Sparks - always show remove option
          <ActionButton variant="danger" onPress={handleRemove}>
            <ActionButtonText variant="danger">Remove</ActionButtonText>
          </ActionButton>
        )}
      </ButtonsContainer>
    </Container>
  );
};