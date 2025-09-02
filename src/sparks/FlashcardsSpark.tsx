import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, TextInput, Alert } from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface TranslationCard {
  id: number;
  english: string;
  spanish: string;
  correctCount: number;
  incorrectCount: number;
  lastAsked: Date | null;
  needsReview: boolean;
}

const defaultTranslations: TranslationCard[] = [
  { id: 1, english: "Hello", spanish: "Hola", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 2, english: "Thank you", spanish: "Gracias", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 3, english: "Good morning", spanish: "Buenos días", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 4, english: "How are you?", spanish: "¿Cómo estás?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 5, english: "Where is the bathroom?", spanish: "¿Dónde está el baño?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 6, english: "I don't understand", spanish: "No entiendo", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 7, english: "Please", spanish: "Por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 8, english: "Excuse me", spanish: "Disculpe", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
];

interface FlashcardSettings {
  english: string;
  spanish: string;
}

const FlashcardSettings: React.FC<{
  cards: TranslationCard[];
  onSave: (cards: TranslationCard[]) => void;
  onClose: () => void;
}> = ({ cards, onSave, onClose }) => {
  const { colors } = useTheme();
  const [customCards, setCustomCards] = useState<TranslationCard[]>(cards);
  const [newCard, setNewCard] = useState<FlashcardSettings>({ english: '', spanish: '' });

  const addCustomCard = () => {
    if (!newCard.english.trim() || !newCard.spanish.trim()) {
      Alert.alert('Error', 'Please enter both English and Spanish phrases');
      return;
    }

    const newTranslationCard: TranslationCard = {
      id: Math.max(...customCards.map(c => c.id), 0) + 1,
      english: newCard.english.trim(),
      spanish: newCard.spanish.trim(),
      correctCount: 0,
      incorrectCount: 0,
      lastAsked: null,
      needsReview: false,
    };

    setCustomCards([...customCards, newTranslationCard]);
    setNewCard({ english: '', spanish: '' });
    HapticFeedback.success();
  };

  const removeCard = (id: number) => {
    if (customCards.length <= 1) {
      Alert.alert('Error', 'You must have at least one card');
      return;
    }
    setCustomCards(customCards.filter(card => card.id !== id));
    HapticFeedback.medium();
  };

  const saveSettings = () => {
    onSave(customCards);
    onClose();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    addSection: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    addButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cardsSection: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    cardItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cardText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    removeButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginLeft: 10,
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Flashcard Settings</Text>
          <Text style={styles.subtitle}>Manage your English-Spanish phrases</Text>
        </View>

        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>Add New Phrase</Text>
          <TextInput
            style={styles.input}
            placeholder="English phrase"
            placeholderTextColor={colors.textSecondary}
            value={newCard.english}
            onChangeText={(text) => setNewCard({ ...newCard, english: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Spanish translation"
            placeholderTextColor={colors.textSecondary}
            value={newCard.spanish}
            onChangeText={(text) => setNewCard({ ...newCard, spanish: text })}
          />
          <TouchableOpacity style={styles.addButton} onPress={addCustomCard}>
            <Text style={styles.addButtonText}>Add Phrase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>Your Phrases ({customCards.length})</Text>
          {customCards.map((card) => (
            <View key={card.id} style={styles.cardItem}>
              <Text style={styles.cardText}>{card.english} → {card.spanish}</Text>
              <TouchableOpacity 
                style={styles.removeButton} 
                onPress={() => removeCard(card.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveSettings}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export const FlashcardsSpark: React.FC = () => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();
  
  const [cards, setCards] = useState<TranslationCard[]>(defaultTranslations);
  const [currentCard, setCurrentCard] = useState<TranslationCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionStats, setSessionStats] = useState({ asked: 0, correct: 0 });

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('flashcards');
    if (savedData.cards) {
      setCards(savedData.cards);
    }
    if (savedData.sessionStats) {
      setSessionStats(savedData.sessionStats);
    }
  }, [getSparkData]);

  // Save data whenever cards or stats change
  useEffect(() => {
    setSparkData('flashcards', {
      cards,
      sessionStats,
      lastPlayed: new Date().toISOString(),
    });
  }, [cards, sessionStats, setSparkData]);

  const getNextCard = (): TranslationCard | null => {
    // Prioritize cards that need review (were answered incorrectly)
    const reviewCards = cards.filter(card => card.needsReview);
    if (reviewCards.length > 0) {
      return reviewCards[Math.floor(Math.random() * reviewCards.length)];
    }

    // Otherwise, return a random card
    if (cards.length === 0) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  };

  const startNewCard = () => {
    const nextCard = getNextCard();
    if (!nextCard) return;

    setCurrentCard(nextCard);
    setShowAnswer(false);
    setCountdown(5);
    setIsCountingDown(true);

    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCountingDown(false);
          setShowAnswer(true);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Update session stats
    setSessionStats(prev => ({ ...prev, asked: prev.asked + 1 }));
  };

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return;

    // Update card statistics
    const updatedCards = cards.map(card => {
      if (card.id === currentCard.id) {
        return {
          ...card,
          correctCount: correct ? card.correctCount + 1 : card.correctCount,
          incorrectCount: correct ? card.incorrectCount : card.incorrectCount + 1,
          lastAsked: new Date(),
          needsReview: !correct, // Mark for review if incorrect
        };
      }
      return card;
    });

    setCards(updatedCards);

    // Update session stats
    if (correct) {
      setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      HapticFeedback.success();
    } else {
      HapticFeedback.error();
    }

    // Start next card after a short delay
    setTimeout(() => {
      startNewCard();
    }, 1000);
  };

  const resetSession = () => {
    setSessionStats({ asked: 0, correct: 0 });
    setCurrentCard(null);
    setShowAnswer(false);
    setIsCountingDown(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const saveCustomCards = (newCards: TranslationCard[]) => {
    setCards(newCards);
    HapticFeedback.success();
  };

  // Calculate progress percentages
  const askedPercentage = sessionStats.asked > 0 ? Math.min((sessionStats.asked / cards.length) * 100, 100) : 0;
  const correctPercentage = sessionStats.asked > 0 ? (sessionStats.correct / sessionStats.asked) * 100 : 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    progressBars: {
      flexDirection: 'row',
      gap: 15,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    progressContainer: {
      flex: 1,
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '600',
    },
    progressBar: {
      width: '100%',
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    askedProgress: {
      backgroundColor: colors.primary,
    },
    correctProgress: {
      backgroundColor: colors.success,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      fontWeight: '600',
    },
    cardContainer: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 30,
      marginBottom: 20,
      alignItems: 'center',
      minHeight: 200,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    englishText: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    countdownContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    countdownText: {
      fontSize: 48,
      fontWeight: 'bold',
      color: colors.primary,
    },
    countdownLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    },
    spanishText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 20,
    },
    answerButtons: {
      flexDirection: 'row',
      gap: 15,
      marginBottom: 20,
    },
    answerButton: {
      flex: 1,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    correctButton: {
      backgroundColor: colors.success,
    },
    incorrectButton: {
      backgroundColor: colors.error,
    },
    answerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    startContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 25,
      marginBottom: 20,
    },
    startButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    statsText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 10,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 'auto',
      paddingTop: 20,
    },
    bottomButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
    },
    settingsButton: {
      backgroundColor: colors.border,
    },
    resetButton: {
      backgroundColor: colors.textSecondary,
    },
    bottomButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    resetButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (showSettings) {
    return (
      <FlashcardSettings
        cards={cards}
        onSave={saveCustomCards}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>🃏 English → Spanish</Text>
        <Text style={styles.subtitle}>Learn Spanish translations</Text>
        
        <View style={styles.progressBars}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Asked</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  styles.askedProgress, 
                  { width: `${askedPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{sessionStats.asked}/{cards.length}</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Correct</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  styles.correctProgress, 
                  { width: `${correctPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{sessionStats.correct}/{sessionStats.asked}</Text>
          </View>
        </View>
      </View>

      {!currentCard ? (
        <View style={styles.startContainer}>
          <View style={styles.cardContainer}>
            <Text style={styles.statsText}>
              Ready to practice {cards.length} phrases
            </Text>
            <Text style={styles.statsText}>
              Session: {sessionStats.correct}/{sessionStats.asked} correct
            </Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={startNewCard}>
            <Text style={styles.startButtonText}>Start Learning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.cardContainer}>
            <Text style={styles.englishText}>{currentCard.english}</Text>
            
            {isCountingDown && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{countdown}</Text>
                <Text style={styles.countdownLabel}>Think about the translation...</Text>
              </View>
            )}
            
            {showAnswer && (
              <Text style={styles.spanishText}>{currentCard.spanish}</Text>
            )}
          </View>

          {showAnswer && (
            <View style={styles.answerButtons}>
              <TouchableOpacity 
                style={[styles.answerButton, styles.incorrectButton]} 
                onPress={() => handleAnswer(false)}
              >
                <Text style={styles.answerButtonText}>❌ Wrong</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.answerButton, styles.correctButton]} 
                onPress={() => handleAnswer(true)}
              >
                <Text style={styles.answerButtonText}>✅ Correct</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[styles.bottomButton, styles.settingsButton]} 
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.bottomButtonText}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.bottomButton, styles.resetButton]} 
          onPress={resetSession}
        >
          <Text style={styles.resetButtonText}>Reset Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};