import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { SparkProps } from "../types/spark";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { GeminiCommandParser } from "../services/GeminiCommandParser";
import { CommandExecutor } from "../services/CommandExecutor";
import { HapticFeedback } from "../utils/haptics";
import { useNavigation } from "@react-navigation/native";
import { useSparkStore } from "../store";
import { getSparkById } from "../components/sparkRegistryData";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SaveCancelButtons,
} from "../components/SettingsComponents";

interface CommandHistoryItem {
  id: string;
  transcript: string;
  response: string;
  success: boolean;
  timestamp: number;
  targetSpark?: string;
}

export const SpeakSpark: React.FC<SparkProps & { autoRecord?: boolean }> = ({
  showSettings,
  onCloseSettings,
  autoRecord,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { getSparkData, setSparkData } = useSparkStore();

  // -- Hooks --

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const SUGGESTED_COMMANDS = [
    "Add a todo to buy milk",
    "Remind me to call Mom tomorrow",
    "Add a todo to Work category to finish report",

    "Weight is 150 lbs",
    "Add weight 70 kg",

    "Add a toview for a movie called the Wolf of Wallstreet on Netflix",
    "Watch a show called Slow Horses on Apple TV",
    "Add a toview for a movie called Dune to watch with Tom",
    "Read a book called The Hobbit",
  ];

  // -- Effects --

  // Keyboard Listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Load history on mount
  useEffect(() => {
    const savedData = getSparkData("speak-spark");
    if (savedData?.history) {
      setHistory(savedData.history);
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    if (history.length > 0) {
      setSparkData("speak-spark", { history });
    }
  }, [history]);

  // Listen to store updates for clearing (or when returning from settings)
  useEffect(() => {
    if (!showSettings) {
      const savedData = getSparkData("speak-spark");
      setHistory(savedData?.history || []);
    }
  }, [showSettings]);

  // Animation Effect
  useEffect(() => {
    if (isListening && !showSettings) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [isListening, showSettings]);

  // Auto-Record Effect
  useEffect(() => {
    if (autoRecord && !isListening && !isProcessing) {
      const timer = setTimeout(() => {
        toggleListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoRecord]);

  // -- Handlers --

  const navigateToSpark = (sparkId: string) => {
    (navigation as any).push("Spark", { sparkId });
  };

  const useSuggestion = (text: string) => {
    setManualInput(text);
    setShowSuggestions(false);
  };

  const handleFinalResult = async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setCurrentTranscript(text);
    setShowSuggestions(false);

    try {
      const parsed = await GeminiCommandParser.parseCommand(text);
      const result = await CommandExecutor.execute(parsed);

      const newItem: CommandHistoryItem = {
        id: Date.now().toString(),
        transcript: text,
        response: result.message,
        success: result.success,
        timestamp: Date.now(),
        targetSpark:
          parsed.targetSpark !== "unknown" ? parsed.targetSpark : undefined,
      };

      setHistory((prev) => {
        const newHistory = [newItem, ...prev];
        return newHistory.slice(0, 10);
      });
      setCurrentTranscript("");
      setManualInput("");

      if (result.success) {
        HapticFeedback.success();
      } else {
        HapticFeedback.error();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to process command.");
    } finally {
      setIsProcessing(false);
    }
  };

  // -- Speech Hooks --

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setCurrentTranscript("");
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    setCurrentTranscript(transcript);

    if (event.isFinal) {
      // If final result is empty, show an error to the user and record a failed history item
      if (!transcript.trim()) {
        const message = "Could not understand audio. Please try again.";
        setErrorMessage(message);
        HapticFeedback.error();

        const failItem: CommandHistoryItem = {
          id: Date.now().toString(),
          transcript: "",
          response: "No speech recognized",
          success: false,
          timestamp: Date.now(),
        };

        setHistory((prev) => [failItem, ...prev].slice(0, 10));

        // Clear the message after a short delay so it doesn't linger
        setTimeout(() => setErrorMessage(null), 3500);

        setCurrentTranscript("");
        return;
      }

      handleFinalResult(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    const msg = event?.message || "Speech recognition error";
    setErrorMessage(msg);
    HapticFeedback.error();
    // Clear after a short time so UI recovers
    setTimeout(() => setErrorMessage(null), 4500);
  });

  const toggleListening = async () => {
    if (isListening) {
      await ExpoSpeechRecognitionModule.stop();
    } else {
      try {
        const result =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          setErrorMessage("Microphone permission required.");
          setTimeout(() => setErrorMessage(null), 3500);
          return;
        }

        await ExpoSpeechRecognitionModule.start({
          lang: "en-US",
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: true,
        });

        setErrorMessage(null);
        HapticFeedback.light();
      } catch (e: any) {
        const msg = e?.message
          ? "Could not start listening: " + e.message
          : "Could not start listening.";
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 4500);
      }
    }
  };

  // -- Render Settings --
  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Speak Spark Settings"
            subtitle="Voice Control Configuration"
            icon="🎙️"
            sparkId="speak-spark"
          />

          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 16,
                color: colors.text,
                marginBottom: 8,
                fontWeight: "600",
              }}
            >
              About Speak Spark
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 16,
              }}
            >
              Use your voice to create todos, log weight, and interact with
              other Sparks. Powered by Gemini AI.
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {process.env.EXPO_PUBLIC_GEMINI_API_KEY
                ? "✅ Gemini API Key Configured"
                : "❌ Missing API Key"}
            </Text>
          </View>

          <SettingsFeedbackSection
            sparkName="Speak Spark"
            sparkId="speak-spark"
          />

          <View style={{ padding: 20 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => {
                Alert.alert("Clear History", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                      setSparkData("speak-spark", { history: [] });
                      // Ensure UI updates by forcing a read or relying on next effect
                      setHistory([]);
                      Alert.alert("Success", "History cleared.");
                    },
                  },
                ]);
              }}
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                Clear Action History
              </Text>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>

          <SaveCancelButtons
            onSave={onCloseSettings || (() => {})}
            onCancel={onCloseSettings || (() => {})}
            saveText="Done"
            cancelText="Close"
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  // -- Render Main UI --
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          setShowSuggestions(false);
        }}
      >
        <View style={styles.container}>
          {/* Header - Hide when keyboard is up */}
          {!keyboardVisible && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                🎙️ Speak Spark
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Control your Sparks with voice
              </Text>
            </View>
          )}

          {/* Main Mic Button - Hide when keyboard is up */}
          {!keyboardVisible && (
            <View style={styles.micContainer}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    {
                      backgroundColor: isListening ? "#ff4444" : colors.primary,
                      borderColor: isProcessing
                        ? colors.textSecondary
                        : "transparent",
                      borderWidth: isProcessing ? 4 : 0,
                    },
                  ]}
                  onPress={toggleListening}
                  disabled={isProcessing}
                >
                  <Text style={styles.micIcon}>
                    {isProcessing ? "⏳" : isListening ? "⏹️" : "🎙️"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isProcessing
                  ? "ProcessingCommand..."
                  : isListening
                  ? "Listening..."
                  : "Tap to speak"}
              </Text>
              {/* Live Transcript Display */}
              <Text style={[styles.liveTranscript, { color: colors.text }]}>
                {currentTranscript ? `"${currentTranscript}"` : ""}
              </Text>
              {/* Error Message */}
              {errorMessage ? (
                <Text
                  style={{
                    marginTop: 8,
                    color: "#ff4d4f",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {errorMessage}
                </Text>
              ) : null}{" "}
            </View>
          )}

          {/* Manual Input */}
          <View style={{ zIndex: 10 }}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Or type command..."
                placeholderTextColor={colors.textSecondary}
                value={manualInput}
                onChangeText={setManualInput}
                onFocus={() => setShowSuggestions(true)}
                onSubmitEditing={() => handleFinalResult(manualInput)}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={() => handleFinalResult(manualInput)}
                disabled={!manualInput.trim() || isProcessing}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <View
                style={{
                  position: "absolute",
                  top: 60,
                  left: 0,
                  right: 0,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  maxHeight: 200,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <ScrollView keyboardShouldPersistTaps="handled">
                  {SUGGESTED_COMMANDS.map((cmd, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        padding: 12,
                        borderBottomWidth:
                          i === SUGGESTED_COMMANDS.length - 1 ? 0 : 1,
                        borderBottomColor: colors.border,
                      }}
                      onPress={() => useSuggestion(cmd)}
                    >
                      <Text style={{ color: colors.text }}>{cmd}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* History */}
          <View
            style={[
              styles.historyContainer,
              { backgroundColor: colors.surface, zIndex: 1 },
            ]}
          >
            <Text
              style={[styles.historyTitle, { color: colors.textSecondary }]}
            >
              Recent Commands (Last 10)
            </Text>
            <ScrollView
              style={styles.historyList}
              keyboardShouldPersistTaps="handled"
            >
              {!history.length ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No commands yet. Try "Add a todo to buy milk".
                </Text>
              ) : (
                history.map((item) => {
                  const sparkMeta = item.targetSpark
                    ? getSparkById(item.targetSpark)
                    : null;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.historyItem,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <Text
                          style={[
                            styles.historyTranscript,
                            { color: colors.text },
                          ]}
                        >
                          "{item.transcript}"
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          {sparkMeta && (
                            <TouchableOpacity
                              style={[
                                styles.linkButton,
                                { backgroundColor: colors.primary + "20" },
                              ]}
                              onPress={() => navigateToSpark(item.targetSpark!)}
                            >
                              <Text style={{ fontSize: 12 }}>
                                {sparkMeta.metadata.icon}
                              </Text>
                              <Text
                                style={[
                                  styles.linkButtonText,
                                  { color: colors.primary },
                                ]}
                              >
                                Open
                              </Text>
                            </TouchableOpacity>
                          )}
                          <Text style={{ marginLeft: 8 }}>
                            {item.success ? "✅" : "❌"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.historyResponse,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.response}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginVertical: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  micContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  micIcon: {
    fontSize: 32,
    color: "#fff",
  },
  statusText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
  },
  liveTranscript: {
    marginTop: 10,
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
    minHeight: 24,
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    marginTop: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  historyContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  historyTitle: {
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    fontSize: 12,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyTranscript: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  historyResponse: {
    fontSize: 13,
    marginTop: 4,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  linkButtonText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
});
