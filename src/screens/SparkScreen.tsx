import React, { useEffect, useState } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MySparkStackParamList, MarketplaceStackParamList } from '../types/navigation';
import { getSparkById } from '../components/SparkRegistry';
import { useSparkStore, useAppStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { QuickSwitchModal } from '../components/QuickSwitchModal';

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
  const { setCurrentSparkId, recentSparks, addRecentSpark } = useAppStore();
  const { colors } = useTheme();
  
  const [showSparkSettings, setShowSparkSettings] = useState(false);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);

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
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
      justifyContent: 'space-around',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      minHeight: 60,
      justifyContent: 'center',
    },
    buttonIcon: {
      fontSize: 24,
      marginBottom: 2,
      lineHeight: 28,
    },
    buttonLabel: {
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 14,
    },
    // Button colors
    closeIcon: {
      color: colors.textSecondary,
    },
    closeLabel: {
      color: colors.textSecondary,
    },
    addIcon: {
      color: colors.primary,
    },
    addLabel: {
      color: colors.primary,
    },
    quickSwitchIcon: {
      color: colors.primary,
    },
    quickSwitchLabel: {
      color: colors.primary,
    },
    recentSparkIcon: {
      color: colors.textSecondary,
    },
    recentSparkLabel: {
      color: colors.textSecondary,
    },
    settingsIcon: {
      color: colors.primary,
    },
    settingsLabel: {
      color: colors.primary,
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
      // Add to recent sparks for quick switching
      addRecentSpark(sparkId);
    }

    return () => {
      setCurrentSparkId(null);
    };
  }, [sparkId, spark, setCurrentSparkId, updateSparkProgress, addRecentSpark]);

  const handleClose = () => {
    HapticFeedback.light();
    navigation.goBack();
  };


  const handleAdd = () => {
    HapticFeedback.success();
    addSparkToUser(sparkId);
  };

  const handleSettings = () => {
    HapticFeedback.light();
    setShowSparkSettings(true);
  };

  const handleQuickSwitch = () => {
    console.log('QuickSwitch: Opening modal');
    console.log('QuickSwitch: Current sparkId:', sparkId);
    console.log('QuickSwitch: All recent sparks:', recentSparks);
    console.log('QuickSwitch: Filtered recent sparks:', recentSparks.filter(id => id !== sparkId));
    HapticFeedback.light();
    setShowQuickSwitch(true);
  };

  const handleSelectSpark = (selectedSparkId: string) => {
    console.log('QuickSwitch: Selected spark ID:', selectedSparkId);
    console.log('QuickSwitch: Current spark ID:', sparkId);
    console.log('QuickSwitch: Available sparks:', recentSparks);
    
    if (selectedSparkId !== sparkId) {
      // Verify the spark exists before navigating
      const targetSpark = getSparkById(selectedSparkId);
      console.log('QuickSwitch: Target spark found:', targetSpark);
      
      if (targetSpark) {
        navigation.replace('Spark', { sparkId: selectedSparkId });
      } else {
        console.error('QuickSwitch: Spark not found:', selectedSparkId);
      }
    }
  };

  const handleRecentSparkPress = () => {
    if (recentSparks.length > 1) {
      const previousSpark = recentSparks.find(id => id !== sparkId);
      if (previousSpark) {
        HapticFeedback.light();
        navigation.replace('Spark', { sparkId: previousSpark });
      }
    } else {
      handleQuickSwitch();
    }
  };

  if (!spark) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Spark Not Found</Text>
          <Text style={styles.errorDetail}>The spark "{sparkId}" could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const SparkComponent = spark.component;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }}>
        <SparkComponent
          showSettings={showSparkSettings}
          onCloseSettings={() => setShowSparkSettings(false)}
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
      
      {!showSparkSettings && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleClose}
          >
            <Text style={[styles.buttonIcon, styles.closeIcon]}>✖️</Text>
            <Text style={[styles.buttonLabel, styles.closeLabel]}>Close</Text>
          </TouchableOpacity>
          
          {/* Recent Spark Quick Access */}
          {recentSparks.length > 1 && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleRecentSparkPress}
            >
              <Text style={[styles.buttonIcon, styles.recentSparkIcon]}>
                {recentSparks.find(id => id !== sparkId) ? 
                  getSparkById(recentSparks.find(id => id !== sparkId)!)?.metadata.icon || '⚡️' : 
                  '⚡️'
                }
              </Text>
              <Text style={[styles.buttonLabel, styles.recentSparkLabel]}>Recent</Text>
            </TouchableOpacity>
          )}
          
          {/* Quick Switch Button */}
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleQuickSwitch}
          >
            <Text style={[styles.buttonIcon, styles.quickSwitchIcon]}>⚡️</Text>
            <Text style={[styles.buttonLabel, styles.quickSwitchLabel]}>Switch</Text>
          </TouchableOpacity>
          
          {!isInUserCollection && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleAdd}
            >
              <Text style={[styles.buttonIcon, styles.addIcon]}>➕</Text>
              <Text style={[styles.buttonLabel, styles.addLabel]}>Add</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSettings}
          >
            <Text style={[styles.buttonIcon, styles.settingsIcon]}>⚙️</Text>
            <Text style={[styles.buttonLabel, styles.settingsLabel]}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Quick Switch Modal */}
      <QuickSwitchModal
        visible={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        recentSparks={recentSparks.filter(id => id !== sparkId)}
        onSelectSpark={handleSelectSpark}
      />
    </SafeAreaView>
  );
};