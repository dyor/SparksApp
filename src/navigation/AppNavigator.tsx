import React from 'react';
import { Text, Easing } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootTabParamList, MySparkStackParamList, MarketplaceStackParamList } from '../types/navigation';
import { SparkSelectionScreen } from '../screens/SparkSelectionScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SparkScreen } from '../screens/SparkScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const MySparksStack = createStackNavigator<MySparkStackParamList>();
const MarketplaceStack = createStackNavigator<MarketplaceStackParamList>();

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

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [tabBarVisible, setTabBarVisible] = React.useState(true);
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="MySparks"
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: tabBarVisible ? {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          } : { display: 'none' },
        }}
      >
        <Tab.Screen
          name="MySparks"
          options={{
            tabBarLabel: 'My Sparks',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>★</Text>
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
            tabBarLabel: 'Marketplace',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>◆</Text>
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