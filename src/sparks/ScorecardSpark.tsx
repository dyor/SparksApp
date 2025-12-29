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
  createCourse,
  createRoundForCourse,
  getCourses,
  getHoles,
  getRounds,
  getScores,
  Hole,
  initDB,
  Round,
  saveScore,
  updateCourse,
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

  // Refs to hold latest values for onBlur (avoiding stale state closures)
  const localStrokesRef = useRef(score.strokes);
  const localPuttsRef = useRef(score.putts);

  const strokesInputRef = useRef<TextInput>(null);
  const puttsInputRef = useRef<TextInput>(null);

  React.useImperativeHandle(ref, () => ({
    focusStrokes: () => strokesInputRef.current?.focus(),
    focusPutts: () => puttsInputRef.current?.focus(),
  }));

  useEffect(() => {
    setLocalStrokes(score.strokes);
    localStrokesRef.current = score.strokes;
    setLocalPutts(score.putts);
    localPuttsRef.current = score.putts;
  }, [score.strokes, score.putts]);

  const handleBlur = () => {
    onSave(hole.hole_number, localStrokesRef.current, localPuttsRef.current);
  };

  const strokesValue = parseInt(localStrokes);
  const netValue = !isNaN(strokesValue) ? strokesValue - hole.par : 0;
  const isUnderPar = !isNaN(strokesValue) && netValue < 0;

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
            localStrokesRef.current = val;
            if (val.length === 1 && /^\d+$/.test(val)) {
              puttsInputRef.current?.focus();
            }
          }}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder=""
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.inputCol}>
        <TextInput
          ref={puttsInputRef}
          style={styles.tableInput}
          value={localPutts}
          onChangeText={(val) => {
            setLocalPutts(val);
            localPuttsRef.current = val;
            if (val.length === 1 && /^\d+$/.test(val)) {
              onAutoAdvance?.();
            }
          }}
          onBlur={handleBlur}
          keyboardType="numeric"
          placeholder=""
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      <View style={styles.netCol}>
        <Text style={[styles.netText, isUnderPar && { color: "#2E7D32" }]}>
          {!isNaN(strokesValue)
            ? netValue > 0
              ? `+${netValue}`
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
    newRoundButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    newRoundButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    courseItem: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      marginHorizontal: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    courseInfo: {
      flex: 1,
    },
    courseName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
    },
    courseDetails: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    editButton: {
      padding: 8,
    },
    formContainer: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
    },
    holeConfigRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    parSelector: {
      flexDirection: "row",
      alignItems: "center",
    },
    parButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 4,
    },
    parButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    parButtonText: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.text,
    },
    parButtonTextActive: {
      color: "#FFFFFF",
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 24,
      marginBottom: 40,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
    },
  });

const ScorecardFooter = ({ totals, styles }: { totals: any; styles: any }) => (
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
        style={[styles.footerValue, totals.net < 0 && { color: "#2E7D32" }]}
      >
        {totals.strokes > 0
          ? totals.net > 0
            ? `+${totals.net}`
            : totals.net
          : ""}
      </Text>
    </View>
  </View>
);

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

  // Course editing state
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [courseName, setCourseName] = useState("");
  const [numHoles, setNumHoles] = useState(18);
  const [holePars, setHolePars] = useState<Record<number, number>>({});

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
          strokes: s.strokes === null ? "" : s.strokes.toString(),
          putts: s.putts === null ? "" : s.putts.toString(),
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
      const allCourses = await getCourses();
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

      // Optimistic update
      setScores((prev) => ({
        ...prev,
        [holeNumber]: { strokes, putts },
      }));

      try {
        await saveScore(
          roundId,
          holeNumber,
          isNaN(s) ? null : s,
          isNaN(p) ? null : p
        );
      } catch (error) {
        console.error("Error saving score:", error);
        // Revert could be implemented here if needed
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
        const s = parseInt(score.strokes);
        const p = parseInt(score.putts);
        if (!isNaN(s)) {
          totalStrokes += s;
          scoredPar += hole.par;
        }
        if (!isNaN(p)) {
          totalPutts += p;
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
          <Text style={styles.headerTitle}>Golf Scorecard</Text>
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
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
            ListHeaderComponent={
              <>
                <TouchableOpacity
                  style={styles.newRoundButton}
                  onPress={() => setScreen("courses")}
                >
                  <Text style={styles.newRoundButtonText}>NEW ROUND</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>Recent Rounds</Text>
              </>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  marginHorizontal: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => {
                  setRoundId(item.id);
                  setScreen("scorecard");
                }}
              >
                <View>
                  <Text
                    style={{
                      fontWeight: "bold",
                      color: colors.text,
                      fontSize: 16,
                    }}
                  >
                    {item.course_name}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: colors.textSecondary,
                  marginTop: 20,
                }}
              >
                No rounds found.
              </Text>
            }
          />
        )}
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
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                "Number # Enter # and #"
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
                extraData={scores}
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
                  <ScorecardFooter totals={totals} styles={styles} />
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
    const handleCreateNewCourse = () => {
      setEditingCourse({ id: null });
      setCourseName("");
      setNumHoles(18);
      const initialPars: Record<number, number> = {};
      for (let i = 1; i <= 18; i++) initialPars[i] = 4;
      setHolePars(initialPars);
    };

    const handleEditCourse = (course: any) => {
      setEditingCourse(course);
      setCourseName(course.name);
      setNumHoles(course.holes.length);
      const initialPars: Record<number, number> = {};
      course.holes.forEach((h: any) => {
        initialPars[h.hole_number] = h.par;
      });
      setHolePars(initialPars);
    };

    const handleSaveCourse = async () => {
      if (!courseName.trim()) {
        Alert.alert("Error", "Please enter a course name.");
        return;
      }

      const holesData = [];
      for (let i = 1; i <= numHoles; i++) {
        holesData.push({ hole_number: i, par: holePars[i] || 4 });
      }

      let savedCourse;
      if (editingCourse.id) {
        await updateCourse(editingCourse.id, courseName, holesData);
        savedCourse = {
          id: editingCourse.id,
          name: courseName,
          holes: holesData,
        };
      } else {
        savedCourse = await createCourse(courseName, holesData);
      }

      // After saving, start a new round with this course
      const newRound = await createRoundForCourse(savedCourse.id);
      setRoundId(newRound.id);
      setEditingCourse(null);
      setScreen("scorecard");
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (editingCourse) setEditingCourse(null);
              else setScreen("recent-rounds");
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {editingCourse
                ? editingCourse.id
                  ? "Edit Course"
                  : "New Course"
                : "Select Course"}
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {editingCourse ? (
          <FlatList
            data={Array.from({ length: numHoles }, (_, i) => i + 1)}
            keyExtractor={(item) => String(item)}
            contentContainerStyle={styles.formContainer}
            ListHeaderComponent={
              <>
                <Text style={styles.inputLabel}>Course Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={courseName}
                  onChangeText={setCourseName}
                  placeholder="Enter course name"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Number of Holes</Text>
                <View style={[styles.parSelector, { marginBottom: 24 }]}>
                  {[9, 18].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.parButton,
                        numHoles === n && styles.parButtonActive,
                        { flex: 1, height: 44 },
                      ]}
                      onPress={() => setNumHoles(n)}
                    >
                      <Text
                        style={[
                          styles.parButtonText,
                          numHoles === n && styles.parButtonTextActive,
                        ]}
                      >
                        {n} Holes
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Hole Pars</Text>
              </>
            }
            renderItem={({ item: holeNum }) => (
              <View style={styles.holeConfigRow}>
                <Text style={styles.parText}>Hole {holeNum}</Text>
                <View style={styles.parSelector}>
                  {[3, 4, 5, 6].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.parButton,
                        holePars[holeNum] === p && styles.parButtonActive,
                      ]}
                      onPress={() =>
                        setHolePars((prev) => ({ ...prev, [holeNum]: p }))
                      }
                    >
                      <Text
                        style={[
                          styles.parButtonText,
                          holePars[holeNum] === p && styles.parButtonTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCourse}
              >
                <Text style={styles.saveButtonText}>SAVE & START ROUND</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          <FlatList
            data={courses}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.newRoundButton}
                onPress={handleCreateNewCourse}
              >
                <Text style={styles.newRoundButtonText}>CREATE NEW COURSE</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <View style={styles.courseItem}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{item.name}</Text>
                  <Text style={styles.courseDetails}>
                    {item.holes.length} holes • Par{" "}
                    {item.holes.reduce((sum: number, h: any) => sum + h.par, 0)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditCourse(item)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginLeft: 12,
                    }}
                    onPress={async () => {
                      const newRound = await createRoundForCourse(item.id);
                      setRoundId(newRound.id);
                      setScreen("scorecard");
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      START
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: colors.textSecondary,
                  marginTop: 20,
                }}
              >
                No courses found.
              </Text>
            }
          />
        )}
      </SafeAreaView>
    );
  }
};
export default ScorecardSpark;
