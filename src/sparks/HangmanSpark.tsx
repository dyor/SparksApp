import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { SaveCancelButtons } from "../components/SettingsComponents";
import { useTheme } from "../contexts/ThemeContext";

interface HangmanSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const HANGMAN_STATES = [
  `
   +---+
     |
     |
     |
    ===`,
  `
   +---+
   O   |
     |
     |
    ===`,
  `
   +---+
   O   |
   |   |
     |
    ===`,
  `
   +---+
   O   |
  /|   |
     |
    ===`,
  `
   +---+
   O   |
  /|\\  |
     |
    ===`,
  `
   +---+
   O   |
  /|\\  |
  /    |
    ===`,
  `
   +---+
   O   |
  /|\\  |
  / \\  |
    ===`,
];

export const HangmanSpark: React.FC<HangmanSparkProps> = ({ }) => {
  const { colors } = useTheme();

  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [phase, setPhase] = useState<"pickPlayers" | "enterWord" | "playing">(
    "pickPlayers"
  );

  const [wordSetter, setWordSetter] = useState(1); // who entered the word most recently
  const [secretWordRaw, setSecretWordRaw] = useState("");
  const [secretWord, setSecretWord] = useState(""); // normalized (uppercase)

  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1);

  const letters = ALPHABET;

  const visibleLetters = useMemo(() => {
    return secretWord.split("").map((ch) => {
      if (ch === " ") return " ";
      if (!/^[A-Z]$/.test(ch)) return ch; // show punctuation
      return guessedLetters.includes(ch) ? ch : "_";
    });
  }, [secretWord, guessedLetters]);

  const remainingToGuess = useMemo(() => {
    return secretWord
      .split("")
      .filter((ch) => /^[A-Z]$/.test(ch) && !guessedLetters.includes(ch))
      .length;
  }, [secretWord, guessedLetters]);

  const resetForNewRound = (nextSetter: number) => {
    setSecretWordRaw("");
    setSecretWord("");
    setGuessedLetters([]);
    setWrongCount(0);
    setWordSetter(nextSetter);
    setPhase("enterWord");
  };

  const startGameWithWord = (raw: string) => {
    const normalized = raw.toUpperCase();
    setSecretWordRaw(raw);
    setSecretWord(normalized);
    setGuessedLetters([]);
    setWrongCount(0);

    // Determine first guesser: next player after setter
    if (!numPlayers) return;
    const next = (wordSetter % numPlayers) + 1;
    setCurrentPlayer(next);
    setPhase("playing");
  };

  const onPressLetter = (letter: string) => {
    if (guessedLetters.includes(letter) || phase !== "playing") return;

    const isPresent = secretWord.includes(letter);
    setGuessedLetters((g) => [...g, letter]);
    if (!isPresent) {
      setWrongCount((w) => Math.min(w + 1, HANGMAN_STATES.length - 1));
    }

    // Advance to the next player after each guess
    if (numPlayers) {
      setCurrentPlayer((prev) => (prev % numPlayers) + 1);
    }
  };

  const handleWinOrLose = () => {
    if (remainingToGuess === 0) return "win";
    if (wrongCount >= HANGMAN_STATES.length - 1) return "lose";
    return null;
  };

  const result = handleWinOrLose();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.container]}>
        {phase === "pickPlayers" && (
          <View>
            <Text style={[styles.header, { color: colors.text }]}>Hangman</Text>
            <Text style={[styles.label, { color: colors.text }]}>
              How many players?
            </Text>
            <View style={styles.row}>
              {[2, 3, 4].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        numPlayers === n ? colors.primary : colors.card,
                    },
                  ]}
                  onPress={() => setNumPlayers(n)}
                >
                  <Text
                    style={{ color: numPlayers === n ? "white" : colors.text }}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (!numPlayers) return;
                setWordSetter(1);
                setPhase("enterWord");
              }}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "enterWord" && (
          <View>
            <Text style={[styles.header, { color: colors.text }]}>
              Hand the phone to Player {wordSetter} to enter the word
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              Secret word (kept hidden):
            </Text>
            <TextInput
              value={secretWordRaw}
              onChangeText={setSecretWordRaw}
              placeholder="Enter secret word"
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (!secretWordRaw || !numPlayers) return;
                startGameWithWord(secretWordRaw);
              }}
            >
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "playing" && (
          <View>
            <Text style={[styles.header, { color: colors.text }]}>
              Player {currentPlayer}'s Turn
            </Text>

            <View style={styles.hangmanBox}>
              <Text style={[styles.mono, { color: colors.text }]}>
                {HANGMAN_STATES[wrongCount]}
              </Text>
            </View>

            <View style={styles.wordRow}>
              {visibleLetters.map((ch, idx) => (
                <View key={idx} style={styles.letterSlot}>
                  <Text style={[styles.letterText, { color: colors.text }]}>
                    {ch}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.alphabetContainer}>
              {letters.map((l) => {
                const disabled = guessedLetters.includes(l) || !!result;
                return (
                  <TouchableOpacity
                    key={l}
                    onPress={() => onPressLetter(l)}
                    style={[
                      styles.letterPill,
                      {
                        backgroundColor: disabled ? colors.border : colors.card,
                      },
                    ]}
                    disabled={disabled}
                  >
                    <Text
                      style={{ color: disabled ? colors.text : colors.text }}
                    >
                      {l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {result && (
              <View style={{ marginTop: 12 }}>
                <Text
                  style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}
                >
                  {result === "win"
                    ? `Player ${currentPlayer} wins!`
                    : `Player ${currentPlayer} lost. The word was: ${secretWord}`}
                </Text>

                <SaveCancelButtons
                  onSave={() => {
                    // same setter continues
                    const nextSetter = (wordSetter % (numPlayers || 2)) + 1;
                    resetForNewRound(nextSetter);
                  }}
                  onCancel={() => {
                    // restart entire game
                    setNumPlayers(null);
                    setPhase("pickPlayers");
                    setSecretWordRaw("");
                    setSecretWord("");
                    setGuessedLetters([]);
                    setWrongCount(0);
                  }}
                  saveText="Next Round"
                  cancelText="New Game"
                />
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default HangmanSpark;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  hangmanBox: {
    padding: 12,
    alignItems: "center",
    marginVertical: 12,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  wordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  letterSlot: {
    minWidth: 20,
    padding: 6,
    borderBottomWidth: 2,
    marginRight: 6,
    alignItems: "center",
  },
  letterText: {
    fontSize: 18,
    fontWeight: "700",
  },
  alphabetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  letterPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    margin: 4,
    alignItems: "center",
  },
  buttonOutline: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
});
