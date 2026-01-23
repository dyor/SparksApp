import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { HapticFeedback } from "../utils/haptics";
import { useSparkStore } from "../store";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsToggle,
} from "../components/SettingsComponents";

interface SkinsSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

type GameMode =
  | "setup"
  | "playing"
  | "finished"
  | "history"
  | "settings"
  | "results"
  | "round-details";
type PlayerCount = 2 | 3 | 4;
type TeamMode = "individual" | "teams";

interface HoleResult {
  holeNumber: number;
  winnerIndex: number; // -1 for tie
  winnerName: string | null; // null for tie
  timestamp: number;
}

interface RoundHistory {
  id: string;
  date: string;
  players: string[];
  finalScores: number[];
  holes: HoleResult[];
  playerCount: PlayerCount;
  teamMode: TeamMode;
}

interface GameState {
  players: string[];
  scores: number[];
  history: number[]; // Index of winner for each hole, -1 for tie
  currentHole: number;
  holeDetails: HoleResult[]; // New: detailed history for current round
  carryover: number; // Number of skins carried over from tied holes
}

export const SkinsSpark: React.FC<SkinsSparkProps> = ({
  showSettings,
  onCloseSettings,
  onStateChange,
}) => {
  const { colors } = useTheme();
  const { getSparkData, setSparkData } = useSparkStore();

  // Setup State
  const [mode, setMode] = useState<GameMode>("setup");
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [teamMode, setTeamMode] = useState<TeamMode>("individual");
  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [carryoverEnabled, setCarryoverEnabled] = useState<boolean>(true);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    scores: [],
    history: [],
    currentHole: 1,
    holeDetails: [],
    carryover: 0,
  });

  const [roundHistory, setRoundHistory] = useState<RoundHistory[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [deleteConfirmRoundId, setDeleteConfirmRoundId] = useState<
    string | null
  >(null);

  // Load saved state
  useEffect(() => {
    const savedData = getSparkData("skins");
    if (savedData) {
      // Don't restore settings or menu modes - only game/playing/history/results
      if (
        savedData.mode &&
        !["settings", "round-details"].includes(savedData.mode)
      ) {
        setMode(savedData.mode);
      }
      if (savedData.gameState) setGameState(savedData.gameState);
      if (savedData.roundHistory) setRoundHistory(savedData.roundHistory);
      if (savedData.playerCount) setPlayerCount(savedData.playerCount);
      if (savedData.teamMode) setTeamMode(savedData.teamMode);
      if (savedData.names) setNames(savedData.names);
      if (savedData.carryoverEnabled !== undefined)
        setCarryoverEnabled(savedData.carryoverEnabled);
    }
    setDataLoaded(true);
  }, []);

  // Save state (but NOT settings/round-details modes)
  useEffect(() => {
    if (!dataLoaded) return;
    setSparkData("skins", {
      mode: ["settings", "round-details"].includes(mode) ? "playing" : mode,
      gameState,
      roundHistory,
      playerCount,
      teamMode,
      names,
      carryoverEnabled,
    });
  }, [
    mode,
    gameState,
    roundHistory,
    playerCount,
    teamMode,
    names,
    carryoverEnabled,
    dataLoaded,
  ]);

  const handleStartGame = () => {
    const activeNames = names
      .slice(0, playerCount)
      .map((n, i) => n.trim() || `Player ${i + 1}`);

    let finalPlayers = activeNames;
    if (playerCount === 4 && teamMode === "teams") {
      finalPlayers = [
        `${activeNames[0]} & ${activeNames[1]}`,
        `${activeNames[2]} & ${activeNames[3]}`,
      ];
    }

    setGameState({
      players: finalPlayers,
      scores: new Array(finalPlayers.length).fill(0),
      history: [],
      currentHole: 1,
      holeDetails: [],
      carryover: 0,
    });
    setMode("playing");
    HapticFeedback.success();
  };

  const handleWinHole = (playerIndex: number) => {
    HapticFeedback.light();
    const newScores = [...gameState.scores];
    let newCarryover = gameState.carryover;

    if (carryoverEnabled) {
      // Carryover mode: ties accumulate, winner gets all
      if (playerIndex === -1) {
        // Tie - carryover increases by 1
        newCarryover++;
      } else {
        // Winner gets current hole + all carryover
        const skinsWon = 1 + gameState.carryover;
        newScores[playerIndex] += skinsWon;
        newCarryover = 0;
      }
    } else {
      // No carryover mode: ties are ignored, winner gets 1 point
      if (playerIndex !== -1) {
        newScores[playerIndex]++;
      }
      newCarryover = 0;
    }

    const holeResult: HoleResult = {
      holeNumber: gameState.currentHole,
      winnerIndex: playerIndex,
      winnerName: playerIndex === -1 ? null : gameState.players[playerIndex],
      timestamp: Date.now(),
    };

    setGameState((prev) => ({
      ...prev,
      scores: newScores,
      history: [...prev.history, playerIndex],
      holeDetails: [...prev.holeDetails, holeResult],
      currentHole: prev.currentHole + 1,
      carryover: newCarryover,
    }));
  };

  const handleUndo = () => {
    if (gameState.history.length === 0) return;

    const lastWinner = gameState.history[gameState.history.length - 1];
    const newScores = [...gameState.scores];
    let newCarryover = gameState.carryover;

    if (carryoverEnabled) {
      if (lastWinner === -1) {
        // Last hole was a tie, reduce carryover
        newCarryover = Math.max(0, gameState.carryover - 1);
      } else {
        // Last hole was won, need to recalculate what was awarded
        // Count consecutive ties before this win
        let tieCount = 0;
        for (let i = gameState.history.length - 2; i >= 0; i--) {
          if (gameState.history[i] === -1) {
            tieCount++;
          } else {
            break;
          }
        }
        const skinsToRemove = 1 + tieCount;
        newScores[lastWinner] -= skinsToRemove;
        newCarryover = tieCount;
      }
    } else {
      // No carryover mode: just remove 1 point if there was a winner
      if (lastWinner !== -1) {
        newScores[lastWinner]--;
      }
      newCarryover = 0;
    }

    setGameState((prev) => ({
      ...prev,
      scores: newScores,
      history: prev.history.slice(0, -1),
      holeDetails: prev.holeDetails.slice(0, -1),
      currentHole: prev.currentHole - 1,
      carryover: newCarryover,
    }));
    HapticFeedback.medium();
  };

  const handleEndGame = () => {
    // Save the completed round to history
    const newRound: RoundHistory = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      players: gameState.players,
      finalScores: gameState.scores,
      holes: gameState.holeDetails,
      playerCount,
      teamMode,
    };

    setRoundHistory((prev) => [newRound, ...prev]);
    setMode("results");
    HapticFeedback.success();
  };

  const handleReset = () => {
    setShowEndGameConfirm(true);
    HapticFeedback.light();
  };

  const handleViewHistory = () => {
    setMode("history");
    HapticFeedback.light();
  };

  const handleDeleteRound = (roundId: string) => {
    setDeleteConfirmRoundId(roundId);
    HapticFeedback.light();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    header: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    buttonGroup: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
    },
    optionButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
    },
    selectedOption: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "20",
    },
    optionText: {
      fontSize: 16,
      fontWeight: "600",
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
      alignItems: "center",
      marginTop: 30,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
    },
    gameContainer: {
      flex: 1,
    },
    gameContainerContent: {
      justifyContent: "flex-start",
      paddingVertical: 5,
    },
    holeIndicator: {
      fontSize: 24,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 15,
    },
    playerCard: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    playerName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    scoreBadge: {
      backgroundColor: colors.primary,
      width: 35,
      height: 35,
      borderRadius: 17.5,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    scoreText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    winButton: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      marginLeft: 8,
    },
    winButtonText: {
      color: colors.primary,
      fontWeight: "600",
    },
    tieButton: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    controls: {
      flexDirection: "row",
      gap: 10,
      marginTop: "auto",
      paddingTop: 20,
    },
    controlButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyCard: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    historyDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    historyPlayers: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 5,
    },
    historyScores: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    historyDetails: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    deleteButton: {
      padding: 5,
    },
    deleteButtonText: {
      color: "#e74c3c",
      fontSize: 14,
      fontWeight: "600",
    },
    emptyHistory: {
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 50,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 10,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    carryoverBanner: {
      backgroundColor: colors.primary + "20",
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
    },
    carryoverText: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4,
    },
    carryoverSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 12,
    },
    bulletText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 8,
      paddingLeft: 10,
    },
    exampleBox: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      marginBottom: 12,
    },
    exampleTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginBottom: 8,
    },
    exampleText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    resultContainer: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    winnerBadge: {
      backgroundColor: "#FFD700",
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
      alignItems: "center",
    },
    winnerText: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#000",
    },
    resultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    resultName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    resultScore: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },
    statsTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    statsLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    statsValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
  });

  if (showSettings || mode === "settings") {
    const handleSettingsClose = () => {
      if (onCloseSettings) {
        onCloseSettings();
      } else {
        setMode(gameState.players.length > 0 ? "playing" : "setup");
        HapticFeedback.light();
      }
    };

    return (
      <SettingsContainer>
        <SettingsScrollView>
          <TouchableOpacity
            onPress={handleSettingsClose}
            style={{
              alignSelf: "flex-start",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>

          <SettingsHeader
            title="Skins Rules"
            subtitle="Golf betting game with carryover excitement"
            icon="🏌️"
            sparkId="skins"
          />

          <SettingsSection title="What is Skins?">
            <Text style={styles.infoText}>
              Skins is a golf betting game where each hole is worth one "skin"
              (point). The player with the lowest score on a hole wins that
              skin.
            </Text>
            <Text style={styles.infoText}>
              The traditional game uses carryover: when players tie on a hole,
              no one wins the skin, and it carries over to the next hole. You
              can also disable carryover to play a simpler version where ties
              are just ignored.
            </Text>
          </SettingsSection>

          <SettingsSection title="Carryover Rules (When Enabled)">
            <Text style={styles.bulletText}>• Each hole is worth 1 skin</Text>
            <Text style={styles.bulletText}>
              • If there's a clear winner (lowest score), they get all
              accumulated skins
            </Text>
            <Text style={styles.bulletText}>
              • If players tie, the skin carries over to the next hole
            </Text>
            <Text style={styles.bulletText}>
              • Multiple ties mean multiple skins at stake on the next decisive
              hole
            </Text>
          </SettingsSection>

          <SettingsSection title="No Carryover Mode (When Disabled)">
            <Text style={styles.bulletText}>• Each hole is worth 1 skin</Text>
            <Text style={styles.bulletText}>
              • If there's a clear winner, they get 1 skin
            </Text>
            <Text style={styles.bulletText}>
              • If players tie, no one gets a skin (simpler scoring)
            </Text>
          </SettingsSection>

          <SettingsSection title="Example Scenario">
            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Hole 1 - Tie</Text>
              <Text style={styles.exampleText}>
                All players score 4. No winner, so 1 skin carries to Hole 2.
              </Text>
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Hole 2 - Tie Again</Text>
              <Text style={styles.exampleText}>
                Another tie! Now 2 skins carry forward to Hole 3.
              </Text>
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Hole 3 - Winner!</Text>
              <Text style={styles.exampleText}>
                Player A wins with a birdie. They get 3 skins total (Holes 1, 2,
                and 3)!
              </Text>
            </View>
          </SettingsSection>

          <SettingsSection title="Game Settings">
            <SettingsToggle
              label="Enable Carryover"
              value={carryoverEnabled}
              onValueChange={(value) => {
                setCarryoverEnabled(value);
                HapticFeedback.light();
              }}
            />
            <Text style={[styles.infoText, { marginTop: 8, fontSize: 14 }]}>
              When enabled, tied holes carry over to the next hole. When
              disabled, ties are ignored and no points are awarded.
            </Text>
          </SettingsSection>

          <SettingsSection title="How to Use">
            <Text style={styles.bulletText}>
              • Set up your game with 2-4 players (or 2 teams)
            </Text>
            <Text style={styles.bulletText}>
              • After each hole, tap the winner's name
            </Text>
            <Text style={styles.bulletText}>
              • If the hole is tied, tap "Tie / Halve Hole"
            </Text>
            <Text style={styles.bulletText}>
              • Watch the carryover banner when skins accumulate
            </Text>
            <Text style={styles.bulletText}>
              • Use "Undo" if you make a mistake
            </Text>
            <Text style={styles.bulletText}>
              • View your round history to track past games
            </Text>
          </SettingsSection>

          <SettingsFeedbackSection sparkId="skins" sparkName="Skins" />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  if (mode === "results") {
    // Calculate winner and statistics
    const maxScore = Math.max(...gameState.scores);
    const winnerIndices = gameState.scores
      .map((score, index) => (score === maxScore ? index : -1))
      .filter((i) => i !== -1);
    const isTie = winnerIndices.length > 1;

    // Calculate all-time statistics
    const allTimeStats: {
      [player: string]: {
        wins: number;
        totalSkins: number;
        gamesPlayed: number;
      };
    } = {};

    roundHistory.forEach((round) => {
      const maxRoundScore = Math.max(...round.finalScores);
      round.players.forEach((player, index) => {
        if (!allTimeStats[player]) {
          allTimeStats[player] = { wins: 0, totalSkins: 0, gamesPlayed: 0 };
        }
        allTimeStats[player].gamesPlayed++;
        allTimeStats[player].totalSkins += round.finalScores[index];
        if (round.finalScores[index] === maxRoundScore) {
          allTimeStats[player].wins++;
        }
      });
    });

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Game Results 🏆</Text>

        {isTie ? (
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerText}>🤝 TIE GAME!</Text>
          </View>
        ) : (
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerText}>
              🏆 {gameState.players[winnerIndices[0]]} WINS!
            </Text>
          </View>
        )}

        <View style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
            Final Scores
          </Text>
          {gameState.players.map((player, index) => (
            <View key={index} style={styles.resultRow}>
              <Text style={styles.resultName}>{player}</Text>
              <Text style={styles.resultScore}>
                {gameState.scores[index]} skin
                {gameState.scores[index] !== 1 ? "s" : ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
            Round Stats
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Holes Played</Text>
            <Text style={styles.statsValue}>
              {gameState.holeDetails.length}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Tied Holes</Text>
            <Text style={styles.statsValue}>
              {gameState.holeDetails.filter((h) => h.winnerIndex === -1).length}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Total Games Played</Text>
            <Text style={styles.statsValue}>{roundHistory.length}</Text>
          </View>
        </View>

        {Object.keys(allTimeStats).length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
              All-Time Stats
            </Text>
            {Object.entries(allTimeStats)
              .sort((a, b) => b[1].totalSkins - a[1].totalSkins)
              .map(([player, stats]) => (
                <View key={player} style={{ marginBottom: 15 }}>
                  <Text style={styles.resultName}>{player}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Games Won</Text>
                    <Text style={styles.statsValue}>{stats.wins}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Total Skins</Text>
                    <Text style={styles.statsValue}>{stats.totalSkins}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Games Played</Text>
                    <Text style={styles.statsValue}>{stats.gamesPlayed}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Avg Skins/Game</Text>
                    <Text style={styles.statsValue}>
                      {(stats.totalSkins / stats.gamesPlayed).toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setMode("history");
            HapticFeedback.light();
          }}
        >
          <Text style={styles.primaryButtonText}>View All History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setGameState({
              players: [],
              scores: [],
              history: [],
              currentHole: 1,
              holeDetails: [],
              carryover: 0,
            });
            setMode("setup");
            HapticFeedback.light();
          }}
        >
          <Text style={styles.secondaryButtonText}>New Game</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "setup") {
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
                playerCount === num && styles.selectedOption,
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
                  teamMode === "individual" && styles.selectedOption,
                ]}
                onPress={() => setTeamMode("individual")}
              >
                <Text style={styles.optionText}>Individual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  teamMode === "teams" && styles.selectedOption,
                ]}
                onPress={() => setTeamMode("teams")}
              >
                <Text style={styles.optionText}>2 vs 2</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>
          {teamMode === "teams" && playerCount === 4
            ? "Enter Team Names"
            : "Enter Player Names"}
        </Text>

        {Array.from({ length: playerCount }).map((_, i) => (
          <TextInput
            key={i}
            style={styles.input}
            placeholder={
              teamMode === "teams" && playerCount === 4
                ? `Player ${i + 1} (${i < 2 ? "Team 1" : "Team 2"})`
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartGame}
        >
          <Text style={styles.primaryButtonText}>Start Round</Text>
        </TouchableOpacity>

        {roundHistory.length > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewHistory}
          >
            <Text style={styles.secondaryButtonText}>
              📊 View History ({roundHistory.length} rounds)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  if (mode === "round-details" && selectedRound) {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity
          onPress={() => {
            setMode("history");
            setSelectedRound(null);
            HapticFeedback.light();
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 24, marginRight: 10 }}>←</Text>
          <Text
            style={{ fontSize: 16, color: colors.primary, fontWeight: "600" }}
          >
            Back to History
          </Text>
        </TouchableOpacity>

        <Text style={styles.header}>{selectedRound.players.join(" vs ")}</Text>

        <View style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Game Info</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Date</Text>
            <Text style={styles.statsValue}>
              {new Date(selectedRound.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Holes Played</Text>
            <Text style={styles.statsValue}>{selectedRound.holes.length}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Players</Text>
            <Text style={styles.statsValue}>{selectedRound.playerCount}</Text>
          </View>
        </View>

        <View style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
            Hole-by-Hole Results
          </Text>
          {selectedRound.holes.map((hole, idx) => {
            const tiedHoles = selectedRound.holes.filter(
              (h) => h.winnerIndex === -1,
            ).length;
            return (
              <View
                key={idx}
                style={[
                  styles.resultRow,
                  {
                    backgroundColor:
                      hole.winnerIndex === -1
                        ? colors.primary + "10"
                        : "transparent",
                    paddingHorizontal: 10,
                    borderRadius: 8,
                  },
                ]}
              >
                <Text style={styles.statsLabel}>Hole {hole.holeNumber}</Text>
                <Text style={styles.statsValue}>
                  {hole.winnerName || "🤝 Tie"}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
            Final Scores
          </Text>
          {selectedRound.players.map((player, index) => (
            <View key={index} style={styles.resultRow}>
              <Text style={styles.resultName}>{player}</Text>
              <Text style={styles.resultScore}>
                {selectedRound.finalScores[index]} skin
                {selectedRound.finalScores[index] !== 1 ? "s" : ""}
              </Text>
            </View>
          ))}

          <View style={{ marginTop: 20, alignItems: "center" }}>
            <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
              🏆{" "}
              {
                selectedRound.players[
                  selectedRound.finalScores.indexOf(
                    Math.max(...selectedRound.finalScores),
                  )
                ]
              }
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setMode("history");
            setSelectedRound(null);
            HapticFeedback.light();
          }}
        >
          <Text style={styles.primaryButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "history") {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Round History 📊</Text>

        <ScrollView style={{ flex: 1 }}>
          {roundHistory.length === 0 ? (
            <Text style={styles.emptyHistory}>
              No rounds played yet. Complete a round to see history here.
            </Text>
          ) : (
            roundHistory.map((round) => {
              const date = new Date(round.date);
              const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });

              const winner = round.finalScores.indexOf(
                Math.max(...round.finalScores),
              );
              const winnerName = round.players[winner];

              return (
                <TouchableOpacity
                  key={round.id}
                  style={styles.historyCard}
                  onPress={() => {
                    setSelectedRound(round);
                    setMode("round-details");
                    HapticFeedback.light();
                  }}
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{formattedDate}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteRound(round.id);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.historyPlayers}>
                    {round.players.join(" vs ")}
                  </Text>

                  <Text style={styles.historyScores}>
                    Final Scores:{" "}
                    {round.players
                      .map((p, i) => `${p}: ${round.finalScores[i]}`)
                      .join(", ")}
                  </Text>

                  <Text style={styles.historyDetails}>
                    🏆 Winner: {winnerName} • {round.holes.length} holes played
                    •
                    <Text style={{ color: colors.primary }}>
                      {" "}
                      Tap to view details
                    </Text>
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setMode("setup");
            HapticFeedback.light();
          }}
        >
          <Text style={styles.primaryButtonText}>Back to Setup</Text>
        </TouchableOpacity>

        {deleteConfirmRoundId && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 25,
                borderRadius: 15,
                width: "85%",
                maxWidth: 400,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: colors.text,
                  marginBottom: 15,
                }}
              >
                Delete Round?
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginBottom: 25,
                }}
              >
                This action cannot be undone.
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  onPress={() => {
                    setDeleteConfirmRoundId(null);
                    HapticFeedback.light();
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 10,
                    backgroundColor: "#e74c3c",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setRoundHistory((prev) =>
                      prev.filter((r) => r.id !== deleteConfirmRoundId),
                    );
                    setDeleteConfirmRoundId(null);
                    HapticFeedback.medium();
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Skins 🏌️</Text>
      <Text style={styles.holeIndicator}>Hole {gameState.currentHole}</Text>

      {carryoverEnabled && gameState.carryover > 0 && (
        <View style={styles.carryoverBanner}>
          <Text style={styles.carryoverText}>
            🔥 {gameState.carryover + 1} Skin
            {gameState.carryover + 1 > 1 ? "s" : ""} in Play!
          </Text>
          <Text style={styles.carryoverSubtext}>
            {gameState.carryover} carried over from tie
            {gameState.carryover > 1 ? "s" : ""}
          </Text>
        </View>
      )}

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
          <Text style={styles.optionText}>↶ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            setMode("settings");
            HapticFeedback.light();
          }}
        >
          <Text style={styles.optionText}>⚙️ Rules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <Text style={[styles.optionText, { color: "#e74c3c" }]}>
            End Game
          </Text>
        </TouchableOpacity>
      </View>

      {showEndGameConfirm && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              padding: 25,
              borderRadius: 15,
              width: "85%",
              maxWidth: 400,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.text,
                marginBottom: 15,
              }}
            >
              End Game?
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginBottom: 25,
              }}
            >
              Save this round to history?
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => {
                  setShowEndGameConfirm(false);
                  HapticFeedback.light();
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: "#e74c3c",
                  alignItems: "center",
                }}
                onPress={() => {
                  setShowEndGameConfirm(false);
                  setGameState({
                    players: [],
                    scores: [],
                    history: [],
                    currentHole: 1,
                    holeDetails: [],
                    carryover: 0,
                  });
                  setMode("setup");
                  HapticFeedback.medium();
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Discard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 15,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                }}
                onPress={() => {
                  setShowEndGameConfirm(false);
                  handleEndGame();
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Save & Results
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
