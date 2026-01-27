import React, { useEffect, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MySparkStackParamList,
  MarketplaceStackParamList,
} from "../types/navigation";
import { getSparkById } from "../components/SparkRegistry";
import { useSparkStore, useAppStore } from "../store";
import { HapticFeedback } from "../utils/haptics";
import { useTheme } from "../contexts/ThemeContext";
import { QuickSwitchModal } from "../components/QuickSwitchModal";
import { NotificationBadge } from "../components/NotificationBadge";

type SparkScreenNavigationProp =
  | StackNavigationProp<MySparkStackParamList, "Spark">
  | StackNavigationProp<MarketplaceStackParamList, "Spark">;
type SparkScreenRouteProp =
  | RouteProp<MySparkStackParamList, "Spark">
  | RouteProp<MarketplaceStackParamList, "Spark">;

interface Props {
  navigation: SparkScreenNavigationProp;
  route: SparkScreenRouteProp;
}

export const SparkScreen: React.FC<Props> = ({ navigation, route }) => {
  // Destructure sparkId and any other params (like autoRecord)
  const { sparkId, ...otherParams } = route.params;

  // Debug: log sparkId and SparkComponent at render
  // This will help confirm which spark is being rendered
  const spark = getSparkById(sparkId);
  console.log(
    "[SparkScreen] Render: sparkId =",
    sparkId,
    "SparkComponent =",
    spark?.component?.name || spark?.component
  );

  const updateSparkProgress = useSparkStore(state => state.updateSparkProgress);
  const isUserSpark = useSparkStore(state => state.isUserSpark);
  const addSparkToUser = useSparkStore(state => state.addSparkToUser);

  const setCurrentSparkId = useAppStore(state => state.setCurrentSparkId);
  const recentSparks = useAppStore(state => state.recentSparks);
  const addRecentSpark = useAppStore(state => state.addRecentSpark);

  const { colors } = useTheme();

  const showSparkSettings = (route.params as any)?.showSettings || false;
  const [settingsFocus, setSettingsFocus] = useState<string | undefined>(
    undefined
  );
  const [openCourseSelectionSignal, setOpenCourseSelectionSignal] = useState(0);
  const [sparkDarkMode, setSparkDarkMode] = useState(false);
  const insets = useSafeAreaInsets();

  const handleStateChange = React.useCallback((state: any) => {
    // Handle spark state changes
    console.log("Spark state changed:", state);

    // Handle openSettings signal
    if (state.openSettings) {
      navigation.setParams({ showSettings: true } as any);
      return;
    }

    // Handle dark mode for final-clock spark
    if (sparkId === "final-clock" && state.darkMode !== undefined) {
      setSparkDarkMode((prev) => {
        if (prev !== state.darkMode) {
          return state.darkMode;
        }
        return prev;
      });
    }
  }, [sparkId, navigation]);

  // Reset dark mode when leaving the spark
  useEffect(() => {
    return () => {
      if (sparkId === "final-clock") {
        setSparkDarkMode(false);
      }
    };
  }, [sparkId]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    errorText: {
      fontSize: 18,
      color: colors.error,
      textAlign: "center",
      marginBottom: 16,
    },
    errorDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    buttonsContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: Math.max(insets.bottom, 8),
      backgroundColor: sparkDarkMode ? "#000000" : colors.surface,
      borderTopWidth: 1,
      borderTopColor: sparkDarkMode ? "#333333" : colors.border,
      justifyContent: "space-around",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    actionButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 0,
      paddingHorizontal: 8,
      borderRadius: 8,
      justifyContent: "center",
    },
    buttonIcon: {
      fontSize: 24,
      marginBottom: 2,
      lineHeight: 28,
    },
    buttonLabel: {
      fontSize: 11,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 14,
    },
    // Button colors
    closeIcon: {
      color: sparkDarkMode ? "#666666" : colors.textSecondary,
    },
    closeLabel: {
      color: sparkDarkMode ? "#666666" : colors.textSecondary,
    },
    addIcon: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
    addLabel: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
    quickSwitchIcon: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
    quickSwitchLabel: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
    recentSparkIcon: {
      color: sparkDarkMode ? "#666666" : colors.textSecondary,
    },
    recentSparkLabel: {
      color: sparkDarkMode ? "#666666" : colors.textSecondary,
    },
    settingsIcon: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
    settingsLabel: {
      color: sparkDarkMode ? "#666666" : colors.primary,
    },
  });

  // Basic Error Boundary to catch render errors from Sparks
  class SparkErrorBoundary extends React.Component<
    any,
    { hasError: boolean; error?: any }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: undefined };
    }

    static getDerivedStateFromError(error: any) {
      return { hasError: true, error };
    }

    componentDidCatch(error: any, info: any) {
      console.error("SparkErrorBoundary caught error:", error, info);
    }

    render() {
      if (this.state.hasError) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              An error occurred while rendering this Spark.
            </Text>
            <Text style={styles.errorDetail}>{String(this.state.error)}</Text>
          </View>
        );
      }
      return this.props.children;
    }
  }

  // Detect if we're in the marketplace or my sparks
  const isFromMarketplace =
    navigation.getState()?.routes[0]?.name === "MarketplaceList";
  const isInUserCollection = useSparkStore((state) =>
    state.userSparkIds.includes(sparkId)
  );

  useEffect(() => {
    setCurrentSparkId(sparkId);
    // Reset dark mode when spark changes
    setSparkDarkMode(false);

    if (spark) {
      // Update play count when spark is accessed
      updateSparkProgress(sparkId, {});
      // Add to recent sparks for quick switching
      addRecentSpark(sparkId);

      // Track analytics
      import("../services/ServiceFactory").then(({ ServiceFactory }) => {
        ServiceFactory.ensureAnalyticsInitialized().then(() => {
          const AnalyticsService = ServiceFactory.getAnalyticsService();
          if (AnalyticsService.trackSparkOpen) {
            AnalyticsService.trackSparkOpen(sparkId, spark.metadata.title);
          }
        });
      });
    }

    return () => {
      setCurrentSparkId(null);
      // Reset dark mode when leaving spark
      setSparkDarkMode(false);
      // Global safety: stop any ongoing speech when navigating between sparks
      import("expo-speech").then((Speech) => {
        Speech.stop();
      });
    };
  }, [sparkId, spark, setCurrentSparkId, updateSparkProgress, addRecentSpark]);

  const handleClose = () => {
    HapticFeedback.light();
    (navigation as any).navigate("MySparks", {
      screen: "MySparksList",
    });
  };

  const handleAdd = () => {
    HapticFeedback.success();
    addSparkToUser(sparkId);
  };

  const handleSettings = () => {
    HapticFeedback.light();
    navigation.setParams({ showSettings: true } as any);
  };

  if (!spark) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Spark Not Found</Text>
          <Text style={styles.errorDetail}>
            The spark "{sparkId}" could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // At this point we know `spark` is defined
  const SparkComponent = spark.component as React.ComponentType<any>;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <SparkErrorBoundary>
          <SparkComponent
            {...({
              ...otherParams, // Pass forwarded params (e.g., autoRecord from SpeakSpark quick launch)
              showSettings: showSparkSettings,
              settingsInitialTab: settingsFocus,
              openCourseSelectionSignal: openCourseSelectionSignal,
              onCloseSettings: () => {
                navigation.setParams({ showSettings: false } as any);
                setSettingsFocus(undefined);
              },
              onStateChange: handleStateChange,
              onComplete: (result: any) => {
                // Handle spark completion
                console.log("Spark completed:", result);
                updateSparkProgress(sparkId, {
                  completionPercentage: 100,
                  customData: result,
                });
              },
            } as any)}
          />
        </SparkErrorBoundary>
      </View>
    </SafeAreaView>
  );
};
