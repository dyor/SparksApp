import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Keyboard,
  Image,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus, VideoFullscreenUpdate } from "expo-av";

import { PanGestureHandler, State, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSparkStore } from "../store";
import { HapticFeedback } from "../utils/haptics";
import { useTheme } from "../contexts/ThemeContext";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SaveCancelButtons,
} from "../components/SettingsComponents";
import { RecordSwing, RecordedSwing } from "../components/RecordSwing";
import {
  Course,
  Hole,
  Shot,
  HoleScore,
  Round,
  GolfBrainData,
  HoleHistory,
  GolfBrainSparkProps,
} from "./GolfBrainSpark/types";
import {
  formatDate,
  getScoreColor,
  calculateHoleHistory,
  SHOT_QUALITY_GRID,
  LIE_OPTIONS,
  PUTT_DISTANCE_OPTIONS,
  DEFAULT_CLUBS,
} from "./GolfBrainSpark/utils";
import { DEFAULT_COURSE, DEFAULT_COURSE_BACK9 } from "./GolfBrainSpark/constants";
import { EditCourseModal } from "./GolfBrainSpark/EditCourseModal";
import { CreateCourseModal } from "./GolfBrainSpark/CreateCourseModal";

// Dropdown Component
const Dropdown = React.forwardRef<
  { open: () => void },
  {
    options: readonly string[];
    selectedValue: string;
    onSelect: (value: string) => void;
    placeholder?: string;
    style?: any;
    textStyle?: any;
  }
>(
  (
    { options, selectedValue, onSelect, placeholder, style, textStyle },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);

    // Expose open method via ref
    React.useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
    }));

    // For Android, use a different approach when there are many options
    const shouldUseModal = options.length >= 5;

    return (
      <View style={{ position: "relative" }}>
        <TouchableOpacity
          onPress={() => setIsOpen(!isOpen)}
          style={[
            style,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={textStyle}>{selectedValue || placeholder}</Text>
          <Text style={[textStyle, { fontSize: 12 }]}>
            {isOpen ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {isOpen && shouldUseModal ? (
          <Modal
            visible={isOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsOpen(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPress={() => setIsOpen(false)}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  margin: 20,
                  maxHeight: "70%",
                  minWidth: "80%",
                  elevation: 5,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                }}
                onStartShouldSetResponder={() => true}
              >
                <View
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#eee",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    {placeholder || "Select Option"}
                  </Text>
                </View>
                <ScrollView
                  style={{ maxHeight: 300 }}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {options?.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        onSelect(option);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: "#eee",
                        backgroundColor:
                          selectedValue === option ? "#f0f8ff" : "transparent",
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          textStyle,
                          {
                            color:
                              selectedValue === option ? "#007AFF" : "#333",
                            fontWeight:
                              selectedValue === option ? "600" : "400",
                          },
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : isOpen ? (
          <View
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 6,
              zIndex: 1000,
              elevation: 5, // For Android
              shadowColor: "#000", // For iOS
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              maxHeight: 200,
              marginTop: 2, // Small gap from trigger
            }}
          >
            <ScrollView
              style={{ maxHeight: 200 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
            >
              {options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#eee",
                    minHeight: 44, // Ensure touchable area
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[textStyle, { color: "#333" }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }
);

// Function to analyze historical data by shot position
const analyzeHistoricalDataByShotPosition = (holeHistory: HoleHistory) => {
  const shotPositionData: { [key: string]: { [key: string]: number } } = {};

  // Process each round's hole score
  holeHistory.recentRounds.forEach((holeScore) => {
    const shots = holeScore.shots || [];

    // Group shots by type and position
    const shotShots = shots
      .filter((shot) => shot.type === "shot")
      .sort((a, b) => a.timestamp - b.timestamp);
    const putts = shots
      .filter((shot) => shot.type === "putt")
      .sort((a, b) => a.timestamp - b.timestamp);

    // Process shots by position
    shotShots.forEach((shot, index) => {
      const positionKey = `shot-${index + 1}`;
      if (!shotPositionData[positionKey]) {
        shotPositionData[positionKey] = {};
      }
      if (shot.direction) {
        shotPositionData[positionKey][shot.direction] =
          (shotPositionData[positionKey][shot.direction] || 0) + 1;
      }
    });

    // Process putts by position
    putts.forEach((putt, index) => {
      const positionKey = `putt-${index + 1}`;
      if (!shotPositionData[positionKey]) {
        shotPositionData[positionKey] = {};
      }
      if (putt.direction) {
        shotPositionData[positionKey][putt.direction] =
          (shotPositionData[positionKey][putt.direction] || 0) + 1;
      }
    });
  });

  return shotPositionData;
};

// Hole History Modal Component
const HoleHistoryModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  holeHistory: HoleHistory;
  courseName: string;
  colors: any;
}> = ({ visible, onClose, holeHistory, courseName, colors }) => {

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: "90%",
      maxWidth: 500,
      maxHeight: "90%",
      flex: 1,
    },
    scrollContent: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    courseName: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 24,
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
      marginTop: 16,
    },
    shotAnalysis: {
      marginTop: 16,
    },
    todaysDistanceCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    actionButtonsCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    navigationButtons: {
      flexDirection: "row",
      padding: 20,
      paddingBottom: 40, // Move up from bottom
      gap: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 80,
    },
    addShotCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    addPuttContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    addShotContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    addButtonContainer: {
      marginTop: 20,
      alignItems: "center",
    },
    addButtonsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    viewButtonsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 8,
      gap: 12,
    },
    viewButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      flex: 1,
      maxWidth: 150,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    viewButtonTextActive: {
      color: colors.background,
    },
    sectionHeader: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    expectedText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    closeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 20,
    },
    closeButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  if (holeHistory.totalRounds === 0) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Hole {holeHistory.holeNumber} History
            </Text>
            <Text style={styles.courseName}>{courseName}</Text>

            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No rounds played on this hole yet
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Hole {holeHistory.holeNumber} History
          </Text>
          <Text style={styles.courseName}>{courseName}</Text>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Statistics */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{holeHistory.totalRounds}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{holeHistory.averageScore}</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: getScoreColor(holeHistory.bestScore, 4) },
                  ]}
                >
                  {holeHistory.bestScore}
                </Text>
                <Text style={styles.statLabel}>Best</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: getScoreColor(holeHistory.worstScore, 4) },
                  ]}
                >
                  {holeHistory.worstScore}
                </Text>
                <Text style={styles.statLabel}>Worst</Text>
              </View>
            </View>

            {/* Historical Shot Analysis by Position */}
            <View style={styles.shotAnalysis}>
              <Text style={styles.sectionTitle}>Historical Shot Patterns</Text>
              {(() => {
                const shotPositionData =
                  analyzeHistoricalDataByShotPosition(holeHistory);
                const shotPositions = Object.keys(shotPositionData).sort();

                return shotPositions.map((positionKey) => {
                  const [shotType, shotNumber] = positionKey.split("-");
                  const historicalData = shotPositionData[positionKey];

                  return (
                    <HistoricalOutcomeGrid
                      key={positionKey}
                      shotType={shotType as "iron" | "putt"}
                      shotNumber={parseInt(shotNumber)}
                      historicalData={historicalData}
                      colors={colors}
                    />
                  );
                });
              })()}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Round Summary Screen Component
const RoundSummaryScreen: React.FC<{
  round: Round;
  course: Course;
  onClose: () => void;
  onHolePress?: (holeNumber: number) => void;
  onReturnToRound?: () => void;
  onEndRound?: () => void;
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  colors: any;
}> = ({
  round,
  course,
  onClose,
  onHolePress,
  onReturnToRound,
  onEndRound,
  handicap,
  getBumpsForHole,
  colors,
}) => {
    console.log("RoundSummaryScreen props:", {
      onReturnToRound: !!onReturnToRound,
      onEndRound: !!onEndRound,
    });


    const hasFireShot = (holeNumber: number) => {
      const holeScore = (round.holeScores || []).find(
        (hs) => hs.holeNumber === holeNumber
      );
      if (!holeScore) return false;
      return holeScore.shots.some((shot) => shot.direction === "fire");
    };

    const hasPoorShot = (holeNumber: number) => {
      const holeScore = (round.holeScores || []).find(
        (hs) => hs.holeNumber === holeNumber
      );
      if (!holeScore) return false;
      return holeScore.shots.some((shot) => shot.poorShot === true);
    };

    // Calculate cumulative scores over par
    const getCumulativeScores = () => {
      const scores = [];
      let grossCumulative = 0;
      let netCumulative = 0;

      for (let holeNumber = 1; holeNumber <= 18; holeNumber++) {
        const hole = (course.holes || []).find((h) => h.number === holeNumber);
        const holeScore = (round.holeScores || []).find(
          (hs) => hs.holeNumber === holeNumber
        );

        if (hole && holeScore) {
          const grossOverPar = holeScore.totalScore - hole.par;
          const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
          const netOverPar = grossOverPar - bumps;

          grossCumulative += grossOverPar;
          netCumulative += netOverPar;

          scores.push({
            hole: holeNumber,
            gross: grossCumulative,
            net: netCumulative,
            par: hole.par,
            score: holeScore.totalScore,
            bumps,
          });
        } else {
          scores.push({
            hole: holeNumber,
            gross: null,
            net: null,
            par: hole?.par || 0,
            score: 0,
            bumps: 0,
          });
        }
      }

      return scores;
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        padding: 20,
        paddingBottom: 10,
        alignItems: "center",
      },
      title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 8,
      },
      subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
      },
      incompleteText: {
        fontSize: 14,
        color: colors.primary,
        textAlign: "center",
        marginTop: 4,
        fontWeight: "500",
      },
      scorecard: {
        backgroundColor: colors.surface,
        margin: 20,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      scorecardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      courseName: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
      },
      totalScore: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.primary,
      },
      holesGrid: {
        gap: 8,
      },
      frontNine: {
        backgroundColor: "#E3F2FD", // Light blue for front 9
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
      },
      backNine: {
        backgroundColor: "#E8F5E8", // Light green for back 9
        borderRadius: 8,
        padding: 8,
      },
      frontNineTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
      },
      backNineTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        textAlign: "center",
        marginBottom: 8,
      },
      holesRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 8,
      },
      holesRowLast: {
        flexDirection: "row",
        gap: 8,
      },
      holeCard: {
        width: "18%", // Fixed width instead of flex
        aspectRatio: 1,
        backgroundColor: colors.background,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
        position: "relative",
      },
      holeNumber: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
      },
      holeScore: {
        fontSize: 16,
        fontWeight: "bold",
      },
      holePar: {
        fontSize: 10,
        color: colors.textSecondary,
      },
      bumpIndicator: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
      },
      bumpIndicators: {
        position: "absolute",
        top: 4,
        right: 4,
        flexDirection: "row",
        gap: 2,
      },
      bumpDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
      },
      topActionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        gap: 10,
      },
      bottomActionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        gap: 10,
      },
      returnToRoundButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25, // Pill-shaped
        alignItems: "center",
        justifyContent: "center",
      },
      returnToRoundButtonText: {
        color: colors.background,
        fontSize: 16,
        fontWeight: "600",
      },
      endRoundButton: {
        flex: 1,
        backgroundColor: colors.error || "#ff4444",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25, // Pill-shaped
        alignItems: "center",
        justifyContent: "center",
      },
      endRoundButtonText: {
        color: colors.background,
        fontSize: 16,
        fontWeight: "600",
      },
      closeButton: {
        position: "absolute",
        top: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
      },
      closeButtonText: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
      },
      statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        margin: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      statItem: {
        alignItems: "center",
      },
      statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: colors.text,
      },
      statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
      },
      buttons: {
        padding: 20,
        gap: 12,
      },
      button: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "center",
      },
      primaryButton: {
        backgroundColor: colors.primary,
      },
      secondaryButton: {
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
      },
      buttonText: {
        fontSize: 16,
        fontWeight: "600",
      },
      primaryButtonText: {
        color: colors.background,
      },
      secondaryButtonText: {
        color: colors.primary,
      },
      // Graph styles
      graphContainer: {
        margin: 20,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      graphTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
        textAlign: "center",
      },
      graph: {
        height: 220,
        width: 300,
        position: "relative",
        paddingHorizontal: 8,
        alignSelf: "center",
      },
      graphLine: {
        position: "absolute",
        height: 2,
        backgroundColor: colors.primary,
      },
      graphLineNet: {
        position: "absolute",
        height: 2,
        backgroundColor: "#4CAF50",
      },
      graphPoint: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
      },
      graphPointNet: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4CAF50",
      },
      graphPointPositive: {
        backgroundColor: "#F44336",
      },
      graphPointNegative: {
        backgroundColor: "#4CAF50",
      },
      graphPointZero: {
        backgroundColor: "#2196F3",
      },
      graphZeroLine: {
        position: "absolute",
        left: 8,
        right: 8,
        height: 3,
        backgroundColor: colors.border,
        top: 100, // Center of 200px graph
      },
      customChart: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      graphDataPoint: {
        position: "absolute",
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 2,
      },
      graphFireEmoji: {
        position: "absolute",
        fontSize: 16,
        zIndex: 3,
      },
      graphLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingHorizontal: 8,
      },
      graphLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: "center",
      },
      graphLegend: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 8,
        gap: 16,
      },
      legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      },
      legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
      },
      legendText: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      clubBreakdown: {
        margin: 20,
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      clubBreakdownTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 12,
      },
      clubRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
      },
      clubName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        flex: 1,
      },
      clubStats: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "right",
        flex: 2,
      },
    });

    // Calculate current total score for incomplete rounds
    const currentTotalScore = (round.holeScores || []).reduce(
      (sum, hs) => sum + hs.totalScore,
      0
    );
    const currentTotalPar = (round.holeScores || []).reduce(
      (sum, hs) => sum + hs.par,
      0
    );
    const netScore = currentTotalScore - currentTotalPar;
    const underParHoles = (round.holeScores || []).filter(
      (hs) => hs.totalScore < hs.par
    ).length;
    const parHoles = (round.holeScores || []).filter(
      (hs) => hs.totalScore === hs.par
    ).length;
    const overParHoles = (round.holeScores || []).filter(
      (hs) => hs.totalScore > hs.par
    ).length;

    // Calculate club breakdown
    const clubBreakdown = React.useMemo(() => {
      const clubStats: {
        [club: string]: {
          total: number;
          fire: number;
          poop: number;
          teeShot: number;
          fireTeeShot: number;
          poopTeeShot: number;
        };
      } = {};

      (round.holeScores || []).forEach((holeScore) => {
        const shots = holeScore.shots || [];

        shots.forEach((shot, index) => {
          if (!shot.club) return;

          const club = shot.club;
          const isTeeShot = index === 0; // First shot of the hole
          const isFire = shot.direction === "fire";
          const isPoop = shot.poorShot === true;

          if (!clubStats[club]) {
            clubStats[club] = {
              total: 0,
              fire: 0,
              poop: 0,
              teeShot: 0,
              fireTeeShot: 0,
              poopTeeShot: 0,
            };
          }

          clubStats[club].total++;
          if (isFire) clubStats[club].fire++;
          if (isPoop) clubStats[club].poop++;

          if (isTeeShot) {
            clubStats[club].teeShot++;
            if (isFire) clubStats[club].fireTeeShot++;
            if (isPoop) clubStats[club].poopTeeShot++;
          }
        });
      });

      // Sort clubs by type (Driver first, then irons, then wedges, etc.)
      const clubOrder = [
        "Driver",
        "3-Wood",
        "5-Wood",
        "7-Wood",
        "1-Iron",
        "2-Iron",
        "3-Iron",
        "4-Iron",
        "5-Iron",
        "6-Iron",
        "7-Iron",
        "8-Iron",
        "9-Iron",
        "PW",
        "Gap Wedge",
        "SW",
        "LW",
        "Putter",
      ];

      return Object.entries(clubStats).sort(([a], [b]) => {
        const aIndex = clubOrder.indexOf(a);
        const bIndex = clubOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }, [round.holeScores]);

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Action Buttons */}
        <View style={styles.topActionButtons}>
          {onReturnToRound && (
            <TouchableOpacity
              style={styles.returnToRoundButton}
              onPress={onReturnToRound}
            >
              <Text style={styles.returnToRoundButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
          {onEndRound && (
            <TouchableOpacity style={styles.endRoundButton} onPress={onEndRound}>
              <Text style={styles.endRoundButtonText}>End Round</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Round Summary</Text>
          <Text style={styles.subtitle}>
            {course.name} • {formatDate(round.completedAt || round.startedAt, 'short')}
          </Text>
          {!round.isComplete && (
            <Text style={styles.incompleteText}>
              Through {round.holeScores?.length || 0} holes
            </Text>
          )}
        </View>

        {/* Scorecard */}
        <View style={styles.scorecard}>
          <View style={styles.scorecardHeader}>
            <Text style={styles.courseName}>Scorecard</Text>
            <Text style={styles.totalScore}>
              {currentTotalScore} (
              {netScore > 0 ? `+${netScore}` : netScore === 0 ? "E" : netScore})
            </Text>
          </View>

          <View style={styles.holesGrid}>
            {/* Front 9 */}
            <View style={styles.frontNine}>
              <Text style={styles.frontNineTitle}>Front 9</Text>

              {/* Row 1: Holes 1-4 */}
              <View style={styles.holesRow}>
                {[1, 2, 3, 4].map((holeNumber) => {
                  const hole = (course.holes || []).find(
                    (h) => h.number === holeNumber
                  );
                  if (!hole) return null;
                  const holeScore = (round.holeScores || []).find(
                    (hs) => hs.holeNumber === hole.number
                  );
                  const score = holeScore?.totalScore || 0;
                  const bumps =
                    handicap !== undefined ? getBumpsForHole(hole) : 0;

                  return (
                    <TouchableOpacity
                      key={hole.number}
                      style={styles.holeCard}
                      onPress={() => onHolePress?.(hole.number)}
                      disabled={!onHolePress}
                    >
                      {bumps > 0 && (
                        <View style={styles.bumpIndicators}>
                          {Array.from({ length: bumps }, (_, i) => (
                            <View
                              key={`${hole.number}-bump-${i}`}
                              style={styles.bumpDot}
                            />
                          ))}
                        </View>
                      )}
                      <Text style={styles.holeNumber}>{hole.number}</Text>
                      <Text
                        style={[
                          styles.holeScore,
                          {
                            color:
                              score > 0
                                ? getScoreColor(score, hole.par)
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {score > 0
                          ? `${score}${hasFireShot(hole.number) ? " 🔥" : ""}${hasPoorShot(hole.number) ? " 💩" : ""
                          }`
                          : "-"}
                      </Text>
                      <Text style={styles.holePar}>Par {hole.par}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Row 2: Holes 5-9 */}
              <View style={styles.holesRowLast}>
                {[5, 6, 7, 8, 9].map((holeNumber) => {
                  const hole = (course.holes || []).find(
                    (h) => h.number === holeNumber
                  );
                  if (!hole) return null;
                  const holeScore = (round.holeScores || []).find(
                    (hs) => hs.holeNumber === hole.number
                  );
                  const score = holeScore?.totalScore || 0;
                  const bumps =
                    handicap !== undefined ? getBumpsForHole(hole) : 0;

                  return (
                    <TouchableOpacity
                      key={hole.number}
                      style={styles.holeCard}
                      onPress={() => onHolePress?.(hole.number)}
                      disabled={!onHolePress}
                    >
                      {bumps > 0 && (
                        <View style={styles.bumpIndicators}>
                          {Array.from({ length: bumps }, (_, i) => (
                            <View
                              key={`${hole.number}-bump-${i}`}
                              style={styles.bumpDot}
                            />
                          ))}
                        </View>
                      )}
                      <Text style={styles.holeNumber}>{hole.number}</Text>
                      <Text
                        style={[
                          styles.holeScore,
                          {
                            color:
                              score > 0
                                ? getScoreColor(score, hole.par)
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {score > 0
                          ? `${score}${hasFireShot(hole.number) ? " 🔥" : ""}${hasPoorShot(hole.number) ? " 💩" : ""
                          }`
                          : "-"}
                      </Text>
                      <Text style={styles.holePar}>Par {hole.par}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Back 9 */}
            <View style={styles.backNine}>
              <Text style={styles.backNineTitle}>Back 9</Text>

              {/* Row 3: Holes 10-13 */}
              <View style={styles.holesRow}>
                {[10, 11, 12, 13].map((holeNumber) => {
                  const hole = (course.holes || []).find(
                    (h) => h.number === holeNumber
                  );
                  if (!hole) return null;
                  const holeScore = (round.holeScores || []).find(
                    (hs) => hs.holeNumber === hole.number
                  );
                  const score = holeScore?.totalScore || 0;
                  const bumps =
                    handicap !== undefined ? getBumpsForHole(hole) : 0;

                  return (
                    <TouchableOpacity
                      key={hole.number}
                      style={styles.holeCard}
                      onPress={() => onHolePress?.(hole.number)}
                      disabled={!onHolePress}
                    >
                      {bumps > 0 && (
                        <View style={styles.bumpIndicators}>
                          {Array.from({ length: bumps }, (_, i) => (
                            <View
                              key={`${hole.number}-bump-${i}`}
                              style={styles.bumpDot}
                            />
                          ))}
                        </View>
                      )}
                      <Text style={styles.holeNumber}>{hole.number}</Text>
                      <Text
                        style={[
                          styles.holeScore,
                          {
                            color:
                              score > 0
                                ? getScoreColor(score, hole.par)
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {score > 0
                          ? `${score}${hasFireShot(hole.number) ? " 🔥" : ""}${hasPoorShot(hole.number) ? " 💩" : ""
                          }`
                          : "-"}
                      </Text>
                      <Text style={styles.holePar}>Par {hole.par}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Row 4: Holes 14-18 */}
              <View style={styles.holesRowLast}>
                {[14, 15, 16, 17, 18].map((holeNumber) => {
                  const hole = (course.holes || []).find(
                    (h) => h.number === holeNumber
                  );
                  if (!hole) return null;
                  const holeScore = (round.holeScores || []).find(
                    (hs) => hs.holeNumber === hole.number
                  );
                  const score = holeScore?.totalScore || 0;
                  const bumps =
                    handicap !== undefined ? getBumpsForHole(hole) : 0;

                  return (
                    <TouchableOpacity
                      key={hole.number}
                      style={styles.holeCard}
                      onPress={() => onHolePress?.(hole.number)}
                      disabled={!onHolePress}
                    >
                      {bumps > 0 && (
                        <View style={styles.bumpIndicators}>
                          {Array.from({ length: bumps }, (_, i) => (
                            <View
                              key={`${hole.number}-bump-${i}`}
                              style={styles.bumpDot}
                            />
                          ))}
                        </View>
                      )}
                      <Text style={styles.holeNumber}>{hole.number}</Text>
                      <Text
                        style={[
                          styles.holeScore,
                          {
                            color:
                              score > 0
                                ? getScoreColor(score, hole.par)
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {score > 0
                          ? `${score}${hasFireShot(hole.number) ? " 🔥" : ""}${hasPoorShot(hole.number) ? " 💩" : ""
                          }`
                          : "-"}
                      </Text>
                      <Text style={styles.holePar}>Par {hole.par}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Score Graphs */}
        {(() => {
          const scores = getCumulativeScores();
          if (scores.length === 0) {
            return (
              <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>Cumulative Shots Over Par</Text>
                <View style={styles.graph}>
                  <Text
                    style={{
                      textAlign: "center",
                      color: colors.text,
                      marginTop: 40,
                    }}
                  >
                    Complete some holes to see your score progression
                  </Text>
                </View>
              </View>
            );
          }

          const maxValue = Math.max(
            ...scores.map((s) => Math.max(s.gross || 0, s.net || 0))
          );
          const minValue = Math.min(
            ...scores.map((s) => Math.min(s.gross || 0, s.net || 0))
          );
          const range = maxValue - minValue;
          const graphHeight = 100;

          // Define validScores for both graphs
          const validGrossScores = scores.filter((s) => s.gross !== null);
          const validNetScores = scores.filter((s) => s.net !== null);

          return (
            <View>
              {/* Gross Score Graph */}
              <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>Cumulative Shots Over Par</Text>
                <View style={styles.graph}>
                  {(() => {
                    const validScores = validGrossScores;
                    if (validScores.length < 2) {
                      return (
                        <Text
                          style={{
                            textAlign: "center",
                            color: colors.text,
                            marginTop: 40,
                          }}
                        >
                          Complete at least 2 holes to see score progression
                        </Text>
                      );
                    }

                    // Prepare data for LineChart
                    const chartData = validScores.map((score, index) => {
                      const holeHasFire = round.holeScores?.some(
                        (hs) =>
                          hs.holeNumber === score.hole &&
                          hs.shots?.some((shot) => shot.direction === "fire")
                      );
                      const holeHasPoorShot = round.holeScores?.some(
                        (hs) =>
                          hs.holeNumber === score.hole &&
                          hs.shots?.some((shot) => shot.poorShot === true)
                      );

                      return {
                        value: score.gross,
                        label: score.hole.toString(),
                        dataPointText:
                          score.gross > 0
                            ? `+${score.gross}`
                            : score.gross.toString(),
                        dataPointColor: colors.primary,
                        dataPointRadius: 6,
                        holeHasFire,
                        holeHasPoorShot,
                        customDataPoint:
                          holeHasFire || holeHasPoorShot ? (
                            <View style={{ alignItems: "center" }}>
                              <Text style={{ fontSize: 12, marginBottom: 2 }}>
                                {holeHasFire ? "🔥" : ""}
                                {holeHasPoorShot ? "💩" : ""}
                              </Text>
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: colors.primary,
                                }}
                              />
                            </View>
                          ) : undefined,
                      };
                    });

                    return (
                      <View style={styles.graph}>
                        {/* Zero line */}
                        <View style={[styles.graphZeroLine, { top: 100 }]} />

                        {/* Custom line chart - dots only */}
                        <View style={styles.customChart}>
                          {chartData.map((point, index) => {
                            const x = index * (280 / (chartData.length - 1));
                            const y = 100 - point.value * 20; // Scale factor of 20

                            return (
                              <View key={`point-${index}`}>
                                {/* Data point */}
                                <View
                                  style={[
                                    styles.graphDataPoint,
                                    {
                                      left: x - 6,
                                      top: y - 6,
                                      backgroundColor: colors.primary,
                                    },
                                  ]}
                                />
                                {/* Fire and poop emojis if applicable */}
                                {point.customDataPoint && (
                                  <Text
                                    style={[
                                      styles.graphFireEmoji,
                                      {
                                        left: x - 8,
                                        top: y - 20,
                                      },
                                    ]}
                                  >
                                    {point.holeHasFire ? "🔥" : ""}
                                    {point.holeHasPoorShot ? "💩" : ""}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}
                </View>
                <View style={styles.graphLabels}>
                  {validGrossScores.map((score, index) => (
                    <Text key={`gross-${score.hole}`} style={styles.graphLabel}>
                      {score.hole}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Net Score Graph */}
              {handicap !== undefined && (
                <View style={styles.graphContainer}>
                  <Text style={styles.graphTitle}>
                    Cumulative Shots Over Net Par
                  </Text>
                  <View style={styles.graph}>
                    {(() => {
                      const validScores = validNetScores;
                      if (validScores.length < 2) {
                        return (
                          <Text
                            style={{
                              textAlign: "center",
                              color: colors.text,
                              marginTop: 40,
                            }}
                          >
                            Complete at least 2 holes to see net score progression
                          </Text>
                        );
                      }

                      // Prepare data for LineChart
                      const chartData = validScores.map((score, index) => {
                        const holeHasFire = round.holeScores?.some(
                          (hs) =>
                            hs.holeNumber === score.hole &&
                            hs.shots?.some((shot) => shot.direction === "fire")
                        );
                        const holeHasPoorShot = round.holeScores?.some(
                          (hs) =>
                            hs.holeNumber === score.hole &&
                            hs.shots?.some((shot) => shot.poorShot === true)
                        );

                        return {
                          value: score.net,
                          label: score.hole.toString(),
                          dataPointText:
                            score.net > 0
                              ? `+${score.net}`
                              : score.net.toString(),
                          dataPointColor: "#4CAF50",
                          dataPointRadius: 6,
                          holeHasFire,
                          holeHasPoorShot,
                          customDataPoint:
                            holeHasFire || holeHasPoorShot ? (
                              <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 12, marginBottom: 2 }}>
                                  {holeHasFire ? "🔥" : ""}
                                  {holeHasPoorShot ? "💩" : ""}
                                </Text>
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: "#4CAF50",
                                  }}
                                />
                              </View>
                            ) : undefined,
                        };
                      });

                      return (
                        <View style={styles.graph}>
                          {/* Zero line */}
                          <View style={[styles.graphZeroLine, { top: 100 }]} />

                          {/* Custom line chart - dots only */}
                          <View style={styles.customChart}>
                            {chartData.map((point, index) => {
                              const x = index * (280 / (chartData.length - 1));
                              const y = 100 - point.value * 20; // Scale factor of 20

                              return (
                                <View key={`net-point-${index}`}>
                                  {/* Data point */}
                                  <View
                                    style={[
                                      styles.graphDataPoint,
                                      {
                                        left: x - 6,
                                        top: y - 6,
                                        backgroundColor: "#4CAF50",
                                      },
                                    ]}
                                  />
                                  {/* Fire and poop emojis if applicable */}
                                  {point.customDataPoint && (
                                    <Text
                                      style={[
                                        styles.graphFireEmoji,
                                        {
                                          left: x - 8,
                                          top: y - 20,
                                        },
                                      ]}
                                    >
                                      {point.holeHasFire ? "🔥" : ""}
                                      {point.holeHasPoorShot ? "💩" : ""}
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                  <View style={styles.graphLabels}>
                    {validNetScores.map((score, index) => (
                      <Text key={`net-${score.hole}`} style={styles.graphLabel}>
                        {score.hole}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{round.totalScore}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: getScoreColor(round.totalScore, round.totalPar) },
              ]}
            >
              {netScore > 0 ? `+${netScore}` : netScore === 0 ? "E" : netScore}
            </Text>
            <Text style={styles.statLabel}>Net</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>
              {underParHoles}
            </Text>
            <Text style={styles.statLabel}>Under Par</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#2196F3" }]}>
              {parHoles}
            </Text>
            <Text style={styles.statLabel}>Par</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#FF9800" }]}>
              {overParHoles}
            </Text>
            <Text style={styles.statLabel}>Over Par</Text>
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActionButtons}>
          {onReturnToRound && (
            <TouchableOpacity
              style={styles.returnToRoundButton}
              onPress={onReturnToRound}
            >
              <Text style={styles.returnToRoundButtonText}>Continue Round</Text>
            </TouchableOpacity>
          )}
          {onEndRound && (
            <TouchableOpacity style={styles.endRoundButton} onPress={onEndRound}>
              <Text style={styles.endRoundButtonText}>End Round</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Club Breakdown */}
        {clubBreakdown.length > 0 && (
          <View style={styles.clubBreakdown}>
            <Text style={styles.clubBreakdownTitle}>Club Breakdown</Text>
            {clubBreakdown.map(([club, stats]) => (
              <View key={club} style={styles.clubRow}>
                <Text style={styles.clubName}>{club}:</Text>
                <Text style={styles.clubStats}>
                  {stats.total} ({stats.teeShot} tee shot)
                  {stats.fire > 0 && `, ${stats.fire} 🔥`}
                  {stats.poop > 0 && `, ${stats.poop} 💩`}
                  {stats.fireTeeShot > 0 && ` (${stats.fireTeeShot} tee shot)`}
                  {stats.poopTeeShot > 0 && ` (${stats.poopTeeShot} tee shot)`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Shots with Videos Listing */}
        <View style={styles.clubBreakdown}>
          <Text style={styles.clubBreakdownTitle}>Shots with Videos</Text>
          {(() => {
            const shotsWithVideos: { hole: number, shot: Shot, shotNumber: number }[] = [];
            (round.holeScores || []).forEach(hs => {
              (hs.shots || []).forEach((s, idx) => {
                if (s.videoUri) {
                  shotsWithVideos.push({ hole: hs.holeNumber, shot: s, shotNumber: idx + 1 });
                }
              });
            });

            if (shotsWithVideos.length === 0) {
              return <Text style={{ color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 8 }}>No videos recorded yet.</Text>;
            }

            return shotsWithVideos.map((item) => (
              <View key={item.shot.id} style={[styles.clubRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clubName}>Hole {item.hole} - Shot {item.shotNumber}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.shot.club}</Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                  }}
                  onPress={() => onHolePress && onHolePress(item.hole)}
                  disabled={!onHolePress}
                >
                  <Text style={{ color: colors.background, fontWeight: "600" }}>View</Text>
                </TouchableOpacity>
              </View>
            ));
          })()}
        </View>
      </ScrollView>
    );
  };

// Course Edit Modal

// Settings Component
const GolfBrainSettings: React.FC<{
  onClose: () => void;
  courses: Course[];
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onDeleteCourse: (courseId: string) => void;
  data: GolfBrainData;
  onUpdateSettings: (settings: Partial<GolfBrainData["settings"]>) => void;
  onEditRound?: (round: Round) => void;
  onViewRound?: (round: Round) => void;
  onDeleteRound?: (roundId: string) => void;
  onNavigateToRound?: () => void;
  onNavigateToCourse?: (courseId: string) => void;
  onResetData?: () => void;
  colors: any;
  initialFocus?: "courses" | "createCourse" | string;
}> = ({
  onClose,
  courses,
  onUpdateCourse,
  onDeleteCourse,
  data,
  onUpdateSettings,
  onEditRound,
  onViewRound,
  onDeleteRound,
  onNavigateToRound,
  onNavigateToCourse,
  onResetData,
  colors,
  initialFocus,
}) => {
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [newClubName, setNewClubName] = useState("");
    const [showAllRounds, setShowAllRounds] = useState(false);

    const scrollRef = React.useRef<any>(null);
    const coursesRef = React.useRef<any>(null);
    const [focusedSection, setFocusedSection] = useState<string | null>(null);

    // Local state for settings changes
    const [localSettings, setLocalSettings] = useState<GolfBrainData["settings"]>(
      // Initialize with deep copy to avoid reference issues
      JSON.parse(JSON.stringify(data.settings))
    );
    const [hasChanges, setHasChanges] = useState(false);

    // Synchronize local settings with global settings when global settings change
    // This ensures hydration updates are captured if the settings modal is already open
    useEffect(() => {
      if (!hasChanges) {
        setLocalSettings(JSON.parse(JSON.stringify(data.settings)));
      }
    }, [data.settings, hasChanges]);

    useEffect(() => {
    }, []);
    useEffect(() => {
      if (initialFocus === "courses") {
        // Scroll the settings to the courses section and briefly highlight it
        setTimeout(() => {
          try {
            if (
              scrollRef.current &&
              typeof scrollRef.current.scrollTo === "function"
            ) {
              // Try scrolling to a large offset to ensure courses section is visible
              scrollRef.current.scrollTo({ y: 800, animated: true });
            }
          } catch (e) {
            // ignore
          }
          setFocusedSection("courses");
          setTimeout(() => setFocusedSection(null), 2500);
        }, 120);
      } else if (initialFocus === "createCourse") {
        // If parent intended to create a course immediately, open the Create Course modal if available
        // This component doesn't directly control the parent modal, so we'll expose a highlight
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 800, animated: true });
          setFocusedSection("courses");
          setTimeout(() => setFocusedSection(null), 2500);
        }, 120);
      }
    }, [initialFocus]);

    const handleEditCourse = (course: Course) => {
      setEditingCourse(course);
    };

    const handleDeleteCourse = (courseId: string) => {
      Alert.alert(
        "Delete Course",
        "Are you sure you want to delete this course? This will also delete all associated round data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              onDeleteCourse(courseId);
              HapticFeedback.light();
            },
          },
        ]
      );
    };

    const handleSaveSettings = () => {
      const updatedSettings = {
        ...data.settings,
        ...localSettings,
        swingRecording: {
          ...(data.settings.swingRecording || {}),
          ...(localSettings.swingRecording || {}),
        }
      };
      console.log("saved data.settings.countdown value:", updatedSettings.swingRecording?.countdownSeconds);
      onUpdateSettings(updatedSettings);
      setHasChanges(false);
      onClose();
    };

    const handleCancelSettings = () => {
      if (hasChanges) {
        Alert.alert(
          "Discard Changes",
          "You have unsaved changes. Are you sure you want to discard them?",
          [
            { text: "Keep Editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                setLocalSettings(data.settings);
                setHasChanges(false);
                onClose();
              },
            },
          ]
        );
      } else {
        onClose();
      }
    };

    // Rounds management functions
    // Deduplicate rounds by ID to prevent duplicate display
    const deduplicatedRounds = (data.rounds || []).filter(
      (round, index, self) => index === self.findIndex((r) => r.id === round.id)
    );

    const sortedRounds = deduplicatedRounds.sort(
      (a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt)
    );

    const displayedRounds = showAllRounds
      ? sortedRounds
      : sortedRounds.slice(0, 10);

    const handleShowMoreRounds = () => {
      setShowAllRounds(true);
    };

    const handleEditRound = (round: Round) => {
      Alert.alert(
        "Edit Round",
        "Editing this round will make it active again. You cannot start a new round until this one is completed. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit Round",
            onPress: () => {
              // This will be handled by the parent component
              onEditRound?.(round);
            },
          },
        ]
      );
    };

    const handleDeleteRound = (round: Round) => {
      const course = courses.find((c) => c.id === round.courseId);
      Alert.alert(
        "Delete Round",
        `Are you sure you want to delete this round from ${course?.name || "Unknown Course"
        }? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              onDeleteRound?.(round.id);
            },
          },
        ]
      );
    };


    const updateLocalSetting = (
      key: keyof GolfBrainData["settings"],
      value: any
    ) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    };

    const handleAddClub = () => {
      const clubs = localSettings.clubs || DEFAULT_CLUBS;
      if (newClubName.trim() && !clubs.includes(newClubName.trim())) {
        updateLocalSetting("clubs", [...clubs, newClubName.trim()]);
        setNewClubName("");
        HapticFeedback.light();
      }
    };

    const styles = StyleSheet.create({
      courseCard: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      courseName: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
      },
      courseInfo: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
      },
      courseActions: {
        flexDirection: "row",
        gap: 8,
      },
      actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: "center",
      },
      editButton: {
        backgroundColor: colors.primary,
      },
      deleteButton: {
        backgroundColor: colors.error || "#ff4444",
      },
      actionButtonText: {
        fontSize: 14,
        fontWeight: "600",
      },
      editButtonText: {
        color: colors.background,
      },
      deleteButtonText: {
        color: colors.background,
      },
      handicapContainer: {
        marginBottom: 16,
      },
      handicapInput: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 8,
      },
      handicapHelp: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: "italic",
      },
      clubList: {
        marginBottom: 16,
      },
      clubItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.background,
        borderRadius: 8,
        marginBottom: 8,
      },
      reorderButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
      },
      reorderButtonText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: "bold",
      },
      clubName: {
        fontSize: 16,
        color: colors.text,
        flex: 1,
        marginLeft: 8,
      },
      removeClubButton: {
        backgroundColor: colors.error || "#ff4444",
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      },
      removeClubButtonText: {
        color: colors.background,
        fontSize: 16,
        fontWeight: "bold",
      },
      addClubContainer: {
        flexDirection: "row",
        gap: 8,
      },
      addClubInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
      },
      addClubButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
      },
      addClubButtonText: {
        color: colors.background,
        fontSize: 18,
        fontWeight: "bold",
      },
      activeRoundNote: {
        backgroundColor: "rgba(255, 193, 7, 0.1)",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 193, 7, 0.3)",
      },
      activeRoundText: {
        color: "#FFC107",
        marginBottom: 8,
        textAlign: "center",
      },
      returnToRoundButton: {
        backgroundColor: "#FFC107",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: "center",
      },
      returnToRoundButtonText: {
        color: "#000000",
        fontSize: 14,
        fontWeight: "600",
      },
      activeRoundLabel: {
        fontSize: 12,
        color: "#4CAF50",
        fontWeight: "600",
        marginTop: 4,
      },
      disabledButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        opacity: 0.5,
      },
      disabledButtonText: {
        color: "rgba(255, 255, 255, 0.5)",
      },
      noRoundsText: {
        fontStyle: "italic",
        textAlign: "center",
        marginTop: 20,
      },
      roundItem: {
        flexDirection: "column",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
      },
      roundInfo: {
        marginBottom: 4,
      },
      roundCourse: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 2,
      },
      roundId: {
        fontSize: 12,
        fontWeight: "500",
        color: "#AAAAAA",
        marginBottom: 2,
      },
      roundDate: {
        fontSize: 14,
        color: "#666666",
        marginBottom: 4,
      },
      roundStats: {
        fontSize: 12,
        color: "#AAAAAA",
        marginBottom: 4,
      },
      roundScore: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
      },
      incompleteText: {
        fontSize: 12,
        color: "#2196F3",
        fontStyle: "italic",
      },
      roundActions: {
        flexDirection: "row",
        gap: 8,
      },
      showMoreButton: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
      },
      showMoreText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "500",
      },
      overParScore: {
        color: "#FF6B6B",
      },
      underParScore: {
        color: "#4ECDC4",
      },
      parScore: {
        color: "#45B7D1",
      },
      viewButton: {
        backgroundColor: colors.primary,
      },
      viewButtonText: {
        color: "#FFFFFF",
      },
      defaultClubCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      defaultClubTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 8,
      },
      defaultClubRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      },
      defaultClubLabel: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
      },
      defaultClubDropdown: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        minHeight: 32,
        marginLeft: 8,
      },
      defaultClubDropdownText: {
        fontSize: 14,
        color: colors.text,
      },
    });

    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Golf Brain Settings"
            subtitle="Manage your golf scoring and course preferences"
            icon="🏌️‍♂️"
            sparkId="golf-brain"
          />

          <SettingsFeedbackSection sparkName="Golf Brain" sparkId="golf-brain" />

          <SettingsSection title="Swing Recording">
            <View style={{ padding: 16 }}>
              <View style={styles.handicapContainer}>
                <Text style={{ color: colors.text, marginBottom: 8 }}>
                  Countdown Duration (seconds)
                </Text>
                <TextInput
                  style={styles.handicapInput}
                  keyboardType="numeric"
                  value={
                    localSettings.swingRecording?.countdownSeconds?.toString() ||
                    "5"
                  }
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    console.log("changed data.settings.countdown value:", val);
                    setLocalSettings((prev) => ({
                      ...prev,
                      swingRecording: {
                        ...prev.swingRecording,
                        countdownSeconds: val,
                        durationSeconds:
                          prev.swingRecording?.durationSeconds || 30,
                      },
                    }));
                    setHasChanges(true);
                  }}
                />
                <Text style={styles.handicapHelp}>
                  Time before recording starts
                </Text>
              </View>

              <View style={styles.handicapContainer}>
                <Text style={{ color: colors.text, marginBottom: 8 }}>
                  Max Recording Duration (seconds)
                </Text>
                <TextInput
                  style={styles.handicapInput}
                  keyboardType="numeric"
                  value={
                    localSettings.swingRecording?.durationSeconds?.toString() ||
                    "30"
                  }
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    setLocalSettings((prev) => ({
                      ...prev,
                      swingRecording: {
                        ...prev.swingRecording,
                        countdownSeconds:
                          prev.swingRecording?.countdownSeconds || 5,
                        durationSeconds: val,
                      },
                    }));
                    setHasChanges(true);
                  }}
                />
                <Text style={styles.handicapHelp}>
                  Recording automatically stops after this time
                </Text>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection title="Default Clubs">
            <View style={{ padding: 16, backgroundColor: "transparent" }}>
              {/* Par 5 */}
              <View style={styles.defaultClubCard}>
                <Text style={styles.defaultClubTitle}>Par 5</Text>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>1st shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par5?.shot1 || "[Driver]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par5: { ...prev.defaultClubs?.par5, shot1: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>2nd shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par5?.shot2 || "[Irons]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par5: { ...prev.defaultClubs?.par5, shot2: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>3rd shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par5?.shot3 || "[Irons]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par5: { ...prev.defaultClubs?.par5, shot3: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
              </View>

              {/* Par 4 */}
              <View style={styles.defaultClubCard}>
                <Text style={styles.defaultClubTitle}>Par 4</Text>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>1st shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par4?.shot1 || "[Driver]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par4: { ...prev.defaultClubs?.par4, shot1: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>2nd shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par4?.shot2 || "[Irons]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par4: { ...prev.defaultClubs?.par4, shot2: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
              </View>

              {/* Par 3 */}
              <View style={styles.defaultClubCard}>
                <Text style={styles.defaultClubTitle}>Par 3</Text>
                <View style={styles.defaultClubRow}>
                  <Text style={styles.defaultClubLabel}>1st shot:</Text>
                  <Dropdown
                    options={localSettings.clubs || DEFAULT_CLUBS}
                    selectedValue={
                      localSettings.defaultClubs?.par3?.shot1 || "[Irons]"
                    }
                    onSelect={(value) => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        defaultClubs: {
                          ...prev.defaultClubs,
                          par3: { ...prev.defaultClubs?.par3, shot1: value },
                        },
                      }));
                      setHasChanges(true);
                    }}
                    style={styles.defaultClubDropdown}
                    textStyle={styles.defaultClubDropdownText}
                  />
                </View>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection title="Recent Rounds">
            <View style={{ padding: 6, backgroundColor: "transparent" }}>
              {data.currentRound && (
                <View style={styles.activeRoundNote}>
                  <SettingsText variant="body">
                    Editing a round is disabled until you end the current round
                  </SettingsText>
                  <TouchableOpacity
                    style={styles.returnToRoundButton}
                    onPress={onNavigateToRound}
                  >
                    <Text style={styles.returnToRoundButtonText}>
                      Return to Current Round
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {sortedRounds.length === 0 ? (
                <SettingsText variant="body">No rounds recorded yet</SettingsText>
              ) : (
                <>
                  {displayedRounds.map((round, index) => {
                    const course = courses.find((c) => c.id === round.courseId);
                    const holesPlayed = (round.holeScores || []).filter(
                      (hs) => hs.shots.length > 0
                    ).length;
                    const totalParPlayed = (round.holeScores || [])
                      .filter((hs) => hs.shots.length > 0)
                      .reduce((sum, hs) => sum + hs.par, 0);
                    const netScore = round.totalScore - totalParPlayed;
                    const isIncomplete = !round.isComplete;
                    const isActiveRound = data.currentRound?.id === round.id;
                    const canEdit = !data.currentRound || isActiveRound;

                    return (
                      <View key={round.id} style={styles.roundItem}>
                        <View style={styles.roundInfo}>
                          <Text style={styles.roundCourse}>
                            {course?.name || "Unknown Course"}
                          </Text>
                          <Text style={styles.roundId}>
                            Round #{round.id.slice(-6)}
                          </Text>
                          <Text style={styles.roundDate}>
                            {formatDate(round.completedAt || round.startedAt, 'long')}
                          </Text>
                          <Text style={styles.roundStats}>
                            {holesPlayed} holes played
                            {holesPlayed > 0 &&
                              ` • ${netScore > 0
                                ? `+${netScore} over par`
                                : netScore < 0
                                  ? `${Math.abs(netScore)} under par`
                                  : "E"
                              }`}
                          </Text>
                        </View>

                        <View style={styles.roundActions}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.viewButton,
                              { flex: 1, marginRight: 8 },
                            ]}
                            onPress={() => onViewRound?.(round)}
                          >
                            <Text
                              style={[
                                styles.actionButtonText,
                                styles.viewButtonText,
                              ]}
                            >
                              View
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.deleteButton,
                              { flex: 1, marginLeft: 8 },
                              isActiveRound && styles.disabledButton,
                            ]}
                            onPress={() => {
                              console.log("Delete button pressed for round:", {
                                id: round.id,
                                courseName: round.courseName,
                                isActiveRound,
                              });
                              if (!isActiveRound && onDeleteRound && round.id) {
                                onDeleteRound(round.id);
                              }
                            }}
                            disabled={isActiveRound}
                          >
                            <Text
                              style={[
                                styles.actionButtonText,
                                styles.deleteButtonText,
                                isActiveRound && styles.disabledButtonText,
                              ]}
                            >
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {sortedRounds.length > displayedRounds.length && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={handleShowMoreRounds}
                    >
                      <Text style={styles.showMoreText}>
                        Show{" "}
                        {Math.min(
                          50,
                          sortedRounds.length - displayedRounds.length
                        )}{" "}
                        more rounds
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </SettingsSection>

          <SettingsSection title="Handicap">
            <View style={{ padding: 16, backgroundColor: "transparent" }}>
              <SettingsText variant="body">
                Your handicap index for stroke calculations
              </SettingsText>
              <View style={styles.handicapContainer}>
                <TextInput
                  style={styles.handicapInput}
                  placeholder="Enter handicap (0-54)"
                  placeholderTextColor={colors.textSecondary}
                  value={localSettings.handicap?.toString() || ""}
                  onChangeText={(text) => {
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 0 && num <= 54) {
                      updateLocalSetting("handicap", num);
                    } else if (text === "") {
                      updateLocalSetting("handicap", undefined);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.handicapHelp}>
                  {localSettings.handicap !== undefined
                    ? localSettings.handicap === 0
                      ? "No strokes on any hole"
                      : localSettings.handicap <= 18
                        ? `You get 1 stroke on holes with difficulty index ≤ ${localSettings.handicap}`
                        : `You get 1 stroke on all holes, plus an extra stroke on holes with difficulty index ≤ ${localSettings.handicap - 18
                        }`
                    : "Set your handicap to see stroke adjustments"}
                </Text>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection title="Clubs">
            <View style={{ padding: 16, backgroundColor: "transparent" }}>
              <View style={styles.clubList}>
                {(localSettings.clubs || DEFAULT_CLUBS).map((club, index) => {
                  const clubs = localSettings.clubs || DEFAULT_CLUBS;
                  const canMoveUp = index > 0;
                  const canMoveDown = index < clubs.length - 1;

                  return (
                    <View key={index} style={styles.clubItem}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.reorderButton,
                            !canMoveUp && { opacity: 0.3 },
                          ]}
                          onPress={() => {
                            if (canMoveUp) {
                              const newClubs = [...clubs];
                              [newClubs[index - 1], newClubs[index]] = [
                                newClubs[index],
                                newClubs[index - 1],
                              ];
                              updateLocalSetting("clubs", newClubs);
                              HapticFeedback.light();
                            }
                          }}
                          disabled={!canMoveUp}
                        >
                          <Text style={styles.reorderButtonText}>↑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.reorderButton,
                            !canMoveDown && { opacity: 0.3 },
                          ]}
                          onPress={() => {
                            if (canMoveDown) {
                              const newClubs = [...clubs];
                              [newClubs[index], newClubs[index + 1]] = [
                                newClubs[index + 1],
                                newClubs[index],
                              ];
                              updateLocalSetting("clubs", newClubs);
                              HapticFeedback.light();
                            }
                          }}
                          disabled={!canMoveDown}
                        >
                          <Text style={styles.reorderButtonText}>↓</Text>
                        </TouchableOpacity>
                        <Text style={styles.clubName}>{club}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeClubButton}
                        onPress={() => {
                          const newClubs = clubs.filter((_, i) => i !== index);
                          updateLocalSetting("clubs", newClubs);
                        }}
                      >
                        <Text style={styles.removeClubButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              <View style={styles.addClubContainer}>
                <TextInput
                  style={styles.addClubInput}
                  placeholder="Add new club (use [Name] for groups)..."
                  placeholderTextColor={colors.textSecondary}
                  value={newClubName}
                  onChangeText={setNewClubName}
                  onSubmitEditing={handleAddClub}
                />
                <TouchableOpacity
                  style={styles.addClubButton}
                  onPress={handleAddClub}
                >
                  <Text style={styles.addClubButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection title="Courses">
            {courses.length === 0 ? (
              <View style={{ padding: 16, backgroundColor: "transparent" }}>
                <SettingsText variant="body">
                  No courses created yet. Create your first course to get started!
                </SettingsText>
              </View>
            ) : (
              courses.map((course) => (
                <View key={course.id} style={styles.courseCard}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseInfo}>
                    {course.holes.length} holes • Created{" "}
                    {new Date(course.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.courseActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditCourse(course)}
                    >
                      <Text
                        style={[styles.actionButtonText, styles.editButtonText]}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteCourse(course.id)}
                    >
                      <Text
                        style={[styles.actionButtonText, styles.deleteButtonText]}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </SettingsSection>

          <SettingsSection title="Reset Data">
            <View style={{ padding: 16, backgroundColor: "transparent" }}>
              <View style={{ marginBottom: 16 }}>
                <SettingsText variant="body">
                  This will delete all your rounds, courses (except defaults), and
                  reset all settings to default values. This action cannot be
                  undone.
                </SettingsText>
              </View>
              {onResetData && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.error || "#f44336",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    Alert.alert(
                      "Reset All Data?",
                      "This will permanently delete all your rounds, custom courses, and reset settings. This cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Reset",
                          style: "destructive",
                          onPress: () => {
                            onResetData();
                            HapticFeedback.light();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                  >
                    Reset All Data
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SettingsSection>

          <SettingsSection title="About">
            <View style={{ padding: 16, backgroundColor: "transparent" }}>
              <SettingsText variant="body">
                Golf Brain helps you record detailed golf rounds with shot-by-shot
                tracking.{"\n"}
                Track courses, scores, and analyze your performance over time.
              </SettingsText>
            </View>
          </SettingsSection>

          <View style={GolfBrainSettingsStyles.saveCancelContainer}>
            <SaveCancelButtons
              onSave={() => {
                handleSaveSettings();
              }}
              onCancel={handleCancelSettings}
              saveDisabled={false} // Force enabled for testing
            />
          </View>
        </SettingsScrollView>

        {editingCourse && (
          <EditCourseModal
            visible={editingCourse !== null}
            onClose={() => setEditingCourse(null)}
            course={editingCourse}
            onUpdateCourse={onUpdateCourse}
            colors={colors}
          />
        )}
      </SettingsContainer>
    );
  };

// GolfBrainSettings Styles
const GolfBrainSettingsStyles = StyleSheet.create({
  saveCancelContainer: {
    padding: 20,
    paddingTop: 0,
  },
  noRoundsText: {
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  roundItem: {
    flexDirection: "column",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roundInfo: {
    marginBottom: 8,
  },
  roundCourse: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  roundDate: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 4,
  },
  roundScore: {
    fontSize: 14,
    fontWeight: "500",
  },
  incompleteText: {
    fontSize: 12,
    color: "#2196F3",
    fontStyle: "italic",
  },
  roundActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  activeRoundNote: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  activeRoundText: {
    color: "#FFC107",
    marginBottom: 8,
    textAlign: "center",
  },
  returnToRoundButton: {
    backgroundColor: "#FFC107",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  returnToRoundButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },
  activeRoundLabel: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    opacity: 0.5,
  },
  disabledButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  deleteButtonText: {
    color: "#FFFFFF",
  },
  showMoreButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
  },
});

// Outcome Grid Component
const OutcomeGrid: React.FC<{
  shotType: "iron" | "putt";
  shotNumber: number;
  historicalData: { [key: string]: number };
  selectedOutcome?: string;
  isPoorShot?: boolean;
  onSelect: (outcome: string) => void;
  onPoopSelect?: (outcome: string) => void;
  showError?: boolean;
  colors: any;
  onFlameAnimation?: () => void;
  onPoopAnimation?: () => void;
}> = ({
  shotType,
  shotNumber,
  historicalData,
  selectedOutcome,
  isPoorShot = false,
  onSelect,
  onPoopSelect,
  showError = false,
  colors,
  onFlameAnimation,
  onPoopAnimation,
}) => {
    const outcomes = [
      ["left\nlong", "left", "left\nshort"],
      ["long", "good", "short"],
      ["right\nlong", "right", "right\nshort"],
    ];

    // Map display labels to stored values
    const getOutcomeValue = (displayLabel: string) => {
      const mapping: { [key: string]: string } = {
        "left\nlong": "left and long",
        long: "long",
        "right\nlong": "right and long",
        left: "left",
        good: "good",
        right: "right",
        "left\nshort": "left and short",
        short: "short",
        "right\nshort": "right and short",
      };
      return mapping[displayLabel] || displayLabel;
    };

    const getDisplayLabel = (value: string) => {
      const mapping: { [key: string]: string } = {
        "left and long": "left\nlong",
        long: "long",
        "right and long": "right\nlong",
        left: "left",
        good: "good",
        right: "right",
        "left and short": "left\nshort",
        short: "short",
        "right and short": "right\nshort",
      };
      return mapping[value] || value;
    };

    const maxCount = Math.max(...Object.values(historicalData), 1);

    const getOpacity = (outcome: string) => {
      const count = historicalData[outcome] || 0;
      return Math.max(0.2, count / maxCount);
    };

    const styles = StyleSheet.create({
      container: {
        marginBottom: 16,
      },
      title: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 0,
      },
      grid: {
        flexDirection: "row",
        alignSelf: "center", // Center horizontally
        width: "90%", // Use percentage to span most of screen width
        borderWidth: 1,
        borderColor: colors.border,
      },
      row: {
        flex: 1,
      },
      cell: {
        height: 40,
        borderRadius: 0, // No border radius for touching cells
        justifyContent: "center",
        alignItems: "center",
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      },
      cellText: {
        fontSize: 8,
        fontWeight: "500",
        textAlign: "center",
        lineHeight: 10,
      },
    });

    return (
      <View style={styles.container}>
        {/* <Text style={styles.title}>
        {shotType === 'iron' ? `Shot ${shotNumber}` : `Putt ${shotNumber}`} - Select Outcome
      </Text> */}
        <View
          style={[
            styles.grid,
            showError && {
              borderColor: colors.error || "#ff4444",
              borderWidth: 2,
              borderRadius: 8,
            },
          ]}
        >
          {outcomes.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((outcome) => {
                const outcomeValue = getOutcomeValue(outcome);
                const count = historicalData[outcomeValue] || 0;
                const isSelected =
                  selectedOutcome === outcomeValue ||
                  (selectedOutcome === "fire" && outcome === "good");
                const isGood = outcomeValue === "good";

                // Determine cell color based on position
                const getCellColor = () => {
                  if (isSelected) {
                    // Check if fire is selected (special case for good cell)
                    if (selectedOutcome === "fire" && outcome === "good") {
                      return "#FF8C00"; // Burnt orange for fire
                    }
                    // Check if good is selected
                    if (selectedOutcome === "good" && outcomeValue === "good") {
                      return "#228B22"; // Dark green for good
                    }
                    return colors.primary; // Default selection color
                  }
                  if (isGood) return "#E8F5E8"; // Light green for center when not selected

                  // Corner cells (bad outcomes) - light red
                  if (
                    outcomeValue === "left and long" ||
                    outcomeValue === "right and long" ||
                    outcomeValue === "left and short" ||
                    outcomeValue === "right and short"
                  ) {
                    return "#FFE8E8"; // Light red
                  }

                  // Outer central cells (okay outcomes) - no background color
                  if (
                    outcomeValue === "left" ||
                    outcomeValue === "right" ||
                    outcomeValue === "long" ||
                    outcomeValue === "short"
                  ) {
                    return "transparent"; // No background color
                  }

                  // Penalty outcome - black background for all cells
                  if (outcomeValue === "penalty") {
                    return "#000000"; // Black background
                  }

                  return colors.surface; // Default
                };

                return (
                  <TouchableOpacity
                    key={outcome}
                    style={[
                      styles.cell,
                      {
                        backgroundColor:
                          isSelected && isPoorShot ? "#D2B48C" : getCellColor(), // Light brown for poor shots
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => onSelect(outcomeValue)}
                    onLongPress={
                      isGood
                        ? () => {
                          onSelect("fire");
                          onFlameAnimation?.();
                        }
                        : () => {
                          onPoopSelect?.(outcomeValue);
                          onPoopAnimation?.();
                        }
                    }
                  >
                    <Text
                      style={[
                        styles.cellText,
                        {
                          color: isSelected ? colors.background : colors.text,
                          fontWeight: isSelected ? "600" : "500",
                        },
                        outcomeValue === "penalty" && { color: "#FFFFFF" },
                      ]}
                    >
                      {outcome === "good"
                        ? selectedOutcome === "fire"
                          ? "🔥"
                          : "good"
                        : outcomeValue === "penalty"
                          ? outcome === "good"
                            ? "PENALTY"
                            : ""
                          : isSelected && isPoorShot
                            ? `${outcome} 💩`
                            : outcome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

// Historical Outcome Grid Component
const HistoricalOutcomeGrid: React.FC<{
  shotType: "iron" | "putt";
  shotNumber: number;
  historicalData: { [key: string]: number };
  colors: any;
}> = ({ shotType, shotNumber, historicalData, colors }) => {
  const outcomes = [
    ["left\nlong", "left", "left\nshort"],
    ["long", "good", "short"],
    ["right\nlong", "right", "right\nshort"],
  ];

  // Map display labels to stored values
  const getOutcomeValue = (displayLabel: string) => {
    const mapping: { [key: string]: string } = {
      "left\nlong": "left and long",
      long: "long",
      "right\nlong": "right and long",
      left: "left",
      good: "good",
      right: "right",
      "left\nshort": "left and short",
      short: "short",
      "right\nshort": "right and short",
    };
    return mapping[displayLabel] || displayLabel;
  };

  const maxCount = Math.max(...Object.values(historicalData), 1);

  const getIntensity = (outcome: string) => {
    const count = historicalData[outcome] || 0;
    return count / maxCount;
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    grid: {
      flexDirection: "row",
      gap: 4,
    },
    row: {
      flex: 1,
      gap: 4,
    },
    cell: {
      aspectRatio: 1.5, // 2:3 height:width ratio (width/height = 1.5)
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cellText: {
      fontSize: 10,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 12,
    },
    countText: {
      fontSize: 8,
      marginTop: 2,
      fontWeight: "600",
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
      marginRight: 8,
    },
    legendCell: {
      width: 12,
      height: 12,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {shotType === "iron" ? `Shot ${shotNumber}` : `Putt ${shotNumber}`} -
        Historical Patterns
      </Text>
      <View style={styles.grid}>
        {outcomes.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((outcome) => {
              const outcomeValue = getOutcomeValue(outcome);
              const count = historicalData[outcomeValue] || 0;
              const intensity = getIntensity(outcomeValue);
              const isGood = outcomeValue === "good";

              // Blue gradient scaling (light to dark)
              const alpha = Math.max(0.1, intensity);
              const backgroundColor = isGood
                ? `rgba(76, 175, 80, ${alpha})`
                : `rgba(33, 150, 243, ${alpha})`;

              return (
                <View key={outcome} style={[styles.cell, { backgroundColor }]}>
                  <Text style={[styles.cellText, { color: colors.text }]}>
                    {outcome === "good" ? "good" : outcome}
                  </Text>
                  {count > 0 && (
                    <Text style={[styles.countText, { color: colors.text }]}>
                      {count}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Frequency Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
          <View
            key={index}
            style={[
              styles.legendCell,
              { backgroundColor: `rgba(33, 150, 243, ${intensity})` },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

// Handicap Onboarding Modal
const HandicapOnboardingModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSetHandicap: (handicap: number) => void;
  colors: any;
}> = ({ visible, onClose, onSetHandicap, colors }) => {
  const [handicap, setHandicap] = useState("");
  const [isValid, setIsValid] = useState(false);

  const validateHandicap = (value: string) => {
    const num = parseInt(value);
    const valid = !isNaN(num) && num >= 0 && num <= 54;
    setIsValid(valid);
    return valid;
  };

  const handleSubmit = () => {
    const num = parseInt(handicap);
    if (validateHandicap(handicap)) {
      onSetHandicap(num);
      onClose();
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: 300,
      maxWidth: "90%",
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: "center",
      minWidth: 120,
    },
    cancelButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: colors.text,
    },
    submitButtonText: {
      color: colors.surface,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => { }}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => { }} // Prevent closing by tapping outside
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()} // Prevent event bubbling
        >
          <Text style={styles.title}>Set Your Handicap</Text>
          <TextInput
            style={styles.input}
            value={handicap}
            onChangeText={(text) => {
              setHandicap(text);
              validateHandicap(text);
            }}
            placeholder="Enter handicap (0-54)"
            keyboardType="numeric"
            maxLength={2}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { marginRight: 8 }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Close ✕
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={[styles.buttonText, styles.submitButtonText]}>
                Set Handicap
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Course Selection Component
const CourseSelectionScreen: React.FC<{
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateCourse: () => void;
  onManageCourses?: () => void;
  colors: any;
}> = ({ courses, onSelectCourse, onCreateCourse, onManageCourses, colors }) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    courseList: {
      paddingHorizontal: 20,
    },
    courseCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    courseName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    courseInfo: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: "center",
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 40,
    },
    createButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: "600",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Start New Round</Text>
        <Text style={styles.subtitle}>Choose a course to start your round</Text>
      </View>

      <ScrollView style={styles.courseList}>
        {!courses || courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No courses yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first course to get started!
            </Text>
          </View>
        ) : (
          courses?.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => onSelectCourse(course)}
            >
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseInfo}>
                {course.holes.length} holes • Last played: Never
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.createButton} onPress={onCreateCourse}>
        <Text style={styles.createButtonText}>+ Add New Course</Text>
      </TouchableOpacity>

      {/* Link to manage/create courses in settings */}
      <TouchableOpacity
        style={{ alignItems: "center", paddingVertical: 12 }}
        onPress={() => onManageCourses && onManageCourses()}
      >
        <Text style={{ color: colors.primary, fontWeight: "600" }}>
          Manage courses
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Hole Detail Screen Component
interface HoleDetailScreenProps {
  course: Course;
  currentHole: number;
  currentRound?: Round;
  data: GolfBrainData;
  onNextHole: () => void;
  onPreviousHole: () => void;
  onCompleteHole: (holeScore: HoleScore) => void;
  onShowHistory: () => void;
  onSaveHoleData: (holeNumber: number, shots: Shot[], putts: Shot[]) => void;
  onLoadHoleData: (
    holeNumber: number
  ) => { shots: Shot[]; putts: Shot[] } | null;
  onUpdateTodaysDistance: (
    holeNumber: number,
    distance: number | undefined
  ) => void;
  onEndRound: () => void;
  onViewSummary: () => void;
  onClose: () => void;
  clubs: string[];
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  getCumulativeOverPar: (
    holeNumber: number,
    currentShots?: Shot[],
    currentPutts?: Shot[]
  ) => number;
  colors: any;
  onFlameAnimation: () => void;
  onPoopAnimation: () => void;
}


const HoleDetailScreen = React.forwardRef<{ saveCurrentData: () => void }, HoleDetailScreenProps>((props: HoleDetailScreenProps, ref) => {
  const {
    course,
    currentHole,
    currentRound,
    data,
    onNextHole,
    onPreviousHole,
    onCompleteHole,
    onShowHistory,
    onSaveHoleData,
    onLoadHoleData,
    onUpdateTodaysDistance,
    onEndRound,
    onViewSummary,
    onClose,
    clubs,
    handicap,
    getBumpsForHole,
    getCumulativeOverPar,
    colors,
    onFlameAnimation,
    onPoopAnimation,
  } = props;
  const hole = (course.holes || []).find((h) => h.number === currentHole);
  const [shots, setShots] = useState<Shot[]>([]);
  const [putts, setPutts] = useState<Shot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [todaysDistance, setTodaysDistance] = useState<string>(
    hole?.todaysDistance?.toString() || ""
  );
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const clubDropdownRef = useRef<{ open: () => void }>(null);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const shotVideoRef = useRef<Video>(null);

  const expectedShots = hole ? Math.max(0, hole.par - 2) : 0; // par 3 = 1, par 4 = 2, par 5 = 3
  console.log("Expected shots calculation:", {
    holePar: hole?.par,
    expectedShots,
    holeNumber: hole?.number,
  });
  const expectedPutts = 2;

  // Check if all default iron shots have outcomes
  const allShotsHaveOutcomes =
    (shots?.length || 0) >= expectedShots &&
    shots?.slice(0, expectedShots).every((shot) => shot.direction);

  // Get all shots in order (iron shots first, then putts)
  const getAllShots = () => {
    const allShots = [
      ...(shots || []).map((shot, index) => ({
        shot,
        type: "shot" as const,
        index,
        id: shot.id,
      })),
      ...(putts || []).map((shot, index) => ({
        shot,
        type: "putt" as const,
        index,
        id: shot.id,
      })),
    ];
    console.log("getAllShots debug:", {
      shotsCount: (shots || []).length,
      puttsCount: (putts || []).length,
      totalShots: allShots.length,
      allShots: allShots.map((s) => ({ type: s.type, index: s.index })),
    });
    return allShots;
  };

  // Get current shot being displayed using sequential indexing
  const getCurrentShot = () => {
    const allShots = getAllShots();
    return allShots[currentShotIndex] || null;
  };

  // Get current shot type and display info
  const getCurrentShotInfo = () => {
    const allShots = getAllShots();
    const currentShot = allShots[currentShotIndex];
    if (!currentShot) return null;

    const isShot = currentShot.type === "shot";
    const shotNumber = isShot ? currentShot.index + 1 : currentShot.index + 1;
    const shotLabel = isShot ? `Shot ${shotNumber}` : `Putt ${shotNumber}`;

    return {
      shot: currentShot.shot,
      type: currentShot.type,
      shotNumber,
      shotLabel,
      isShot,
    };
  };

  // Expose saveCurrentData method to parent
  useImperativeHandle(ref, () => ({
    saveCurrentData: () => {
      onSaveHoleData(currentHole, shots, putts);
      // Save today's distance
      const distanceValue = todaysDistance
        ? parseInt(todaysDistance)
        : undefined;
      onUpdateTodaysDistance(currentHole, distanceValue);
    },
  }));

  useEffect(() => {
    setShowClubDropdown(false);
    setPlaybackRate(1.0);
    setIsPlaying(false);
  }, [currentShotIndex]);

  // Open dropdown modal when dropdown becomes visible (after "Other" is clicked)
  useEffect(() => {
    if (showClubDropdown && clubDropdownRef.current) {
      // Small delay to ensure the dropdown component is fully rendered
      const timer = setTimeout(() => {
        if (clubDropdownRef.current) {
          clubDropdownRef.current.open();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showClubDropdown]);

  // Initialize shots when hole changes - load existing data or create defaults
  useEffect(() => {
    console.log("Shot initialization debug:", {
      currentHole,
      hole: hole?.number,
      par: hole?.par,
      expectedShots,
      expectedPutts,
    });

    // Try to load existing data for this hole
    const existingData = onLoadHoleData(currentHole);

    if (existingData) {
      console.log("Loading existing data:", existingData);
      // Load existing data
      const loadedShots = existingData.shots || [];
      const loadedPutts = existingData.putts || [];

      // If no shots exist but we expect shots, create default shots
      console.log("Shot creation check:", {
        loadedShotsLength: loadedShots.length,
        expectedShots,
        shouldCreateShots: loadedShots.length === 0 && expectedShots > 0,
      });

      if (loadedShots.length === 0 && expectedShots > 0) {
        console.log("No shots in loaded data, creating default shots");

        // Smart club selection based on user's default clubs
        const getDefaultClub = (shotIndex: number) => {
          if (!hole) return "Driver";

          const currentShotNumber = shotIndex + 1;
          const par = hole.par;
          const defaultClubs = data.settings.defaultClubs;

          // Par 5: Use user's default clubs
          if (par === 5) {
            if (currentShotNumber === 1)
              return defaultClubs?.par5?.shot1 || "[Driver]";
            if (currentShotNumber === 2)
              return defaultClubs?.par5?.shot2 || "[Irons]";
            return defaultClubs?.par5?.shot3 || "[Irons]";
          }

          // Par 4: Use user's default clubs
          if (par === 4) {
            if (currentShotNumber === 1)
              return defaultClubs?.par4?.shot1 || "[Driver]";
            return defaultClubs?.par4?.shot2 || "[Irons]";
          }

          // Par 3: Use user's default clubs
          if (par === 3) {
            return defaultClubs?.par3?.shot1 || "[Irons]";
          }

          return "[Driver]"; // Default fallback
        };

        const defaultShots: Shot[] = Array.from(
          { length: expectedShots },
          (_, index) => {
            const club = getDefaultClub(index);
            console.log(
              `Creating shot ${index + 1} for par ${hole?.par
              } hole with club: ${club}`
            );
            return {
              id: `shot-${Date.now()}-${index}`,
              type: "shot",
              lie: index === expectedShots - 1 ? "green" : "fairway", // Last shot defaults to green
              direction: "good", // Default to good outcome
              club: club, // Apply smart club selection
              timestamp: Date.now(),
              poorShot: false, // Always start as good shot
            };
          }
        );
        setShots(defaultShots);
        console.log("Created default shots:", defaultShots);
      } else {
        console.log("Loaded shots before club assignment:", loadedShots);
        // Check if any existing shots are missing clubs and apply smart club selection
        const shotsWithClubs = loadedShots.map((shot, index) => {
          let updatedShot = { ...shot };

          // Reset poor shot status to ensure fresh start
          updatedShot.poorShot = false;

          if (!shot.club) {
            // Apply smart club selection to shots without clubs
            const getDefaultClub = (shotIndex: number) => {
              if (!hole) return "Driver";

              const currentShotNumber = shotIndex + 1;
              const par = hole.par;
              const defaultClubs = data.settings.defaultClubs;

              // Par 5: Use user's default clubs
              if (par === 5) {
                if (currentShotNumber === 1)
                  return defaultClubs?.par5?.shot1 || "[Driver]";
                if (currentShotNumber === 2)
                  return defaultClubs?.par5?.shot2 || "[Irons]";
                return defaultClubs?.par5?.shot3 || "[Irons]";
              }

              // Par 4: Use user's default clubs
              if (par === 4) {
                if (currentShotNumber === 1)
                  return defaultClubs?.par4?.shot1 || "[Driver]";
                return defaultClubs?.par4?.shot2 || "[Irons]";
              }

              // Par 3: Use user's default clubs
              if (par === 3) {
                return defaultClubs?.par3?.shot1 || "[Irons]";
              }

              return "[Driver]"; // Default fallback
            };

            const club = getDefaultClub(index);
            console.log(
              `Adding club ${club} to existing shot ${index + 1} for par ${hole?.par
              } hole`
            );
            updatedShot.club = club;
          }

          return updatedShot;
        });

        console.log("Updated shots with clubs:", shotsWithClubs);
        setShots(shotsWithClubs);
      }

      // If no putts exist but we expect putts, create default putts
      if (loadedPutts.length === 0 && expectedPutts > 0) {
        console.log("No putts in loaded data, creating default putts");
        const defaultPutts: Shot[] = Array.from(
          { length: expectedPutts },
          (_, index) => ({
            id: `putt-${Date.now()}-${index}`,
            type: "putt",
            puttDistance: index === 1 ? "<4ft" : "5-10ft", // Second putt is typically a tap-in
            direction: "good", // Default to good outcome
            timestamp: Date.now(),
            poorShot: false, // Always start as good putt
          })
        );
        setPutts(defaultPutts);
        console.log("Created default putts:", defaultPutts);
      } else {
        // Reset poor shot status for existing putts to ensure fresh start
        const resetPutts = loadedPutts.map((putt) => ({
          ...putt,
          poorShot: false,
        }));
        setPutts(resetPutts);
      }
    } else {
      console.log("Creating default shots:", {
        expectedShots,
        expectedPutts,
      });
      // Create default shots
      const defaultShots: Shot[] = Array.from(
        { length: expectedShots },
        (_, index) => ({
          id: `shot-${Date.now()}-${index}`,
          type: "shot",
          lie: index === expectedShots - 1 ? "green" : "fairway", // Last shot defaults to green
          direction: "good", // Default to good outcome
          timestamp: Date.now(),
          poorShot: false, // Always start as good shot
        })
      );

      const defaultPutts: Shot[] = Array.from(
        { length: expectedPutts },
        (_, index) => ({
          id: `putt-${Date.now()}-${index}`,
          type: "putt",
          puttDistance: index === 1 ? "<4ft" : "5-10ft", // Second putt is typically a tap-in
          direction: "good", // Default to good outcome
          timestamp: Date.now(),
          poorShot: false, // Always start as good putt
        })
      );

      console.log("Created default shots:", defaultShots);
      console.log("Created default putts:", defaultPutts);
      setShots(defaultShots);
      setPutts(defaultPutts);
    }

    // Update today's distance when hole changes
    setTodaysDistance(hole?.todaysDistance?.toString() || "");

    // Reset current shot to first shot when hole changes
    setCurrentShotIndex(0);

    // Scroll to top when hole changes
    setTimeout(() => {
      forceScrollToTop();
    }, 100);
  }, [currentHole, expectedShots, expectedPutts, hole]);

  // Helper to reliably scroll to top
  const forceScrollToTop = () => {
    // Attempt immediate scroll
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
    // Backup scroll after a short delay to ensure layout updates are handled
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }, 100);
  };



  const addShot = () => {
    // Smart club selection based on user's default clubs


    const newShot: Shot = {
      id: `shot-${Date.now()}-${Math.random()}`,
      type: "shot",
      lie: "green",
      direction: "good", // Default to good outcome
      club: (() => {
        if (!hole) return "Driver";
        // Replicate logic or call helper if hoisted. Since we can't easily hoist without refactoring properties, 
        // we'll inline the same logic pattern for now, but with correct implementation.
        // Actually, since I can't access getSmartClubSelection safely from here (it's inside the render scope),
        // I should have defined it at component level. 
        // For now, I will align this logic to match the new robust logic.

        const shotNum = shots.length + 1;
        const par = hole.par;
        const dClubs = data.settings.defaultClubs;

        if (par === 5) {
          if (shotNum === 1) return dClubs?.par5?.shot1 || "Driver";
          if (shotNum === 2) return dClubs?.par5?.shot2 || "7-Iron";
          return dClubs?.par5?.shot3 || "9-Iron";
        }
        if (par === 4) {
          if (shotNum === 1) return dClubs?.par4?.shot1 || "Driver";
          return dClubs?.par4?.shot2 || "9-Iron";
        }
        if (par === 3) return dClubs?.par3?.shot1 || "7-Iron";

        return "Driver";
      })(),
      timestamp: Date.now(),
      poorShot: false,
    };
    setShots((prev) => {
      const newShots = [...prev, newShot];

      // If the previous shot has lie 'green', change it to 'fairway'
      if (prev.length > 0 && prev[prev.length - 1].lie === "green") {
        const updatedPrevShots = [...prev];
        updatedPrevShots[updatedPrevShots.length - 1] = {
          ...updatedPrevShots[updatedPrevShots.length - 1],
          lie: "fairway",
        };
        return [...updatedPrevShots, newShot];
      }

      return newShots;
    });

    // Go to the new shot (it will be the last iron shot)
    setCurrentShotIndex((shots || []).length); // Index of the new shot

    forceScrollToTop();
    HapticFeedback.light();
  };

  const addPutt = () => {
    const newPutt: Shot = {
      id: `putt-${Date.now()}-${Math.random()}`,
      type: "putt",
      puttDistance: "5-10ft",
      direction: "good", // Default to good outcome
      timestamp: Date.now(),
      poorShot: false,
    };
    setPutts((prev) => [...prev, newPutt]);

    // Go to the new putt (it will be the last putt)
    setCurrentShotIndex((shots || []).length + (putts || []).length); // Index of the new putt

    forceScrollToTop();
    HapticFeedback.light();
  };

  // Shot navigation functions
  const goToPreviousShot = () => {
    if (currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
      forceScrollToTop();
      HapticFeedback.light();
    }
  };

  const goToNextShot = () => {
    const allShots = getAllShots();
    if (currentShotIndex < allShots.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
      forceScrollToTop();
      HapticFeedback.light();
    }
  };

  const canGoPrevious = currentShotIndex > 0;
  const canGoNext = currentShotIndex < getAllShots().length - 1;

  const removeShot = (shotId: string, type: "shot" | "putt") => {
    if (type === "shot") {
      const shotIndex = shots.findIndex((shot) => shot.id === shotId);
      setShots((prev) => prev.filter((shot) => shot.id !== shotId));

      // Adjust current shot index if needed
      if (currentShotIndex === shotIndex) {
        // If we removed the current shot, go to the previous one or first available
        setCurrentShotIndex(Math.max(0, shotIndex - 1));
      } else if (currentShotIndex > shotIndex) {
        // If we removed a shot before the current one, adjust the index
        setCurrentShotIndex(currentShotIndex - 1);
      }
    } else {
      const puttIndex = (putts || []).findIndex((putt) => putt.id === shotId);
      const globalIndex = (shots || []).length + puttIndex;
      setPutts((prev) => prev.filter((putt) => putt.id !== shotId));

      // Adjust current shot index if needed
      if (currentShotIndex === globalIndex) {
        // If we removed the current putt, go to the previous one or first available
        setCurrentShotIndex(Math.max(0, globalIndex - 1));
      } else if (currentShotIndex > globalIndex) {
        // If we removed a putt before the current one, adjust the index
        setCurrentShotIndex(currentShotIndex - 1);
      }
    }
    HapticFeedback.light();

    // Check if all shots and putts are deleted, and remove hole from scorecard
    setTimeout(() => {
      const updatedShots =
        type === "shot" ? shots.filter((shot) => shot.id !== shotId) : shots;
      const updatedPutts =
        type === "putt"
          ? (putts || []).filter((putt) => putt.id !== shotId)
          : putts || [];

      if (updatedShots.length === 0 && updatedPutts.length === 0) {
        // Remove this hole from the scorecard
        onSaveHoleData(currentHole, [], []);
        // Navigate to previous hole or close if this is the first hole
        if (currentHole > 1) {
          onPreviousHole();
        } else {
          onClose();
        }
      }
    }, 100);
  };

  const updateShot = (
    shotId: string,
    type: "shot" | "putt",
    field: keyof Shot,
    value: any
  ) => {
    if (type === "shot") {
      setShots((prev) =>
        prev.map((shot) =>
          shot.id === shotId ? { ...shot, [field]: value } : shot
        )
      );
    } else {
      setPutts((prev) =>
        prev.map((shot) =>
          shot.id === shotId ? { ...shot, [field]: value } : shot
        )
      );
    }
    // Clear validation error when shots are updated
    setShowValidationError(false);

    // No auto-advance - let user manually navigate
  };

  const totalScore = (shots || []).length + (putts || []).length;
  const netScore = totalScore - (hole?.par || 0);

  const handleCompleteHole = () => {
    if ((shots || []).length === 0 && (putts || []).length === 0) {
      Alert.alert(
        "Error",
        "Please add at least one shot to complete the hole"
      );
      return;
    }

    // Check if all shots have been described
    const allShotsDescribed = (shots || []).every((shot) => shot.direction);
    const allPuttsDescribed = (putts || []).every((putt) => putt.direction); // puttDistance is optional

    if (!allShotsDescribed || !allPuttsDescribed) {
      setShowValidationError(true);
      Alert.alert(
        "Error",
        "Cannot go to next hole until all shots have a selected outcome or deleted"
      );
      return;
    }

    const holeScore: HoleScore = {
      holeNumber: currentHole,
      courseId: course.id,
      shots: [...shots, ...putts],
      totalScore,
      par: hole?.par || 0,
      netScore,
      completedAt: Date.now(),
    };

    onCompleteHole(holeScore);
    HapticFeedback.success();
  };

  const handleViewSummary = () => {
    // Show current round summary
    onViewSummary();
  };

  const handleRecordingComplete = (swing: RecordedSwing) => {
    console.log("Recording completed:", swing);
    // Find the shot to update
    // We need to match based on hole and shot number
    // swing.shotNumber is 1-based index

    // Determine if it's a shot or putt based on index
    // Note: RecordSwing is currently only passed for shots (shotInfo.isShot check in JSX)
    // swing.shotNumber from RecordSwing corresponds to the visible shot number

    // Iterate through shots to find the one matching the current index
    const shotToUpdate = (shots || []).find(
      (s, i) => i + 1 === swing.shotNumber
    );

    if (shotToUpdate) {
      updateShot(shotToUpdate.id, "shot", "videoUri", swing.uri);
      HapticFeedback.success();
    } else {
      console.warn(
        "Could not find shot to update with recording for shot number:",
        swing.shotNumber
      );
    }
  };

  // Analyze historical shot data for this hole
  const getHistoricalShotData = () => {
    if (!currentRound) return { iron: {}, putts: {} };

    // Get all rounds for this course and hole
    const allRounds = (data.rounds || []).filter(
      (round) => round.courseId === course.id
    );
    const holeScores = allRounds.flatMap((round) =>
      (round.holeScores || []).filter((hs) => hs.holeNumber === currentHole)
    );

    const shotData: { [key: string]: number } = {};
    const puttData: { [key: string]: number } = {};

    holeScores.forEach((holeScore) => {
      (holeScore.shots || []).forEach((shot) => {
        if (shot.direction) {
          if (shot.type === "shot") {
            shotData[shot.direction] = (shotData[shot.direction] || 0) + 1;
          } else if (shot.type === "putt") {
            puttData[shot.direction] = (puttData[shot.direction] || 0) + 1;
          }
        }
      });
    });

    return { shot: shotData, putts: puttData };
  };

  const historicalData = getHistoricalShotData();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    holeInfo: {
      flex: 1,
    },
    holeNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    holeDetails: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    todaysDistanceLabel: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
    },
    todaysDistanceContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    editIcon: {
      fontSize: 16,
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    distanceModalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: "80%",
      maxWidth: 400,
    },
    distanceModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    distanceModalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    modalCloseButton: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    distanceModalContent: {
      marginBottom: 20,
    },
    distanceModalLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
    distanceModalInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    distanceModalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    distanceModalButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    distanceModalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    distanceModalButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    distanceModalButtonTextPrimary: {
      color: "#FFFFFF",
    },
    bumpInfo: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "500",
      marginTop: 4,
    },
    scoreDisplay: {
      backgroundColor: "grey",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: "center",
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    scoreText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: "bold",
    },
    netScoreText: {
      color: colors.background,
      fontSize: 12,
      opacity: 0.8,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    bumpEmoji: {
      fontSize: 14,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      width: `${(currentHole / 18) * 100}%`,
    },
    commonShotsSection: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      marginTop: 8,
    },
    shotList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    shotTag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    shotTagText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "500",
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    expectedText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    shotCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12, // Reduced padding to remove excess white space
      paddingBottom: 12, // Reduced bottom padding
      marginBottom: 5, // Add 5px spacing between cards
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    shotHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: 8,
    },
    shotNavButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    disabledShotNavButton: {
      backgroundColor: colors.border,
    },
    shotNavButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.background,
    },
    disabledShotNavButtonText: {
      color: colors.textSecondary,
    },
    shotNumber: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    shotFields: {
      gap: 8,
    },
    shotFieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      width: 60,
    },
    dropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    puttDistanceLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginRight: 8,
      width: 40,
    },
    puttDistanceDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 40,
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
    dropdownText: {
      fontSize: 14,
      color: colors.text,
    },
    lieDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    quickClubButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
    },
    quickClubButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
    obWaterButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16, // Pill shape
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: "#8B4513", // Brown outline
      alignItems: "center",
      justifyContent: "center",
    },
    obWaterButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#8B4513", // Brown text
    },
    recordSwingButton: {
      height: 40,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: "#4CAF50", // Green
      borderWidth: 2,
      borderColor: "#4CAF50",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    recordingButton: {
      backgroundColor: "#F44336", // Red when recording
      borderColor: "#F44336",
    },
    recordSwingButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    countdownText: {
      fontSize: 48,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    cameraModal: {
      flex: 1,
      backgroundColor: "#000000",
    },
    cameraView: {
      flex: 1,
    },
    cameraOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    cameraControls: {
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
    },
    recordingInfo: {
      position: "absolute",
      top: 60,
      alignSelf: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    recordingDurationText: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    videoThumbnailContainer: {
      marginTop: 8,
      marginBottom: 8,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    videoThumbnail: {
      width: "100%",
      height: 120,
    },
    videoThumbnailTextContainer: {
      padding: 12,
      backgroundColor: colors.surface,
    },
    videoThumbnailTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    videoThumbnailSubtext: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textSecondary,
    },

    clubDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    requiredField: {
      borderColor: "#ff4444",
      borderWidth: 2,
    },
    feetInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      minHeight: 40,
    },
    deleteShotButton: {
      backgroundColor: colors.error || "#ff4444",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
    },
    deleteShotButtonText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    addButton: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    addButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    bottomButtons: {
      padding: 20,
      paddingTop: 0,
      gap: 12,
    },
    actionButtonsContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    actionButtonsRow: {
      flexDirection: "row",
      gap: 12,
    },
    navigationButtonsRow: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      paddingHorizontal: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    primaryButtonText: {
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.primary,
    },
    historyButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    historyButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
    },
    actionButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      color: colors.text,
      fontWeight: "500",
    },
    actionButtonsCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    nextHoleContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 20,
    },
    permanentNavigation: {
      padding: 2,
      paddingBottom: 4,
      paddingTop: 4,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 28,
    },
    navRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginBottom: 3,
      marginTop: 3,
    },
    navButton: {
      // Retaining for backward compatibility if used elsewhere, but ideally deprecated
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 2,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    navButtonText: {
      color: colors.text,
      fontWeight: "600",
    },
    // New Standardized Navigation Buttons (Matching Record Swing dimensions)
    navigationButtonBase: {
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    navigationButtonOutline: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border, // Using border color for outline
    },
    navigationButtonFilled: {
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    arrowButton: {
      backgroundColor: colors.primary, // Blue for navigation
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 16,
      height: 32,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    arrowButtonText: {
      color: colors.background,
      fontWeight: "600",
      fontSize: 12,
    },
    // xxx
    endRoundButton: {
      backgroundColor: colors.error || "#f44336",
      borderWidth: 2,
      borderColor: colors.error || "#d32f2f",
      borderRadius: 16,
      height: 32,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    endRoundButtonText: {
      color: colors.background,
      fontWeight: "600",
      fontSize: 12,
    },
    disabledButton: {
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    disabledButtonText: {
      color: colors.textSecondary,
    },
    viewButtonsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 8,
      gap: 12,
    },
    viewButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      flex: 1,
      maxWidth: 150,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    viewButtonTextActive: {
      color: colors.background,
    },
    addShotCard: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 0,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    addShotCardContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 8, // Reduced padding for smaller card
    },
    addShotCardText: {
      fontSize: 18, // Reduced font size for smaller card
      fontWeight: "600",
      color: colors.background,
      marginBottom: 4, // Reduced margin for smaller card
    },
    addShotCardSubtext: {
      fontSize: 12, // Reduced font size for smaller card
      color: colors.background,
      textAlign: "center",
      opacity: 0.8,
    },
    todaysDistanceCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 8,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noShotsContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    noShotsText: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: 30,
      textAlign: "center",
    },
    addShotButtonsContainer: {
      flexDirection: "row",
      gap: 16,
    },
    addShotButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: "center",
      minWidth: 120,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: "#8B4513", // Brown outline
    },
    addPuttButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: "#8B4513", // Brown outline
    },
    addShotButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#8B4513", // Brown text
    },
    addPuttButtonText: {
      color: "#8B4513", // Brown text
    },
    shotNavigationContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    shotCounter: {
      alignItems: "center",
    },
    shotCounterText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    shotGridContainer: {
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: "relative",
      marginTop: 4,
    },
    shotNavigationButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 4,
      marginBottom: 4,
    },
    outcomeGridNavigation: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 8,
      marginTop: 8,
      position: "relative",
    },
    navigationSide: {
      flex: 1,
      alignItems: "center",
    },
    navigationCenter: {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: [{ translateX: -40 }, { translateY: -14 }], // Half button width and height
      alignItems: "center",
    },
    navigationPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 40,
      alignItems: "center",
    },
    navigationPillText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    smallNavigationPill: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: "center",
      minWidth: 70,
      maxWidth: 80,
    },
    smallNavigationPillPrev: {
      backgroundColor: "lightgrey",
      borderWidth: 1,
      borderColor: "lightgrey",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: "center",
      minWidth: 70,
      maxWidth: 80,
    },
    smallNavigationPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
    shotNavigationArrows: {
      position: "absolute",
      bottom: 8,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    shotArrowButton: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 4,
      minWidth: 80,
    },
    disabledShotArrow: {
      backgroundColor: colors.border,
    },
    shotArrowText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff",
    },
    disabledShotArrowText: {
      color: colors.textSecondary,
    },
    shotRow: {
      marginBottom: 4,
    },
    shotRowContent: {
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      flexGrow: 1,
    },
    shotButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 40,
    },
    activeShotButton: {
      backgroundColor: "grey",
      borderColor: "black",
    },
    shotButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    activeShotButtonText: {
      color: "white",
    },
    penaltyButton: {
      backgroundColor: "#000000",
      borderColor: "#000000",
    },
    penaltyButtonText: {
      color: "#FFFFFF",
    },
    addShotGridButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: "#8B4513", // Brown outline
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
    },
    // xxx
    addShotGridButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#8B4513", // Brown text
    },
    videoContainer: {
      width: "100%",
      alignItems: "center",
      marginTop: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    videoPlayer: {
      width: "100%",
      height: 200,
      backgroundColor: "#000",
      borderRadius: 8,
    },
    reRecordButton: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.error,
      borderRadius: 20,
    },
    reRecordButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 14,
    },
  });

  if (!hole) {
    return (
      <View style={styles.container}>
        <Text
          style={{ color: colors.text, textAlign: "center", marginTop: 50 }}
        >
          Hole not found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation - Moved per request */}
      <TouchableOpacity
        style={[
          styles.navigationButtonBase,
          styles.navigationButtonOutline,
          { marginHorizontal: 20, marginBottom: 10, width: "auto", alignSelf: "stretch" },
        ]}
        onPress={handleViewSummary}
      >
        <Text style={[styles.buttonText, styles.navButtonText, { textAlign: "center" }]}>
          Round Summary
        </Text>
      </TouchableOpacity>

      {/* Top Nav Buttons */}
      <View
        style={[
          styles.navRow,
          {
            marginHorizontal: 20,
            marginBottom: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          },
        ]}
      >
        {/* Prev Hole */}
        <TouchableOpacity
          style={[
            styles.navigationButtonBase,
            styles.navigationButtonOutline,
            currentHole <= 1 && styles.disabledButton,
            { flex: 1 },
          ]}
          onPress={currentHole > 1 ? onPreviousHole : undefined}
          disabled={currentHole <= 1}
        >
          <Text
            style={[
              styles.buttonText,
              styles.navButtonText,
              currentHole <= 1 && styles.disabledButtonText,
            ]}
          >
            ← Prev
          </Text>
        </TouchableOpacity>

        {/* Hole History */}
        <TouchableOpacity
          style={[styles.navigationButtonBase, styles.navigationButtonOutline, { flex: 1 }]}
          onPress={onShowHistory}
        >
          <Text style={[styles.buttonText, styles.navButtonText]}>History</Text>
        </TouchableOpacity>

        {/* Next Hole */}
        <TouchableOpacity
          style={[
            styles.navigationButtonBase,
            styles.navigationButtonFilled,
            currentHole === 18 && styles.disabledButton,
            { flex: 1 },
          ]}
          onPress={currentHole < 18 ? onNextHole : undefined}
          disabled={currentHole === 18}
        >
          <Text
            style={[
              styles.buttonText,
              { color: colors.background },
              currentHole === 18 && styles.disabledButtonText,
            ]}
          >
            Next →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.holeInfo}>
          <Text style={styles.holeNumber}>
            Hole {currentHole}
            {(() => {
              const cumulativeOverPar = getCumulativeOverPar(
                currentHole,
                shots,
                putts
              );
              if (cumulativeOverPar === 0) return " (even par)";
              if (cumulativeOverPar > 0)
                return ` (${cumulativeOverPar} over)`;
              return ` (${Math.abs(cumulativeOverPar)} under)`;
            })()}
          </Text>
          <Text style={styles.holeDetails}>
            Par {hole.par} • Stroke Index {hole.strokeIndex}
            {hole.distanceYards && ` • ${hole.distanceYards} yards`}
          </Text>
          {handicap !== undefined && (
            <Text style={styles.bumpInfo}>
              {getBumpsForHole(hole) > 0
                ? `You get ${getBumpsForHole(hole)} stroke${getBumpsForHole(hole) === 1 ? "" : "s"
                } on this hole`
                : "No strokes on this hole"}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.scoreDisplay}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>{totalScore}</Text>
              {handicap !== undefined && getBumpsForHole(hole) > 0 && (
                <Text style={styles.bumpEmoji}>
                  {getBumpsForHole(hole) === 1 ? "☝️" : "✌️"}
                </Text>
              )}
            </View>
            <Text style={styles.netScoreText}>
              {netScore > 0
                ? `+${netScore}`
                : netScore === 0
                  ? "E"
                  : netScore}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      {/* Today's Distance Card - Moved to bottom of ScrollView */}

      {/* Distance Modal */}
      <Modal
        visible={showDistanceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDistanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.distanceModalContainer}>
            <View style={styles.distanceModalHeader}>
              <Text style={styles.distanceModalTitle}>Update Distance</Text>
              <TouchableOpacity onPress={() => setShowDistanceModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.distanceModalContent}>
              <Text style={styles.distanceModalLabel}>
                Today's Distance (yards):
              </Text>
              <TextInput
                style={styles.distanceModalInput}
                placeholder="Enter distance"
                placeholderTextColor={colors.textSecondary}
                value={todaysDistance}
                onChangeText={setTodaysDistance}
                keyboardType="numeric"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={() => {
                  const distanceValue = todaysDistance.trim()
                    ? parseInt(todaysDistance.trim())
                    : undefined;
                  onUpdateTodaysDistance(currentHole, distanceValue);
                  setShowDistanceModal(false);
                }}
                autoFocus={true}
              />
            </View>
            <View style={styles.distanceModalActions}>
              <TouchableOpacity
                style={styles.distanceModalButton}
                onPress={() => setShowDistanceModal(false)}
              >
                <Text style={styles.distanceModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.distanceModalButton,
                  styles.distanceModalButtonPrimary,
                ]}
                onPress={() => {
                  const distanceValue = todaysDistance.trim()
                    ? parseInt(todaysDistance.trim())
                    : undefined;
                  onUpdateTodaysDistance(currentHole, distanceValue);
                  setShowDistanceModal(false);
                }}
              >
                <Text
                  style={[
                    styles.distanceModalButtonText,
                    styles.distanceModalButtonTextPrimary,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Single Shot Display */}
      {/* Shot Grid Navigation - Moved to top */}
      {
        getCurrentShotInfo() && (
          <View style={styles.shotGridContainer}>
            {/* Shots Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.shotRow}
              contentContainerStyle={styles.shotRowContent}
            >
              {(shots || []).map((shot, index) => {
                const isPenalty = shot.direction === "penalty";
                return (
                  <TouchableOpacity
                    key={shot.id}
                    style={[
                      styles.shotButton,
                      currentShotIndex === index && styles.activeShotButton,
                      isPenalty && styles.penaltyButton,
                    ]}
                    onPress={() => {
                      setCurrentShotIndex(index);
                      forceScrollToTop();
                    }}
                  >
                    <Text
                      style={[
                        styles.shotButtonText,
                        currentShotIndex === index &&
                        styles.activeShotButtonText,
                        isPenalty && styles.penaltyButtonText,
                      ]}
                    >
                      {`s${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Shot Button */}
              <TouchableOpacity
                style={styles.addShotGridButton}
                onPress={addShot}
              >
                <Text style={styles.addShotGridButtonText}>+shot</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Putts Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.shotRow}
              contentContainerStyle={styles.shotRowContent}
            >
              {(putts || []).map((putt, index) => (
                <TouchableOpacity
                  key={putt.id}
                  style={[
                    styles.shotButton,
                    currentShotIndex === (shots || []).length + index &&
                    styles.activeShotButton,
                  ]}
                  onPress={() => {
                    setCurrentShotIndex((shots || []).length + index);
                    forceScrollToTop();
                  }}
                >
                  <Text
                    style={[
                      styles.shotButtonText,
                      currentShotIndex === (shots || []).length + index &&
                      styles.activeShotButtonText,
                    ]}
                  >
                    p{index + 1}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Add Putt Button */}
              <TouchableOpacity
                style={styles.addShotGridButton}
                onPress={addPutt}
              >
                <Text style={styles.addShotGridButtonText}>+putt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )
      }

      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.END) {
              const { translationX, velocityX } = nativeEvent;
              const swipeThreshold = 50;
              const velocityThreshold = 500;

              // Swipe right to left (Next) - negative translationX or high velocity to the left
              if (
                translationX < -swipeThreshold ||
                velocityX < -velocityThreshold
              ) {
                if (canGoNext) {
                  HapticFeedback.light();
                  goToNextShot();
                }
              }
              // Swipe left to right (Previous) - positive translationX or high velocity to the right
              else if (
                translationX > swipeThreshold ||
                velocityX > velocityThreshold
              ) {
                if (canGoPrevious) {
                  HapticFeedback.light();
                  goToPreviousShot();
                }
              }
            }
          }}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={[styles.content, { flex: 1 }]}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {(() => {
                const shotInfo = getCurrentShotInfo();
                if (!shotInfo) {
                  // No shots yet - show add shot options
                  return (
                    <View style={styles.noShotsContainer}>
                      <Text style={styles.noShotsText}>
                        No shots recorded yet
                      </Text>
                      <View style={styles.addShotButtonsContainer}>
                        <TouchableOpacity
                          style={[styles.addShotButton, styles.addShotButton]}
                          onPress={addShot}
                        >
                          <Text
                            style={[
                              styles.addShotButtonText,
                              styles.addShotButtonText,
                            ]}
                          >
                            + Add Shot
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.addShotButton, styles.addPuttButton]}
                          onPress={addPutt}
                        >
                          <Text
                            style={[
                              styles.addShotButtonText,
                              styles.addPuttButtonText,
                            ]}
                          >
                            + Add Putt
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                // Helper function to check if a club name is a group (has brackets)
                const isClubGroup = (clubName: string): boolean => {
                  return clubName.startsWith("[") && clubName.endsWith("]");
                };

                // Get club groups from the clubs list (anything with [])
                const clubGroups = (clubs || []).filter((club) =>
                  isClubGroup(club)
                );

                // Get regular clubs (not groups)
                const regularClubs = (clubs || []).filter(
                  (club) => !isClubGroup(club)
                );

                // Helper function to check if a club matches a group
                const clubMatchesGroup = (
                  clubName: string,
                  group: string
                ): boolean => {
                  // If the club is the group itself
                  if (clubName === group) return true;

                  // Helper to strip brackets
                  const strip = (s: string) => s.replace(/[\[\]]/g, "");

                  // If the club name matches the group name without brackets (e.g. "Driver" vs "[Driver]")
                  if (strip(clubName) === strip(group)) return true;

                  // Find which group this club belongs to
                  let currentGroup = null;
                  for (const c of (clubs || [])) {
                    if (isClubGroup(c)) {
                      currentGroup = c;
                    } else if (c === clubName) {
                      // Found the club, check if its group matches the target group
                      return currentGroup === group;
                    }
                  }

                  return false;
                };

                // Smart club selection based on user's default clubs
                const getSmartClubSelection = (
                  targetShotNumber: number,
                  targetPar: number
                ): string => {
                  const defaultClubs = data.settings.defaultClubs;

                  console.log("club-select: smart selection", { targetPar, targetShotNumber, defaults: defaultClubs });

                  if (targetPar === 5) {
                    if (targetShotNumber === 1) return defaultClubs?.par5?.shot1 || "[Driver]";
                    if (targetShotNumber === 2) return defaultClubs?.par5?.shot2 || "[Irons]";
                    return defaultClubs?.par5?.shot3 || "[Irons]";
                  } else if (targetPar === 4) {
                    if (targetShotNumber === 1) return defaultClubs?.par4?.shot1 || "[Driver]";
                    return defaultClubs?.par4?.shot2 || "[Irons]";
                  } else if (targetPar === 3) {
                    return defaultClubs?.par3?.shot1 || "[Irons]";
                  }

                  return "[Driver]"; // Fallback
                };

                // Get clubs with groups for dropdown - maintain the order from settings
                const clubsWithGroups = clubs || [];

                // Get default club for current shot
                const defaultClubForShot = hole && shotInfo.isShot
                  ? getSmartClubSelection(shotInfo.shotNumber, hole.par)
                  : null;

                return (
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={[
                        styles.shotCard,
                        { marginBottom: 0, paddingBottom: 18 },
                      ]}
                    >
                      {/* Shot Header */}
                      <View style={styles.shotHeader}>
                        <Text style={styles.shotNumber}>
                          {shotInfo.type === "shot"
                            ? `Shot ${shotInfo.shotNumber}`
                            : `Putt ${shotInfo.shotNumber}`}
                        </Text>
                      </View>

                      {/* Record Swing Component */}
                      <View style={{ marginBottom: 12, marginTop: 4 }}>
                        {shotInfo.shot.videoUri ? (
                          <View style={styles.videoContainer}>
                            <Video
                              ref={shotVideoRef}
                              source={{ uri: shotInfo.shot.videoUri }}
                              style={styles.videoPlayer}
                              useNativeControls
                              resizeMode={ResizeMode.CONTAIN}
                              isLooping
                              rate={playbackRate}
                              shouldCorrectPitch={false}
                              onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                                if (status.isLoaded) {
                                  setIsPlaying(status.isPlaying);
                                }
                              }}
                              onFullscreenUpdate={(event) => {
                                if (
                                  event.fullscreenUpdate ===
                                  VideoFullscreenUpdate.PLAYER_DID_DISMISS
                                ) {
                                  if (shotVideoRef.current) {
                                    shotVideoRef.current.pauseAsync();
                                  }
                                }
                              }}
                            />
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 12,
                                marginTop: 12,
                                marginBottom: 4,
                              }}
                            >
                              {[1.0, 0.5, 0.25].map((rate) => (
                                <TouchableOpacity
                                  key={rate}
                                  style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: "rgba(255, 255, 255, 0.3)",
                                    minWidth: 70,
                                  }}
                                  onPress={async () => {
                                    setPlaybackRate(rate);
                                    if (shotVideoRef.current) {
                                      await shotVideoRef.current.playAsync();
                                      await shotVideoRef.current.presentFullscreenPlayer();
                                    }
                                    HapticFeedback.light();
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: "#FFFFFF",
                                      fontSize: 14,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {rate === 1.0 ? "1x" : `${rate}x`}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TouchableOpacity
                              style={styles.reRecordButton}
                              onPress={() => {
                                Alert.alert(
                                  "Re-record Swing",
                                  "This will delete the current recording. Are you sure?",
                                  [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                      text: "Delete",
                                      style: "destructive",
                                      onPress: () =>
                                        updateShot(
                                          shotInfo.shot.id,
                                          shotInfo.type === "shot" ? "shot" : "putt",
                                          "videoUri",
                                          undefined
                                        ),
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.reRecordButtonText}>
                                Re-record Swing
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <RecordSwing
                            holeNumber={currentHole}
                            shotNumber={shotInfo.shotNumber}
                            club={shotInfo.shot.club || "Unknown"}
                            countdownSeconds={
                              data.settings.swingRecording.countdownSeconds
                            }
                            durationSeconds={
                              data.settings.swingRecording.durationSeconds
                            }
                            colors={colors}
                            onRecordingComplete={handleRecordingComplete}
                          />
                        )}
                      </View>

                      <View style={styles.shotFields}>
                        <View
                          style={[
                            styles.shotFieldRow,
                            { flexDirection: "column", gap: 8 },
                          ]}
                        >
                          {shotInfo.isShot ? (
                            <>
                              {/* Quick-select club buttons */}
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  marginBottom: 8,
                                  justifyContent: "center",
                                }}
                              >
                                {clubGroups.map((group) => {
                                  const isSelected =
                                    shotInfo.shot.club &&
                                    clubMatchesGroup(shotInfo.shot.club, group);
                                  // Also highlight if this group matches the default club for this shot
                                  const isDefault =
                                    defaultClubForShot &&
                                    clubMatchesGroup(defaultClubForShot, group);
                                  const shouldHighlight =
                                    isSelected ||
                                    (isDefault && !shotInfo.shot.club);
                                  return (
                                    <TouchableOpacity
                                      key={group}
                                      style={[
                                        styles.quickClubButton,
                                        {
                                          backgroundColor: shouldHighlight
                                            ? colors.border
                                            : colors.background,
                                          borderColor: colors.primary,
                                          borderWidth: 1,
                                        },
                                      ]}
                                      onPress={() => {
                                        if (
                                          shotInfo.shot.direction !== "penalty"
                                        ) {
                                          // Assign the group name directly as the club
                                          updateShot(
                                            shotInfo.shot.id,
                                            "shot",
                                            "club",
                                            group
                                          );
                                          // Hide dropdown when a group is selected
                                          setShowClubDropdown(false);
                                        }
                                      }}
                                      disabled={
                                        shotInfo.shot.direction === "penalty"
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.quickClubButtonText,
                                          {
                                            color: shouldHighlight
                                              ? colors.text
                                              : colors.text,
                                          },
                                        ]}
                                      >
                                        {group.replace(/[\[\]]/g, "")}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                                {/* Other button - shows dropdown without selecting */}
                                <TouchableOpacity
                                  style={[
                                    styles.quickClubButton,
                                    {
                                      backgroundColor: colors.background,
                                      borderColor: colors.primary,
                                      borderWidth: 1,
                                    },
                                  ]}
                                  onPress={() => {
                                    // Show the dropdown when "Other" is clicked
                                    // The useEffect will handle opening the modal
                                    setShowClubDropdown(true);
                                  }}
                                  disabled={shotInfo.shot.direction === "penalty"}
                                >
                                  <Text
                                    style={[
                                      styles.quickClubButtonText,
                                      { color: colors.text },
                                    ]}
                                  >
                                    Other
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {/* Club dropdown - Only show if "Other" was clicked or a non-group club is selected */}
                              {showClubDropdown && (
                                <View style={{ width: "100%", marginTop: 8 }}>
                                  <Dropdown
                                    ref={clubDropdownRef}
                                    options={clubsWithGroups}
                                    selectedValue={shotInfo.shot.club || ""}
                                    onSelect={(value) => {
                                      if (shotInfo.shot.direction !== "penalty") {
                                        // Assign the selected value directly (could be a group or a regular club)
                                        updateShot(
                                          shotInfo.shot.id,
                                          "shot",
                                          "club",
                                          value
                                        );
                                        // If a group was selected, hide the dropdown; otherwise keep it visible
                                        if (clubGroups.includes(value)) {
                                          setShowClubDropdown(false);
                                        }
                                      }
                                    }}
                                    style={[
                                      styles.clubDropdown,
                                      shotInfo.shot.direction === "penalty" && {
                                        opacity: 0.5,
                                      },
                                    ]}
                                    textStyle={styles.dropdownText}
                                    placeholder="club"
                                  />
                                </View>
                              )}
                            </>
                          ) : (
                            <>
                              <View style={{ flex: 1 }}>
                                <Dropdown
                                  options={PUTT_DISTANCE_OPTIONS}
                                  selectedValue={
                                    shotInfo.shot.puttDistance || "5-10ft"
                                  }
                                  onSelect={(value) =>
                                    updateShot(
                                      shotInfo.shot.id,
                                      "putt",
                                      "puttDistance",
                                      value
                                    )
                                  }
                                  style={styles.puttDistanceDropdown}
                                  textStyle={styles.dropdownText}
                                />
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Dynamic Navigation Pills - Contextual Next/Prev buttons */}
                    {(() => {
                      const shotInfo = getCurrentShotInfo();
                      if (!shotInfo) return null;

                      const canGoPrevious = currentShotIndex > 0;
                      const canGoNext =
                        currentShotIndex < getAllShots().length - 1;

                      return (
                        <View
                          style={[
                            styles.outcomeGridNavigation,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: 20,
                              paddingVertical: 8,
                              justifyContent: "space-between",
                            },
                          ]}
                        >
                          {/* Previous shot */}
                          <View
                            style={{
                              flex: 1,
                              alignItems: "flex-start",
                              justifyContent: "center",
                            }}
                          >
                            {canGoPrevious && (
                              <TouchableOpacity
                                style={styles.smallNavigationPillPrev}
                                onPress={goToPreviousShot}
                              >
                                <Text
                                  style={[
                                    styles.smallNavigationPillText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {(() => {
                                    const prevShotIndex = currentShotIndex - 1;
                                    if (prevShotIndex < (shots || []).length) {
                                      return `← Shot ${prevShotIndex + 1}`;
                                    } else {
                                      const puttIndex =
                                        prevShotIndex - (shots || []).length;
                                      return `← Putt ${puttIndex + 1}`;
                                    }
                                  })()}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Delete current shot */}
                          <View
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <TouchableOpacity
                              style={styles.deleteShotButton}
                              onPress={() => {
                                const currentShotInfo = getCurrentShotInfo();
                                if (currentShotInfo) {
                                  removeShot(
                                    currentShotInfo.shot.id,
                                    currentShotInfo.type === "shot"
                                      ? "shot"
                                      : "putt"
                                  );
                                }
                              }}
                            >
                              <Text style={styles.deleteShotButtonText}>
                                {(() => {
                                  const currentShotInfo = getCurrentShotInfo();
                                  return currentShotInfo
                                    ? currentShotInfo.type === "shot"
                                      ? "Delete Shot"
                                      : "Delete Putt"
                                    : "Delete";
                                })()}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Next shot */}
                          <View
                            style={{
                              flex: 1,
                              alignItems: "flex-end",
                              justifyContent: "center",
                            }}
                          >
                            {canGoNext && (
                              <TouchableOpacity
                                style={styles.smallNavigationPill}
                                onPress={goToNextShot}
                              >
                                <Text
                                  style={[
                                    styles.smallNavigationPillText,
                                    { color: colors.background },
                                  ]}
                                >
                                  {(() => {
                                    const nextShotIndex = currentShotIndex + 1;
                                    if (nextShotIndex < (shots || []).length) {
                                      return `Shot ${nextShotIndex + 1} →`;
                                    } else {
                                      const puttIndex =
                                        nextShotIndex - (shots || []).length;
                                      return `Putt ${puttIndex + 1} →`;
                                    }
                                  })()}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })()}

                    {/* Outcome Grid for this shot */}
                    <View style={{ height: 12, marginTop: 6 }} />
                    <View
                      style={[
                        shotInfo.shot.direction === "penalty" && {
                          backgroundColor: "#000000",
                          borderRadius: 8,
                          padding: 8,
                        },
                      ]}
                    >
                      <OutcomeGrid
                        shotType={
                          shotInfo.type === "shot" ? "iron" : shotInfo.type
                        }
                        shotNumber={shotInfo.shotNumber}
                        historicalData={
                          shotInfo.isShot
                            ? historicalData.shot || {}
                            : historicalData.putts || {}
                        }
                        selectedOutcome={shotInfo.shot.direction}
                        isPoorShot={shotInfo.shot.poorShot === true}
                        onSelect={(outcome) => {
                          updateShot(
                            shotInfo.shot.id,
                            shotInfo.type === "shot" ? "shot" : "putt",
                            "direction",
                            outcome
                          );
                          updateShot(
                            shotInfo.shot.id,
                            shotInfo.type === "shot" ? "shot" : "putt",
                            "poorShot",
                            false
                          );
                        }}
                        onPoopSelect={(outcome) => {
                          updateShot(
                            shotInfo.shot.id,
                            shotInfo.type === "shot" ? "shot" : "putt",
                            "direction",
                            outcome
                          );
                          updateShot(
                            shotInfo.shot.id,
                            shotInfo.type === "shot" ? "shot" : "putt",
                            "poorShot",
                            true
                          );
                        }}
                        onFlameAnimation={onFlameAnimation}
                        onPoopAnimation={onPoopAnimation}
                        showError={
                          showValidationError && !shotInfo.shot.direction
                        }
                        colors={colors}
                      />
                    </View>

                    {/* OB/Water buttons - Moved to bottom */}
                    {shotInfo.isShot && (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          marginTop: 0,
                          marginBottom: 8,
                        }}
                      >
                        <TouchableOpacity
                          style={[styles.obWaterButton, { flex: 1 }]}
                          onPress={() => {
                            if (shotInfo.shot.direction !== "penalty") {
                              updateShot(
                                shotInfo.shot.id,
                                "shot",
                                "lie",
                                shotInfo.shot.lie === "ob" ? "fairway" : "ob"
                              );
                              // Handle OB - set next shot to penalty
                              const nextShotIndex = 1; // s2 is index 1
                              if (nextShotIndex < shots.length) {
                                updateShot(
                                  shots[nextShotIndex].id,
                                  "shot",
                                  "direction",
                                  "penalty"
                                );
                              }

                              // If setting OB (not unsetting), prompt to add another shot
                              if (shotInfo.shot.lie !== "ob") {
                                Alert.alert(
                                  "Add Another Shot?",
                                  "Do you want to add another shot?",
                                  [
                                    {
                                      text: "No",
                                      style: "cancel",
                                    },
                                    {
                                      text: "Yes",
                                      onPress: () => {
                                        // Add another shot with gap wedge default
                                        const newShot: Shot = {
                                          id: `shot-${Date.now()}-${Math.random()}`,
                                          type: "shot",
                                          lie: "green",
                                          direction: "good", // Default to good
                                          club: "Gap Wedge", // Default to gap wedge
                                          timestamp: Date.now(),
                                        };

                                        setShots((prev) => [...prev, newShot]);
                                        // Stay on current shot, don't navigate to the new shot
                                      },
                                    },
                                  ]
                                );
                              }
                            }
                          }}
                          disabled={shotInfo.shot.direction === "penalty"}
                        >
                          <Text style={styles.obWaterButtonText}>OB</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.obWaterButton, { flex: 1 }]}
                          onPress={() => {
                            if (shotInfo.shot.direction !== "penalty") {
                              updateShot(
                                shotInfo.shot.id,
                                "shot",
                                "lie",
                                shotInfo.shot.lie === "water"
                                  ? "fairway"
                                  : "water"
                              );
                              // Handle Water - set next shot to penalty
                              const nextShotIndex = 1; // s2 is index 1
                              if (nextShotIndex < shots.length) {
                                updateShot(
                                  shots[nextShotIndex].id,
                                  "shot",
                                  "direction",
                                  "penalty"
                                );
                              }

                              // If setting Water (not unsetting), prompt to add another shot
                              if (shotInfo.shot.lie !== "water") {
                                Alert.alert(
                                  "Add Another Shot?",
                                  "Do you want to add another shot?",
                                  [
                                    {
                                      text: "No",
                                      style: "cancel",
                                    },
                                    {
                                      text: "Yes",
                                      onPress: () => {
                                        // Add another shot with gap wedge default
                                        const newShot: Shot = {
                                          id: `shot-${Date.now()}-${Math.random()}`,
                                          type: "shot",
                                          lie: "green",
                                          direction: "good", // Default to good
                                          club: "Gap Wedge", // Default to gap wedge
                                          timestamp: Date.now(),
                                        };

                                        setShots((prev) => [...prev, newShot]);
                                        // Stay on current shot, don't navigate to the new shot
                                      },
                                    },
                                  ]
                                );
                              }
                            }
                          }}
                          disabled={shotInfo.shot.direction === "penalty"}
                        >
                          <Text style={styles.obWaterButtonText}>Water</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Today's Distance - Moved to bottom */}
                    <View
                      style={[
                        styles.todaysDistanceCard,
                        { marginTop: 8, marginBottom: 0 },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.todaysDistanceContainer}
                        onPress={() => setShowDistanceModal(true)}
                      >
                        <Text style={styles.todaysDistanceLabel}>
                          Today's Distance:{" "}
                          {todaysDistance || hole?.todaysDistance || "Not set"}
                        </Text>
                        <Text style={styles.editIcon}>✎</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </PanGestureHandler>
      </GestureHandlerRootView>

      {/* Shot Navigation Arrows - Moved to bottom */}
    </View >
  );
}
);



// Course Creation Modal

export const GolfBrainSpark: React.FC<
  GolfBrainSparkProps & {
    openCourseSelectionSignal?: number;
    settingsInitialTab?: string;
  }
> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  openCourseSelectionSignal,
  settingsInitialTab,
}) => {
    const getSparkData = useSparkStore(state => state.getSparkData);
    const setSparkData = useSparkStore(state => state.setSparkData);
    const { colors } = useTheme();

    const [dataLoaded, setDataLoaded] = useState(false);

    const [infoBanner, setInfoBanner] = useState<string | null>(null);
    const [internalShowSettings, setInternalShowSettings] = useState(false);

    const [data, setData] = useState<GolfBrainData>({
      courses: [DEFAULT_COURSE, DEFAULT_COURSE_BACK9],
      rounds: [],
      settings: {
        showHints: true,
        autoAdvance: false,
        clubs: DEFAULT_CLUBS,
        defaultClubs: {
          par5: {
            shot1: "Driver",
            shot2: "7-Iron",
            shot3: "9-Iron",
          },
          par4: {
            shot1: "Driver",
            shot2: "9-Iron",
          },
          par3: {
            shot1: "7-Iron",
          },
        },
        swingRecording: {
          countdownSeconds: 5,
          durationSeconds: 30,
        },
      },
    });

    const [currentScreen, setCurrentScreen] = useState<
      "course-selection" | "hole-detail" | "round-summary"
    >("course-selection");
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [currentHole, setCurrentHole] = useState(1);
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showHandicapOnboarding, setShowHandicapOnboarding] = useState(false);
    const [roundEnded, setRoundEnded] = useState(false);
    const [flameAnimation, setFlameAnimation] = useState<{
      visible: boolean;
      flames: Array<{
        id: string;
        x: number;
        y: number;
        rotation: number;
        scale: number;
        targetY: number;
        translateY: Animated.Value;
      }>;
    }>({
      visible: false,
      flames: [],
    });

    const [poopAnimation, setPoopAnimation] = useState<{
      visible: boolean;
      poops: Array<{
        id: string;
        x: number;
        y: number;
        rotation: number;
        scale: number;
        targetY: number;
        translateY: Animated.Value;
      }>;
    }>({
      visible: false,
      poops: [],
    });

    // Store temporary hole data for navigation
    const [tempHoleData, setTempHoleData] = useState<
      Record<number, { shots: Shot[]; putts: Shot[] }>
    >({});
    const holeDetailRef = useRef<{ saveCurrentData: () => void }>(null);

    // React to parent signal to open Course Selection for a new round
    useEffect(() => {
      if (
        typeof openCourseSelectionSignal === "number" &&
        openCourseSelectionSignal > 0
      ) {
        setCurrentScreen("course-selection");
        setSelectedCourse(null);
        setShowCreateModal(false);
        HapticFeedback.light();

        // Show a transient confirmation banner so it's obvious the + worked
        setInfoBanner("Start New Round — choose a course");
        setTimeout(() => setInfoBanner(null), 2800);
      }
    }, [openCourseSelectionSignal]);

    // Track store hydration state
    const [storeHydrated, setStoreHydrated] = useState(false);

    // Subscribe to store updates for checking hydration
    // We use a polling approach as a fallback because onFinishHydration is hard to hook into dynamically
    useEffect(() => {
      const checkHydration = () => {
        // Check if the persist middleware has finished rehydrating
        const isHydrated = useSparkStore.persist && useSparkStore.persist.hasHydrated();
        if (isHydrated) {
          setStoreHydrated(true);
        }
      };

      checkHydration();

      const interval = setInterval(() => {
        if (!storeHydrated) {
          checkHydration();
        } else {
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    }, [storeHydrated]);

    // Use reactive selector for spark data
    const savedSparkData = useSparkStore(state => state.sparkData["golf-brain"]);

    // Load saved data on mount - wait for hydration
    useEffect(() => {
      if (!storeHydrated && !savedSparkData) {
        // If not hydrated and no data, wait.
        // Note: if savedSparkData exists, hydration presumably happened or we have something.
        return;
      }

      // If we are already initialized, don't run again
      if (dataLoaded) return;

      // Use the reactive data if available, or fall back to getSparkData logic (which returns {})
      // We cast to any to safely check emptiness or property existence if needed
      const savedData = (savedSparkData || getSparkData("golf-brain")) as GolfBrainData;

      // Check if it's truly empty (initial store state returning {})
      const isEmpty = Object.keys(savedData).length === 0;

      // If store says hydrated but data is empty, it's a new user.
      // If store NOT hydrated and data empty, we should have waited (covered by first check)

      if (savedData && !isEmpty) {
        // Ensure default courses are always available
        const hasDefaultCourse = savedData.courses?.some(
          (course: Course) => course.id === DEFAULT_COURSE.id
        );
        const hasDefaultBack9Course = savedData.courses?.some(
          (course: Course) => course.id === DEFAULT_COURSE_BACK9.id
        );

        let courses = savedData.courses || [];
        if (!hasDefaultCourse) {
          courses = [DEFAULT_COURSE, ...courses];
        }
        if (!hasDefaultBack9Course) {
          courses = [DEFAULT_COURSE_BACK9, ...courses];
        }

        const mergedData = {
          ...savedData,
          courses,
          rounds: savedData.rounds || [],
          settings: {
            showHints: savedData.settings?.showHints ?? true,
            autoAdvance: savedData.settings?.autoAdvance ?? false,
            clubs: savedData.settings?.clubs ?? DEFAULT_CLUBS,
            handicap: savedData.settings?.handicap,
            defaultClubs: {
              par5: {
                shot1: savedData.settings?.defaultClubs?.par5?.shot1 || "Driver",
                shot2: savedData.settings?.defaultClubs?.par5?.shot2 || "7-Iron",
                shot3: savedData.settings?.defaultClubs?.par5?.shot3 || "9-Iron",
              },
              par4: {
                shot1: savedData.settings?.defaultClubs?.par4?.shot1 || "Driver",
                shot2: savedData.settings?.defaultClubs?.par4?.shot2 || "9-Iron",
              },
              par3: {
                shot1: savedData.settings?.defaultClubs?.par3?.shot1 || "7-Iron",
              },
            },
            swingRecording: {
              countdownSeconds: savedData.settings?.swingRecording?.countdownSeconds ?? 5,
              durationSeconds: savedData.settings?.swingRecording?.durationSeconds ?? 30,
            },
          },
        };
        console.log("hydration data.settings.countdown value:", mergedData.settings?.swingRecording?.countdownSeconds);
        setData(mergedData);
        if (savedData.currentRound) {
          setCurrentRound(savedData.currentRound);
          setSelectedCourse(
            savedData.courses.find(
              (c) => c.id === savedData.currentRound?.courseId
            ) || null
          );
          setCurrentScreen("hole-detail");
        }
        setDataLoaded(true);
      } else {
        // Only resolve empty/new user if we are SURE we are hydrated
        if (storeHydrated) {
          setDataLoaded(true);
        }
      }
    }, [storeHydrated, savedSparkData, dataLoaded, getSparkData]);

    // Handle screen navigation based on data state
    useEffect(() => {
      // If no courses exist, go to course selection
      if (data.courses && data.courses.length === 0) {
        setCurrentScreen("course-selection");
        return;
      }

      // Check for rounds in progress
      const inProgressRound = data.rounds?.find((round) => !round.isComplete);
      if (inProgressRound && data.courses) {
        const course = data.courses.find(
          (c) => c.id === inProgressRound.courseId
        );
        if (course) {
          setSelectedCourse(course);
          setCurrentRound(inProgressRound);
          setData((prev) => ({
            ...prev,
            currentRound: inProgressRound,
          }));
          setCurrentScreen("hole-detail");
          return;
        }
      }

      // Default to course selection if we have courses but no active round
      if (
        data.courses &&
        data.courses.length > 0 &&
        currentScreen === "hole-detail" &&
        !selectedCourse
      ) {
        setCurrentScreen("course-selection");
      }
    }, [data.courses, data.rounds, currentScreen, selectedCourse]);

    // Show handicap onboarding when no handicap is set
    useEffect(() => {
      if (
        currentScreen === "hole-detail" &&
        data.settings.handicap === undefined &&
        !showSettings
      ) {
        setShowHandicapOnboarding(true);
      } else if (
        data.settings.handicap !== undefined ||
        currentScreen !== "hole-detail"
      ) {
        setShowHandicapOnboarding(false);
      }
    }, [data.settings.handicap, showSettings, currentScreen]);

    // Save data whenever it changes
    useEffect(() => {
      if (dataLoaded) {
        // Only save if it's not a round/course change that was already handled
        setSparkData("golf-brain", data);
        onStateChange?.({
          courseCount: data.courses?.length || 0,
          roundCount: data.rounds?.length || 0,
        });
      }
    }, [data, dataLoaded, setSparkData, onStateChange]);

    const handleSelectCourse = (course: Course) => {
      setSelectedCourse(course);
      setCurrentHole(1);
      setRoundEnded(false); // Reset round ended state when starting new round

      // Clear any temporary hole data from previous rounds
      setTempHoleData({});

      // Create new round
      const newRound: Round = {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        courseId: course.id,
        courseName: course.name,
        holeScores: [],
        totalScore: 0,
        totalPar: (course.holes || []).reduce((sum, hole) => sum + hole.par, 0),
        startedAt: Date.now(),
        isComplete: false,
      };

      setCurrentRound(newRound);
      setData((prev) => ({
        ...prev,
        currentRound: newRound,
      }));
      setCurrentScreen("hole-detail");
      HapticFeedback.light();
    };

    const handleCreateCourse = (courseData: Omit<Course, "id" | "createdAt">) => {
      const newCourse: Course = {
        ...courseData,
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        createdAt: Date.now(),
      };

      setData((prev) => ({
        ...prev,
        courses: [...(prev.courses || []), newCourse],
      }));

      HapticFeedback.success();
    };

    const handleCompleteHole = (holeScore: HoleScore) => {
      if (!currentRound || !selectedCourse) return;

      const updatedRound = {
        ...currentRound,
        holeScores: [
          ...currentRound.holeScores.filter(
            (h) => h.holeNumber !== holeScore.holeNumber
          ),
          holeScore,
        ],
        totalScore:
          currentRound.holeScores
            .filter((h) => h.holeNumber !== holeScore.holeNumber)
            .reduce((sum, h) => sum + h.totalScore, 0) + holeScore.totalScore,
      };

      setCurrentRound(updatedRound);
      setData((prev) => ({
        ...prev,
        currentRound: updatedRound,
      }));

      // Note: Round completion is now handled by handleEndRound() when "End Round" is clicked
      // This prevents duplicate rounds from being created

      // Move to next hole if not hole 18
      if (holeScore.holeNumber < 18) {
        const nextHole = holeScore.holeNumber + 1;
        setCurrentHole(nextHole);

        // Clear any temporary data for the next hole to ensure it starts fresh
        setTempHoleData((prev) => {
          const updated = { ...prev };
          delete updated[nextHole];
          return updated;
        });
      }

      HapticFeedback.success();
    };

    const handleNextHole = () => {
      if (currentHole < 18) {
        // Save current hole data before navigating
        if (holeDetailRef.current) {
          holeDetailRef.current.saveCurrentData();
        }
        const nextHole = currentHole + 1;
        setCurrentHole(nextHole);

        // Clear any temporary data for the next hole to ensure it starts fresh
        setTempHoleData((prev) => {
          const updated = { ...prev };
          delete updated[nextHole];
          return updated;
        });
      }
    };

    const handlePreviousHole = () => {
      if (currentHole > 1) {
        // Save current hole data before navigating
        if (holeDetailRef.current) {
          holeDetailRef.current.saveCurrentData();
        }
        setCurrentHole((prev) => prev - 1);
      }
    };

    const handleShowHistory = () => {
      setShowHistoryModal(true);
    };

    const handleSaveHoleData = (
      holeNumber: number,
      shots: Shot[],
      putts: Shot[]
    ) => {
      console.log("handleSaveHoleData called:", {
        holeNumber,
        shots: shots || [],
        putts: putts || [],
        shotsCount: (shots || []).length,
        puttsCount: (putts || []).length,
        currentRound: currentRound?.id,
      });

      // Save to temporary storage for navigation
      setTempHoleData((prev) => ({
        ...prev,
        [holeNumber]: { shots: shots, putts },
      }));

      // Also save to permanent database if we have a current round
      if (currentRound) {
        const totalShots = (shots || []).length + (putts || []).length;

        // Only save holes that have shots
        if (totalShots > 0) {
          const holeScore: HoleScore = {
            holeNumber,
            courseId: currentRound.courseId,
            shots: [...(shots || []), ...(putts || [])],
            totalScore: totalShots,
            par:
              selectedCourse?.holes.find((h) => h.number === holeNumber)?.par ||
              4,
            netScore:
              totalShots -
              (selectedCourse?.holes.find((h) => h.number === holeNumber)?.par ||
                4),
            completedAt: Date.now(),
          };

          console.log("Saving hole score to permanent database:", holeScore);

          // Update the current round with this hole's data
          setData((prev) => {
            const updatedRounds = (prev.rounds || []).map((round) =>
              round.id === currentRound.id
                ? {
                  ...round,
                  holeScores: [
                    ...(round.holeScores || []).filter(
                      (hs) => hs.holeNumber !== holeNumber
                    ),
                    holeScore,
                  ],
                }
                : round
            );

            const updatedCurrentRound = {
              ...currentRound,
              holeScores: [
                ...(currentRound.holeScores || []).filter(
                  (hs) => hs.holeNumber !== holeNumber
                ),
                holeScore,
              ],
            };

            console.log("Updating current round with hole data:", {
              holeNumber,
              updatedHoleScores: updatedCurrentRound.holeScores.length,
              currentRoundId: currentRound.id,
            });

            return {
              ...prev,
              rounds: updatedRounds,
              currentRound: updatedCurrentRound,
            };
          });

          // Also update local currentRound state to stay in sync
          setCurrentRound((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              holeScores: [
                ...(prev.holeScores || []).filter(
                  (hs) => hs.holeNumber !== holeNumber
                ),
                holeScore,
              ],
            };
          });
        } else {
          // Remove empty hole from database
          console.log("Removing empty hole from database:", holeNumber);

          setData((prev) => {
            const updatedRounds = (prev.rounds || []).map((round) =>
              round.id === currentRound.id
                ? {
                  ...round,
                  holeScores: (round.holeScores || []).filter(
                    (hs) => hs.holeNumber !== holeNumber
                  ),
                }
                : round
            );

            return {
              ...prev,
              rounds: updatedRounds,
              currentRound: {
                ...currentRound,
                holeScores: (currentRound.holeScores || []).filter(
                  (hs) => hs.holeNumber !== holeNumber
                ),
              },
            };
          });

          // Also update local currentRound state to stay in sync
          setCurrentRound((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              holeScores: (prev.holeScores || []).filter(
                (hs) => hs.holeNumber !== holeNumber
              ),
            };
          });
        }
      }
    };

    const handleLoadHoleData = (holeNumber: number) => {
      console.log("handleLoadHoleData called for hole:", holeNumber);
      console.log("tempHoleData:", tempHoleData);

      // First check temporary storage (for current session)
      if (tempHoleData[holeNumber]) {
        const tempData = tempHoleData[holeNumber];
        console.log("Found temp data for hole", holeNumber, ":", tempData);
        // Migrate putts in temporary storage if needed
        const migratedPutts = (tempData.putts || []).map((putt) => ({
          ...putt,
          puttDistance:
            putt.puttDistance || (putt as any).feet
              ? (putt as any).feet < 4
                ? ("<4ft" as const)
                : (putt as any).feet <= 10
                  ? ("5-10ft" as const)
                  : ("10+ft" as const)
              : undefined,
        })) as Shot[];
        const result = {
          ...tempData,
          shots: tempData.shots || [],
          putts: migratedPutts,
        };
        console.log("Returning temp data:", result);
        return result;
      }

      // Then check permanent database (for previously saved data)
      if (currentRound) {
        const existingHoleScore = (currentRound.holeScores || []).find(
          (hs) => hs.holeNumber === holeNumber
        );
        if (existingHoleScore) {
          const shots = (existingHoleScore.shots || []).filter(
            (shot) => shot.type === "shot"
          );
          const putts = (existingHoleScore.shots || [])
            .filter((shot) => shot.type === "putt")
            .map((putt) => ({
              ...putt,
              // Migrate old 'feet' field to 'puttDistance' if needed
              puttDistance:
                putt.puttDistance || (putt as any).feet
                  ? (putt as any).feet < 4
                    ? ("<4ft" as const)
                    : (putt as any).feet <= 10
                      ? ("5-10ft" as const)
                      : ("10+ft" as const)
                  : undefined,
            })) as Shot[];
          return { shots: shots, putts };
        }
      }

      console.log("No data found for hole", holeNumber, "returning null");
      return null;
    };

    const handleUpdateTodaysDistance = (
      holeNumber: number,
      distance: number | undefined
    ) => {
      if (!selectedCourse) return;

      // Update the course's hole todaysDistance
      const updatedCourse = {
        ...selectedCourse,
        holes: selectedCourse.holes.map((hole) =>
          hole.number === holeNumber
            ? { ...hole, todaysDistance: distance }
            : hole
        ),
      };

      // Update the course in the data
      const updatedData = {
        ...data,
        courses: (data.courses || []).map((course) =>
          course.id === selectedCourse.id ? updatedCourse : course
        ),
      };

      setSparkData("golf-brain", updatedData);
      setSelectedCourse(updatedCourse);
    };

    const handleSetHandicap = (handicap: number) => {
      setData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          handicap,
          swingRecording: prev.settings.swingRecording || {
            countdownSeconds: 5,
            durationSeconds: 30,
          },
        },
      }));
      setShowHandicapOnboarding(false);
      HapticFeedback.light();
    };

    const handleEditRound = (round: Round) => {
      console.log("handleEditRound called with round:", {
        id: round.id,
        courseId: round.courseId,
        courseName: round.courseName,
      });

      // Check if there's an active round
      if (data.currentRound && data.currentRound.id !== round.id) {
        console.log("Active round in progress, showing alert");
        Alert.alert(
          "Active Round in Progress",
          "You must end your current round before editing another round.",
          [{ text: "OK", style: "default" }]
        );
        return;
      }

      console.log("Setting round as current and navigating to round summary");
      // Set the round as current and navigate to round summary
      setData((prev) => ({
        ...prev,
        currentRound: round,
      }));
      // Also update local currentRound state for consistency
      setCurrentRound(round);
      const course = data.courses.find((c) => c.id === round.courseId);
      console.log("Found course for round:", {
        courseId: round.courseId,
        course: course?.name || "Not found",
      });
      setSelectedCourse(course || null);
      setCurrentScreen("round-summary");
      console.log("Navigation state set:", {
        currentScreen: "round-summary",
        selectedCourse: course?.name,
        currentRound: round.id,
      });
      // Close settings when navigating to round summary
      if (onCloseSettings) {
        onCloseSettings();
      }
    };

    const handleViewRound = (round: Round) => {
      // For active rounds, just navigate to round summary without changing current round
      setCurrentRound(round);
      setData((prev) => ({
        ...prev,
        currentRound: round,
      }));
      setSelectedCourse(
        data.courses.find((c) => c.id === round.courseId) || null
      );
      setCurrentScreen("round-summary");
      // Close settings when navigating to round summary
      if (onCloseSettings) {
        onCloseSettings();
      }
    };

    const handleDeleteRound = (roundId: string) => {
      console.log("handleDeleteRound called with roundId:", roundId);
      console.log(
        "Current rounds before deletion:",
        (data.rounds || []).map((r) => ({ id: r.id, courseName: r.courseName }))
      );

      // Safety check - if roundId is undefined or empty, don't delete anything
      if (!roundId) {
        console.error("handleDeleteRound called with empty roundId");
        return;
      }

      setData((prev) => {
        const filteredRounds = (prev.rounds || []).filter((round) => {
          const shouldKeep = round.id !== roundId;
          console.log(
            `Round ${round.id} ${shouldKeep ? "kept" : "deleted"
            } (comparing with ${roundId})`
          );
          return shouldKeep;
        });
        console.log(
          "Rounds after filtering:",
          filteredRounds.map((r) => ({ id: r.id, courseName: r.courseName }))
        );

        return {
          ...prev,
          rounds: filteredRounds,
          // If we're deleting the current round, clear it
          currentRound:
            prev.currentRound?.id === roundId ? undefined : prev.currentRound,
        };
      });
      // Also clear local currentRound state if we're deleting the current round
      if (currentRound?.id === roundId) {
        setCurrentRound(null);
      }
    };

    const handleEndRound = () => {
      console.log(
        "End Round clicked - saving current hole and going to round summary"
      );

      if (currentRound) {
        console.log("Saving current hole and going to round summary:", {
          id: currentRound.id,
          courseName: currentRound.courseName,
        });

        // Save current hole data FIRST
        try {
          if (holeDetailRef.current) {
            console.log("Calling saveCurrentData from holeDetailRef");
            holeDetailRef.current.saveCurrentData();
          } else {
            console.log(
              "holeDetailRef.current is null - cannot save current data"
            );
          }
        } catch (error) {
          console.error("Error calling saveCurrentData:", error);
        }

        // Go to round summary with round still active
        setCurrentScreen("round-summary");
      } else {
        console.log("No current round to save");
        setCurrentScreen("round-summary");
      }
    };

    const handleHolePress = (holeNumber: number) => {
      setCurrentHole(holeNumber);
      setCurrentScreen("hole-detail");
    };

    const handleActuallyEndRound = () => {
      console.log(
        "Actually ending round - marking as complete and going to settings"
      );

      if (currentRound) {
        // Create the completed round
        const completedRound = {
          ...currentRound,
          completedAt: Date.now(),
          isComplete: true,
        };
        console.log("Saving completed round:", completedRound);

        // Save the completed round to the rounds array
        setData((prev) => {
          const newRounds = [...(prev.rounds || []), completedRound];
          console.log(
            "Rounds after adding completed round:",
            newRounds.map((r) => ({ id: r.id, courseName: r.courseName }))
          );

          return {
            ...prev,
            rounds: newRounds,
            currentRound: undefined, // Clear the active round
          };
        });

        // Clear the current round
        setCurrentRound(null);
        setCurrentScreen("course-selection");
      }
    };

    const handleReturnToRound = () => {
      console.log("Continue clicked - going back to hole detail");
      setCurrentScreen("hole-detail");
    };

    const handleViewSummary = () => {
      console.log(
        "View summary clicked - saving current hole and going to round summary"
      );

      // Save current hole data first
      try {
        if (holeDetailRef.current) {
          console.log("Calling saveCurrentData from holeDetailRef");
          holeDetailRef.current.saveCurrentData();
        } else {
          console.log("holeDetailRef.current is null - cannot save current data");
        }
      } catch (error) {
        console.error("Error calling saveCurrentData:", error);
      }

      setCurrentScreen("round-summary");
    };

    const triggerFlameAnimation = () => {
      // Create multiple flame emojis starting from bottom, animating to top
      const flames = Array.from({ length: 8 }, (_, i) => {
        const startY = 600 + Math.random() * 200; // Start from bottom of screen
        const targetY = Math.random() * 200 + 50; // Target position near top
        const translateY = new Animated.Value(startY);

        // Start the animation
        Animated.timing(translateY, {
          toValue: targetY,
          duration: 2000 + Math.random() * 1000, // Random duration between 2-3 seconds
          useNativeDriver: true,
        }).start();

        return {
          id: `flame-${i}-${Date.now()}`,
          x: Math.random() * 300 + 50, // Random x position
          y: startY,
          rotation: 0, // No rotation - normal orientation
          scale: Math.random() * 0.6 + 0.8, // Random scale between 0.8 and 1.4
          targetY: targetY,
          translateY: translateY,
        };
      });

      setFlameAnimation({
        visible: true,
        flames,
      });

      // Hide animation after 3 seconds
      setTimeout(() => {
        setFlameAnimation({
          visible: false,
          flames: [],
        });
      }, 3000);
    };

    const triggerPoopAnimation = () => {
      // Create multiple poop emojis starting from top, animating down
      const poops = Array.from({ length: 6 }, (_, i) => {
        const startY = -100 - Math.random() * 100; // Start from above screen
        const targetY = 600 + Math.random() * 200; // Target position near bottom
        const translateY = new Animated.Value(startY);

        // Start the animation
        Animated.timing(translateY, {
          toValue: targetY,
          duration: 1500 + Math.random() * 1000, // Random duration between 1.5-2.5 seconds
          useNativeDriver: true,
        }).start();

        return {
          id: `poop-${i}-${Date.now()}`,
          x: Math.random() * 300 + 50, // Random x position
          y: startY,
          rotation: Math.random() * 360, // Random rotation for more realistic falling
          scale: Math.random() * 0.4 + 0.6, // Random scale between 0.6 and 1.0
          targetY: targetY,
          translateY: translateY,
        };
      });

      setPoopAnimation({
        visible: true,
        poops,
      });

      // Hide animation after 3 seconds
      setTimeout(() => {
        setPoopAnimation({
          visible: false,
          poops: [],
        });
      }, 3000);
    };

    // Calculate bumps for a hole based on handicap
    const getBumpsForHole = (hole: Hole): number => {
      if (data.settings.handicap === undefined || data.settings.handicap === 0) {
        return 0;
      }

      const handicap = data.settings.handicap;
      const strokeIndex = hole.strokeIndex;

      // For handicaps 1-18: 1 stroke on holes with difficulty index <= handicap
      if (handicap <= 18) {
        return strokeIndex <= handicap ? 1 : 0;
      }

      // For handicaps > 18:
      // - 1 stroke on all 18 holes (difficulty index 1-18)
      // - Additional strokes on the most difficult holes
      const extraStrokes = handicap - 18;
      let bumps = 1; // Base stroke for all holes

      // Add extra strokes starting from difficulty index 1
      if (strokeIndex <= extraStrokes) {
        bumps += 1;
      }

      return bumps;
    };

    const getCurrentHoleHistory = (): HoleHistory => {
      if (!selectedCourse) {
        return {
          holeNumber: currentHole,
          courseId: "",
          totalRounds: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          commonShots: { shot: [], putts: [] },
          recentRounds: [],
        };
      }
      return calculateHoleHistory(currentHole, selectedCourse.id, data.rounds);
    };

    // Calculate cumulative over par for current hole
    const getCumulativeOverPar = (
      holeNumber: number,
      currentShots: Shot[] = [],
      currentPutts: Shot[] = []
    ): number => {
      if (!currentRound || !selectedCourse) return 0;

      let cumulativeOverPar = 0;

      for (let i = 1; i <= holeNumber; i++) {
        const hole = selectedCourse.holes.find((h) => h.number === i);
        let holeScore = currentRound.holeScores.find((hs) => hs.holeNumber === i);

        // If this is the current hole and no score exists yet, calculate from current shots/putts
        if (i === holeNumber && !holeScore && hole) {
          const shotsCount = currentShots.length;
          const puttsCount = currentPutts.length;
          const totalShots = shotsCount + puttsCount;

          if (totalShots > 0) {
            holeScore = {
              holeNumber: i,
              courseId: selectedCourse.id,
              shots: [...currentShots, ...currentPutts],
              totalScore: totalShots,
              par: hole.par,
              netScore: totalShots - hole.par,
              completedAt: Date.now(),
            };
          }
        }

        if (hole && holeScore) {
          const overPar = holeScore.totalScore - hole.par;
          cumulativeOverPar += overPar;
        }
      }

      return cumulativeOverPar;
    };

    const handleResumeRound = (round: Round) => {
      const course = data.courses.find((c) => c.id === round.courseId);
      if (course) {
        setSelectedCourse(course);
        setCurrentRound(round);
        setData((prev) => ({
          ...prev,
          currentRound: round,
        }));
        setCurrentHole(
          round.holeScores.length > 0
            ? round.holeScores[round.holeScores.length - 1].holeNumber + 1
            : 1
        );
        setCurrentScreen("hole-detail");
      }
    };

    const handleResetData = () => {
      // Reset to initial state
      const resetData: GolfBrainData = {
        courses: [DEFAULT_COURSE, DEFAULT_COURSE_BACK9],
        rounds: [],
        settings: {
          showHints: true,
          autoAdvance: false,
          clubs: DEFAULT_CLUBS,
          defaultClubs: {
            par5: {
              shot1: "[Driver]",
              shot2: "[Irons]",
              shot3: "[Irons]",
            },
            par4: {
              shot1: "[Driver]",
              shot2: "[Irons]",
            },
            par3: {
              shot1: "[Irons]",
            },
          },
          swingRecording: {
            countdownSeconds: 5,
            durationSeconds: 30,
          },
        },
      };

      setData(resetData);
      setSparkData("golf-brain", resetData);
      setCurrentRound(null);
      setSelectedCourse(null);
      setCurrentHole(1);
      setCurrentScreen("course-selection");

      Alert.alert("Success", "All data has been reset to default values.");
    };

    const handleUpdateCourse = (courseId: string, updates: Partial<Course>) => {
      setData((prev) => ({
        ...prev,
        courses: (prev.courses || []).map((course) =>
          course.id === courseId ? { ...course, ...updates } : course
        ),
      }));
      HapticFeedback.success();
    };

    const handleDeleteCourse = (courseId: string) => {
      console.log("handleDeleteCourse called with courseId:", courseId);
      console.log(
        "Current rounds before course deletion:",
        (data.rounds || []).map((r) => ({
          id: r.id,
          courseId: r.courseId,
          courseName: r.courseName,
        }))
      );

      setData((prev) => {
        const filteredRounds = prev.rounds.filter(
          (round) => round.courseId !== courseId
        );
        console.log(
          "Rounds after course deletion:",
          filteredRounds.map((r) => ({
            id: r.id,
            courseId: r.courseId,
            courseName: r.courseName,
          }))
        );

        return {
          ...prev,
          courses: prev.courses.filter((course) => course.id !== courseId),
          rounds: filteredRounds,
        };
      });
      HapticFeedback.light();
    };

    const handleUpdateSettings = (
      settings: Partial<GolfBrainData["settings"]>
    ) => {
      setData((prev) => {
        // Calculate next state using functional update to avoid stale closures
        const updatedSettings = { ...prev.settings, ...settings };

        // Deep merge recording settings if they are part of the update
        if (settings.swingRecording) {
          updatedSettings.swingRecording = {
            ...(prev.settings.swingRecording || {}),
            ...settings.swingRecording
          };
        }

        const next = {
          ...prev,
          settings: updatedSettings
        };

        // CRITICAL: Save to store immediately to prevent race condition on unmount
        setSparkData("golf-brain", next);
        return next;
      });
      HapticFeedback.light();
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
    });

    if (dataLoaded && (showSettings || internalShowSettings)) {
      // No read log here as we want the main page read value
      return (
        <GolfBrainSettings
          onClose={() => {
            if (onCloseSettings) onCloseSettings();
            setInternalShowSettings(false);
          }}
          courses={data.courses}
          onUpdateCourse={handleUpdateCourse}
          onDeleteCourse={handleDeleteCourse}
          data={data}
          onUpdateSettings={handleUpdateSettings}
          onEditRound={handleEditRound}
          onViewRound={handleViewRound}
          onDeleteRound={handleDeleteRound}
          onResetData={handleResetData}
          onNavigateToRound={() => {
            setCurrentScreen("round-summary");
            setSelectedCourse(
              data.courses.find((c) => c.id === data.currentRound?.courseId) ||
              null
            );
            // Close settings when navigating to round summary
            if (onCloseSettings) {
              onCloseSettings();
            }
          }}
          onNavigateToCourse={(courseId) => {
            setSelectedCourse(
              data.courses.find((c) => c.id === courseId) || null
            );
            setCurrentScreen("hole-detail");
          }}
          colors={colors}
        />
      );
    }

    console.log("read data.settings.countdown value:", data.settings?.swingRecording?.countdownSeconds);

    return (
      <View style={styles.container}>
        {/* Transient confirmation banner */}
        {infoBanner && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 20,
              right: 20,
              zIndex: 1000,
            }}
          >
            <View
              style={{
                backgroundColor: "#111",
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {infoBanner}
              </Text>
            </View>
          </View>
        )}

        {currentScreen === "course-selection" && (
          <CourseSelectionScreen
            courses={
              data.courses.sort((a, b) => a.name.localeCompare(b.name)) || []
            }
            onSelectCourse={handleSelectCourse}
            onCreateCourse={() => setShowCreateModal(true)}
            onManageCourses={() => setInternalShowSettings(true)}
            colors={colors}
          />
        )}

        {currentScreen === "hole-detail" && selectedCourse && currentRound && (
          <HoleDetailScreen
            ref={holeDetailRef}
            course={selectedCourse}
            currentHole={currentHole}
            currentRound={currentRound}
            data={data}
            onNextHole={handleNextHole}
            onPreviousHole={handlePreviousHole}
            onCompleteHole={handleCompleteHole}
            onShowHistory={handleShowHistory}
            onSaveHoleData={handleSaveHoleData}
            onLoadHoleData={handleLoadHoleData}
            onUpdateTodaysDistance={handleUpdateTodaysDistance}
            onEndRound={handleEndRound}
            onViewSummary={handleViewSummary}
            onClose={() => setCurrentScreen("course-selection")}
            clubs={data.settings.clubs || DEFAULT_CLUBS}
            handicap={data.settings.handicap}
            getBumpsForHole={getBumpsForHole}
            getCumulativeOverPar={getCumulativeOverPar}
            colors={colors}
            onFlameAnimation={triggerFlameAnimation}
            onPoopAnimation={triggerPoopAnimation}
          />
        )}

        {currentScreen === "round-summary" && selectedCourse && currentRound && (
          <RoundSummaryScreen
            round={currentRound}
            course={selectedCourse}
            onClose={() => {
              // Clear currentRound when leaving round summary
              setCurrentRound(null);
              setData((prev) => ({
                ...prev,
                currentRound: undefined,
              }));
              setCurrentScreen(roundEnded ? "course-selection" : "hole-detail");
            }}
            onHolePress={handleHolePress}
            onReturnToRound={handleReturnToRound}
            onEndRound={handleActuallyEndRound}
            handicap={data.settings.handicap}
            getBumpsForHole={getBumpsForHole}
            colors={colors}
          />
        )}

        <CreateCourseModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateCourse={handleCreateCourse}
          colors={colors}
        />

        <HoleHistoryModal
          visible={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          holeHistory={getCurrentHoleHistory()}
          courseName={selectedCourse?.name || ""}
          colors={colors}
        />

        {currentScreen === "hole-detail" && (
          <HandicapOnboardingModal
            visible={showHandicapOnboarding}
            onClose={() => setShowHandicapOnboarding(false)}
            onSetHandicap={handleSetHandicap}
            colors={colors}
          />
        )}

        {/* Flame Animation Overlay */}
        {flameAnimation.visible && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 1000,
            }}
          >
            {flameAnimation.flames.map((flame) => (
              <Animated.Text
                key={flame.id}
                style={{
                  position: "absolute",
                  left: flame.x,
                  top: 0, // Fixed top position
                  fontSize: 30,
                  transform: [
                    { translateY: flame.translateY },
                    { scale: flame.scale },
                  ],
                  opacity: 0.8,
                }}
              >
                🔥
              </Animated.Text>
            ))}
          </View>
        )}

        {/* Poop Animation Overlay */}
        {poopAnimation.visible && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 1000,
              backgroundColor: "rgba(139, 69, 19, 0.1)", // Light brown background
            }}
          >
            {poopAnimation.poops.map((poop) => (
              <Animated.Text
                key={poop.id}
                style={{
                  position: "absolute",
                  left: poop.x,
                  top: 0, // Fixed top position
                  fontSize: 25,
                  transform: [
                    { translateY: poop.translateY },
                    { scale: poop.scale },
                    { rotate: `${poop.rotation}deg` },
                  ],
                  opacity: 0.9,
                }}
              >
                💩
              </Animated.Text>
            ))}
          </View>
        )}
      </View>
    );
  };
