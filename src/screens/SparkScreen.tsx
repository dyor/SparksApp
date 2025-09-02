import React, { useEffect } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { MySparkStackParamList, MarketplaceStackParamList } from '../types/navigation';
import { getSparkById } from '../components/SparkRegistry';
import { useSparkStore, useAppStore } from '../store';
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


export const SparkScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sparkId } = route.params;
  const { updateSparkProgress, isUserSpark, addSparkToUser, removeSparkFromUser } = useSparkStore();
  const { setCurrentSparkId } = useAppStore();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      fontSize: 18,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    errorDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buttonsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.border,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    dangerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
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
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Spark Not Found</Text>
          <Text style={styles.errorDetail}>The spark "{sparkId}" could not be loaded.</Text>
        </View>
      </View>
    );
  }

  const SparkComponent = spark.component;

  return (
    <View style={styles.container}>
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
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={handleClose}
        >
          <Text style={styles.secondaryButtonText}>Close</Text>
        </TouchableOpacity>
        
        {isFromMarketplace ? (
          // In marketplace - show Add/Remove based on collection status
          isInUserCollection ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={handleRemove}
            >
              <Text style={styles.dangerButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]} 
              onPress={handleAdd}
            >
              <Text style={styles.primaryButtonText}>Add to My Sparks</Text>
            </TouchableOpacity>
          )
        ) : (
          // In My Sparks - always show remove option
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleRemove}
          >
            <Text style={styles.dangerButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};