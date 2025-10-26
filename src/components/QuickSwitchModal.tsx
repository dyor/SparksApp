import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { getSparkById } from './SparkRegistry';
import { HapticFeedback } from '../utils/haptics';

interface QuickSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  recentSparks: string[];
  onSelectSpark: (sparkId: string) => void;
  navigation?: any; // Navigation prop for navigating to My Sparks
}

const { height } = Dimensions.get('window');

export const QuickSwitchModal: React.FC<QuickSwitchModalProps> = ({
  visible,
  onClose,
  recentSparks,
  onSelectSpark,
  navigation,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      // Start with modal off-screen, then slide up
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide down when closing
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleSelectSpark = (sparkId: string) => {
    console.log('QuickSwitchModal: Selecting spark ID:', sparkId);
    console.log('QuickSwitchModal: Available recent sparks:', recentSparks);
    
    if (!sparkId) {
      console.error('QuickSwitchModal: Invalid sparkId:', sparkId);
      return;
    }
    
    HapticFeedback.light();
    onSelectSpark(sparkId);
    onClose();
  };

  const handleMySparks = () => {
    HapticFeedback.light();
    onClose();
    if (navigation) {
      // Close the modal and navigate back (same as close X)
      navigation.goBack();
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: height * 0.75, // Increased from 0.6 to 0.75 for more space
      minHeight: height * 0.4, // Added minimum height
      paddingBottom: 20,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    sparkList: {
      paddingHorizontal: 20,
    },
    sparkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.background,
    },
    sparkIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    sparkInfo: {
      flex: 1,
    },
    sparkTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    sparkDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    recentBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    recentBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    mySparksItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mySparksIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    mySparksTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
    },
    mySparksDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    mySparksArrow: {
      fontSize: 18,
      color: colors.primary,
      marginLeft: 'auto',
    },
  });

  const availableSparks = recentSparks
    .map(sparkId => {
      const spark = getSparkById(sparkId);
      return spark;
    })
    .filter(spark => {
      const isValid = spark !== null && spark !== undefined && spark.metadata?.id !== undefined;
      return isValid;
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>⚡️ Quick Switch</Text>
          
          {availableSparks.length > 0 ? (
            <ScrollView style={styles.sparkList} showsVerticalScrollIndicator={false}>
              {availableSparks.map((spark, index) => (
                <TouchableOpacity
                  key={spark.metadata.id}
                  style={styles.sparkItem}
                  onPress={() => handleSelectSpark(spark.metadata.id)}
                >
                  <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                  <View style={styles.sparkInfo}>
                    <Text style={styles.sparkTitle}>{spark.metadata.title}</Text>
                    <Text style={styles.sparkDescription}>
                      {spark.metadata.description}
                    </Text>
                  </View>
                  {index === 0 && (
                    <View style={styles.recentBadge}>
                      <Text style={styles.recentBadgeText}>Recent</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* My Sparks Link */}
              <TouchableOpacity
                style={styles.mySparksItem}
                onPress={handleMySparks}
              >
                <Text style={styles.mySparksIcon}>⚡️</Text>
                <View style={styles.sparkInfo}>
                  <Text style={styles.mySparksTitle}>My Sparks</Text>
                  <Text style={styles.mySparksDescription}>
                    Browse all available sparks
                  </Text>
                </View>
                <Text style={styles.mySparksArrow}>→</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No recent sparks to switch to
              </Text>
              
              {/* My Sparks Link for empty state */}
              <TouchableOpacity
                style={styles.mySparksItem}
                onPress={handleMySparks}
              >
                <Text style={styles.mySparksIcon}>⚡️</Text>
                <View style={styles.sparkInfo}>
                  <Text style={styles.mySparksTitle}>My Sparks</Text>
                  <Text style={styles.mySparksDescription}>
                    Browse all available sparks
                  </Text>
                </View>
                <Text style={styles.mySparksArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};
