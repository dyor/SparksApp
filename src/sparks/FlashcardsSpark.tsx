import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = Math.min(screenWidth - 40, 320);

interface FlashCard {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const defaultCards: FlashCard[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    answer: "Paris",
    category: "Geography"
  },
  {
    id: 2,
    question: "What is 2 + 2?",
    answer: "4",
    category: "Math"
  },
  {
    id: 3,
    question: "Who painted the Mona Lisa?",
    answer: "Leonardo da Vinci",
    category: "Art"
  },
  {
    id: 4,
    question: "What is the largest planet in our solar system?",
    answer: "Jupiter",
    category: "Science"
  },
  {
    id: 5,
    question: "In what year was the iPhone first released?",
    answer: "2007",
    category: "Technology"
  },
  {
    id: 6,
    question: "What is the chemical symbol for gold?",
    answer: "Au",
    category: "Chemistry"
  }
];

export const FlashcardsSpark: React.FC = () => {
  const { getSparkData, setSparkData } = useSparkStore();
  
  const [cards] = useState<FlashCard[]>(defaultCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // Load persisted data on component mount
  useEffect(() => {
    const savedData = getSparkData('flashcards');
    if (savedData.bestScore) setBestScore(savedData.bestScore);
    if (savedData.totalSessions) setTotalSessions(savedData.totalSessions);
  }, [getSparkData]);
  
  const flipValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  const currentCard = cards[currentIndex];
  const progress = (studiedCards.size / cards.length) * 100;

  const flipCard = () => {
    if (isFlipped) return;
    
    HapticFeedback.medium();
    
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    setIsFlipped(true);
  };

  const nextCard = (wasCorrect: boolean) => {
    // Provide haptic feedback based on correctness
    if (wasCorrect) {
      HapticFeedback.success();
      setCorrectCount(prev => prev + 1);
    } else {
      HapticFeedback.error();
    }
    
    const newStudiedCards = new Set(studiedCards);
    newStudiedCards.add(currentCard.id);
    setStudiedCards(newStudiedCards);

    // Check if all cards are studied
    if (newStudiedCards.size === cards.length) {
      const sessionScore = Math.round((correctCount / cards.length) * 100);
      const newTotalSessions = totalSessions + 1;
      const newBestScore = Math.max(bestScore, sessionScore);
      
      // Update state
      setIsComplete(true);
      setTotalSessions(newTotalSessions);
      setBestScore(newBestScore);
      
      // Persist data
      setSparkData('flashcards', {
        bestScore: newBestScore,
        totalSessions: newTotalSessions,
        lastScore: sessionScore,
        lastPlayed: new Date().toISOString(),
      });
      
      return;
    }

    // Animate out current card and in next card
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    // Reset for next card
    setCurrentIndex((currentIndex + 1) % cards.length);
    setIsFlipped(false);
    flipValue.setValue(0);
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrectCount(0);
    setStudiedCards(new Set());
    setIsComplete(false);
    flipValue.setValue(0);
    scaleValue.setValue(1);
  };

  // Animation interpolations
  const frontInterpolate = flipValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (isComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎉 Study Session Complete!</Text>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Your Results</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cards.length}</Text>
              <Text style={styles.statLabel}>Cards Studied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#28A745' }]}>
                {correctCount}
              </Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#DC3545' }]}>
                {cards.length - correctCount}
              </Text>
              <Text style={styles.statLabel}>To Review</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#007AFF' }]}>
                {Math.round((correctCount / cards.length) * 100)}%
              </Text>
              <Text style={styles.statLabel}>This Session</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                {bestScore}%
              </Text>
              <Text style={styles.statLabel}>Best Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#8E44AD' }]}>
                {totalSessions}
              </Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
          </View>
          
          <View style={styles.accuracyContainer}>
            <Text style={styles.accuracyLabel}>Accuracy</Text>
            <Text style={styles.accuracyPercent}>
              {Math.round((correctCount / cards.length) * 100)}%
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.restartButton} onPress={resetStudy}>
          <Text style={styles.restartButtonText}>Study Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🃏 Flashcards</Text>
        <Text style={styles.subtitle}>Tap the card to reveal the answer</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {studiedCards.size}/{cards.length} cards studied
          </Text>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { rotateY: frontInterpolate },
                { scale: scaleValue }
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={flipCard}
            disabled={isFlipped}
          >
            <View style={styles.cardContent}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{currentCard.category}</Text>
              </View>
              <Text style={styles.cardText}>{currentCard.question}</Text>
              <Text style={styles.tapHint}>
                {!isFlipped ? '👆 Tap to reveal answer' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            {
              transform: [
                { rotateY: backInterpolate },
                { scale: scaleValue }
              ],
            },
          ]}
        >
          <View style={styles.cardContent}>
            <View style={[styles.categoryBadge, styles.categoryBadgeAnswer]}>
              <Text style={styles.categoryText}>Answer</Text>
            </View>
            <Text style={styles.cardText}>{currentCard.answer}</Text>
          </View>
        </Animated.View>
      </View>

      {isFlipped && (
        <View style={styles.answerButtons}>
          <TouchableOpacity
            style={[styles.answerButton, styles.incorrectButton]}
            onPress={() => nextCard(false)}
          >
            <Text style={styles.answerButtonText}>❌ Incorrect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.answerButton, styles.correctButton]}
            onPress={() => nextCard(true)}
          >
            <Text style={styles.answerButtonText}>✅ Correct</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={() => {
          HapticFeedback.light();
          resetStudy();
        }}
      >
        <Text style={styles.resetButtonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
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
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  cardContainer: {
    position: 'relative',
    width: cardWidth,
    height: 200,
    marginBottom: 30,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backgroundColor: '#007AFF',
  },
  cardTouchable: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  categoryBadgeAnswer: {
    backgroundColor: '#E8F5E8',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  cardText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
  },
  tapHint: {
    position: 'absolute',
    bottom: 15,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  answerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  correctButton: {
    backgroundColor: '#28A745',
  },
  incorrectButton: {
    backgroundColor: '#DC3545',
  },
  answerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  accuracyContainer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  accuracyLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  accuracyPercent: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#28A745',
  },
  restartButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});