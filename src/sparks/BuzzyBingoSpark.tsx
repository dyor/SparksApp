import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Alert, Modal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Conditionally import expo-sensors
let Accelerometer: any = null;
let isSensorsAvailable = false;
try {
  const sensors = require('expo-sensors');
  Accelerometer = sensors.Accelerometer;
  isSensorsAvailable = true;
} catch (error) {
  console.log('expo-sensors not available, shake detection disabled');
  isSensorsAvailable = false;
}
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import * as Sharing from 'expo-sharing';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsInput,
  SettingsButton,
  SettingsFeedbackSection,
  SettingsItem,
  SettingsText,
  SettingsRemoveButton,
  SaveCancelButtons,
} from '../components/SettingsComponents';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SIZE = 5;
const CENTER_INDEX = 12; // Row 2, Column 2 (0-indexed: 2*5 + 2 = 12)

interface WordSet {
  id: string;
  name: string;
  words: string[]; // Should be normalized to 24 words
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface BuzzyBingoGame {
  wordSetId: string;
  grid: string[][]; // 5x5 grid with words (center is "FREE")
  checkedSquares: boolean[][]; // 5x5 grid of checked states
  randomized: boolean;
  lastResetAt: string;
  bingos: string[]; // Array of bingo line identifiers (e.g., "row-2", "col-1", "diag-0")
}

interface BuzzyBingoData {
  wordSets: WordSet[];
  game: BuzzyBingoGame | null;
}

const DEFAULT_WORDS = [
  'KMP',
  'CMP',
  'Android',
  'Agentic',
  'AI',
  'LLM',
  'Cross Platform',
  'Premium',
  'Vibe Coding',
  'Agent',
  'Android Studio',
  'Cursor',
  'React Native',
  'TypeScript',
  'Compose',
  'Kotlin',
  'Developer',
  'CUJ',
  'Hallucinate',
  'Gemini',
  'Claude',
  'Context',
  'Foldable',
  'Wear',
];

interface BuzzyBingoSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const BuzzyBingoSpark: React.FC<BuzzyBingoSparkProps> = ({
  showSettings = false,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();
  const [data, setData] = useState<BuzzyBingoData>({ wordSets: [], game: null });
  const [isLoading, setIsLoading] = useState(true);
  const [showWordSetModal, setShowWordSetModal] = useState(false);
  const [editingWordSet, setEditingWordSet] = useState<WordSet | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [celebrationScale] = useState(new Animated.Value(0));
  const [celebrationRotation] = useState(new Animated.Value(0));
  const [celebrationOpacity] = useState(new Animated.Value(0));
  const [bingoLines, setBingoLines] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const accelerometerSubscription = useRef<any>(null);
  const lastShakeTime = useRef<number>(0);

  // Normalize words to exactly 24 words (duplicate if needed)
  const normalizeWords = (words: string[]): string[] => {
    const trimmed = words.filter(w => w.trim().length > 0).map(w => w.trim());
    if (trimmed.length === 0) return DEFAULT_WORDS;
    if (trimmed.length >= 24) return trimmed.slice(0, 24);
    
    // Duplicate words to fill to 24
    const result = [...trimmed];
    while (result.length < 24) {
      result.push(...trimmed);
      if (result.length >= 24) break;
    }
    return result.slice(0, 24);
  };

  // Load data
  useEffect(() => {
    const loadData = () => {
      const saved = getSparkData('buzzy-bingo') as BuzzyBingoData | null;
      if (saved && saved.wordSets && Array.isArray(saved.wordSets) && saved.wordSets.length > 0) {
        setData(saved);
      } else {
        // Create default word set
        const defaultWordSet: WordSet = {
          id: Date.now().toString(),
          name: 'Tech Buzzwords',
          words: normalizeWords(DEFAULT_WORDS),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        };
        const initialData: BuzzyBingoData = {
          wordSets: [defaultWordSet],
          game: null,
        };
        setData(initialData);
        setSparkData('buzzy-bingo', initialData);
      }
      setIsLoading(false);
    };
    loadData();
  }, [getSparkData, setSparkData]);

  // Get active word set (with safety checks)
  const activeWordSet = (data.wordSets && Array.isArray(data.wordSets) && data.wordSets.length > 0)
    ? (data.wordSets.find(ws => ws.isActive) || data.wordSets[0])
    : null;

  // Initialize or reset game
  const initializeGame = (randomize: boolean = true) => {
    if (!activeWordSet) return;

    const words = [...activeWordSet.words];
    
    // Shuffle words if randomizing
    if (randomize) {
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
    }

    // Create 5x5 grid
    const grid: string[][] = [];
    const checked: boolean[][] = [];
    let wordIndex = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row] = [];
      checked[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        if (index === CENTER_INDEX) {
          grid[row][col] = 'FREE';
          checked[row][col] = true; // Center is always checked
        } else {
          grid[row][col] = words[wordIndex] || '';
          checked[row][col] = false;
          wordIndex++;
        }
      }
    }

    const newGame: BuzzyBingoGame = {
      wordSetId: activeWordSet.id,
      grid,
      checkedSquares: checked,
      randomized: randomize,
      lastResetAt: new Date().toISOString(),
      bingos: [],
    };

    const updatedData = { ...data, game: newGame };
    setData(updatedData);
    setSparkData('buzzy-bingo', updatedData);
    setBingoLines([]);
  };

  // Initialize game on mount or when active word set changes
  useEffect(() => {
    if (!isLoading && activeWordSet && (!data.game || data.game.wordSetId !== activeWordSet.id)) {
      initializeGame();
    }
  }, [activeWordSet?.id, isLoading]);

  // Check for bingos
  const checkBingos = (checked: boolean[][]): string[] => {
    const bingos: string[] = [];

    // Check rows
    for (let row = 0; row < GRID_SIZE; row++) {
      if (checked[row].every(cell => cell)) {
        bingos.push(`row-${row}`);
      }
    }

    // Check columns
    for (let col = 0; col < GRID_SIZE; col++) {
      if (checked.every(row => row[col])) {
        bingos.push(`col-${col}`);
      }
    }

    // Check main diagonal (top-left to bottom-right)
    if (checked.every((row, i) => row[i])) {
      bingos.push('diag-0');
    }

    // Check anti-diagonal (top-right to bottom-left)
    if (checked.every((row, i) => row[GRID_SIZE - 1 - i])) {
      bingos.push('diag-1');
    }

    return bingos;
  };

  // Toggle square
  const toggleSquare = (row: number, col: number) => {
    if (!data.game) return;
    if (row === 2 && col === 2) return; // Center is always checked

    const newChecked = data.game.checkedSquares.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? !c : c)) : r
    );

    const newBingos = checkBingos(newChecked);
    const isNewBingo = newBingos.some(b => !data.game!.bingos.includes(b));

    const updatedGame: BuzzyBingoGame = {
      ...data.game,
      checkedSquares: newChecked,
      bingos: newBingos,
    };

    const updatedData = { ...data, game: updatedGame };
    setData(updatedData);
    setSparkData('buzzy-bingo', updatedData);
    setBingoLines(newBingos);

    if (isNewBingo) {
      // Big celebration!
      setShowCelebration(true);
      
      // Multiple haptic pulses throughout the celebration
      HapticFeedback.success();
      setTimeout(() => HapticFeedback.medium(), 200);
      setTimeout(() => HapticFeedback.medium(), 400);
      setTimeout(() => HapticFeedback.light(), 800);
      setTimeout(() => HapticFeedback.light(), 1200);
      
      // Reset animation values
      celebrationScale.setValue(0);
      celebrationRotation.setValue(0);
      celebrationOpacity.setValue(0);
      
      // Longer, more elaborate celebration sequence
      Animated.parallel([
        // Scale animation - grows big, then settles
        Animated.sequence([
          Animated.spring(celebrationScale, {
            toValue: 1.5,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(celebrationScale, {
            toValue: 1.2,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
        // Rotation animation - spins
        Animated.sequence([
          Animated.timing(celebrationRotation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        // Opacity fade in and out
        Animated.sequence([
          Animated.timing(celebrationOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1300),
          Animated.timing(celebrationOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset after celebration
        setTimeout(() => {
          setShowCelebration(false);
          celebrationScale.setValue(0);
          celebrationRotation.setValue(0);
          celebrationOpacity.setValue(0);
        }, 100);
      });
    } else {
      HapticFeedback.light();
    }
  };

  // Shake detection
  useEffect(() => {
    if (!isSensorsAvailable || !Accelerometer) {
      console.log('Shake detection disabled - expo-sensors not available');
      return;
    }

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    const SHAKE_THRESHOLD = 1.5;
    const SHAKE_COOLDOWN = 2000; // 2 seconds between resets

    try {
      Accelerometer.setUpdateInterval(100);

      accelerometerSubscription.current = Accelerometer.addListener(({ x, y, z }: any) => {
        const acceleration = Math.sqrt(
          Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2) + Math.pow(z - lastZ, 2)
        );

        if (acceleration > SHAKE_THRESHOLD) {
          const now = Date.now();
          if (now - lastShakeTime.current > SHAKE_COOLDOWN) {
            lastShakeTime.current = now;
            HapticFeedback.medium();
            initializeGame();
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      });
    } catch (error) {
      console.error('Error setting up shake detection:', error);
    }

    return () => {
      if (accelerometerSubscription.current) {
        try {
          accelerometerSubscription.current.remove();
        } catch (error) {
          console.error('Error removing accelerometer listener:', error);
        }
      }
    };
  }, []);

  // Check if a square is part of a bingo line
  const isBingoSquare = (row: number, col: number): boolean => {
    return bingoLines.some(line => {
      if (line.startsWith('row-')) {
        return parseInt(line.split('-')[1]) === row;
      }
      if (line.startsWith('col-')) {
        return parseInt(line.split('-')[1]) === col;
      }
      if (line === 'diag-0') {
        return row === col;
      }
      if (line === 'diag-1') {
        return row === GRID_SIZE - 1 - col;
      }
      return false;
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      paddingTop: 60,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    gameContainer: {
      flex: 1,
      padding: 16,
      alignItems: 'center',
    },
    resetButtonFullWidth: {
      width: '100%',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButtonFullWidthText: {
      fontSize: 16,
      fontWeight: '600',
    },
    wordSetName: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    grid: {
      width: screenWidth - 32,
      aspectRatio: 1,
    },
    gridRow: {
      flexDirection: 'row',
      flex: 1,
    },
    square: {
      flex: 1,
      aspectRatio: 1,
      margin: 2,
      borderRadius: 8,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
    },
    squareText: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    celebrationContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 1000,
    },
    celebrationText: {
      fontSize: 80,
      fontWeight: 'bold',
      textShadowColor: '#000',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
    celebrationSubtext: {
      fontSize: 32,
      fontWeight: '600',
      marginTop: 16,
      textShadowColor: '#000',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
  });

  // Word set management functions
  const handleActivateWordSet = (wordSetId: string) => {
    const updatedWordSets = data.wordSets.map(ws => ({
      ...ws,
      isActive: ws.id === wordSetId,
    }));
    const updatedData = { ...data, wordSets: updatedWordSets };
    setData(updatedData);
    setSparkData('buzzy-bingo', updatedData);
    HapticFeedback.light();
  };

  const handleDeleteWordSet = (wordSetId: string) => {
    Alert.alert(
      'Delete Word Set',
      'Are you sure you want to delete this word set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedWordSets = data.wordSets.filter(ws => ws.id !== wordSetId);
            // If we deleted the active set, make the first one active
            if (updatedWordSets.length > 0 && !updatedWordSets.find(ws => ws.isActive)) {
              updatedWordSets[0].isActive = true;
            }
            const updatedData = { ...data, wordSets: updatedWordSets };
            setData(updatedData);
            setSparkData('buzzy-bingo', updatedData);
            HapticFeedback.light();
          },
        },
      ]
    );
  };

  const handleEditWordSet = (wordSet: WordSet) => {
    setEditingWordSet({ ...wordSet });
    setShowWordSetModal(true);
  };

  const handleAddWordSet = () => {
    setEditingWordSet({
      id: '',
      name: '',
      words: [''],
      createdAt: '',
      updatedAt: '',
      isActive: false,
    });
    setShowWordSetModal(true);
  };

  const handleShareWordSet = async (wordSet: WordSet) => {
    try {
      const shareData = {
        name: wordSet.name,
        words: wordSet.words,
      };
      const jsonString = JSON.stringify(shareData, null, 2);
      
      if (await Sharing.isAvailableAsync()) {
        // For now, we'll use Alert to show the JSON - in a real app, you'd save to a file first
        Alert.alert(
          'Word Set',
          `Copy this JSON:\n\n${jsonString}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Share', jsonString);
      }
    } catch (error) {
      console.error('Error sharing word set:', error);
      Alert.alert('Error', 'Failed to share word set');
    }
  };

  const handleImportWordSet = () => {
    setShowImportModal(true);
  };

  const handleProcessImport = () => {
    try {
      const imported = JSON.parse(importText);
      if (!imported.name || !Array.isArray(imported.words)) {
        Alert.alert('Invalid Format', 'Word set must have "name" and "words" fields');
        return;
      }

      const normalizedWords = normalizeWords(imported.words);
      const newWordSet: WordSet = {
        id: Date.now().toString(),
        name: imported.name,
        words: normalizedWords,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: false, // New imports are not active by default
      };

      const updatedWordSets = [...data.wordSets, newWordSet];
      const updatedData = { ...data, wordSets: updatedWordSets };
      setData(updatedData);
      setSparkData('buzzy-bingo', updatedData);
      setShowImportModal(false);
      setImportText('');
      HapticFeedback.success();
      Alert.alert('Success', 'Word set imported successfully!');
    } catch (error) {
      Alert.alert('Invalid JSON', 'Please check the format of your JSON');
    }
  };

  const handleSaveWordSet = () => {
    if (!editingWordSet) return;
    
    const trimmedWords = editingWordSet.words.filter(w => w.trim().length > 0);
    if (trimmedWords.length === 0) {
      Alert.alert('Error', 'Word set must have at least one word');
      return;
    }

    const normalizedWords = normalizeWords(trimmedWords);
    const now = new Date().toISOString();

    if (editingWordSet.id && data.wordSets.find(ws => ws.id === editingWordSet!.id)) {
      // Update existing
      const updatedWordSets = data.wordSets.map(ws =>
        ws.id === editingWordSet.id
          ? { ...editingWordSet, words: normalizedWords, updatedAt: now }
          : ws
      );
      const updatedData = { ...data, wordSets: updatedWordSets };
      setData(updatedData);
      setSparkData('buzzy-bingo', updatedData);
    } else {
      // Create new
      const newWordSet: WordSet = {
        id: Date.now().toString(),
        name: editingWordSet.name || 'New Word Set',
        words: normalizedWords,
        createdAt: now,
        updatedAt: now,
        isActive: data.wordSets.length === 0, // First word set is active
      };
      const updatedWordSets = [...data.wordSets, newWordSet];
      const updatedData = { ...data, wordSets: updatedWordSets };
      setData(updatedData);
      setSparkData('buzzy-bingo', updatedData);
    }

    setShowWordSetModal(false);
    setEditingWordSet(null);
    HapticFeedback.success();
  };

  if (showSettings) {
    return (
      <>
        <SettingsContainer>
          <SettingsScrollView>
            <SettingsHeader
              title="Buzzy Bingo Settings"
              subtitle="Manage your word sets and game preferences"
            />
            <SettingsFeedbackSection sparkName="Buzzy Bingo" sparkId="buzzy-bingo" />

            {/* Active Word Set */}
            <SettingsSection title="Active Word Set">
              {activeWordSet ? (
                <SettingsItem>
                  <SettingsText>{activeWordSet.name}</SettingsText>
                </SettingsItem>
              ) : (
                <SettingsItem>
                  <SettingsText>No active word set</SettingsText>
                </SettingsItem>
              )}
            </SettingsSection>

            {/* Your Word Sets */}
            <SettingsSection title="Your Word Sets">
              <SettingsButton
                title="Add Word Set"
                onPress={handleAddWordSet}
              />
              {data.wordSets.map((wordSet) => (
                <SettingsItem key={wordSet.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View style={{ flex: 1 }}>
                      <SettingsText>{wordSet.name}</SettingsText>
                      <SettingsText style={{ fontSize: 12, opacity: 0.7 }}>
                        {wordSet.words.length} words {wordSet.isActive ? '• Active' : ''}
                      </SettingsText>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {!wordSet.isActive && (
                        <TouchableOpacity
                          onPress={() => handleActivateWordSet(wordSet.id)}
                          style={{ padding: 8 }}
                        >
                          <Text style={{ color: colors.primary, fontSize: 14 }}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleEditWordSet(wordSet)}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 14 }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShareWordSet(wordSet)}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 14 }}>Share</Text>
                      </TouchableOpacity>
                      <SettingsRemoveButton
                        onPress={() => handleDeleteWordSet(wordSet.id)}
                      />
                    </View>
                  </View>
                </SettingsItem>
              ))}
            </SettingsSection>

            {/* Share & Import */}
            <SettingsSection title="Share & Import">
              <SettingsButton
                title="Import Word Set"
                onPress={handleImportWordSet}
              />
            </SettingsSection>

            {/* Close Button */}
            <View style={{ padding: 16, paddingTop: 24 }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
                onPress={() => {
                  HapticFeedback.light();
                  if (onCloseSettings) onCloseSettings();
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </SettingsScrollView>
        </SettingsContainer>

        {/* Word Set Edit Modal */}
        {showWordSetModal && editingWordSet && (
          <Modal visible={showWordSetModal} animationType="slide" presentationStyle="pageSheet">
            <SettingsContainer>
              <SettingsScrollView>
                <SettingsHeader
                  title={editingWordSet.id ? 'Edit Word Set' : 'New Word Set'}
                  subtitle={editingWordSet.id ? 'Update your word set' : 'Create a new word set'}
                />
                <SettingsSection title="Name">
                  <SettingsInput
                    placeholder="Word set name"
                    value={editingWordSet.name}
                    onChangeText={(text) => setEditingWordSet({ ...editingWordSet, name: text })}
                  />
                </SettingsSection>
                <SettingsSection title="Words">
                  {editingWordSet.words.map((word, index) => (
                    <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <SettingsInput
                        placeholder={`Word ${index + 1}`}
                        value={word}
                        onChangeText={(text) => {
                          const newWords = [...editingWordSet.words];
                          newWords[index] = text;
                          setEditingWordSet({ ...editingWordSet, words: newWords });
                        }}
                        style={{ flex: 1, marginRight: 8 }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const newWords = editingWordSet.words.filter((_, i) => i !== index);
                          setEditingWordSet({ ...editingWordSet, words: newWords });
                        }}
                        style={{ padding: 8, justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#ff4444' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      setEditingWordSet({ ...editingWordSet, words: [...editingWordSet.words, ''] });
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: colors.primary }}>+ Add Word</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                    Note: Words will be normalized to exactly 24 words (duplicated if needed)
                  </Text>
                </SettingsSection>
                <SaveCancelButtons
                  onSave={handleSaveWordSet}
                  onCancel={() => {
                    setShowWordSetModal(false);
                    setEditingWordSet(null);
                  }}
                />
              </SettingsScrollView>
            </SettingsContainer>
          </Modal>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <Modal visible={showImportModal} animationType="slide" presentationStyle="pageSheet">
            <SettingsContainer>
              <SettingsScrollView>
                <SettingsHeader
                  title="Import Word Set"
                  subtitle="Paste JSON to import a word set"
                />
                <SettingsSection title="JSON">
                  <SettingsInput
                    placeholder='{"name": "My Word Set", "words": ["word1", "word2", ...]}'
                    value={importText}
                    onChangeText={setImportText}
                    multiline
                    style={{ minHeight: 200, textAlignVertical: 'top' }}
                  />
                </SettingsSection>
                <SaveCancelButtons
                  onSave={handleProcessImport}
                  onCancel={() => {
                    setShowImportModal(false);
                    setImportText('');
                  }}
                />
              </SettingsScrollView>
            </SettingsContainer>
          </Modal>
        )}
      </>
    );
  }

  if (isLoading || !data.wordSets || data.wordSets.length === 0 || !activeWordSet) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text, padding: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (!data.game) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text, padding: 16 }}>Initializing game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buzzy Bingo</Text>
      </View>

      <View style={styles.gameContainer}>
        {activeWordSet && (
          <Text style={styles.wordSetName}>{activeWordSet.name}</Text>
        )}
        <View style={styles.grid}>
          {data.game.grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((word, colIndex) => {
                const isChecked = data.game!.checkedSquares[rowIndex][colIndex];
                const isBingo = isBingoSquare(rowIndex, colIndex);
                const isCenter = rowIndex === 2 && colIndex === 2;

                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.square,
                      {
                        backgroundColor: isChecked
                          ? isCenter
                            ? colors.primary + '40'
                            : colors.primary + '80'
                          : colors.surface,
                        borderColor: isBingo
                          ? '#FFD700'
                          : isChecked
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => toggleSquare(rowIndex, colIndex)}
                  >
                    <Text
                      style={[
                        styles.squareText,
                        {
                          color: isChecked ? '#fff' : colors.text,
                          fontWeight: isCenter ? 'bold' : '600',
                        },
                      ]}
                    >
                      {word}
                    </Text>
                    {isChecked && !isCenter && (
                      <Text style={{ fontSize: 20, color: '#fff' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.resetButtonFullWidth, { backgroundColor: colors.primary }]}
          onPress={() => {
            HapticFeedback.medium();
            initializeGame();
          }}
        >
          <Text style={[styles.resetButtonFullWidthText, { color: '#fff' }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Celebration Animation */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebrationContainer,
            {
              opacity: celebrationOpacity,
              transform: [
                {
                  scale: celebrationScale,
                },
                {
                  rotate: celebrationRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.celebrationText, { color: '#FFD700' }]}>🎉 BINGO! 🎉</Text>
          <Text style={[styles.celebrationSubtext, { color: '#FF6B6B' }]}>YOU DID IT!</Text>
        </Animated.View>
      )}
    </View>
  );
};

