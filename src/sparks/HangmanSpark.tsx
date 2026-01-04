import React from "react";
import { BaseSpark } from "../components/BaseSpark";
import styled from "styled-components/native";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const LetterBox = styled.TouchableOpacity`
  padding: 8px 10px;
  margin: 4px;
  border-radius: 16px;
  background-color: #e6e6e6;
`;

const LetterText = styled.Text`
  font-size: 16px;
  font-weight: 600;
`;

const BigText = styled.Text`
  font-size: 20px;
  margin-vertical: 8px;
`;

const Ascii = styled.Text`
  font-family: monospace;
  font-size: 14px;
  margin-vertical: 8px;
`;

export const HangmanSpark: React.FC = () => {
  const [numPlayers, setNumPlayers] = React.useState<number | null>(null);
  const [entryWord, setEntryWord] = React.useState("");
  const [started, setStarted] = React.useState(false);
  const [currentPlayer, setCurrentPlayer] = React.useState(1);
  const [guessed, setGuessed] = React.useState<string[]>([]);
  const [wrongCount, setWrongCount] = React.useState(0);

  const stages = [
    `
     _____
    |     |
          |
          |
          |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
          |
          |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
    |     |
          |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
   /|     |
          |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
   /|\    |
          |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
   /|\    |
   /      |
          |
   _______|_`,
    `
     _____
    |     |
    O     |
   /|\    |
   / \    |
          |
   _______|_`,
  ];

  const maxWrong = stages.length - 1;

  const normalizedWord = entryWord.toUpperCase();
  const letters = normalizedWord.split("");

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const startGame = () => {
    setGuessed([]);
    setWrongCount(0);
    setCurrentPlayer(2 <= (numPlayers ?? 2) ? 2 : 1);
    setStarted(true);
  };

  const reset = () => {
    setNumPlayers(null);
    setEntryWord("");
    setStarted(false);
    setGuessed([]);
    setWrongCount(0);
    setCurrentPlayer(1);
  };

  const handleGuess = (ch: string) => {
    if (guessed.includes(ch)) return;
    setGuessed((g) => [...g, ch]);
    if (letters.includes(ch)) {
      // correct
    } else {
      setWrongCount((w) => Math.min(w + 1, maxWrong));
    }

    // rotate to next player
    if (numPlayers) {
      setCurrentPlayer((p) => (p % numPlayers) + 1);
    }
  };

  const allRevealed = letters.filter((l) => l !== " ").every((l) => guessed.includes(l));
  const lost = wrongCount >= maxWrong;

  return (
    <BaseSpark title="Hangman" description="Classic hangman — pass the phone and play with friends">
      {!numPlayers && (
        <View>
          <BigText>How many players? (2-4)</BigText>
          <Row>
            {[2, 3, 4].map((n) => (
              <LetterBox key={n} onPress={() => setNumPlayers(n)}>
                <LetterText>{n} Players</LetterText>
              </LetterBox>
            ))}
          </Row>
        </View>
      )}

      {numPlayers && !started && (
        <View>
          <BigText>Hand the phone to Player 1 to enter the word</BigText>
          <TextInput
            value={entryWord}
            onChangeText={setEntryWord}
            placeholder="Enter the secret word"
            autoCapitalize="characters"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 8,
              borderRadius: 8,
              marginTop: 12,
            }}
            secureTextEntry={true}
          />
          <Row>
            <LetterBox onPress={startGame}>
              <LetterText>Start</LetterText>
            </LetterBox>
            <LetterBox onPress={() => setNumPlayers(null)}>
              <LetterText>Back</LetterText>
            </LetterBox>
          </Row>
        </View>
      )}

      {started && (
        <View>
          <BigText>Player {currentPlayer}'s turn</BigText>
          <Ascii>{stages[wrongCount]}</Ascii>

          <Row>
            {letters.map((l, i) => (
              <View key={`${l}-${i}`} style={{ width: 24, margin: 4, alignItems: "center" }}>
                <Text style={{ fontSize: 20 }}>{l === " " ? " " : guessed.includes(l) ? l : "_"}</Text>
              </View>
            ))}
          </Row>

          <Row>
            {alphabet.map((a) => {
              const disabled = guessed.includes(a) || allRevealed || lost;
              return (
                <LetterBox
                  key={a}
                  onPress={() => !disabled && handleGuess(a)}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                >
                  <LetterText>{a}</LetterText>
                </LetterBox>
              );
            })}
          </Row>

          {(allRevealed || lost) && (
            <View style={{ marginTop: 16 }}>
              <BigText>{allRevealed ? `Player ${((currentPlayer - 2 + (numPlayers ?? 2)) % (numPlayers ?? 2)) + 1} wins!` : `All out — the word was ${entryWord.toUpperCase()}`}</BigText>
              <Row>
                <LetterBox onPress={reset}>
                  <LetterText>Play Again</LetterText>
                </LetterBox>
              </Row>
            </View>
          )}
        </View>
      )}
    </BaseSpark>
  );
};

export default HangmanSpark;
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
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
  /|\  |
       |
      ===`,
  `
   +---+
   O   |
  /|\  |
  /    |
      ===`,
  `
   +---+
   O   |
  /|\  |
  / \  |
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

                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: colors.primary, marginRight: 8 },
                    ]}
                    onPress={() => {
                      // same setter continues
                      const nextSetter = (wordSetter % (numPlayers || 2)) + 1;
                      resetForNewRound(nextSetter);
                    }}
                  >
                    <Text style={styles.buttonText}>Next Round</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.buttonOutline,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => {
                      // restart entire game
                      setNumPlayers(null);
                      setPhase("pickPlayers");
                      setSecretWordRaw("");
                      setSecretWord("");
                      setGuessedLetters([]);
                      setWrongCount(0);
                    }}
                  >
                    <Text style={{ color: colors.text }}>New Game</Text>
                  </TouchableOpacity>
                </View>
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
