import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';

interface GameState {
  cash: number;
  day: number;
  businessLevel: number;
  customers: number;
  reputation: number;
  inventory: number;
  staff: number;
}

interface Event {
  title: string;
  description: string;
  choices: {
    text: string;
    effect: Partial<GameState>;
    cost?: number;
  }[];
}

const initialState: GameState = {
  cash: 1000,
  day: 1,
  businessLevel: 1,
  customers: 10,
  reputation: 50,
  inventory: 20,
  staff: 1,
};

const events: Event[] = [
  {
    title: "Customer Complaint",
    description: "A customer is unhappy with their service. How do you handle it?",
    choices: [
      {
        text: "Offer full refund + apology",
        effect: { cash: -50, reputation: 15, customers: 2 }
      },
      {
        text: "Offer 50% discount",
        effect: { cash: -25, reputation: 8, customers: 1 }
      },
      {
        text: "Apologize but no refund",
        effect: { reputation: -5, customers: -1 }
      }
    ]
  },
  {
    title: "Marketing Opportunity",
    description: "A local newspaper wants to feature your business. What's your approach?",
    choices: [
      {
        text: "Pay for premium feature",
        effect: { customers: 15, reputation: 10 },
        cost: 200
      },
      {
        text: "Accept free basic mention",
        effect: { customers: 8, reputation: 5 }
      },
      {
        text: "Decline the offer",
        effect: { cash: 0 }
      }
    ]
  },
  {
    title: "Inventory Decision",
    description: "Your popular item is running low. Customers are asking for it.",
    choices: [
      {
        text: "Bulk order (cheaper per unit)",
        effect: { inventory: 50, cash: -300 },
        cost: 300
      },
      {
        text: "Small order (more expensive)",
        effect: { inventory: 20, cash: -150 },
        cost: 150
      },
      {
        text: "Wait for next week",
        effect: { customers: -3, reputation: -3 }
      }
    ]
  },
  {
    title: "Staff Issue",
    description: "Your employee wants a raise, threatening to quit otherwise.",
    choices: [
      {
        text: "Give the raise",
        effect: { cash: -100, reputation: 5 }
      },
      {
        text: "Negotiate a smaller raise",
        effect: { cash: -50, reputation: 2 }
      },
      {
        text: "Let them quit",
        effect: { staff: -1, customers: -5, reputation: -8 }
      }
    ]
  }
];

export const BusinessSpark: React.FC = () => {
  const { getSparkData, setSparkData } = useSparkStore();
  
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  // Load persisted data on mount
  useEffect(() => {
    const savedData = getSparkData('business-sim');
    if (savedData.bestScore) setBestScore(savedData.bestScore);
    if (savedData.gamesPlayed) setGamesPlayed(savedData.gamesPlayed);
  }, [getSparkData]);

  // Calculate daily income based on customers, reputation, and business level
  const calculateDailyIncome = () => {
    const baseIncome = gameState.customers * (5 + gameState.businessLevel);
    const reputationMultiplier = 1 + (gameState.reputation / 100);
    const staffEfficiency = Math.min(gameState.staff / 2, 1.5);
    
    return Math.round(baseIncome * reputationMultiplier * staffEfficiency);
  };

  // Progress to next day
  const nextDay = () => {
    HapticFeedback.light();
    
    if (gameState.day >= 30 || gameState.cash < 0) {
      endGame();
      return;
    }

    const dailyIncome = calculateDailyIncome();
    const dailyCosts = gameState.staff * 30 + gameState.businessLevel * 20;
    const netIncome = dailyIncome - dailyCosts;

    setGameState(prev => ({
      ...prev,
      day: prev.day + 1,
      cash: prev.cash + netIncome,
      inventory: Math.max(0, prev.inventory - Math.floor(prev.customers / 3)),
      customers: Math.max(1, prev.customers + Math.random() > 0.5 ? 1 : -1),
      reputation: Math.max(0, Math.min(100, prev.reputation + (Math.random() > 0.7 ? 1 : 0)))
    }));

    // Random event trigger (30% chance)
    if (Math.random() < 0.3) {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setCurrentEvent(randomEvent);
    }
  };

  // Handle event choice
  const handleEventChoice = (choice: Event['choices'][0]) => {
    if (choice.cost && gameState.cash < choice.cost) {
      HapticFeedback.error();
      Alert.alert("Insufficient Funds", "You don't have enough cash for this option.");
      return;
    }
    
    HapticFeedback.medium();

    setGameState(prev => {
      const newState = { ...prev };
      
      // Apply effects
      Object.entries(choice.effect).forEach(([key, value]) => {
        if (key in newState && typeof value === 'number') {
          (newState as any)[key] = Math.max(0, (newState as any)[key] + value);
        }
      });

      // Apply cost
      if (choice.cost) {
        newState.cash -= choice.cost;
      }

      return newState;
    });

    setCurrentEvent(null);
  };

  // Upgrade business
  const upgradeBusiness = () => {
    const cost = gameState.businessLevel * 500;
    if (gameState.cash >= cost) {
      HapticFeedback.success();
      setGameState(prev => ({
        ...prev,
        cash: prev.cash - cost,
        businessLevel: prev.businessLevel + 1,
        reputation: prev.reputation + 5
      }));
    } else {
      HapticFeedback.error();
      Alert.alert("Insufficient Funds", `You need $${cost} to upgrade your business.`);
    }
  };

  // Hire staff
  const hireStaff = () => {
    const cost = 200;
    if (gameState.cash >= cost) {
      HapticFeedback.success();
      setGameState(prev => ({
        ...prev,
        cash: prev.cash - cost,
        staff: prev.staff + 1
      }));
    } else {
      HapticFeedback.error();
      Alert.alert("Insufficient Funds", `You need $${cost} to hire staff.`);
    }
  };

  // End game
  const endGame = () => {
    const finalScore = gameState.cash + (gameState.reputation * 10) + (gameState.customers * 20) + (gameState.businessLevel * 100);
    const newGamesPlayed = gamesPlayed + 1;
    const newBestScore = Math.max(bestScore, finalScore);
    
    // Update state
    setScore(finalScore);
    setGamesPlayed(newGamesPlayed);
    setBestScore(newBestScore);
    setGameEnded(true);
    
    // Persist data
    setSparkData('business-sim', {
      bestScore: newBestScore,
      gamesPlayed: newGamesPlayed,
      lastScore: finalScore,
      lastPlayed: new Date().toISOString(),
    });
  };

  // Reset game
  const resetGame = () => {
    setGameState(initialState);
    setCurrentEvent(null);
    setGameEnded(false);
    setScore(0);
  };

  const dailyIncome = calculateDailyIncome();
  const dailyCosts = gameState.staff * 30 + gameState.businessLevel * 20;
  const upgradeBusinessCost = gameState.businessLevel * 500;

  if (gameEnded) {
    let performanceText = "Keep trying!";
    let performanceColor = "#DC3545";
    
    if (score > 3000) {
      performanceText = "Outstanding Entrepreneur!";
      performanceColor = "#28A745";
    } else if (score > 2000) {
      performanceText = "Successful Business Owner!";
      performanceColor = "#FFC107";
    } else if (score > 1000) {
      performanceText = "Getting the hang of it!";
      performanceColor = "#17A2B8";
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎮 Game Over!</Text>
          <Text style={styles.subtitle}>Day {gameState.day} - Business Simulation Complete</Text>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Final Results</Text>
          
          <View style={styles.finalStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Final Cash:</Text>
              <Text style={styles.statValue}>${gameState.cash}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Business Level:</Text>
              <Text style={styles.statValue}>{gameState.businessLevel}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Customers:</Text>
              <Text style={styles.statValue}>{gameState.customers}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Reputation:</Text>
              <Text style={styles.statValue}>{gameState.reputation}%</Text>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Total Score</Text>
            <Text style={[styles.scoreValue, { color: performanceColor }]}>{score}</Text>
            <Text style={[styles.performanceText, { color: performanceColor }]}>
              {performanceText}
            </Text>
          </View>
        </View>

        <View style={styles.persistentStats}>
          <Text style={styles.persistentStatsTitle}>Your Progress</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best Score:</Text>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{bestScore}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Games Played:</Text>
            <Text style={[styles.statValue, { color: '#8E44AD' }]}>{gamesPlayed}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>This Score:</Text>
            <Text style={[styles.statValue, { color: '#007AFF' }]}>{score}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.playAgainButton} onPress={resetGame}>
          <Text style={styles.playAgainButtonText}>Play Again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (currentEvent) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💼 Business Event</Text>
          <Text style={styles.day}>Day {gameState.day}</Text>
        </View>

        <View style={styles.eventContainer}>
          <Text style={styles.eventTitle}>{currentEvent.title}</Text>
          <Text style={styles.eventDescription}>{currentEvent.description}</Text>

          <View style={styles.eventChoices}>
            {currentEvent.choices.map((choice, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.choiceButton,
                  choice.cost && gameState.cash < choice.cost ? styles.choiceButtonDisabled : undefined
                ]}
                onPress={() => handleEventChoice(choice)}
                disabled={choice.cost ? gameState.cash < choice.cost : false}
              >
                <Text style={styles.choiceText}>{choice.text}</Text>
                {choice.cost && (
                  <Text style={styles.choiceCost}>Cost: ${choice.cost}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💼 Business Simulator</Text>
        <Text style={styles.subtitle}>Build your empire one day at a time!</Text>
        <Text style={styles.day}>Day {gameState.day}/30</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>💰 Cash</Text>
          <Text style={styles.statCardValue}>${gameState.cash}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>👥 Customers</Text>
          <Text style={styles.statCardValue}>{gameState.customers}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>⭐ Reputation</Text>
          <Text style={styles.statCardValue}>{gameState.reputation}%</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardTitle}>📦 Inventory</Text>
          <Text style={styles.statCardValue}>{gameState.inventory}</Text>
        </View>
      </View>

      <View style={styles.dailyInfo}>
        <Text style={styles.dailyInfoTitle}>Today's Projection</Text>
        <Text style={styles.dailyInfoText}>Income: ${dailyIncome}</Text>
        <Text style={styles.dailyInfoText}>Costs: ${dailyCosts}</Text>
        <Text style={[styles.dailyInfoText, styles.dailyNet]}>
          Net: ${dailyIncome - dailyCosts}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={nextDay}>
          <Text style={styles.primaryButtonText}>Next Day</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              gameState.cash < upgradeBusinessCost && styles.actionButtonDisabled
            ]}
            onPress={upgradeBusiness}
            disabled={gameState.cash < upgradeBusinessCost}
          >
            <Text style={styles.actionButtonText}>
              Upgrade Business (${upgradeBusinessCost})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              gameState.cash < 200 && styles.actionButtonDisabled
            ]}
            onPress={hireStaff}
            disabled={gameState.cash < 200}
          >
            <Text style={styles.actionButtonText}>
              Hire Staff ($200) - Current: {gameState.staff}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  day: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  dailyInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dailyInfoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  dailyNet: {
    fontWeight: 'bold',
    color: '#28A745',
  },
  actions: {
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eventContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  eventChoices: {
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  choiceButtonDisabled: {
    backgroundColor: '#ccc',
  },
  choiceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  choiceCost: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  finalStats: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  performanceText: {
    fontSize: 18,
    fontWeight: '600',
  },
  playAgainButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  persistentStats: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 15,
  },
  persistentStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
});