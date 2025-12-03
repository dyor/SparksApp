import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsInput,
  SettingsButton,
  SaveCancelButtons,
  SettingsText,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';

interface PlayerSet {
  id: string;
  setName: string;
  players: string[];
  winHistory: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface ActiveGame {
  activeSetId: string;
  rounds: Array<Record<string, number>>;
  startedAt: string;
}

interface CardScoreSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

const defaultPlayerSet: PlayerSet = {
  id: 'default',
  setName: 'Default',
  players: ['Hero', 'Villain'],
  winHistory: { Hero: 0, Villain: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Settings Component
const CardScoreSettings: React.FC<{
  playerSets: PlayerSet[];
  onUpdatePlayerSets: (sets: PlayerSet[]) => void;
  onClose: () => void;
}> = ({ playerSets, onUpdatePlayerSets, onClose }) => {
  const { colors } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSet, setEditingSet] = useState<PlayerSet | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [newPlayers, setNewPlayers] = useState<string[]>(['', '']);
  const [editingSetName, setEditingSetName] = useState('');
  const [editingPlayers, setEditingPlayers] = useState<string[]>([]);

  const handleCreateSet = () => {
    setNewSetName('');
    setNewPlayers(['', '']);
    setShowCreateModal(true);
  };

  const handleSaveNewSet = () => {
    const validPlayers = newPlayers.filter(p => p.trim() !== '');
    if (newSetName.trim() === '') {
      Alert.alert('Error', 'Please enter a set name');
      return;
    }
    if (validPlayers.length < 2) {
      Alert.alert('Error', 'Please add at least 2 players');
      return;
    }

    const winHistory: Record<string, number> = {};
    validPlayers.forEach(player => {
      winHistory[player.trim()] = 0;
    });

    const newSet: PlayerSet = {
      id: `set_${Date.now()}`,
      setName: newSetName.trim(),
      players: validPlayers.map(p => p.trim()),
      winHistory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlayerSets([...playerSets, newSet]);
    setShowCreateModal(false);
    HapticFeedback.success();
  };

  const handleEditSet = (set: PlayerSet) => {
    setEditingSet(set);
    setEditingSetName(set.setName);
    setEditingPlayers([...set.players, '']);
    setShowEditModal(true);
  };

  const handleSaveEditSet = () => {
    if (!editingSet) return;

    const validPlayers = editingPlayers.filter(p => p.trim() !== '');
    if (editingSetName.trim() === '') {
      Alert.alert('Error', 'Please enter a set name');
      return;
    }
    if (validPlayers.length < 2) {
      Alert.alert('Error', 'Please add at least 2 players');
      return;
    }

    // Preserve win history for existing players, add new players with 0 wins
    const updatedWinHistory: Record<string, number> = { ...editingSet.winHistory };
    validPlayers.forEach(player => {
      if (!updatedWinHistory[player.trim()]) {
        updatedWinHistory[player.trim()] = 0;
      }
    });
    // Remove win history for players that were removed
    Object.keys(updatedWinHistory).forEach(player => {
      if (!validPlayers.includes(player)) {
        delete updatedWinHistory[player];
      }
    });

    const updatedSet: PlayerSet = {
      ...editingSet,
      setName: editingSetName.trim(),
      players: validPlayers.map(p => p.trim()),
      winHistory: updatedWinHistory,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlayerSets(playerSets.map(s => s.id === editingSet.id ? updatedSet : s));
    setShowEditModal(false);
    setEditingSet(null);
    HapticFeedback.success();
  };

  const handleDeleteSet = (set: PlayerSet) => {
    if (set.id === 'default') {
      Alert.alert('Error', 'Cannot delete the default player set');
      return;
    }

    Alert.alert(
      'Delete Player Set',
      `Are you sure you want to delete "${set.setName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onUpdatePlayerSets(playerSets.filter(s => s.id !== set.id));
            HapticFeedback.medium();
          },
        },
      ]
    );
  };

  const addPlayerField = (isEdit: boolean) => {
    if (isEdit) {
      setEditingPlayers([...editingPlayers, '']);
    } else {
      setNewPlayers([...newPlayers, '']);
    }
  };

  const removePlayerField = (index: number, isEdit: boolean) => {
    if (isEdit) {
      const updated = editingPlayers.filter((_, i) => i !== index);
      if (updated.length >= 2) {
        setEditingPlayers(updated);
      }
    } else {
      const updated = newPlayers.filter((_, i) => i !== index);
      if (updated.length >= 2) {
        setNewPlayers(updated);
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    playerSetCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    playerSetName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    playerSetInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    deleteButton: {
      flex: 1,
      backgroundColor: '#e74c3c',
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playerInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    playerInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    addPlayerButton: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    addPlayerText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="CardScore Settings"
          subtitle="Manage your player sets"
          icon="♠️"
          sparkId="card-score"
        />

        <SettingsFeedbackSection sparkName="CardScore" sparkId="card-score" />

        <SettingsSection title="Player Sets">
          <SettingsButton
            title="Create New Player Set"
            variant="primary"
            onPress={handleCreateSet}
          />

          {playerSets.map(set => (
            <View key={set.id} style={styles.playerSetCard}>
              <Text style={styles.playerSetName}>{set.setName}</Text>
              <Text style={styles.playerSetInfo}>
                Players: {set.players.join(', ')}
              </Text>
              <Text style={styles.playerSetInfo}>
                Wins: {Object.entries(set.winHistory)
                  .map(([player, wins]) => `${player}: ${wins}`)
                  .join(' | ')}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSet(set)}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSet(set)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </SettingsSection>

        <SettingsButton title="Close" variant="secondary" onPress={onClose} />
      </SettingsScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Player Set</Text>
            <TextInput
              style={styles.input}
              placeholder="Set Name"
              placeholderTextColor={colors.textSecondary}
              value={newSetName}
              onChangeText={setNewSetName}
            />
            <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>
              Players:
            </Text>
            {newPlayers.map((player, index) => (
              <View key={index} style={styles.playerInputRow}>
                <TextInput
                  style={styles.playerInput}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor={colors.textSecondary}
                  value={player}
                  onChangeText={(text) => {
                    const updated = [...newPlayers];
                    updated[index] = text;
                    setNewPlayers(updated);
                  }}
                />
                {newPlayers.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removePlayerField(index, false)}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: '#e74c3c', fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addPlayerButton} onPress={() => addPlayerField(false)}>
              <Text style={styles.addPlayerText}>+ Add Player</Text>
            </TouchableOpacity>
            <SaveCancelButtons
              onSave={handleSaveNewSet}
              onCancel={() => setShowCreateModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Player Set</Text>
            <TextInput
              style={styles.input}
              placeholder="Set Name"
              placeholderTextColor={colors.textSecondary}
              value={editingSetName}
              onChangeText={setEditingSetName}
            />
            <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>
              Players:
            </Text>
            {editingPlayers.map((player, index) => (
              <View key={index} style={styles.playerInputRow}>
                <TextInput
                  style={styles.playerInput}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor={colors.textSecondary}
                  value={player}
                  onChangeText={(text) => {
                    const updated = [...editingPlayers];
                    updated[index] = text;
                    setEditingPlayers(updated);
                  }}
                />
                {editingPlayers.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removePlayerField(index, true)}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: '#e74c3c', fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addPlayerButton} onPress={() => addPlayerField(true)}>
              <Text style={styles.addPlayerText}>+ Add Player</Text>
            </TouchableOpacity>
            <SaveCancelButtons
              onSave={handleSaveEditSet}
              onCancel={() => {
                setShowEditModal(false);
                setEditingSet(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </SettingsContainer>
  );
};

export const CardScoreSpark: React.FC<CardScoreSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete,
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [playerSets, setPlayerSets] = useState<PlayerSet[]>([]);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'active-game'>('home');
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [manualScoreInput, setManualScoreInput] = useState('');
  const [showInternalSettings, setShowInternalSettings] = useState(false);

  // Load data on mount (only once)
  useEffect(() => {
    const savedData = getSparkData('card-score');
    
    // Initialize player sets
    if (savedData?.playerSets && savedData.playerSets.length > 0) {
      setPlayerSets(savedData.playerSets);
    } else {
      // Create default player set
      setPlayerSets([defaultPlayerSet]);
    }

    // Check for active game
    if (savedData?.activeGame) {
      setActiveGame(savedData.activeGame);
      setCurrentScreen('active-game');
    } else {
      setCurrentScreen('home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save data whenever it changes
  useEffect(() => {
    // Skip save if playerSets is empty (still loading)
    if (playerSets.length === 0 && activeGame === null) {
      return;
    }
    
    setSparkData('card-score', {
      playerSets,
      activeGame,
    });
    onStateChange?.({
      playerSetCount: playerSets.length,
      hasActiveGame: activeGame !== null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerSets, activeGame]); // Removed setSparkData and onStateChange from deps

  const handleStartGame = (playerSet: PlayerSet) => {
    HapticFeedback.success();
    const newGame: ActiveGame = {
      activeSetId: playerSet.id,
      rounds: [],
      startedAt: new Date().toISOString(),
    };
    setActiveGame(newGame);
    setCurrentScreen('active-game');
  };

  const handleAddRound = () => {
    if (!activeGame) return;
    const playerSet = playerSets.find(s => s.id === activeGame.activeSetId);
    if (!playerSet) return;

    setCurrentPlayerIndex(0);
    setManualScoreInput('');
    setShowAddRoundModal(true);
  };

  const handleScoreButtonPress = (score: number) => {
    if (!activeGame) return;
    const playerSet = playerSets.find(s => s.id === activeGame.activeSetId);
    if (!playerSet) return;

    HapticFeedback.light();

    // Create new round if this is the first player
    const newRound: Record<string, number> = {};
    if (currentPlayerIndex === 0) {
      // Initialize all players with 0
      playerSet.players.forEach(player => {
        newRound[player] = 0;
      });
    } else {
      // Copy previous round scores
      const lastRound = activeGame.rounds[activeGame.rounds.length - 1];
      Object.assign(newRound, lastRound);
    }

    // Set current player's score
    newRound[playerSet.players[currentPlayerIndex]] = score;

    // Update rounds
    const updatedRounds = [...activeGame.rounds];
    if (currentPlayerIndex === 0) {
      updatedRounds.push(newRound);
    } else {
      updatedRounds[updatedRounds.length - 1] = newRound;
    }

    const updatedGame: ActiveGame = {
      ...activeGame,
      rounds: updatedRounds,
    };

    // Auto-advance to next player or close modal
    if (currentPlayerIndex < playerSet.players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setActiveGame(updatedGame);
    } else {
      // Last player - close modal
      setActiveGame(updatedGame);
      setShowAddRoundModal(false);
      setCurrentPlayerIndex(0);
    }
  };

  const handleManualScoreSave = () => {
    const score = parseInt(manualScoreInput);
    if (isNaN(score)) {
      Alert.alert('Error', 'Please enter a valid score');
      return;
    }
    handleScoreButtonPress(score);
    setManualScoreInput('');
  };

  const handleCancelScore = () => {
    if (!activeGame) return;
    
    // If we've started entering scores for this round, remove the entire round
    if (currentPlayerIndex > 0) {
      const updatedRounds = [...activeGame.rounds];
      // Remove the last round if it exists (the one we were working on)
      if (updatedRounds.length > 0) {
        updatedRounds.pop();
        setActiveGame({
          ...activeGame,
          rounds: updatedRounds,
        });
      }
    }
    
    setShowAddRoundModal(false);
    setCurrentPlayerIndex(0);
    setManualScoreInput('');
  };

  const handleEndGame = () => {
    if (!activeGame) return;
    const playerSet = playerSets.find(s => s.id === activeGame.activeSetId);
    if (!playerSet) return;

    // Calculate totals
    const totals: Record<string, number> = {};
    playerSet.players.forEach(player => {
      totals[player] = activeGame.rounds.reduce((sum, round) => sum + (round[player] || 0), 0);
    });

    // Find winner(s) - highest score
    const maxScore = Math.max(...Object.values(totals));
    const winners = Object.keys(totals).filter(player => totals[player] === maxScore);

    // Update win history
    const updatedPlayerSets = playerSets.map(set => {
      if (set.id === playerSet.id) {
        const updatedWinHistory = { ...set.winHistory };
        winners.forEach(winner => {
          updatedWinHistory[winner] = (updatedWinHistory[winner] || 0) + 1;
        });
        return {
          ...set,
          winHistory: updatedWinHistory,
          updatedAt: new Date().toISOString(),
        };
      }
      return set;
    });

    setPlayerSets(updatedPlayerSets);
    setActiveGame(null);
    setCurrentScreen('home');

    // Show winner alert
    const winnerText = winners.length === 1
      ? `${winners[0]} wins with ${maxScore} points!`
      : `Tie! ${winners.join(' and ')} both have ${maxScore} points!`;

    Alert.alert('Game Over', winnerText);
    HapticFeedback.success();
  };

  const calculateTotals = (): Record<string, number> => {
    if (!activeGame) return {};
    const playerSet = playerSets.find(s => s.id === activeGame.activeSetId);
    if (!playerSet) return {};

    const totals: Record<string, number> = {};
    playerSet.players.forEach(player => {
      totals[player] = activeGame.rounds.reduce((sum, round) => sum + (round[player] || 0), 0);
    });
    return totals;
  };

  // Get color for player based on index
  const getPlayerColor = (index: number): string => {
    const colors = ['#AF52DE', '#FF3B30', '#FF9500', '#007AFF']; // Purple, Red, Orange, Blue
    return colors[index % colors.length];
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    settingsButton: {
      padding: 8,
    },
    settingsButtonText: {
      fontSize: 24,
    },
    playerSetCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    playerSetName: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    playerSetInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    startGameButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    startGameButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    activeGameHeader: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    activeGameTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    scoreTable: {
      backgroundColor: '#E5E5E5',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
      minWidth: '100%',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 8,
      minHeight: 60,
      alignItems: 'center',
    },
    tableHeaderText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
      textAlign: 'center',
    },
    tableHeaderTextRotated: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
      transform: [{ rotate: '-90deg' }],
    },
    tableHeaderCellRotated: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 50,
      paddingVertical: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: '#FFFFFF',
    },
    tableRowTotal: {
      backgroundColor: '#F5F5F5',
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
    },
    tableCell: {
      fontSize: 14,
      color: colors.text,
    },
    tableCellLabel: {
      fontWeight: '600',
      textAlign: 'left',
    },
    tableCellValue: {
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 'auto',
      paddingTop: 20,
    },
    footerButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    addRoundButton: {
      backgroundColor: colors.primary,
    },
    endGameButton: {
      backgroundColor: '#e74c3c',
    },
    footerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    scoreButtonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    scoreButton: {
      width: '15%',
      aspectRatio: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    scoreButtonText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    manualInputContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    manualInputLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    manualInputRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    signButton: {
      width: 44,
      height: 44,
      backgroundColor: colors.border,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signButtonText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    manualInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      justifyContent: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (showSettings || showInternalSettings) {
    return (
      <CardScoreSettings
        playerSets={playerSets}
        onUpdatePlayerSets={setPlayerSets}
        onClose={() => {
          setShowInternalSettings(false);
          onCloseSettings?.();
        }}
      />
    );
  }

  // Active Game Screen
  if (currentScreen === 'active-game' && activeGame) {
    const playerSet = playerSets.find(s => s.id === activeGame.activeSetId);
    if (!playerSet) {
      setCurrentScreen('home');
      return null;
    }

    const totals = calculateTotals();
    const reversedRounds = [...activeGame.rounds].reverse();

    return (
      <View style={styles.container}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.activeGameHeader}>
            <Text style={styles.activeGameTitle}>Now Playing: {playerSet.setName}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.scoreTable}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'left' }]}>Round</Text>
                {playerSet.players.map((player, playerIndex) => {
                  const shouldRotate = playerSet.players.length > 2;
                  const columnWidth = shouldRotate ? 50 : 70;
                  
                  if (shouldRotate) {
                    return (
                      <View 
                        key={player} 
                        style={[styles.tableHeaderCellRotated, { width: columnWidth }]}
                      >
                        <Text style={styles.tableHeaderTextRotated}>
                          {player}
                        </Text>
                      </View>
                    );
                  }
                  
                  return (
                    <Text 
                      key={player} 
                      style={[
                        styles.tableHeaderText, 
                        { width: columnWidth, textAlign: 'center' }
                      ]}
                    >
                      {player}
                    </Text>
                  );
                })}
              </View>

              {/* Total Row (Sticky) */}
              <View style={[styles.tableRow, styles.tableRowTotal]}>
                <Text style={[styles.tableCell, styles.tableCellLabel, { width: 60 }]}>Total</Text>
                {playerSet.players.map((player, playerIndex) => {
                  const columnWidth = playerSet.players.length > 2 ? 50 : 70;
                  return (
                    <Text 
                      key={player} 
                      style={[
                        styles.tableCell, 
                        styles.tableCellValue, 
                        { width: columnWidth, color: getPlayerColor(playerIndex), fontWeight: 'bold' }
                      ]}
                    >
                      {totals[player] || 0}
                    </Text>
                  );
                })}
              </View>

              {/* Round Rows */}
              {reversedRounds.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { 
                    width: 60 + (playerSet.players.length * (playerSet.players.length > 2 ? 50 : 70)) 
                  }]}>
                    No rounds yet. Tap "Add Round" to start!
                  </Text>
                </View>
              ) : (
                reversedRounds.map((round, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableCellLabel, { width: 60 }]}>
                      Round {activeGame.rounds.length - index}
                    </Text>
                    {playerSet.players.map((player, playerIndex) => {
                      const columnWidth = playerSet.players.length > 2 ? 50 : 70;
                      return (
                        <Text 
                          key={player} 
                          style={[
                            styles.tableCell, 
                            styles.tableCellValue, 
                            { width: columnWidth, color: getPlayerColor(playerIndex) }
                          ]}
                        >
                          {round[player] || 0}
                        </Text>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={{ padding: 20, backgroundColor: colors.background }}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.addRoundButton]}
              onPress={handleAddRound}
            >
              <Text style={styles.footerButtonText}>Add Round</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.endGameButton]}
              onPress={handleEndGame}
            >
              <Text style={styles.footerButtonText}>End Game</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Round Modal */}
        <Modal visible={showAddRoundModal} transparent animationType="slide">
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Enter Score for {playerSet.players[currentPlayerIndex]}:
                </Text>

                <View style={styles.scoreButtonGrid}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.scoreButton, { backgroundColor: getPlayerColor(currentPlayerIndex) }]}
                      onPress={() => handleScoreButtonPress(i)}
                    >
                      <Text style={styles.scoreButtonText}>{i}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.manualInputContainer}>
                  <Text style={styles.manualInputLabel}>Or enter score:</Text>
                  <View style={styles.manualInputRow}>
                    <TouchableOpacity
                      style={styles.signButton}
                      onPress={() => {
                        if (manualScoreInput.startsWith('-')) {
                          setManualScoreInput(manualScoreInput.substring(1));
                        } else {
                          setManualScoreInput('-' + manualScoreInput);
                        }
                      }}
                    >
                      <Text style={styles.signButtonText}>±</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.manualInput}
                      placeholder="Score"
                      placeholderTextColor={colors.textSecondary}
                      value={manualScoreInput}
                      onChangeText={(text) => {
                        // Allow negative sign and numbers
                        if (text === '' || text === '-' || /^-?\d*$/.test(text)) {
                          setManualScoreInput(text);
                        }
                      }}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { flex: 1 }]}
                      onPress={handleCancelScore}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, { flex: 1, backgroundColor: '#007AFF' }]}
                      onPress={handleManualScoreSave}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // Home Screen
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>CardScore ♠️</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowInternalSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {playerSets.map(set => (
        <View key={set.id} style={styles.playerSetCard}>
          <Text style={styles.playerSetName}>{set.setName}</Text>
          <Text style={styles.playerSetInfo}>
            Players: {set.players.join(', ')}
          </Text>
          <Text style={styles.playerSetInfo}>
            Wins: {Object.entries(set.winHistory)
              .map(([player, wins]) => `${player}: ${wins}`)
              .join(' | ')}
          </Text>
          <TouchableOpacity
            style={styles.startGameButton}
            onPress={() => handleStartGame(set)}
          >
            <Text style={styles.startGameButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

