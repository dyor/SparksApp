import React, { useEffect, useState } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const SparkComponent = spark?.component;
  console.log(
    "[SparkScreen] Render: sparkId =",
    sparkId,
    "SparkComponent =",
    SparkComponent?.name || SparkComponent
  );

  const { updateSparkProgress, isUserSpark, addSparkToUser } = useSparkStore();
  const { setCurrentSparkId, recentSparks, addRecentSpark } = useAppStore();
  const { colors } = useTheme();

  const [showSparkSettings, setShowSparkSettings] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string | undefined>(
    undefined
  );
  const [openCourseSelectionSignal, setOpenCourseSelectionSignal] = useState(0);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [sparkDarkMode, setSparkDarkMode] = useState(false);

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
      backgroundColor: sparkDarkMode ? "#000000" : colors.surface,
      borderTopWidth: 1,
      borderTopColor: sparkDarkMode ? "#333333" : colors.border,
      justifyContent: "space-around",
      alignItems: "center",
      height: 60,
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

  // Detect if we're in the marketplace or my sparks
  const isFromMarketplace =
    navigation.getState()?.routes[0]?.name === "MarketplaceList";
  const isInUserCollection = isUserSpark(sparkId);

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
    };
  }, [sparkId, spark, setCurrentSparkId, updateSparkProgress, addRecentSpark]);

  const handleClose = () => {
    HapticFeedback.light();
    // Reset dark mode when navigating away
    setSparkDarkMode(false);
    // Always navigate to the Home screen (MySparks list)
    // This ensures we don't go back to Marketplace/Discover if we came from there
    (navigation as any).navigate("MySparks", {
      screen: "MySparksList",
    });
  };

  const handleAdd = () => {
    // If this is Golf Brain, open the Course Selection screen to start a new round
    if (sparkId === "golf-brain") {
      console.log(
        "SparkScreen: + pressed - open Course Selection for new round"
      );
      HapticFeedback.light();
      setOpenCourseSelectionSignal((s) => s + 1);
      return;
    }

    HapticFeedback.success();
    addSparkToUser(sparkId);
  };

  const handleSettings = () => {
    console.log("SparkScreen: handleSettings invoked for", sparkId);
    HapticFeedback.light();
    // If this is Golf Brain, open settings focused on Courses (add/revise)
    if (sparkId === "golf-brain") {
      setSettingsFocus("courses");
    }
    setShowSparkSettings(true);
  };

  const handleQuickSwitch = () => {
    console.log("QuickSwitch: Opening modal");
    console.log("QuickSwitch: Current sparkId:", sparkId);
    console.log("QuickSwitch: All recent sparks:", recentSparks);
    console.log(
      "QuickSwitch: Filtered recent sparks:",
      recentSparks.filter((id) => id !== sparkId)
    );
    HapticFeedback.light();
    setShowQuickSwitch(true);
  };

  const handleSelectSpark = (selectedSparkId: string) => {
    console.log("QuickSwitch: Selected spark ID:", selectedSparkId);
    console.log("QuickSwitch: Current spark ID:", sparkId);
    console.log("QuickSwitch: Available sparks:", recentSparks);

    if (selectedSparkId !== sparkId) {
      // Verify the spark exists before navigating
      const targetSpark = getSparkById(selectedSparkId);
      console.log("QuickSwitch: Target spark found:", targetSpark);

      if (targetSpark) {
        (navigation as any).replace("Spark", { sparkId: selectedSparkId });
      } else {
        console.error("QuickSwitch: Spark not found:", selectedSparkId);
      }
    }
  };

  const handleRecentSparkPress = () => {
    if (recentSparks.length > 1) {
      const previousSpark = recentSparks.find((id) => id !== sparkId);
      if (previousSpark) {
        HapticFeedback.light();
        (navigation as any).replace("Spark", { sparkId: previousSpark });
      }
    } else {
      handleQuickSwitch();
    }
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <SparkComponent
          {...({
            ...otherParams, // Pass forwarded params (e.g., autoRecord from SpeakSpark quick launch)
            showSettings: showSparkSettings,
            settingsInitialTab: settingsFocus,
            openCourseSelectionSignal: openCourseSelectionSignal,
            onCloseSettings: () => {
              setShowSparkSettings(false);
              setSettingsFocus(undefined);
            },
            onStateChange: (state: any) => {
              // Handle spark state changes
              console.log("Spark state changed:", state);
              // Handle dark mode for final-clock spark
              if (sparkId === "final-clock" && state.darkMode !== undefined) {
                setSparkDarkMode(state.darkMode);
              }
            },
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
      </View>

      {!showSparkSettings && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
            <Text style={[styles.buttonIcon, styles.closeIcon]}>🏠</Text>
            <Text style={[styles.buttonLabel, styles.closeLabel]}>Home</Text>
          </TouchableOpacity>

          {/* Recent Spark Quick Access */}
          {recentSparks.length > 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRecentSparkPress}
            >
              <Text style={[styles.buttonIcon, styles.recentSparkIcon]}>
                {recentSparks.find((id) => id !== sparkId)
                  ? getSparkById(recentSparks.find((id) => id !== sparkId)!)
                      ?.metadata.icon || "⚡️"
                  : "⚡️"}
              </Text>
              <Text style={[styles.buttonLabel, styles.recentSparkLabel]}>
                Recent
              </Text>
            </TouchableOpacity>
          )}

          {/* Quick Switch Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleQuickSwitch}
          >
            <Text style={[styles.buttonIcon, styles.quickSwitchIcon]}>∞</Text>
            <Text style={[styles.buttonLabel, styles.quickSwitchLabel]}>
              Switch
            </Text>
          </TouchableOpacity>

          {!isInUserCollection && (
            <TouchableOpacity style={styles.actionButton} onPress={handleAdd}>
              <Text style={[styles.buttonIcon, styles.addIcon]}>➕</Text>
              <Text style={[styles.buttonLabel, styles.addLabel]}>Add</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSettings}
          >
            <View style={{ position: "relative" }}>
              <Text style={[styles.buttonIcon, styles.settingsIcon]}>⚙️</Text>
              <NotificationBadge sparkId={sparkId} size="small" />
            </View>
            <Text style={[styles.buttonLabel, styles.settingsLabel]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Switch Modal */}
      <QuickSwitchModal
        visible={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        recentSparks={recentSparks.filter((id) => id !== sparkId)}
        onSelectSpark={handleSelectSpark}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};
