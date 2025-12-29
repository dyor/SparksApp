import React from "react";
import { Text, Easing, View, TouchableOpacity, StyleSheet } from "react-native";
import {
  NavigationContainer,
  useNavigation,
  createNavigationContainerRef,
  CommonActions,
} from "@react-navigation/native";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
import { useTheme } from "../contexts/ThemeContext";
import {
  RootTabParamList,
  MySparkStackParamList,
  MarketplaceStackParamList,
} from "../types/navigation";
import { SparkSelectionScreen } from "../screens/SparkSelectionScreen";
import { MarketplaceScreen } from "../screens/MarketplaceScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SparkScreen } from "../screens/SparkScreen";
import { useAppStore } from "../store";
import { QuickSwitchModal } from "../components/QuickSwitchModal";
import { getSparkById } from "../components/SparkRegistry";
import { HapticFeedback } from "../utils/haptics";

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

const MySparksStackNavigator = ({
  setTabBarVisible,
}: {
  setTabBarVisible?: (visible: boolean) => void;
}) => {
  const { colors } = useTheme();

  return (
    <MySparksStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <MySparksStack.Screen
        name="MySparksList"
        component={SparkSelectionScreen}
        options={{
          title: "Home",
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
          headerBackTitle: "Back",
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

const MarketplaceStackNavigator = ({
  setTabBarVisible,
}: {
  setTabBarVisible?: (visible: boolean) => void;
}) => {
  const { colors } = useTheme();

  return (
    <MarketplaceStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <MarketplaceStack.Screen
        name="MarketplaceList"
        component={MarketplaceScreen}
        options={{
          title: "Marketplace",
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
          headerBackTitle: "Back",
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
const CustomTabBar: React.FC<
  BottomTabBarProps & { tabBarVisible: boolean }
> = ({ state, descriptors, navigation, tabBarVisible }) => {
  const { colors } = useTheme();
  const { recentSparks } = useAppStore();
  const [showQuickSwitch, setShowQuickSwitch] = React.useState(false);
  const isNavigatingRef = React.useRef(false);

  // Log navigation state changes
  React.useEffect(() => {
    const mySparksRoute = state.routes.find((r) => r.name === "MySparks");
    if (mySparksRoute) {
      const routeState = mySparksRoute.state;
      if (
        routeState &&
        routeState.routes &&
        routeState.routes.length > 0 &&
        typeof routeState.index === "number"
      ) {
        console.log("📊 Navigation State Changed - MySparks Stack:", {
          index: routeState.index,
          routes: routeState.routes
            .map(
              (r, i) =>
                `${i}:${r.name}${i === routeState.index ? " (current)" : ""}`
            )
            .join(", "),
          currentRoute: routeState.routes[routeState.index]?.name,
        });
      }
    }
  }, [state]);

  if (!tabBarVisible) {
    return null;
  }

  // Check if we're currently on a Spark screen
  const isOnSparkScreen = () => {
    for (const route of state.routes) {
      const routeState = route.state;
      if (
        routeState &&
        routeState.routes &&
        routeState.routes.length > 0 &&
        typeof routeState.index === "number"
      ) {
        const focusedRoute = routeState.routes[routeState.index];
        if (focusedRoute && focusedRoute.name === "Spark") {
          return true;
        }
      }
    }
    return false;
  };

  const onSparkScreen = isOnSparkScreen();

  // Check if we're on a Spark screen within a specific tab's stack
  const isOnSparkScreenInTab = (tabName: string) => {
    const tabRoute = state.routes.find((r) => r.name === tabName);
    if (!tabRoute) return false;
    const routeState = tabRoute.state;
    if (
      routeState &&
      routeState.routes &&
      routeState.routes.length > 0 &&
      typeof routeState.index === "number"
    ) {
      const focusedRoute = routeState.routes[routeState.index];
      return focusedRoute && focusedRoute.name === "Spark";
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
        if (
          routeState &&
          routeState.routes &&
          routeState.routes.length > 0 &&
          typeof routeState.index === "number"
        ) {
          const focusedRoute = routeState.routes[routeState.index];
          if (
            focusedRoute &&
            focusedRoute.name === "Spark" &&
            focusedRoute.params
          ) {
            currentSparkId = (focusedRoute.params as any).sparkId;
            break;
          }
        }
      }

      // Return the most recent spark that's not the current one
      const otherSparks = recentSparks.filter((id) => id !== currentSparkId);
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
      navigation.navigate("MySparks", {
        screen: "Spark",
        params: { sparkId },
      });
    }
    setShowQuickSwitch(false);
  };

  const styles = StyleSheet.create({
    tabBar: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 8,
      height: 60,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
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
      alignItems: "center",
      justifyContent: "center",
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
            // MARKETPLACE TAB - Always reset to MarketplaceList
            if (route.name === "Marketplace") {
              const routeState = state.routes[index]?.state;
              console.log("🔎 Discover Tab Click - Route State:", {
                routeName: route.name,
                routeIndex: index,
                hasRouteState: !!routeState,
                routeStateIndex: routeState?.index,
                routesCount: routeState?.routes?.length,
                routeNames: routeState?.routes?.map((r) => r.name),
              });

              // Always navigate to MarketplaceList root, regardless of current state
              // This ensures Discover always goes to Marketplace, not to a previous Spark
              console.log(
                "🔎 Discover Tab - Navigating to MarketplaceList root"
              );
              navigation.navigate(route.name, {
                screen: "MarketplaceList",
              });
              return;
            }

            // MYSPARKS TAB - Complex logic to handle stack navigation
            if (route.name === "MySparks") {
              const routeState = state.routes[index]?.state;
              console.log("🏠 Home Tab Click - Route State:", {
                routeName: route.name,
                routeIndex: index,
                hasRouteState: !!routeState,
                routeStateIndex: routeState?.index,
                routeStateType: typeof routeState?.index,
                routesCount: routeState?.routes?.length,
                routeNames: routeState?.routes?.map((r) => r.name),
                isOnSparkScreen: isOnSparkScreenInTab("MySparks"),
                isNavigating: isNavigatingRef.current,
              });

              if (
                routeState &&
                routeState.routes &&
                routeState.routes.length > 0 &&
                typeof routeState.index === "number"
              ) {
                console.log(
                  "🏠 Home Tab - Current Index:",
                  routeState.index,
                  "| Routes:",
                  routeState.routes.map((r, i) => `${i}:${r.name}`).join(", ")
                );

                // Get root screen name first
                const rootScreenName = routeState.routes[0].name;

                // If already at root, do nothing
                if (routeState.index === 0) {
                  console.log(
                    "🏠 Home Tab - Already at root (index=0), returning early"
                  );
                  return;
                }

                // Check if root route exists at index 0 (we need to pop to it)
                const rootRouteExists = routeState.routes.some(
                  (r) => r.name === rootScreenName
                );
                const rootRouteIndex = routeState.routes.findIndex(
                  (r) => r.name === rootScreenName
                );
                const currentIndex = routeState.index;

                // If root exists at index 0 and we're not at it, pop to it
                // This handles both: being on Spark (index 1) and being on duplicate MySparksList (index 2)
                if (
                  rootRouteExists &&
                  rootRouteIndex === 0 &&
                  currentIndex > 0
                ) {
                  console.log(
                    "🏠 Home Tab - Root exists at index 0, current index:",
                    currentIndex,
                    "| Popping to root"
                  );

                  // Prevent double navigation
                  if (isNavigatingRef.current) {
                    console.log(
                      "🏠 Home Tab - Navigation already in progress, returning early"
                    );
                    return;
                  }
                  isNavigatingRef.current = true;

                  // Prevent default tab press behavior
                  navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  // Navigate to root screen - this will reset the stack
                  // Don't use goBack() here because we're in the tab navigator, not the stack navigator
                  console.log(
                    "🏠 Home Tab - Navigating to root screen:",
                    rootScreenName
                  );
                  navigation.navigate(route.name, {
                    screen: rootScreenName,
                  });

                  // Reset navigation flag
                  setTimeout(() => {
                    console.log("🏠 Home Tab - Resetting navigation flag");
                    isNavigatingRef.current = false;
                  }, 300);
                  return;
                }

                // If on a spark screen (but root doesn't exist at index 0), navigate to root
                if (isOnSparkScreenInTab("MySparks")) {
                  console.log(
                    "🏠 Home Tab - On Spark screen, navigating to root"
                  );

                  // Prevent double navigation
                  if (isNavigatingRef.current) {
                    console.log(
                      "🏠 Home Tab - Navigation already in progress, returning early"
                    );
                    return;
                  }
                  isNavigatingRef.current = true;

                  const rootScreenName = routeState.routes[0].name;
                  console.log(
                    "🏠 Home Tab - Root screen name:",
                    rootScreenName
                  );

                  // Prevent default tab press behavior
                  navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  // Check if root route already exists in the stack
                  // If it does, we need to pop to it instead of navigating (which pushes)
                  const rootRouteExists = routeState.routes.some(
                    (r) => r.name === rootScreenName
                  );
                  const rootRouteIndex = routeState.routes.findIndex(
                    (r) => r.name === rootScreenName
                  );
                  const currentIndex = routeState.index;
                  console.log(
                    "🏠 Home Tab - Root route exists:",
                    rootRouteExists,
                    "at index:",
                    rootRouteIndex,
                    "| Current index:",
                    currentIndex
                  );

                  if (
                    rootRouteExists &&
                    rootRouteIndex === 0 &&
                    currentIndex > 0
                  ) {
                    // Root exists at index 0 and we're not at it - pop back to it
                    // Use goBack() the correct number of times, but batch it
                    const screensToPop = currentIndex;
                    console.log(
                      "🏠 Home Tab - Popping",
                      screensToPop,
                      "screens to reach root at index 0"
                    );

                    // Navigate to root screen - this will reset the stack
                    // Don't use goBack() here because we're in the tab navigator, not the stack navigator
                    console.log(
                      "🏠 Home Tab - Navigating to root screen:",
                      rootScreenName
                    );
                    navigation.navigate(route.name, {
                      screen: rootScreenName,
                    });
                  } else {
                    // Root doesn't exist or we're already there - navigate normally
                    console.log(
                      "🏠 Home Tab - Navigating to root (will push if route exists)"
                    );
                    navigation.navigate(route.name, {
                      screen: rootScreenName,
                    });
                  }

                  // Reset navigation flag after navigation completes
                  setTimeout(() => {
                    console.log("🏠 Home Tab - Resetting navigation flag");
                    isNavigatingRef.current = false;
                  }, 300);
                  return;
                }
              } else {
                console.log("🏠 Home Tab - No route state or invalid state");
              }
            }

            // DEFAULT TAB BEHAVIOR (Settings, etc.)
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Not focused - navigate to this tab
              console.log("Tab - Not focused, navigating to tab:", route.name);
              navigation.navigate(route.name as any);
            } else if (isFocused && !event.defaultPrevented) {
              // Tab is already focused - check if we're in a nested stack
              const routeState = state.routes[index]?.state;
              console.log("Tab - Focused, checking nested stack:", {
                routeName: route.name,
                routeStateIndex: routeState?.index,
                routesCount: routeState?.routes?.length,
                routeNames: routeState?.routes?.map((r) => r.name),
              });

              if (
                routeState &&
                routeState.routes &&
                routeState.routes.length > 0 &&
                typeof routeState.index === "number"
              ) {
                // Check if we're already at the root screen
                if (routeState.index === 0) {
                  // Already at root - do nothing to prevent unnecessary transitions
                  console.log(
                    "Tab - Focused and at root (index=0), returning early"
                  );
                  return;
                }
                // We're in a nested stack, navigate to root
                const rootScreenName = routeState.routes[0].name;
                console.log(
                  "Tab - Focused but not at root, navigating to:",
                  rootScreenName,
                  "Current index:",
                  routeState.index
                );
                navigation.navigate(route.name as any, {
                  screen: rootScreenName,
                });
              } else {
                console.log(
                  "Tab - Focused but no route state or invalid index"
                );
              }
              // If no route state or index is undefined, we're already at root - do nothing
            }
          };

          // Determine icon and label - keep them static, no dynamic changing
          let icon =
            route.name === "MySparks"
              ? "🏠"
              : route.name === "Marketplace"
              ? "🔎"
              : "⚙️";
          let label =
            route.name === "MySparks"
              ? "Home"
              : route.name === "Marketplace"
              ? "Discover"
              : "Settings";

          return (
            <React.Fragment key={route.key}>
              {/* Quick Switch Button - show before Settings tab if there are recent sparks */}
              {route.name === "Settings" && recentSparks.length >= 1 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={handleQuickSwitch}
                  style={styles.quickSwitchButton}
                >
                  <Text style={styles.quickSwitchIcon}>∞</Text>
                  <Text style={styles.quickSwitchLabel}>Switch</Text>
                </TouchableOpacity>
              )}

              {route.name === "MySparks" && isFocused ? (
                <>
                  {/* Home tab - non-interactive when already on Home screen */}
                  <View style={styles.tab}>
                    <Text
                      style={[
                        styles.tabIcon,
                        {
                          color: isFocused
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {icon}
                    </Text>
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isFocused
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Home tab when NOT focused, or other tabs - interactive */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    // testID={options.tabBarTestID} // tabBarTestID doesn't exist in type
                    onPress={onPress}
                    style={styles.tab}
                  >
                    <Text
                      style={[
                        styles.tabIcon,
                        {
                          color: isFocused
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {icon}
                    </Text>
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isFocused
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
          tabBarStyle: { display: "none" }, // Hide default tab bar, we use custom
        }}
        tabBar={(props) => (
          <CustomTabBar {...props} tabBarVisible={tabBarVisible} />
        )}
      >
        <Tab.Screen
          name="MySparks"
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: "bold" }}>
                🏠
              </Text>
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
            tabBarLabel: "Discover",
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: "bold" }}>
                🔎
              </Text>
            ),
            headerShown: false,
          }}
          listeners={{
            tabPress: () => setTabBarVisible(true),
          }}
        >
          {() => (
            <MarketplaceStackNavigator setTabBarVisible={setTabBarVisible} />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size - 2, color, fontWeight: "bold" }}>
                ⚙️
              </Text>
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
