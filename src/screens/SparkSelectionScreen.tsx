import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MySparkStackParamList } from '../types/navigation';
import { getAllSparks, getSparkById } from '../components/SparkRegistry';
import { useSparkStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { NotificationBadge } from '../components/NotificationBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SparkSelectionNavigationProp = StackNavigationProp<MySparkStackParamList, 'MySparksList'>;

interface Props {
  navigation: SparkSelectionNavigationProp;
}




export const SparkSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { getUserSparks } = useSparkStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(colors, insets), [colors, insets]);
  const userSparkIds = getUserSparks();

  // Filter to only show user's sparks
  const userSparks = userSparkIds.map(sparkId => getSparkById(sparkId)).filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>My Sparks</Text>
          {userSparkIds.includes('speak-spark') && (
            <TouchableOpacity
              onPress={() => {
                HapticFeedback.light();
                (navigation as any).navigate('Spark', { sparkId: 'speak-spark', autoRecord: true });
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 24 }}>🎙️</Text>
            </TouchableOpacity>
          )}
        </View>
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
            onPress={() => (navigation as any).navigate('Marketplace')}
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
                  style={styles.sparkCard}
                  onPress={() => {
                    navigation.navigate('Spark', { sparkId: spark.metadata.id });
                  }}
                >
                  <View style={styles.sparkCardContent}>
                    <View style={styles.sparkIconContainer}>
                      {spark.metadata.iconImage ? (
                        <Image source={spark.metadata.iconImage} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
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
        </ScrollView>
      )}
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
    position: 'relative',
  },
  sparkIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  sparkIcon: {
    fontSize: 36,
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