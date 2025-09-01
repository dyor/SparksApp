import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MySparkStackParamList } from '../types/navigation';
import { getAllSparks, getSparkById } from '../components/SparkRegistry';
import { useSparkStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';

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
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
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
      justifyContent: 'space-between',
    },
    sparkCard: {
      width: '48%',
      aspectRatio: 1.3,
      marginBottom: 16,
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
      padding: 24,
    },
    sparkIcon: {
      fontSize: 48,
      marginBottom: 8,
    },
    sparkTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sparks</Text>
        <Text style={styles.subtitle}>{userSparks.length} spark{userSparks.length !== 1 ? 's' : ''} in your collection</Text>
      </View>
      <ScrollView>
        <View style={styles.grid}>
          {userSparks.map((spark) => {
            if (!spark) return null;
            
            return (
              <TouchableOpacity
                key={spark.metadata.id}
                style={[
                  styles.sparkCard,
                  { opacity: spark.metadata.available ? 1 : 0.6 }
                ]}
                onPress={() => {
                  if (spark.metadata.available) {
                    navigation.navigate('Spark', { sparkId: spark.metadata.id });
                  }
                }}
              >
                <View style={styles.sparkCardContent}>
                  <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                  <Text style={styles.sparkTitle}>{spark.metadata.title}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};