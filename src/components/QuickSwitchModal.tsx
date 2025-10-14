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
}

const { height } = Dimensions.get('window');

export const QuickSwitchModal: React.FC<QuickSwitchModalProps> = ({
  visible,
  onClose,
  recentSparks,
  onSelectSpark,
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
    HapticFeedback.light();
    onSelectSpark(sparkId);
    onClose();
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
      maxHeight: height * 0.6,
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
  });

  const availableSparks = recentSparks
    .map(sparkId => {
      console.log('QuickSwitchModal: Mapping sparkId:', sparkId);
      const spark = getSparkById(sparkId);
      console.log('QuickSwitchModal: Found spark:', spark);
      return spark;
    })
    .filter(spark => spark !== null);

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
                  key={spark.id}
                  style={styles.sparkItem}
                  onPress={() => handleSelectSpark(spark.id)}
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
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No recent sparks to switch to
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};
