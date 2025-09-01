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

const MySparksStackNavigator = () => {
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
      />
      <MySparksStack.Screen
        name="Spark"
        component={SparkScreen}
        options={({ route }) => ({
          title: `Spark: ${route.params.sparkId}`,
          headerBackTitle: 'Back',
          ...sparkTransition,
        })}
      />
    </MySparksStack.Navigator>
  );
};

const MarketplaceStackNavigator = () => {
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
      />
      <MarketplaceStack.Screen
        name="Spark"
        component={SparkScreen}
        options={({ route }) => ({
          title: `Spark: ${route.params.sparkId}`,
          headerBackTitle: 'Back',
          ...sparkTransition,
        })}
      />
    </MarketplaceStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="MySparks"
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tab.Screen
          name="MySparks"
          component={MySparksStackNavigator}
          options={{
            tabBarLabel: 'My Sparks',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>★</Text>
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Marketplace"
          component={MarketplaceStackNavigator}
          options={{
            tabBarLabel: 'Marketplace',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: 'bold' }}>◆</Text>
            ),
            headerShown: false,
          }}
        />
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
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};