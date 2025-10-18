import React, { useState } from 'react';
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
  const allSparks = getAllSparks();
  const { colors } = useTheme();

  const handleSparkPress = (sparkId: string) => {
    navigation.navigate('Spark', { sparkId });
  };

  // Get new sparks (3 most recently created)
  const newSparks = allSparks
    .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
    .slice(0, 3);

  // Get top 3 rated sparks
  const topRatedSparks = allSparks
    .sort((a, b) => b.metadata.rating - a.metadata.rating)
    .slice(0, 3);

  // Get all sparks alphabetically
  const allSparksAlphabetical = allSparks
    .sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasPartialStar = rating % 1 !== 0;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Text key={`full-${i}`} style={styles.star}>⭐</Text>
      );
    }
    
    // Partial star
    if (hasPartialStar) {
      const partialPercentage = (rating % 1) * 100;
      stars.push(
        <View key="partial" style={styles.partialStarContainer}>
          <View style={[styles.partialStarBackground, { width: `${100 - partialPercentage}%` }]}>
            <Text style={styles.starGray}>⭐</Text>
          </View>
          <View style={styles.partialStarForeground}>
            <Text style={styles.star}>⭐</Text>
          </View>
        </View>
      );
    }
    
    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Text key={`empty-${i}`} style={styles.starGray}>⭐</Text>
      );
    }
    
    return stars;
  };

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
      padding: 12,
    },
    sparkCardContentWithRating: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
    },
    sparkIcon: {
      fontSize: 32,
      marginBottom: 4,
    },
    sparkTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    categoryTabs: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryTab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    activeCategoryTab: {
      backgroundColor: colors.primary,
    },
    categoryTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeCategoryTabText: {
      color: colors.background,
    },
    sectionHeader: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    ratingText: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 0,
    },
    starsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 4,
      marginTop: 0,
    },
    star: {
      fontSize: 6,
      marginHorizontal: .5,
    },
    starGray: {
      fontSize: 10,
      marginHorizontal: 0.5,
      opacity: 0.3,
    },
    ratingNumber: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    partialStarContainer: {
      position: 'relative',
      marginHorizontal: 0.5,
    },
    partialStarBackground: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    partialStarForeground: {
      position: 'relative',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Sparks</Text>
        <Text style={styles.subtitle}>Explore new experiences</Text>
      </View>
      
      <ScrollView>
        {/* New Sparks Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Sparks</Text>
        </View>
        <View style={styles.grid}>
          {newSparks.map((spark) => {
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

        {/* Top Rated Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated</Text>
        </View>
        <View style={styles.grid}>
          {topRatedSparks.map((spark) => {
            return (
              <TouchableOpacity
                key={spark.metadata.id}
                style={[
                  styles.sparkCard,
                  { opacity: spark.metadata.available ? 1 : 0.6 }
                ]}
                onPress={() => handleSparkPress(spark.metadata.id)}
              >
                <View style={styles.sparkCardContentWithRating}>
                  <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                  <Text style={styles.sparkTitle} numberOfLines={2}>{spark.metadata.title}</Text>
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsContainer}>
                      {renderStars(spark.metadata.rating)}
                    </View>
                    <Text style={styles.ratingNumber}>{spark.metadata.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* All Sparks Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Sparks</Text>
        </View>
        <View style={styles.grid}>
          {allSparksAlphabetical.map((spark) => {
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