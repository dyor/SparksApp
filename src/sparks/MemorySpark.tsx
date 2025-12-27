import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { HapticFeedback } from "../utils/haptics";
import { BaseSpark } from "../components/BaseSpark";
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsFeedbackSection,
  SaveCancelButtons,
} from "../components/SettingsComponents";
import ConfettiCannon from "react-native-confetti-cannon";

const { width: screenWidth } = Dimensions.get("window");
const cardSize = Math.min((screenWidth - 80) / 6, 50); // 6 cards per row

// Player colors for up to 4 players
const playerColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

// Spark emojis for the cards
const sparkEmojis = [
  "💡",
  "🎡",
  "🃏",
  "🎒",
  "📝",
  "👁️",
  "📸",
  "🇪🇸",
  "⛳",
  "🎛️",
  "🏌️‍♂️",
  "💱",
  "🎉",
  "🔥",
  "⭐",
];

interface Player {
  id: number;
  name: string;
  score: number;
  color: string;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy?: number; // Player ID who matched this card
}

interface MemorySparkProps {
  config?: any;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const MemorySpark: React.FC<MemorySparkProps> = ({
  config,
  onStateChange,
  onComplete,
  showSettings,
  onCloseSettings,
}) => {
  const { colors } = useTheme();
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [poopAnimation, setPoopAnimation] = useState<{
    visible: boolean;
    poops: Array<{
      id: string;
      x: number;
      y: number;
      rotation: number;
      scale: number;
      targetY: number;
      translateY: Animated.Value;
    }>;
  }>({
    visible: false,
    poops: [],
  });

  console.log(
    "MemorySpark rendering, showSettings:",
    showSettings,
    "gameStarted:",
    gameStarted
  );

  // Initialize game
  const initializeGame = (playerCount: number) => {
    const playerList: Player[] = [];
    for (let i = 1; i <= playerCount; i++) {
      playerList.push({
        id: i,
        name: `Player ${i}`,
        score: 0,
        color: playerColors[i - 1],
      });
    }
    setPlayers(playerList);
    setCurrentPlayerIndex(0);

    // Create shuffled deck with pairs
    const emojis = [...sparkEmojis, ...sparkEmojis]; // 12 pairs
    const shuffledEmojis = emojis.sort(() => Math.random() - 0.5);

    const cardDeck: Card[] = shuffledEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(cardDeck);
    setFlippedCards([]);
    setGameStarted(true);
    setGameWon(false);
    setRounds(0);
  };

  // Handle card press
  const handleCardPress = (cardId: number) => {
    if (
      flippedCards.length >= 2 ||
      cards[cardId].isFlipped ||
      cards[cardId].isMatched
    ) {
      return;
    }

    HapticFeedback.light();
    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, isFlipped: true } : card
      )
    );

    if (newFlippedCards.length === 2) {
      setRounds((prev) => prev + 1);
      // Check for match after a brief delay
      setTimeout(() => {
        const [firstId, secondId] = newFlippedCards;
        const firstCard = cards[firstId];
        const secondCard = cards[secondId];

        if (firstCard.emoji === secondCard.emoji) {
          // Match!
          setCards((prev) =>
            prev.map((card) =>
              card.id === firstId || card.id === secondId
                ? {
                    ...card,
                    isMatched: true,
                    matchedBy: players[currentPlayerIndex].id,
                  }
                : card
            )
          );

          // Update score
          setPlayers((prev) =>
            prev.map((player, index) =>
              index === currentPlayerIndex
                ? { ...player, score: player.score + 1 }
                : player
            )
          );

          // Check if game is won
          const updatedCards = cards.map((card) =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true }
              : card
          );

          if (updatedCards.every((card) => card.isMatched)) {
            setGameWon(true);
            const winner = players[currentPlayerIndex];
            Alert.alert(
              "Game Won!",
              `${winner.name} wins with ${winner.score} pairs!`
            );
          }

          // Show confetti
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);

          setFlippedCards([]);
        } else {
          // No match - flip back and switch players
          setTimeout(() => {
            setCards((prev) =>
              prev.map((card) =>
                card.id === firstId || card.id === secondId
                  ? { ...card, isFlipped: false }
                  : card
              )
            );
            setFlippedCards([]);

            // Switch to next player
            setCurrentPlayerIndex((prev) => (prev + 1) % players.length);

            // Show poop rain
            showPoopRainAnimation();
          }, 1000);
        }
      }, 500);
    }
  };

  // Get card style based on match status and player
  const getCardStyle = (card: Card) => {
    const baseStyle: any[] = [styles.card];

    if (card.isFlipped) {
      baseStyle.push(styles.cardFlipped);
    }

    if (card.isMatched && card.matchedBy) {
      const player = players.find((p) => p.id === card.matchedBy);
      if (player) {
        baseStyle.push({
          backgroundColor: player.color,
          borderColor: player.color,
        });
      }
    }

    return baseStyle;
  };

  // Show poop rain animation
  const showPoopRainAnimation = () => {
    // Create multiple poop emojis starting from top, animating down
    const poops = Array.from({ length: 6 }, (_, i) => {
      const startY = -100 - Math.random() * 100; // Start from above screen
      const targetY = 600 + Math.random() * 200; // Target position near bottom
      const translateY = new Animated.Value(startY);

      // Start the animation
      Animated.timing(translateY, {
        toValue: targetY,
        duration: 1500 + Math.random() * 1000, // Random duration between 1.5-2.5 seconds
        useNativeDriver: true,
      }).start();

      return {
        id: `poop-${i}-${Date.now()}`,
        x: Math.random() * (screenWidth - 100) + 50, // Random x position across screen width
        y: startY,
        rotation: Math.random() * 360, // Random rotation for more realistic falling
        scale: Math.random() * 0.4 + 0.6, // Random scale between 0.6 and 1.0
        targetY: targetY,
        translateY: translateY,
      };
    });

    setPoopAnimation({
      visible: true,
      poops,
    });

    // Hide animation after 3 seconds
    setTimeout(() => {
      setPoopAnimation({
        visible: false,
        poops: [],
      });
    }, 3000);
  };

  // Reset game
  const resetGame = () => {
    setGameStarted(false);
    setNumPlayers(null);
    setPlayers([]);
    setCards([]);
    setFlippedCards([]);
    setGameWon(false);
    setRounds(0);
    setCurrentPlayerIndex(0);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    playerSetup: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    playerButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 10,
      marginVertical: 10,
      minWidth: 200,
      alignItems: "center",
    },
    playerButtonText: {
      color: colors.surface,
      fontSize: 18,
      fontWeight: "bold",
    },
    gameContainer: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    playerInfo: {
      alignItems: "center",
      padding: 10,
      borderRadius: 8,
      marginHorizontal: 5,
    },
    playerName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    playerScore: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      width: cardSize,
      height: cardSize,
      margin: 2,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    cardFlipped: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    cardText: {
      fontSize: cardSize * 0.6,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 20,
    },
    controlButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    controlButtonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: "bold",
    },
  });

  if (showSettings) {
    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Memory Settings"
            subtitle="Configure your memory game"
            icon="🧠"
          />
          <SettingsFeedbackSection sparkName="Memory" sparkId="memory" />
          <SaveCancelButtons
            onSave={() => onCloseSettings?.()}
            onCancel={() => onCloseSettings?.()}
          />
        </SettingsScrollView>
      </SettingsContainer>
    );
  }

  if (!gameStarted) {
    return (
      <BaseSpark>
        <View style={styles.playerSetup}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colors.text,
              marginBottom: 30,
            }}
          >
            How many players?
          </Text>
          {[1, 2, 3, 4].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.playerButton}
              onPress={() => initializeGame(num)}
            >
              <Text style={styles.playerButtonText}>
                {num} Player{num > 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BaseSpark>
    );
  }

  return (
    <BaseSpark>
      <View style={styles.container}>
        <View style={styles.header}>
          {players.map((player, index) => (
            <View
              key={player.id}
              style={[
                styles.playerInfo,
                index === currentPlayerIndex && {
                  borderWidth: 3,
                  borderColor: player.color,
                },
              ]}
            >
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerScore}>{player.score} pairs</Text>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={getCardStyle(card)}
              onPress={() => handleCardPress(card.id)}
              disabled={card.isMatched}
            >
              <Text style={styles.cardText}>
                {card.isFlipped || card.isMatched ? card.emoji : "⚡️"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            textAlign: "center",
            fontSize: 18,
            color: colors.text,
            marginVertical: 10,
          }}
        >
          Rounds: {rounds}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={resetGame}>
            <Text style={styles.controlButtonText}>New Game</Text>
          </TouchableOpacity>
        </View>

        {showConfetti && (
          <ConfettiCannon
            count={200}
            origin={{ x: screenWidth / 2, y: 0 }}
            fadeOut={true}
          />
        )}

        {/* Poop Animation Overlay */}
        {poopAnimation.visible && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 1000,
              backgroundColor: "rgba(139, 69, 19, 0.1)", // Light brown background
            }}
          >
            {poopAnimation.poops.map((poop) => (
              <Animated.Text
                key={poop.id}
                style={{
                  position: "absolute",
                  left: poop.x,
                  top: 0, // Fixed top position
                  fontSize: 25,
                  transform: [
                    { translateY: poop.translateY },
                    { scale: poop.scale },
                    { rotate: `${poop.rotation}deg` },
                  ],
                  opacity: 0.9,
                }}
              >
                💩
              </Animated.Text>
            ))}
          </View>
        )}
      </View>
    </BaseSpark>
  );
};

export default MemorySpark;
