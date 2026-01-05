import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SaveCancelButtons,
} from '../components/SettingsComponents';
import { HapticFeedback } from '../utils/haptics';

interface HangmanData {
    // No persistent data needed for this game
}

const DEFAULT_DATA: HangmanData = {};

export const HangmanSpark: React.FC<SparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    // Game state
    const [numPlayers, setNumPlayers] = useState<number | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [gamePhase, setGamePhase] = useState<'setup' | 'enter-word' | 'playing'>('setup');
    const [word, setWord] = useState('');
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [currentGuess, setCurrentGuess] = useState('');

    const maxWrongGuesses = 6;

    // ASCII hangman stages
    const hangmanStages = [
        '', // 0 wrong guesses
        `
   +---+
   |   |
       |
       |
       |
       |
=========`, // 1
        `
   +---+
   |   |
   O   |
       |
       |
       |
=========`, // 2
        `
   +---+
   |   |
   O   |
   |   |
       |
       |
=========`, // 3
        `
   +---+
   |   |
   O   |
  /|   |
       |
       |
=========`, // 4
        `
   +---+
   |   |
   O   |
  /|\\  |
       |
       |
=========`, // 5
        `
   +---+
   |   |
   O   |
  /|\\  |
  /    |
       |
=========`, // 6
        `
   +---+
   |   |
   O   |
  /|\\  |
  / \\  |
       |
=========` // 7 (game over)
    ];

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    useEffect(() => {
        const saved = getSparkData('hangman');
        if (saved) {
            // Restore any saved state if needed
        }
    }, []);

    const resetGame = () => {
        setNumPlayers(null);
        setCurrentPlayer(1);
        setGamePhase('setup');
        setWord('');
        setGuessedLetters(new Set());
        setWrongGuesses(0);
        setCurrentGuess('');
    };

    const startGame = () => {
        if (numPlayers && numPlayers >= 2 && numPlayers <= 4) {
            setGamePhase('enter-word');
        }
    };

    const submitWord = () => {
        if (currentGuess.trim().length > 0) {
            setWord(currentGuess.trim().toUpperCase());
            setGamePhase('playing');
            setCurrentGuess('');
            HapticFeedback.success();
        }
    };

    const guessLetter = (letter: string) => {
        if (guessedLetters.has(letter)) return;

        const newGuessed = new Set(guessedLetters);
        newGuessed.add(letter);
        setGuessedLetters(newGuessed);

        if (word.includes(letter)) {
            HapticFeedback.success();
            // Check if word is complete
            const wordLetters = new Set(word.split(''));
            const isComplete = [...wordLetters].every(l => newGuessed.has(l));
            if (isComplete) {
                Alert.alert('Congratulations!', `Player ${currentPlayer} wins!`, [
                    { text: 'Play Again', onPress: resetGame }
                ]);
            }
        } else {
            const newWrong = wrongGuesses + 1;
            setWrongGuesses(newWrong);
            HapticFeedback.error();

            if (newWrong >= maxWrongGuesses) {
                Alert.alert('Game Over!', `The word was: ${word}`, [
                    { text: 'Play Again', onPress: resetGame }
                ]);
            } else {
                // Next player's turn
                setCurrentPlayer(currentPlayer % (numPlayers || 2) + 1);
            }
        }
    };

    const renderWordDisplay = () => {
        return word.split('').map((letter, i) => (
            <Text key={i} style={styles.wordLetter}>
                {guessedLetters.has(letter) ? letter : '_'}
            </Text>
        ));
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
                        <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8, fontWeight: '600' }}>
                            About Hangman
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                            A classic word guessing game. Player 1 enters a word, then players take turns guessing letters. Wrong guesses build the hangman!
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

    // Setup phase - select number of players
    if (gamePhase === 'setup') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>🎯 Hangman</Text>
                </View>

                <View style={styles.content}>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        How many players?
                    </Text>

                    <View style={styles.playerButtons}>
                        {[2, 3, 4].map(num => (
                            <TouchableOpacity
                                key={num}
                                style={[styles.playerButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    setNumPlayers(num);
                                    HapticFeedback.selection();
                                }}
                            >
                                <Text style={styles.playerButtonText}>{num} Players</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {numPlayers && (
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: colors.primary }]}
                            onPress={startGame}
                        >
                            <Text style={styles.startButtonText}>Start Game</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    // Enter word phase
    if (gamePhase === 'enter-word') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>🎯 Hangman</Text>
                </View>

                <View style={styles.content}>
                    <Text style={[styles.instruction, { color: colors.text }]}>
                        Hand the phone to Player 1 to enter the word
                    </Text>

                    <TextInput
                        style={[styles.wordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        value={currentGuess}
                        onChangeText={setCurrentGuess}
                        placeholder="Enter a word..."
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="characters"
                        maxLength={20}
                    />

                    <TouchableOpacity
                        style={[styles.startButton, { backgroundColor: colors.primary }]}
                        onPress={submitWord}
                    >
                        <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Playing phase
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>🎯 Hangman</Text>
                <Text style={[styles.playerIndicator, { color: colors.primary }]}>
                    Player {currentPlayer}'s Turn
                </Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Hangman ASCII Art */}
                <View style={styles.hangmanContainer}>
                    <Text style={[styles.hangmanText, { color: colors.text }]}>
                        {hangmanStages[wrongGuesses]}
                    </Text>
                </View>

                {/* Word Display */}
                <View style={styles.wordContainer}>
                    {renderWordDisplay()}
                </View>

                {/* Alphabet Pills */}
                <View style={styles.alphabetContainer}>
                    {alphabet.map(letter => {
                        const isGuessed = guessedLetters.has(letter);
                        const isInWord = word.includes(letter);
                        return (
                            <TouchableOpacity
                                key={letter}
                                style={[
                                    styles.letterPill,
                                    {
                                        backgroundColor: isGuessed
                                            ? (isInWord ? '#4CAF50' : '#F44336')
                                            : colors.surface,
                                        borderColor: colors.border
                                    }
                                ]}
                                onPress={() => guessLetter(letter)}
                                disabled={isGuessed}
                            >
                                <Text style={[
                                    styles.letterText,
                                    { color: isGuessed ? '#fff' : colors.text }
                                ]}>
                                    {letter}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.resetButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => {
                        Alert.alert('Reset Game?', 'Are you sure you want to start over?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reset', onPress: resetGame }
                        ]);
                    }}
                >
                    <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset Game</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    playerIndicator: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30,
    },
    playerButtons: {
        gap: 15,
        marginBottom: 30,
    },
    playerButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    playerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    startButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    instruction: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: '600',
    },
    wordInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 30,
    },
    hangmanContainer: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 20,
    },
    hangmanText: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 14,
    },
    wordContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: 30,
        gap: 8,
    },
    wordLetter: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 30,
        textAlign: 'center',
    },
    alphabetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 30,
    },
    letterPill: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HangmanSpark;