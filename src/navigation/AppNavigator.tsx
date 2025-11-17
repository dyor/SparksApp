import React from 'react';
import { Text, Easing, View, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation, createNavigationContainerRef } from '@react-navigation/native';
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
          title: 'My Sparks',
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
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as any);
            }
          };

          const icon = route.name === 'MySparks' ? '⚡️' : route.name === 'Marketplace' ? '🔎' : '⚙️';
          const label = route.name === 'MySparks' ? 'My Sparks' : route.name === 'Marketplace' ? 'Discover' : 'Settings';

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
                testID={options.tabBarTestID}
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
            tabBarLabel: 'My Sparks',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>⚡️</Text>
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