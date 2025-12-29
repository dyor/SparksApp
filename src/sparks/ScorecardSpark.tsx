import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SparkProps } from "../types/spark";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import {
  getHoles,
  getRounds,
  getScores,
  Hole,
  initDB,
  Round,
  saveScore,
} from "../dbService";

const HoleRow = React.forwardRef<
  any,
  {
    hole: Hole;
    score: { strokes: string; putts: string };
    onSave: (holeNumber: number, strokes: string, putts: string) => void;
    colors: any;
    styles: any;
    onAutoAdvance?: () => void;
  }
>(({ hole, score, onSave, colors, styles, onAutoAdvance }, ref) => {
  const [localStrokes, setLocalStrokes] = useState(score.strokes);
  const [localPutts, setLocalPutts] = useState(score.putts);

  const strokesInputRef = useRef<TextInput>(null);
  const puttsInputRef = useRef<TextInput>(null);

  React.useImperativeHandle(ref, () => ({
    focusStrokes: () => strokesInputRef.current?.focus(),
    focusPutts: () => puttsInputRef.current?.focus(),
  }));

  useEffect(() => {
    setLocalStrokes(score.strokes);
    setLocalPutts(score.putts);
  }, [score.strokes, score.putts]);

  const handleBlur = () => {
    onSave(hole.hole_number, localStrokes, localPutts);
  };

  const strokesValue = parseInt(localStrokes) || 0;
  const netValue = strokesValue > 0 ? strokesValue - hole.par : 0;
  const isUnderPar = netValue < 0;

  return (
    <View style={styles.tableRow}>
      <View style={styles.holeCol}>
        <Text style={styles.holeNumber}>{hole.hole_number}</Text>
      </View>
      <View style={styles.parCol}>
        <Text style={styles.parText}>{hole.par}</Text>
      </View>
      <View style={styles.inputCol}>
        <TextInput
          ref={strokesInputRef}
          style={styles.tableInput}
          value={localStrokes}
          onChangeText={(val) => {
            setLocalStrokes(val);
            if (val.length === 1 && /^\d+$/.test(val)) {
              puttsInputRef.current?.focus();
            }
          }}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder=""
          placeholderTextColor={colors.placeholder}
        />
      </View>
      <View style={styles.inputCol}>
        <TextInput
          ref={puttsInputRef}
          style={styles.tableInput}
          value={localPutts}
          onChangeText={(val) => {
            setLocalPutts(val);
            if (val.length === 1 && /^\d+$/.test(val)) {
              onAutoAdvance?.();
            }
          }}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder=""
          placeholderTextColor={colors.placeholder}
        />
      </View>
      <View style={styles.netCol}>
        <Text style={[styles.netText, isUnderPar && { color: "#2E7D32" }]}>
          {strokesValue > 0
            ? isUnderPar
              ? `${netValue}`
              : netValue === 0
              ? "0"
              : netValue
            : ""}
        </Text>
      </View>
    </View>
  );
});
HoleRow.displayName = "HoleRow";

// getStyles must be declared before use in the component

// getStyles must be declared before use in the component
const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    backButton: {
      padding: 4,
      width: 44,
      alignItems: "flex-start",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
    },
    miniVoiceButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.card,
    },
    voiceButtonActive: {
      backgroundColor: colors.primary,
    },
    tableHeader: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.text,
      textTransform: "uppercase",
    },
    centerText: {
      textAlign: "center",
    },
    listContent: {
      paddingBottom: 40,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    holeCol: {
      width: 35,
    },
    parCol: {
      width: 35,
      alignItems: "center",
    },
    holeNumber: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.text,
    },
    parText: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.text,
    },
    inputCol: {
      flex: 1,
      paddingHorizontal: 4,
    },
    netCol: {
      width: 40,
      alignItems: "center",
    },
    tableInput: {
      backgroundColor: colors.card,
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 8,
      fontSize: 15,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    netText: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.text,
    },
    tableFooter: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerLabel: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
    },
    footerValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
    },
  });

const ScorecardSpark: React.FC<SparkProps> = ({
  showSettings = false,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Always start on Recent Rounds screen
  const [screen, setScreen] = useState<
    "recent-rounds" | "scorecard" | "courses"
  >("recent-rounds");

  // Add missing state hooks
  const [isLoading, setIsLoading] = useState(false);
  const [rounds, setRounds] = useState<any[]>([]);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [round, setRound] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [scores, setScores] = useState<
    Record<number, { strokes: string; putts: string }>
  >({});
  const [courses, setCourses] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  // For focusing next input in scorecard
  const holeRefs = useRef<Record<number, any>>({});

  // Load all rounds for Recent Rounds screen
  useEffect(() => {
    const fetchRounds = async () => {
      setIsLoading(true);
      await initDB();
      const allRounds = await getRounds();
      // Sort by date/time created, descending
      allRounds.sort((a, b) =>
        b.createdAt && a.createdAt
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : 0
      );
      setRounds(allRounds);
      setIsLoading(false);
    };
    if (screen === "recent-rounds") fetchRounds();
  }, [screen]);

  // Load round data for Scorecard screen
  useEffect(() => {
    const loadRoundData = async () => {
      if (!roundId) return;
      setIsLoading(true);
      await initDB();
      const allRounds = await getRounds();
      const currentRound = allRounds.find((r) => r.id === roundId) || null;
      setRound(currentRound);
      if (!currentRound) {
        setHoles([]);
        setScores({});
        setIsLoading(false);
        return;
      }
      const courseHoles = await getHoles(currentRound.course_id);
      setHoles(courseHoles);
      const savedScores = await getScores(currentRound.id);
      const scoreMap: Record<number, { strokes: string; putts: string }> = {};
      savedScores.forEach((s) => {
        scoreMap[s.hole_number] = {
          strokes: s.strokes === 0 ? "" : s.strokes.toString(),
          putts: s.putts === 0 ? "" : s.putts.toString(),
        };
      });
      setScores(scoreMap);
      setIsLoading(false);
    };
    if (screen === "scorecard" && roundId) loadRoundData();
  }, [screen, roundId]);

  // Load courses for Courses screen
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      await initDB();
      const allCourses = await (await import("../dbService")).getCourses();
      setCourses(allCourses);
      setIsLoading(false);
    };
    if (screen === "courses") fetchCourses();
  }, [screen]);

  const handleSaveScore = useCallback(
    async (holeNumber: number, strokes: string, putts: string) => {
      if (!roundId) return;
      const s = parseInt(strokes);
      const p = parseInt(putts);

      // Validate that putts don't exceed strokes
      if (!isNaN(s) && !isNaN(p) && s > 0 && p > s) {
        Alert.alert("Invalid Score", "Putts cannot be greater than strokes.");
        return;
      }

      try {
        await saveScore(
          roundId,
          holeNumber,
          isNaN(s) ? 0 : s,
          isNaN(p) ? 0 : p
        );
        setScores((prev) => ({
          ...prev,
          [holeNumber]: { strokes, putts },
        }));
      } catch (error) {
        console.error("Error saving score:", error);
      }
    },
    [roundId]
  );

  // Speech Recognition Event Handling
  useSpeechRecognitionEvent("start", () => setIsRecording(true));
  useSpeechRecognitionEvent("end", () => setIsRecording(false));
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      parseVoiceScore(transcript);
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error, event.message);
    setIsRecording(false);
  });

  const wordToNumber = (word: string): string => {
    const numberMap: Record<string, string> = {
      zero: "0",
      one: "1",
      two: "2",
      to: "2",
      too: "2",
      three: "3",
      four: "4",
      for: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
      ten: "10",
      eleven: "11",
      twelve: "12",
      thirteen: "13",
      fourteen: "14",
      fifteen: "15",
      sixteen: "16",
      seventeen: "17",
      eighteen: "18",
      nineteen: "19",
      twenty: "20",
    };
    return numberMap[word.toLowerCase()] || word;
  };

  const parseVoiceScore = (text: string) => {
    console.log("Voice transcript received:", text);

    // Normalize common mishearings
    let normalized = text
      .toLowerCase()
      .replace(/\bwhole\b/g, "hole")
      .replace(/\bhas\b/g, "as")
      .replace(/\bhass\b/g, "as");

    console.log("Normalized:", normalized);

    // Try multiple regex patterns for flexibility
    // Pattern 1: "add/update/input/enter [hole] [#] [number] [X] as/and [Y] and [Z]"
    let regex =
      /(?:add|update|input|enter)\s+(?:hole\s*)?(?:#\s*)?(?:number\s*)?(\w+)\s+(?:as|and)\s+(\w+)\s+and\s+(\w+)/i;
    let match = normalized.match(regex);

    // Pattern 2: Try without command word - just "hole X as Y and Z"
    if (!match) {
      regex =
        /(?:hole\s*)?(?:#\s*)?(?:number\s*)?(\w+)\s+(?:as|and)\s+(\w+)\s+and\s+(\w+)/i;
      match = normalized.match(regex);
    }

    // Pattern 3: "number X enter Y and Z"
    if (!match) {
      regex = /number\s+(\w+)\s+enter\s+(\w+)\s+and\s+(\w+)/i;
      match = normalized.match(regex);
    }

    if (match) {
      const holeNum = parseInt(wordToNumber(match[1]));
      const strokes = wordToNumber(match[2]);
      const putts = wordToNumber(match[3]);

      console.log(
        `Parsed: hole=${holeNum}, strokes=${strokes}, putts=${putts}`
      );

      // Validate that we got valid numbers
      if (
        isNaN(holeNum) ||
        isNaN(parseInt(strokes)) ||
        isNaN(parseInt(putts))
      ) {
        Alert.alert("Error", "Could not parse numbers from voice command.");
        return;
      }

      // Check if hole exists
      if (holes.some((h) => h.hole_number === holeNum)) {
        handleSaveScore(holeNum, strokes, putts);
        // Silent success - no alert
      } else {
        Alert.alert("Error", `Hole number ${holeNum} not found.`);
      }
    } else {
      console.log("No match found for voice command");
      Alert.alert(
        "Voice Command Not Recognized",
        `I heard: "${text}"\n\nAccepted format:\n• "number [number] enter [strokes] and [putts]"\n\nExample:\n• "number 5 enter 6 and 2"`
      );
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      const result =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert(
          "Permission Denied",
          "Microphone permission is required for voice entry."
        );
        return;
      }
      ExpoSpeechRecognitionModule.start({ lang: "en-US" });
    }
  };

  const calculateTotals = () => {
    let totalStrokes = 0;
    let totalPutts = 0;
    let scoredPar = 0;
    const totalCoursePar = holes.reduce((sum, h) => sum + h.par, 0);

    holes.forEach((hole) => {
      const score = scores[hole.hole_number];
      if (score) {
        const s = parseInt(score.strokes) || 0;
        if (s > 0) {
          totalStrokes += s;
          totalPutts += parseInt(score.putts) || 0;
          scoredPar += hole.par;
        }
      }
    });

    return {
      strokes: totalStrokes,
      putts: totalPutts,
      par: totalCoursePar,
      net: totalStrokes > 0 ? totalStrokes - scoredPar : 0,
    };
  };

  // --- Screen 1: Recent Rounds ---
  if (screen === "recent-rounds") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { justifyContent: "center" }]}>
          <Text style={styles.headerTitle}>Recent Rounds</Text>
        </View>
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={rounds}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ flexGrow: 1, padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => {
                  setRoundId(item.id);
                  setScreen("scorecard");
                }}
              >
                <View>
                  <Text style={{ fontWeight: "bold", color: colors.text }}>
                    {item.course_name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: colors.textSecondary }}
              >
                No rounds found.
              </Text>
            }
          />
        )}
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 32,
            right: 32,
            backgroundColor: colors.primary,
            borderRadius: 32,
            width: 64,
            height: 64,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => setScreen("courses")}
        >
          <Ionicons name="add" size={36} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Screen 2: Scorecard ---
  if (screen === "scorecard") {
    const totals = calculateTotals();
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setScreen("recent-rounds")}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {round?.course_name || "Scorecard"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleRecording}
              style={[
                styles.miniVoiceButton,
                isRecording && styles.voiceButtonActive,
              ]}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={16}
                color={isRecording ? "#fff" : colors.primary}
              />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text>Loading...</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <View style={styles.holeCol}>
                  <Text style={styles.headerLabel}>Hole</Text>
                </View>
                <View style={styles.parCol}>
                  <Text style={[styles.headerLabel, styles.centerText]}>
                    Par
                  </Text>
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.headerLabel, styles.centerText]}>
                    Score
                  </Text>
                </View>
                <View style={styles.inputCol}>
                  <Text style={[styles.headerLabel, styles.centerText]}>
                    Putts
                  </Text>
                </View>
                <View style={styles.netCol}>
                  <Text style={[styles.headerLabel, styles.centerText]}>
                    Net
                  </Text>
                </View>
              </View>
              <FlatList
                data={holes}
                renderItem={({ item }) => (
                  <HoleRow
                    ref={(el) => (holeRefs.current[item.hole_number] = el)}
                    hole={item}
                    score={
                      scores[item.hole_number] || { strokes: "", putts: "" }
                    }
                    onSave={handleSaveScore}
                    colors={colors}
                    styles={styles}
                    onAutoAdvance={() => {
                      if (item.hole_number < holes.length) {
                        holeRefs.current[item.hole_number + 1]?.focusStrokes();
                      }
                    }}
                  />
                )}
                keyExtractor={(item) => item.hole_number.toString()}
                contentContainerStyle={styles.listContent}
                initialNumToRender={18}
                ListFooterComponent={
                  <View style={styles.tableFooter}>
                    <View style={styles.holeCol}>
                      <Text style={styles.footerLabel}>Total</Text>
                    </View>
                    <View style={styles.parCol}>
                      <Text style={styles.footerValue}>{totals.par}</Text>
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.footerValue}>{totals.strokes}</Text>
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.footerValue}>{totals.putts}</Text>
                    </View>
                    <View style={styles.netCol}>
                      <Text
                        style={[
                          styles.footerValue,
                          totals.net < 0 && { color: "#2E7D32" },
                        ]}
                      >
                        {totals.strokes > 0
                          ? totals.net > 0
                            ? `+${totals.net}`
                            : totals.net
                          : ""}
                      </Text>
                    </View>
                  </View>
                }
              />
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Screen 3: Courses ---
  if (screen === "courses") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { justifyContent: "center" }]}>
          <TouchableOpacity
            onPress={() => setScreen("recent-rounds")}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Courses</Text>
          </View>
          <View style={styles.backButton} />
        </View>
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ flexGrow: 1, padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={async () => {
                  // Create new round for this course
                  const { createRoundForCourse } = await import("../dbService");
                  const newRound = await createRoundForCourse(item.id);
                  setRoundId(newRound.id);
                  setScreen("scorecard");
                }}
              >
                <View>
                  <Text style={{ fontWeight: "bold", color: colors.text }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.holes.length} holes
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: colors.textSecondary }}
              >
                No courses found.
              </Text>
            }
          />
        )}

        {/* Add course creation UI here if needed */}
      </SafeAreaView>
    );
  }
};
export default ScorecardSpark;
