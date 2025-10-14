import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MarketplaceStackParamList } from '../types/navigation';
import { getAllSparks } from '../components/SparkRegistry';
import { useTheme } from '../contexts/ThemeContext';

type MarketplaceNavigationProp = StackNavigationProp<MarketplaceStackParamList, 'MarketplaceList'>;

interface Props {
  navigation: MarketplaceNavigationProp;
}


export const MarketplaceScreen: React.FC<Props> = ({ navigation }) => {
  const sparks = getAllSparks();
  const { colors } = useTheme();

  const handleSparkPress = (sparkId: string) => {
    navigation.navigate('Spark', { sparkId });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 44, // Additional spacing for iOS Dynamic Island
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
      justifyContent: 'space-between',
    },
    sparkCard: {
      width: '31%',
      aspectRatio: 1.1,
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Sparks</Text>
        <Text style={styles.subtitle}>Explore new experiences</Text>
      </View>
      <ScrollView>
        <View style={styles.grid}>
          {sparks.map((spark) => {
            return (
              <TouchableOpacity
                key={spark.metadata.id}
                style={[
                  styles.sparkCard,
                  { opacity: spark.metadata.available ? 1 : 0.6 }
                ]}
                onPress={() => handleSparkPress(spark.metadata.id)}
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
    </View>
  );
};