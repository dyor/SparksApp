import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { useSparkStore } from '../store';

interface SkinsSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

type GameMode = 'setup' | 'playing' | 'finished';
type PlayerCount = 2 | 3 | 4;
type TeamMode = 'individual' | 'teams';

interface GameState {
  players: string[];
  scores: number[];
  history: number[]; // Index of winner for each hole, -1 for tie
  currentHole: number;
}

export const SkinsSpark: React.FC<SkinsSparkProps> = ({
  showSettings,
  onCloseSettings,
  onStateChange,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();

  // Setup State
  const [mode, setMode] = useState<GameMode>('setup');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [teamMode, setTeamMode] = useState<TeamMode>('individual');
  const [names, setNames] = useState<string[]>(['', '', '', '']);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    scores: [],
    history: [],
    currentHole: 1,
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // Load saved state
  useEffect(() => {
    const savedData = getSparkData('skins');
    if (savedData) {
      if (savedData.mode) setMode(savedData.mode);
      if (savedData.gameState) setGameState(savedData.gameState);
      // Restore setup state if needed, but mainly game state is important
    }
    setDataLoaded(true);
  }, []);

  // Save state
  useEffect(() => {
    if (!dataLoaded) return;
    setSparkData('skins', { mode, gameState });
  }, [mode, gameState, dataLoaded]);

  const handleStartGame = () => {
    const activeNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);

    let finalPlayers = activeNames;
    if (playerCount === 4 && teamMode === 'teams') {
      finalPlayers = [
        `${activeNames[0]} & ${activeNames[1]}`,
        `${activeNames[2]} & ${activeNames[3]}`
      ];
    }

    setGameState({
      players: finalPlayers,
      scores: new Array(finalPlayers.length).fill(0),
      history: [],
      currentHole: 1,
    });
    setMode('playing');
    HapticFeedback.success();
  };

  const handleWinHole = (playerIndex: number) => {
    HapticFeedback.light();
    const newScores = [...gameState.scores];
    if (playerIndex !== -1) {
      newScores[playerIndex]++;
    }

    setGameState(prev => ({
      ...prev,
      scores: newScores,
      history: [...prev.history, playerIndex],
      currentHole: prev.currentHole + 1,
    }));
  };

  const handleUndo = () => {
    if (gameState.history.length === 0) return;

    const lastWinner = gameState.history[gameState.history.length - 1];
    const newScores = [...gameState.scores];
    if (lastWinner !== -1) {
      newScores[lastWinner]--;
    }

    setGameState(prev => ({
      ...prev,
      scores: newScores,
      history: prev.history.slice(0, -1),
      currentHole: prev.currentHole - 1,
    }));
    HapticFeedback.medium();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Game',
      'Are you sure you want to start over?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setMode('setup');
            setGameState({
              players: [],
              scores: [],
              history: [],
              currentHole: 1,
            });
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    optionButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    selectedOption: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    optionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      padding: 18,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 30,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    gameContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    holeIndicator: {
      fontSize: 24,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
    },
    playerCard: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 15,
      marginBottom: 15,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    playerName: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    scoreBadge: {
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
    },
    scoreText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    winButton: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginLeft: 10,
    },
    winButtonText: {
      color: colors.primary,
      fontWeight: '600',
    },
    tieButton: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    controls: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 'auto',
      paddingTop: 20,
    },
    controlButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  if (mode === 'setup') {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Skins Setup 🏌️</Text>

        <Text style={styles.sectionTitle}>Number of Players</Text>
        <View style={styles.buttonGroup}>
          {[2, 3, 4].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.optionButton,
                playerCount === num && styles.selectedOption
              ]}
              onPress={() => {
                setPlayerCount(num as PlayerCount);
                HapticFeedback.light();
              }}
            >
              <Text style={styles.optionText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {playerCount === 4 && (
          <>
            <Text style={styles.sectionTitle}>Game Type</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  teamMode === 'individual' && styles.selectedOption
                ]}
                onPress={() => setTeamMode('individual')}
              >
                <Text style={styles.optionText}>Individual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  teamMode === 'teams' && styles.selectedOption
                ]}
                onPress={() => setTeamMode('teams')}
              >
                <Text style={styles.optionText}>2 vs 2</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {teamMode === 'teams' && playerCount === 4 ? 'Enter Team Names' : 'Enter Player Names'}
        </Text>

        {Array.from({ length: playerCount }).map((_, i) => (
          <TextInput
            key={i}
            style={styles.input}
            placeholder={
              teamMode === 'teams' && playerCount === 4
                ? `Player ${i + 1} (${i < 2 ? 'Team 1' : 'Team 2'})`
                : `Player ${i + 1}`
            }
            placeholderTextColor={colors.textSecondary}
            value={names[i]}
            onChangeText={(text) => {
              const newNames = [...names];
              newNames[i] = text;
              setNames(newNames);
            }}
          />
        ))}

        <TouchableOpacity style={styles.primaryButton} onPress={handleStartGame}>
          <Text style={styles.primaryButtonText}>Start Round</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Skins 🏌️</Text>
      <Text style={styles.holeIndicator}>Hole {gameState.currentHole}</Text>

      <View style={styles.gameContainer}>
        {gameState.players.map((player, index) => (
          <TouchableOpacity
            key={index}
            style={styles.playerCard}
            onPress={() => handleWinHole(index)}
          >
            <Text style={styles.playerName}>{player}</Text>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{gameState.scores[index]}</Text>
            </View>
            <View style={styles.winButton}>
              <Text style={styles.winButtonText}>+ WIN</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.tieButton}
          onPress={() => handleWinHole(-1)}
        >
          <Text style={[styles.optionText, { color: colors.textSecondary }]}>
            Tie / Halve Hole
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleUndo}>
          <Text style={styles.optionText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <Text style={[styles.optionText, { color: '#e74c3c' }]}>End Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
