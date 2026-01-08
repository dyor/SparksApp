import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useSparkStore } from "../store";
import { SparkProps } from "../types/spark";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SaveCancelButtons,
} from "../components/SettingsComponents";
import { HapticFeedback } from "../utils/haptics";

interface HangmanData {
  // No persistent data needed for this game
}

const DEFAULT_DATA: HangmanData = {};

type GameState = "setup" | "enterWord" | "playing";

interface GameData {
  numPlayers: number;
  currentPlayer: number;
  word: string;
  guessedLetters: string[];
  wrongGuesses: number;
}

const MAX_WRONG_GUESSES = 6;

const HANGMAN_STAGES = [
  `
   +---+
   |   |
       |
       |
       |
       |
=========`,
  `
   +---+
   |   |
   O   |
       |
       |
       |
=========`,
  `
   +---+
   |   |
   O   |
   |   |
       |
       |
=========`,
  `
   +---+
   |   |
   O   |
  /|   |
       |
       |
=========`,
  `
   +---+
   |   |
   O   |
  /|\\  |
       |
       |
=========`,
  `
   +---+
   |   |
   O   |
  /|\\  |
  /    |
       |
=========`,
  `
   +---+
   |   |
   O   |
  /|\\  |
  / \\  |
       |
=========`,
];

export const HangmanSpark: React.FC<SparkProps> = ({
  showSettings,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();

  const [data, setData] = useState<HangmanData>(DEFAULT_DATA);
  const [gameState, setGameState] = useState<GameState>("setup");
  const [gameData, setGameData] = useState<GameData>({
    numPlayers: 2,
    currentPlayer: 1,
    word: "",
    guessedLetters: [],
    wrongGuesses: 0,
  });
  const [wordInput, setWordInput] = useState("");

  useEffect(() => {
    const saved = getSparkData("hangman") as any;
    if (saved) {
      setData(saved);
    } else {
      setSparkData("hangman", DEFAULT_DATA);
    }
  }, []);

  const saveData = (newData: HangmanData) => {
    setData(newData);
    setSparkData("hangman", newData);
  };

  const startGame = () => {
    if (wordInput.trim().length === 0) {
      Alert.alert("Error", "Please enter a word");
      return;
    }
    const word = wordInput.trim().toUpperCase();
    setGameData({
      ...gameData,
      word,
      guessedLetters: [],
      wrongGuesses: 0,
      currentPlayer: 1,
    });
    setGameState("playing");
    setWordInput("");
    HapticFeedback.success();
  };

  const guessLetter = (letter: string) => {
    if (gameData.guessedLetters.includes(letter)) return;

    const newGuessed = [...gameData.guessedLetters, letter];
    const isCorrect = gameData.word.includes(letter);
    const newWrongGuesses = isCorrect
      ? gameData.wrongGuesses
      : gameData.wrongGuesses + 1;

    setGameData({
      ...gameData,
      guessedLetters: newGuessed,
      wrongGuesses: newWrongGuesses,
    });

    HapticFeedback.light();

    // Check win/lose conditions
    const wordLetters = new Set(gameData.word.split(""));
    const correctGuesses = newGuessed.filter((l) => wordLetters.has(l));
    const isWin = correctGuesses.length === wordLetters.size;
    const isLose = newWrongGuesses >= MAX_WRONG_GUESSES;

    if (isWin || isLose) {
      const message = isWin
        ? "You won!"
        : `Game over! The word was: ${gameData.word}`;
      Alert.alert("Game Over", message, [
        {
          text: "New Game",
          onPress: () => {
            setGameState("setup");
            setGameData({
              numPlayers: gameData.numPlayers,
              currentPlayer: 1,
              word: "",
              guessedLetters: [],
              wrongGuesses: 0,
            });
          },
        },
      ]);
    } else {
      // Next player's turn
      const nextPlayer = (gameData.currentPlayer % gameData.numPlayers) + 1;
      setGameData((prev) => ({ ...prev, currentPlayer: nextPlayer }));
    }
  };

  const renderWord = () => {
    return gameData.word.split("").map((letter, i) => {
      const isGuessed = gameData.guessedLetters.includes(letter);
      return (
        <Text
          key={i}
          style={[styles.letterBox, { borderColor: colors.border }]}
        >
          {isGuessed ? letter : "_"}
        </Text>
      );
    });
  };

  const renderAlphabet = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    return (
      <View style={styles.alphabetContainer}>
        {alphabet.map((letter) => {
          const isGuessed = gameData.guessedLetters.includes(letter);
          return (
            <TouchableOpacity
              key={letter}
              style={[
                styles.letterPill,
                {
                  backgroundColor: isGuessed ? colors.surface : colors.primary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => guessLetter(letter)}
              disabled={isGuessed}
            >
              <Text
                style={[
                  styles.letterPillText,
                  { color: isGuessed ? colors.textSecondary : "#fff" },
                ]}
              >
                {letter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Settings view
  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Hangman Settings"
            subtitle="Classic word guessing game for 2-4 players"
            icon="🎯"
            sparkId="hangman"
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
              About Hangman
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 16,
              }}
            >
              A classic word guessing game. Players take turns guessing letters
              to reveal the hidden word before the hangman is complete.
            </Text>
          </View>

          <SettingsFeedbackSection sparkName="Hangman" sparkId="hangman" />

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

  // Game views
  if (gameState === "setup") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Hangman</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>
            Number of Players
          </Text>
          <View style={styles.playerButtons}>
            {[2, 3, 4].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.playerButton,
                  {
                    backgroundColor:
                      gameData.numPlayers === num
                        ? colors.primary
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setGameData((prev) => ({ ...prev, numPlayers: num }));
                  HapticFeedback.selection();
                }}
              >
                <Text
                  style={[
                    styles.playerButtonText,
                    {
                      color: gameData.numPlayers === num ? "#fff" : colors.text,
                    },
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setGameState("enterWord");
              HapticFeedback.success();
            }}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (gameState === "enterWord") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Hangman</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.instruction, { color: colors.text }]}>
            Hand the phone to Player 1 to enter the word
          </Text>
          <TextInput
            style={[
              styles.wordInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter the secret word"
            placeholderTextColor={colors.textSecondary}
            value={wordInput}
            onChangeText={setWordInput}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Playing state
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Hangman</Text>
        <Text style={[styles.playerIndicator, { color: colors.text }]}>
          Player {gameData.currentPlayer}'s Turn
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.hangman}>
          {HANGMAN_STAGES[gameData.wrongGuesses]}
        </Text>
        <View style={styles.wordContainer}>{renderWord()}</View>
        <Text style={[styles.guessedText, { color: colors.textSecondary }]}>
          Guessed: {gameData.guessedLetters.join(", ")}
        </Text>
        {renderAlphabet()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#333" },
  playerIndicator: { fontSize: 16, marginTop: 8 },
  content: { padding: 20, alignItems: "center" },
  label: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  playerButtons: { flexDirection: "row", gap: 12, marginBottom: 32 },
  playerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  playerButtonText: { fontSize: 20, fontWeight: "bold" },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
  },
  startButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  instruction: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  wordInput: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  hangman: {
    fontFamily: "monospace",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  wordContainer: { flexDirection: "row", gap: 8, marginBottom: 20 },
  letterBox: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 4,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
  },
  guessedText: { fontSize: 14, marginBottom: 20 },
  alphabetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    maxWidth: 300,
  },
  letterPill: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  letterPillText: { fontSize: 16, fontWeight: "bold" },
});

export default HangmanSpark;
