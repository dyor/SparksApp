import React from 'react';
import { Text, Easing, View, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootTabParamList, MySparkStackParamList, MarketplaceStackParamList } from '../types/navigation';
import { SparkSelectionScreen } from '../screens/SparkSelectionScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SparkScreen } from '../screens/SparkScreen';
import { useAppStore } from '../store';
import { QuickSwitchModal } from '../components/QuickSwitchModal';
import { getSparkById } from '../components/SparkRegistry';
import { HapticFeedback } from '../utils/haptics';

const Tab = createBottomTabNavigator<RootTabParamList>();
const MySparksStack = createStackNavigator<MySparkStackParamList>();
const MarketplaceStack = createStackNavigator<MarketplaceStackParamList>();

// Create navigation ref for programmatic navigation (e.g., from notifications)
export const navigationRef = createNavigationContainerRef<RootTabParamList>();

// Use standard React Navigation transitions
const sparkTransition = {
  ...TransitionPresets.SlideFromRightIOS,
};

// Helper function to get focused route name
const getFocusedRouteNameFromRoute = (route: any) => {
  // If state doesn't exist or routes array is empty, return undefined
  const state = route.state;
  if (!state || !state.routes || state.routes.length === 0) {
    return undefined;
  }

  // Return the name of the currently focused route
  const focusedRoute = state.routes[state.index];
  return focusedRoute.name;
};

const MySparksStackNavigator = ({ setTabBarVisible }: { setTabBarVisible?: (visible: boolean) => void }) => {
  const { colors } = useTheme();

  return (
    <MySparksStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <MySparksStack.Screen
        name="MySparksList"
        component={SparkSelectionScreen}
        options={{
          title: 'Home',
          headerShown: false,
        }}
        listeners={{
          focus: () => setTabBarVisible?.(true),
        }}
      />
      <MySparksStack.Screen
        name="Spark"
        component={SparkScreen}
        options={({ route }) => ({
          title: `Spark: ${route.params.sparkId}`,
          headerBackTitle: 'Back',
          headerShown: false,
          ...sparkTransition,
        })}
        listeners={{
          focus: () => setTabBarVisible?.(false),
          blur: () => setTabBarVisible?.(true),
        }}
      />
    </MySparksStack.Navigator>
  );
};

const MarketplaceStackNavigator = ({ setTabBarVisible }: { setTabBarVisible?: (visible: boolean) => void }) => {
  const { colors } = useTheme();

  return (
    <MarketplaceStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <MarketplaceStack.Screen
        name="MarketplaceList"
        component={MarketplaceScreen}
        options={{
          title: 'Marketplace',
          headerShown: false,
        }}
        listeners={{
          focus: () => setTabBarVisible?.(true),
        }}
      />
      <MarketplaceStack.Screen
        name="Spark"
        component={SparkScreen}
        options={({ route }) => ({
          title: `Spark: ${route.params.sparkId}`,
          headerBackTitle: 'Back',
          headerShown: false,
          ...sparkTransition,
        })}
        listeners={{
          focus: () => setTabBarVisible?.(false),
          blur: () => setTabBarVisible?.(true),
        }}
      />
    </MarketplaceStack.Navigator>
  );
};

// Custom Tab Bar with Quick Switch
const CustomTabBar: React.FC<BottomTabBarProps & { tabBarVisible: boolean }> = ({ state, descriptors, navigation, tabBarVisible }) => {
  const { colors } = useTheme();
  const { recentSparks } = useAppStore();
  const [showQuickSwitch, setShowQuickSwitch] = React.useState(false);

  if (!tabBarVisible) {
    return null;
  }

  // Check if we're currently on a Spark screen
  const isOnSparkScreen = () => {
    for (const route of state.routes) {
      const routeState = route.state;
      if (routeState && routeState.routes && routeState.routes.length > 0 && typeof routeState.index === 'number') {
        const focusedRoute = routeState.routes[routeState.index];
        if (focusedRoute && focusedRoute.name === 'Spark') {
          return true;
        }
      }
    }
    return false;
  };

  const onSparkScreen = isOnSparkScreen();
  
  // Check if we're on a Spark screen within a specific tab's stack
  const isOnSparkScreenInTab = (tabName: string) => {
    const tabRoute = state.routes.find(r => r.name === tabName);
    if (!tabRoute) return false;
    const routeState = tabRoute.state;
    if (routeState && routeState.routes && routeState.routes.length > 0 && typeof routeState.index === 'number') {
      const focusedRoute = routeState.routes[routeState.index];
      return focusedRoute && focusedRoute.name === 'Spark';
    }
    return false;
  };
  
  // Get the most recent spark (excluding current if on a spark screen)
  const getMostRecentSpark = () => {
    if (recentSparks.length === 0) return null;
    
    if (onSparkScreen) {
      // Get current spark ID from navigation state
      let currentSparkId: string | null = null;
      for (const route of state.routes) {
        const routeState = route.state;
        if (routeState && routeState.routes && routeState.routes.length > 0 && typeof routeState.index === 'number') {
          const focusedRoute = routeState.routes[routeState.index];
          if (focusedRoute && focusedRoute.name === 'Spark' && focusedRoute.params) {
            currentSparkId = (focusedRoute.params as any).sparkId;
            break;
          }
        }
      }
      
      // Return the most recent spark that's not the current one
      const otherSparks = recentSparks.filter(id => id !== currentSparkId);
      return otherSparks.length > 0 ? otherSparks[0] : null;
    }
    
    return recentSparks[0];
  };

  const mostRecentSpark = getMostRecentSpark();

  const handleQuickSwitch = () => {
    HapticFeedback.light();
    setShowQuickSwitch(true);
  };

  const handleSelectSpark = (sparkId: string) => {
    const targetSpark = getSparkById(sparkId);
    if (targetSpark) {
      // Navigate to the spark
      navigation.navigate('MySparks', {
        screen: 'Spark',
        params: { sparkId },
      });
    }
    setShowQuickSwitch(false);
  };

  const styles = StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 8,
      height: 60,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIcon: {
      fontSize: 20,
      marginBottom: 4,
    },
    tabLabel: {
      fontSize: 12,
    },
    quickSwitchButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickSwitchIcon: {
      fontSize: 20,
      marginBottom: 4,
      color: colors.primary,
    },
    quickSwitchLabel: {
      fontSize: 12,
      color: colors.primary,
    },
  });

  return (
    <>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            // Special handling for Marketplace tab when on a spark screen
            if (route.name === 'Marketplace' && onSparkScreen && mostRecentSpark) {
              // Navigate to the most recent spark instead of Marketplace
              const targetSpark = getSparkById(mostRecentSpark);
              if (targetSpark) {
                navigation.navigate('MySparks', {
                  screen: 'Spark',
                  params: { sparkId: mostRecentSpark },
                });
              }
              return;
            }

            // Special handling for Home tab when on a spark screen - always go to root
            if (route.name === 'MySparks' && isOnSparkScreenInTab('MySparks')) {
              const routeState = state.routes[index]?.state;
              if (routeState && routeState.routes && routeState.routes.length > 0) {
                const rootScreenName = routeState.routes[0].name;
                // Check if we're already at root
                if (typeof routeState.index === 'number' && routeState.index === 0) {
                  // Already at root - do nothing
                  return;
                }
                // Prevent default tab press behavior and navigate to root
                navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                // Use CommonActions to navigate to root, which properly handles stack navigation
                navigation.dispatch(
                  CommonActions.navigate({
                    name: route.name,
                    params: {
                      screen: rootScreenName,
                    },
                  })
                );
                return;
              }
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Not focused - navigate to this tab
              navigation.navigate(route.name as any);
            } else if (isFocused && !event.defaultPrevented) {
              // Tab is already focused - check if we're in a nested stack
              const routeState = state.routes[index]?.state;
              if (routeState && routeState.routes && routeState.routes.length > 0 && typeof routeState.index === 'number') {
                // Check if we're already at the root screen
                if (routeState.index === 0) {
                  // Already at root - do nothing to prevent unnecessary transitions
                  return;
                }
                // We're in a nested stack, navigate to root
                const rootScreenName = routeState.routes[0].name;
                navigation.navigate(route.name as any, {
                  screen: rootScreenName,
                });
              }
              // If no route state or index is undefined, we're already at root - do nothing
            }
          };

          // Determine icon and label for Marketplace tab based on context
          let icon = route.name === 'MySparks' ? '🏠' : route.name === 'Marketplace' ? '🔎' : '⚙️';
          let label = route.name === 'MySparks' ? 'Home' : route.name === 'Marketplace' ? 'Discover' : 'Settings';
          
          if (route.name === 'Marketplace') {
            if (onSparkScreen && mostRecentSpark) {
              icon = '∞';
              label = 'Recent';
            } else {
              icon = '🔎';
              label = 'Discover';
            }
          }

          return (
            <React.Fragment key={route.key}>
              {/* Quick Switch Button - show before Settings tab if there are recent sparks */}
              {route.name === 'Settings' && recentSparks.length >= 1 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={handleQuickSwitch}
                  style={styles.quickSwitchButton}
                >
                  <Text style={styles.quickSwitchIcon}>∞</Text>
                  <Text style={styles.quickSwitchLabel}>Switch</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                // testID={options.tabBarTestID} // tabBarTestID doesn't exist in type
                onPress={onPress}
                style={styles.tab}
              >
                <Text style={[styles.tabIcon, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                  {icon}
                </Text>
                <Text style={[styles.tabLabel, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      <QuickSwitchModal
        visible={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        recentSparks={recentSparks}
        onSelectSpark={handleSelectSpark}
        navigation={navigation}
      />
    </>
  );
};

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [tabBarVisible, setTabBarVisible] = React.useState(true);

  return (
    <NavigationContainer ref={navigationRef}>
      <Tab.Navigator
        initialRouteName="MySparks"
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { display: 'none' }, // Hide default tab bar, we use custom
        }}
        tabBar={(props) => <CustomTabBar {...props} tabBarVisible={tabBarVisible} />}
      >
        <Tab.Screen
          name="MySparks"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>🏠</Text>
            ),
            headerShown: false,
          }}
          listeners={{
            tabPress: () => setTabBarVisible(true),
          }}
        >
          {() => <MySparksStackNavigator setTabBarVisible={setTabBarVisible} />}
        </Tab.Screen>
        <Tab.Screen
          name="Marketplace"
          options={{
            tabBarLabel: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>🔎</Text>
            ),
            headerShown: false,
          }}
          listeners={{
            tabPress: () => setTabBarVisible(true),
          }}
        >
          {() => <MarketplaceStackNavigator setTabBarVisible={setTabBarVisible} />}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>⚙️</Text>
            ),
            headerShown: false,
          }}
          listeners={{
            tabPress: () => setTabBarVisible(true),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};