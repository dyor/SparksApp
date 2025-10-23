import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MySparkStackParamList } from '../types/navigation';
import { getAllSparks, getSparkById } from '../components/SparkRegistry';
import { useSparkStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';

type SparkSelectionNavigationProp = StackNavigationProp<MySparkStackParamList, 'MySparksList'>;

interface Props {
  navigation: SparkSelectionNavigationProp;
}



export const SparkSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { getUserSparks } = useSparkStore();
  const { colors } = useTheme();
  const userSparkIds = getUserSparks();
  
  // Filter to only show user's sparks
  const userSparks = userSparkIds.map(sparkId => getSparkById(sparkId)).filter(Boolean);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 60, // Additional spacing for iOS Dynamic Island
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    grid: {
      flex: 1,
      padding: 24,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    sparkCard: {
      width: '31%',
      aspectRatio: 1.1,
      marginBottom: 16,
      marginHorizontal: '1%',
      backgroundColor: colors.surface,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sparkCardContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    sparkIcon: {
      fontSize: 36,
      marginBottom: 6,
    },
    sparkTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    discoverButton: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
    },
    discoverButtonText: {
      fontSize: 18,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sparks</Text>
        <Text style={styles.subtitle}>
          {userSparks.length === 0 
            ? 'No sparks yet - discover some in the marketplace!' 
            : `${userSparks.length} spark${userSparks.length !== 1 ? 's' : ''} in your collection`
          }
        </Text>
      </View>
      
      {userSparks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>Your collection is empty</Text>
          <Text style={styles.emptySubtitle}>
            Discover amazing sparks in the marketplace and add them to your collection
          </Text>
          <TouchableOpacity
            style={[styles.discoverButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={[styles.discoverButtonText, { color: colors.background }]}>
              Discover Sparks
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          <View style={styles.grid}>
            {userSparks.map((spark, index) => {
              if (!spark) return null;
              
              return (
                <TouchableOpacity
                  key={spark.metadata.id}
                  style={[
                    styles.sparkCard,
                    { 
                      opacity: spark.metadata.available ? 1 : 0.6,
                    }
                  ]}
                  onPress={() => {
                    if (spark.metadata.available) {
                      navigation.navigate('Spark', { sparkId: spark.metadata.id });
                    }
                  }}
                >
                  <View style={styles.sparkCardContent}>
                    <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                    <Text style={styles.sparkTitle} numberOfLines={2}>{spark.metadata.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};