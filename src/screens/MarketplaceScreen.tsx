import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MarketplaceStackParamList } from '../types/navigation';
import { getAllSparks } from '../components/SparkRegistry';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationBadge } from '../components/NotificationBadge';

type MarketplaceNavigationProp = StackNavigationProp<MarketplaceStackParamList, 'MarketplaceList'>;

interface Props {
  navigation: MarketplaceNavigationProp;
}


export const MarketplaceScreen: React.FC<Props> = ({ navigation }) => {
  const allSparks = getAllSparks();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(colors, insets), [colors, insets]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const handleSparkPress = (sparkId: string) => {
    navigation.navigate('Spark', { sparkId });
  };

  const handleCategoryPress = (category: string) => {
    // Toggle: if same category is clicked, clear filter; otherwise set new filter
    setSelectedCategory(prev => prev === category ? null : category);
  };

  const handlePropertyPress = (property: string) => {
    // Toggle: if same property is clicked, clear filter; otherwise set new filter
    setSelectedProperty(prev => prev === property ? null : property);
  };

  // Get unique categories from all sparks
  const categories = Array.from(new Set(allSparks.map(spark => spark.metadata.category)));

  // Get unique properties from all sparks
  const allProperties = new Set<string>();
  allSparks.forEach(spark => {
    if (spark.metadata.properties) {
      spark.metadata.properties.forEach(prop => allProperties.add(prop));
    }
  });
  const properties = Array.from(allProperties).sort();

  // Get new sparks (3 most recently created)
  const newSparks = allSparks
    .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
    .slice(0, 3);

  // Get top 3 rated sparks
  const topRatedSparks = allSparks
    .sort((a, b) => b.metadata.rating - a.metadata.rating)
    .slice(0, 3);

  // Get all sparks alphabetically, filtered by category and property if selected
  const allSparksAlphabetical = allSparks
    .filter(spark => {
      const categoryMatch = !selectedCategory || spark.metadata.category === selectedCategory;
      const propertyMatch = !selectedProperty || (spark.metadata.properties && spark.metadata.properties.includes(selectedProperty));
      return categoryMatch && propertyMatch;
    })
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



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Sparks</Text>
        <Text style={styles.subtitle}>Explore new experiences</Text>
      </View>

      <ScrollView>
        {/* Only show New Sparks and Top Rated when no filters are active */}
        {!selectedCategory && !selectedProperty && (
          <>
            {/* New Sparks Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Sparks</Text>
            </View>
            <View style={styles.grid}>
              {newSparks.map((spark) => {
                return (
                  <TouchableOpacity
                    key={spark.metadata.id}
                    style={styles.sparkCard}
                    onPress={() => handleSparkPress(spark.metadata.id)}
                  >
                    <View style={styles.sparkCardContent}>
                      <View style={styles.sparkIconContainer}>
                        {spark.metadata.iconImage ? (
                          <Image source={spark.metadata.iconImage} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                        ) : (
                          <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                        )}
                        <NotificationBadge sparkId={spark.metadata.id} size="small" />
                      </View>
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
                    style={styles.sparkCard}
                    onPress={() => handleSparkPress(spark.metadata.id)}
                  >
                    <View style={styles.sparkCardContentWithRating}>
                      <View style={styles.sparkIconContainer}>
                        {spark.metadata.iconImage ? (
                          <Image source={spark.metadata.iconImage} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                        ) : (
                          <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                        )}
                        <NotificationBadge sparkId={spark.metadata.id} size="small" />
                      </View>
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
          </>
        )}

        {/* Property Filter Pills */}
        {properties.length > 0 && (
          <View style={styles.categoryPillsContainer}>
            {properties.map((property) => (
              <TouchableOpacity
                key={property}
                style={[
                  styles.categoryPill,
                  selectedProperty === property && styles.categoryPillActive
                ]}
                onPress={() => handlePropertyPress(property)}
              >
                <Text style={[
                  styles.categoryPillText,
                  selectedProperty === property && styles.categoryPillTextActive
                ]}>
                  {property}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category Filter Pills */}
        <View style={styles.categoryPillsContainer}>
          {categories.sort().map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive
              ]}
              onPress={() => handleCategoryPress(category)}
            >
              <Text style={[
                styles.categoryPillText,
                selectedCategory === category && styles.categoryPillTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
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
                style={styles.sparkCard}
                onPress={() => handleSparkPress(spark.metadata.id)}
              >
                <View style={styles.sparkCardContent}>
                  {spark.metadata.iconImage ? (
                    <Image source={spark.metadata.iconImage} style={{ width: 32, height: 32, resizeMode: 'contain', marginBottom: 4 }} />
                  ) : (
                    <Text style={styles.sparkIcon}>{spark.metadata.icon}</Text>
                  )}
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

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: Math.max(insets.top, 20), // Use dynamic top inset
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
    position: 'relative',
  },
  sparkCardContentWithRating: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  sparkIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  sparkIcon: {
    fontSize: 32,
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
  categoryPillsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  categoryPillTextActive: {
    color: colors.background,
  },
});