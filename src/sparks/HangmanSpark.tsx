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
    // Minimal data, perhaps just for settings if any
}

const DEFAULT_DATA: HangmanData = {};

type GameState = 'setup-players' | 'enter-word' | 'playing' | 'game-over';

interface GameData {
    numPlayers: number;
    currentPlayer: number;
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    maxWrongGuesses: number;
}

const HANGMAN_STAGES = [
    '', // 0 wrong
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
=========`, // 7 (game over)
];

export const HangmanSpark: React.FC<SparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    const [data, setData] = useState<HangmanData>(DEFAULT_DATA);
    const [gameState, setGameState] = useState<GameState>('setup-players');
    const [gameData, setGameData] = useState<GameData>({
        numPlayers: 2,
        currentPlayer: 1,
        word: '',
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
    });
    const [wordInput, setWordInput] = useState('');

    useEffect(() => {
        const saved = getSparkData('hangman') as any;
        if (saved) {
            setData(saved);
        } else {
            setSparkData('hangman', DEFAULT_DATA);
        }
    }, []);

    const saveData = (newData: HangmanData) => {
        setData(newData);
        setSparkData('hangman', newData);
    };

    const startNewGame = () => {
        setGameState('setup-players');
        setGameData({
            numPlayers: 2,
            currentPlayer: 1,
            word: '',
            guessedLetters: [],
            wrongGuesses: 0,
            maxWrongGuesses: 6,
        });
        setWordInput('');
    };

    const selectNumPlayers = (num: number) => {
        setGameData(prev => ({ ...prev, numPlayers: num }));
        setGameState('enter-word');
        HapticFeedback.selection();
    };

    const startGame = () => {
        if (!wordInput.trim()) {
            Alert.alert('Error', 'Please enter a word');
            return;
        }
        const word = wordInput.trim().toUpperCase();
        if (!/^[A-Z]+$/.test(word)) {
            Alert.alert('Error', 'Word must contain only letters');
            return;
        }
        setGameData(prev => ({
            ...prev,
            word,
            guessedLetters: [],
            wrongGuesses: 0,
            currentPlayer: 1,
        }));
        setGameState('playing');
        HapticFeedback.success();
    };

    const guessLetter = (letter: string) => {
        if (gameData.guessedLetters.includes(letter)) return;

        const newGuessed = [...gameData.guessedLetters, letter];
        const isCorrect = gameData.word.includes(letter);
        const newWrongGuesses = isCorrect ? gameData.wrongGuesses : gameData.wrongGuesses + 1;

        setGameData(prev => ({
            ...prev,
            guessedLetters: newGuessed,
            wrongGuesses: newWrongGuesses,
        }));

        if (newWrongGuesses >= gameData.maxWrongGuesses) {
            // Game over - lost
            setGameState('game-over');
        } else if (gameData.word.split('').every(l => newGuessed.includes(l))) {
            // Won
            setGameState('game-over');
        } else {
            // Next player
            const nextPlayer = prev.currentPlayer % prev.numPlayers + 1;
            setGameData(prev => ({ ...prev, currentPlayer: nextPlayer }));
        }

        HapticFeedback.selection();
    };

    const renderWord = () => {
        return gameData.word.split('').map((letter, i) => (
            <Text key={i} style={styles.letterBox}>
                {gameData.guessedLetters.includes(letter) ? letter : '_'}
            </Text>
        ));
    };

    const renderAlphabet = () => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        return alphabet.map(letter => {
            const isGuessed = gameData.guessedLetters.includes(letter);
            const isCorrect = gameData.word.includes(letter);
            let backgroundColor = colors.surface;
            if (isGuessed) {
                backgroundColor = isCorrect ? '#4CAF50' : '#F44336';
            }
            return (
                <TouchableOpacity
                    key={letter}
                    style={[styles.letterPill, { backgroundColor }]}
                    onPress={() => guessLetter(letter)}
                    disabled={isGuessed || gameState !== 'playing'}
                >
                    <Text style={[styles.letterText, { color: isGuessed ? '#fff' : colors.text }]}>
                        {letter}
                    </Text>
                </TouchableOpacity>
            );
        });
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
                            A classic word guessing game. Players take turns guessing letters to reveal the hidden word before the hangman is complete.
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

    // Main game view
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={styles.title}>🎯 Hangman</Text>
                <TouchableOpacity onPress={startNewGame} style={styles.newGameButton}>
                    <Text style={styles.newGameText}>New Game</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {gameState === 'setup-players' && (
                    <View style={styles.centerContent}>
                        <Text style={[styles.prompt, { color: colors.text }]}>How many players?</Text>
                        <View style={styles.playerButtons}>
                            {[2, 3, 4].map(num => (
                                <TouchableOpacity
                                    key={num}
                                    style={[styles.playerButton, { backgroundColor: colors.primary }]}
                                    onPress={() => selectNumPlayers(num)}
                                >
                                    <Text style={styles.playerButtonText}>{num} Players</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {gameState === 'enter-word' && (
                    <View style={styles.centerContent}>
                        <Text style={[styles.prompt, { color: colors.text }]}>
                            Hand the phone to Player 1 to enter the word
                        </Text>
                        <TextInput
                            style={[styles.wordInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={wordInput}
                            onChangeText={setWordInput}
                            placeholder="Enter word (letters only)"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="characters"
                            maxLength={20}
                        />
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: colors.primary }]}
                            onPress={startGame}
                        >
                            <Text style={styles.startButtonText}>Start</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {gameState === 'playing' && (
                    <View style={styles.gameContent}>
                        <Text style={[styles.playerTurn, { color: colors.text }]}>
                            Player {gameData.currentPlayer}'s Turn
                        </Text>

                        <Text style={styles.hangman}>
                            {HANGMAN_STAGES[gameData.wrongGuesses]}
                        </Text>

                        <View style={styles.wordContainer}>
                            {renderWord()}
                        </View>

                        <Text style={[styles.wrongCount, { color: colors.textSecondary }]}>
                            Wrong guesses: {gameData.wrongGuesses}/{gameData.maxWrongGuesses}
                        </Text>

                        <View style={styles.alphabetContainer}>
                            {renderAlphabet()}
                        </View>
                    </View>
                )}

                {gameState === 'game-over' && (
                    <View style={styles.centerContent}>
                        <Text style={[styles.gameOverTitle, { color: colors.text }]}>
                            {gameData.wrongGuesses >= gameData.maxWrongGuesses ? 'Game Over!' : 'You Win!'}
                        </Text>
                        <Text style={[styles.gameOverWord, { color: colors.text }]}>
                            The word was: {gameData.word}
                        </Text>
                        <TouchableOpacity
                            style={[styles.newGameButtonLarge, { backgroundColor: colors.primary }]}
                            onPress={startNewGame}
                        >
                            <Text style={styles.newGameButtonTextLarge}>Play Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#000' },
    newGameButton: { padding: 8, backgroundColor: '#007AFF', borderRadius: 8 },
    newGameText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    content: { flex: 1 },
    contentContainer: { padding: 20, paddingTop: 0 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
    prompt: { fontSize: 18, textAlign: 'center', marginBottom: 20, fontWeight: '600' },
    playerButtons: { flexDirection: 'row', gap: 12 },
    playerButton: { padding: 16, borderRadius: 12, minWidth: 100, alignItems: 'center' },
    playerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    wordInput: { width: '80%', padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 18, textAlign: 'center', marginBottom: 20 },
    startButton: { padding: 16, borderRadius: 12, minWidth: 120, alignItems: 'center' },
    startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    gameContent: { alignItems: 'center' },
    playerTurn: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    hangman: { fontFamily: 'monospace', fontSize: 12, textAlign: 'center', marginBottom: 20 },
    wordContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    letterBox: { fontSize: 24, fontWeight: 'bold', marginHorizontal: 4, minWidth: 30, textAlign: 'center' },
    wrongCount: { fontSize: 16, marginBottom: 20 },
    alphabetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 300 },
    letterPill: { width: 35, height: 35, borderRadius: 17.5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd' },
    letterText: { fontSize: 16, fontWeight: 'bold' },
    gameOverTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    gameOverWord: { fontSize: 18, marginBottom: 30 },
    newGameButtonLarge: { padding: 16, borderRadius: 12, minWidth: 150, alignItems: 'center' },
    newGameButtonTextLarge: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default HangmanSpark;