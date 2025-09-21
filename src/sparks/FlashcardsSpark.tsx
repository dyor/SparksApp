import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, TextInput, Alert, Animated } from 'react-native';
import * as Speech from 'expo-speech';
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
  // { id: 1, english: "Hello", spanish: "Hola", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  // { id: 2, english: "Thank you", spanish: "Gracias", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  // { id: 3, english: "Please", spanish: "Por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  // { id: 4, english: "Goodbye", spanish: "Adiós", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  // { id: 5, english: "Yes / No", spanish: "Sí / No", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  // { id: 6, english: "Excuse me", spanish: "Disculpe / Perdón", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 7, english: "I don't understand", spanish: "No entiendo", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 8, english: "Do you speak English?", spanish: "¿Habla inglés?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 9, english: "Where is the bathroom?", spanish: "¿Dónde está el baño?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 10, english: "How much does it cost?", spanish: "¿Cuánto cuesta?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 11, english: "I need help", spanish: "Necesito ayuda", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 12, english: "Where is the departure gate?", spanish: "¿Dónde está la puerta de embarque?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 13, english: "My flight is delayed", spanish: "Mi vuelo está retrasado", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 14, english: "Where is baggage claim?", spanish: "¿Dónde está el reclamo de equipaje?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 15, english: "I have a connecting flight", spanish: "Tengo un vuelo de conexión", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 16, english: "Here is my passport", spanish: "Aquí está mi pasaporte", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 17, english: "I have a reservation", spanish: "Tengo una reservación", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 18, english: "What time is check-out?", spanish: "¿A qué hora es la salida?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 19, english: "Can I have the Wi-Fi password?", spanish: "¿Me da la contraseña del Wi-Fi?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 20, english: "Is breakfast included?", spanish: "¿El desayuno está incluido?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 21, english: "My room key, please", spanish: "La llave de mi habitación, por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 22, english: "Can you call a taxi for me?", spanish: "¿Puede llamarme un taxi?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 23, english: "How do I get to...?", spanish: "¿Cómo llego a...?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 24, english: "Where is the train station?", spanish: "¿Dónde está la estación de tren?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 25, english: "A ticket to..., please", spanish: "Un boleto a..., por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 26, english: "To the left / To the right", spanish: "A la izquierda / A la derecha", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 27, english: "Straight ahead", spanish: "Todo recto", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 28, english: "A table for two, please", spanish: "Una mesa para dos, por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 29, english: "The menu, please", spanish: "El menú, por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 30, english: "I would like to order...", spanish: "Quisiera ordenar...", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 31, english: "The check, please", spanish: "La cuenta, por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 32, english: "Is the tip included?", spanish: "¿La propina está incluida?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 33, english: "I am allergic to nuts", spanish: "Soy alérgico/a a los frutos secos", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 34, english: "A bottle of water, please", spanish: "Una botella de agua, por favor", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 35, english: "Which way to the beach?", spanish: "¿Por dónde se va a la playa?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 36, english: "Is it safe to swim here?", spanish: "¿Es seguro nadar aquí?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 37, english: "Where does the hiking trail start?", spanish: "¿Dónde empieza el sendero?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 38, english: "How long is the hike?", spanish: "¿Cuánto dura la caminata?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 39, english: "I would like to rent an umbrella", spanish: "Quisiera alquilar una sombrilla", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 40, english: "What a beautiful view!", spanish: "¡Qué vista tan hermosa!", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 41, english: "I'm just looking, thank you", spanish: "Solo estoy mirando, gracias", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 42, english: "Do you accept credit cards?", spanish: "¿Aceptan tarjetas de crédito?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 43, english: "Where is an ATM?", spanish: "¿Dónde hay un cajero automático?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 44, english: "Can I have a receipt?", spanish: "¿Me puede dar un recibo?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 45, english: "Where is the nearest hospital?", spanish: "¿Dónde está el hospital más cercano?", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 46, english: "I need a doctor", spanish: "Necesito un médico", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 47, english: "Call the police!", spanish: "¡Llame a la policía!", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 48, english: "I lost my wallet", spanish: "Perdí mi cartera", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 49, english: "Good morning", spanish: "Buenos días", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
  { id: 50, english: "Good night", spanish: "Buenas noches", correctCount: 0, incorrectCount: 0, lastAsked: null, needsReview: false },
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

interface FlashcardsSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

export const FlashcardsSpark: React.FC<FlashcardsSparkProps> = ({ 
  showSettings = false,
  onCloseSettings,
  onStateChange,
  onComplete 
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();
  
  const [cards, setCards] = useState<TranslationCard[]>(defaultTranslations);
  const [currentCard, setCurrentCard] = useState<TranslationCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Session-based tracking
  const [sessionQueue, setSessionQueue] = useState<TranslationCard[]>([]);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<Set<number>>(new Set());
  const [totalAsked, setTotalAsked] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [seenCards, setSeenCards] = useState<Set<number>>(new Set()); // Track which cards we've already shown
  
  const celebrationAnimation = useRef(new Animated.Value(0)).current;

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('flashcards');
    if (savedData.cards && savedData.cards.length > 0) {
      console.log('Loading saved cards:', savedData.cards.length);
      setCards(savedData.cards);
    } else {
      console.log('No saved cards, using defaults:', defaultTranslations.length);
      setCards(defaultTranslations);
    }
  }, [getSparkData]);

  // Save data whenever cards change
  useEffect(() => {
    if (cards.length > 0) {
      setSparkData('flashcards', {
        cards,
        lastPlayed: new Date().toISOString(),
      });
    }
  }, [cards, setSparkData]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('State update:', {
      cardsCount: cards.length,
      sessionActive,
      currentCardId: currentCard?.id,
      queueLength: sessionQueue.length,
      answeredCount: answeredCorrectly.size
    });
  }, [cards.length, sessionActive, currentCard?.id, sessionQueue.length, answeredCorrectly.size]);

  // Text-to-speech function
  const speakSpanish = (text: string) => {
    Speech.speak(text, {
      language: 'es-ES', // Spanish (Spain)
      rate: 0.8, // Slightly slower for learning
      pitch: 1.0,
    });
  };

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Start a new session - initialize the queue with shuffled cards
  const startNewSession = () => {
    console.log('Starting new session with', cards.length, 'cards');
    
    if (cards.length === 0) {
      console.log('No cards available!');
      return;
    }

    const shuffledCards = shuffleArray(cards);
    console.log('Cards shuffled! First card will be:', shuffledCards[0]?.english);
    
    // Set all states at once
    const firstCard = shuffledCards[0];
    const remainingQueue = shuffledCards.slice(1); // Remove first card from queue since we're showing it
    
    setSessionQueue(remainingQueue); // Queue starts with remaining cards
    setAnsweredCorrectly(new Set());
    setSeenCards(new Set()); // Reset seen cards tracker
    setTotalAsked(0); // Reset total asked, will be incremented in startNextCard
    setSessionActive(true);
    setIsCompleted(false);
    setShowCelebration(false);
    
    // Start the first card immediately with the shuffled cards
    if (firstCard) {
      console.log('Setting up first card immediately:', firstCard.english, 'Remaining queue:', remainingQueue.length);
      setCurrentCard(firstCard);
      setShowAnswer(false);
      setCountdown(5);
      setIsCountingDown(true);
      setTotalAsked(1);
      setSeenCards(new Set([firstCard.id]));
      
      // Start countdown for first card
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsCountingDown(false);
            setShowAnswer(true);
            // Automatically speak the Spanish phrase when answer is revealed
            if (firstCard) {
              speakSpanish(firstCard.spanish);
            }
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Check if session is completed
  const checkCompletion = () => {
    if (answeredCorrectly.size === cards.length && sessionActive && !isCompleted) {
      setIsCompleted(true);
      setShowCelebration(true);
      setSessionActive(false);
      triggerCelebration();
      onComplete?.({
        totalCards: cards.length,
        correctAnswers: answeredCorrectly.size,
        accuracy: totalAsked > 0 ? (answeredCorrectly.size / totalAsked) * 100 : 0
      });
    }
  };

  const triggerCelebration = () => {
    HapticFeedback.success();
    Animated.sequence([
      Animated.timing(celebrationAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getNextCard = (): TranslationCard | null => {
    // If session not active or completed, don't show cards
    if (!sessionActive || isCompleted || sessionQueue.length === 0) {
      return null;
    }
    
    // Return the first card in the queue
    return sessionQueue[0];
  };

  const startNextCard = () => {
    const nextCard = getNextCard();
    console.log('\n=== STARTING NEXT CARD ===');
    console.log('Queue length:', sessionQueue.length);
    console.log('Next few cards in queue:', sessionQueue.slice(0, 3).map(c => c.english));
    console.log('Selected next card:', nextCard?.english);
    
    if (!nextCard) {
      console.log('No next card, checking completion');
      // Check if we've completed all cards
      checkCompletion();
      return;
    }
    
    // Clear any existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    setCurrentCard(nextCard);
    setShowAnswer(false);
    setCountdown(5);
    setIsCountingDown(true);

    // Only increment total asked if this is a truly new question (not seen before in this session)
    if (!seenCards.has(nextCard.id)) {
      setTotalAsked(prev => prev + 1);
      setSeenCards(prev => new Set([...prev, nextCard.id]));
    }

    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCountingDown(false);
          setShowAnswer(true);
          // Automatically speak the Spanish phrase when answer is revealed
          if (nextCard) {
            speakSpanish(nextCard.spanish);
          }
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return;

    if (correct) {
      // Mark as answered correctly - remove from queue
      setAnsweredCorrectly(prev => new Set([...prev, currentCard.id]));
      setSessionQueue(prev => {
        const newQueue = prev.filter(card => card.id !== currentCard.id);
        console.log('Correct answer! Removing card. New queue length:', newQueue.length);
        return newQueue;
      });
      HapticFeedback.success();
    } else {
      // Put the card at the end of the queue to ask again later
      setSessionQueue(prev => {
        const filtered = prev.filter(card => card.id !== currentCard.id);
        const newQueue = [...filtered, currentCard];
        console.log('Wrong answer! Moving card to END of queue.');
        console.log('Next card will be:', newQueue[0]?.english);
        console.log('Wrong card now at position:', newQueue.length - 1, '- will be asked after', newQueue.length - 1, 'other cards');
        return newQueue;
      });
      HapticFeedback.error();
    }

    // Update card statistics for tracking
    const updatedCards = cards.map(card => {
      if (card.id === currentCard.id) {
        return {
          ...card,
          correctCount: correct ? card.correctCount + 1 : card.correctCount,
          incorrectCount: correct ? card.incorrectCount : card.incorrectCount + 1,
          lastAsked: new Date(),
        };
      }
      return card;
    });

    setCards(updatedCards);

    // Start next card after a short delay
    setTimeout(() => {
      startNextCard();
    }, 1000);
  };

  const resetSession = () => {
    setCurrentCard(null);
    setShowAnswer(false);
    setIsCountingDown(false);
    setShowCelebration(false);
    setIsCompleted(false);
    setSessionQueue([]);
    setAnsweredCorrectly(new Set());
    setSeenCards(new Set());
    setTotalAsked(0);
    setSessionActive(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
  };

  const saveCustomCards = (newCards: TranslationCard[]) => {
    setCards(newCards);
    HapticFeedback.success();
  };

  // Calculate progress percentages
  const askedPercentage = totalAsked > 0 ? Math.min((totalAsked / cards.length) * 100, 100) : 0;
  const correctPercentage = answeredCorrectly.size > 0 ? (answeredCorrectly.size / cards.length) * 100 : 0;

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
    spanishContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    spanishText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      flex: 1,
    },
    playButton: {
      backgroundColor: colors.primary,
      borderRadius: 25,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 15,
    },
    playButtonText: {
      color: '#fff',
      fontSize: 18,
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
    celebrationContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    celebrationContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 40,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    celebrationTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.success,
      textAlign: 'center',
      marginBottom: 10,
    },
    celebrationText: {
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    celebrationButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 25,
    },
    celebrationButtonText: {
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
        onClose={onCloseSettings}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>🃏 Spanish Flashcards</Text>
        <Text style={styles.subtitle}>Learn Spanish. Easy. </Text>
        
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
            <Text style={styles.progressText}>{totalAsked}/{cards.length}</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Completed</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  styles.correctProgress, 
                  { width: `${correctPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{answeredCorrectly.size}/{cards.length}</Text>
          </View>
        </View>
      </View>

      {!sessionActive ? (
        <View style={styles.startContainer}>
          <View style={styles.cardContainer}>
            <Text style={styles.statsText}>
              Ready to practice {cards.length} phrases
            </Text>
            {totalAsked > 0 && (
              <Text style={styles.statsText}>
                Last session: {answeredCorrectly.size}/{totalAsked} correct
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.startButton} onPress={startNewSession}>
            <Text style={styles.startButtonText}>Start Learning</Text>
          </TouchableOpacity>
        </View>
      ) : sessionActive && currentCard ? (
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
              <View style={styles.spanishContainer}>
                <Text style={styles.spanishText}>{currentCard.spanish}</Text>
                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={() => speakSpanish(currentCard.spanish)}
                >
                  <Text style={styles.playButtonText}>🔊</Text>
                </TouchableOpacity>
              </View>
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
      ) : sessionActive ? (
        <View style={styles.startContainer}>
          <View style={styles.cardContainer}>
            <Text style={styles.statsText}>Loading next card...</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[styles.bottomButton, styles.resetButton]} 
          onPress={resetSession}
        >
          <Text style={styles.resetButtonText}>Reset Session</Text>
        </TouchableOpacity>
      </View>
      
      {/* Completion Celebration Modal */}
      {showCelebration && (
        <Animated.View 
          style={[
            styles.celebrationContainer,
            {
              opacity: celebrationAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
              transform: [{
                scale: celebrationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            }
          ]}
        >
          <View style={styles.celebrationContent}>
            <Text style={styles.celebrationTitle}>🎉 ¡Felicidades! 🎉</Text>
            <Text style={styles.celebrationText}>
              You've completed all {cards.length} flashcards!
            </Text>
            <Text style={styles.celebrationText}>
              Accuracy: {totalAsked > 0 ? Math.round((answeredCorrectly.size / totalAsked) * 100) : 100}%
            </Text>
            <TouchableOpacity 
              style={styles.celebrationButton}
              onPress={() => {
                setShowCelebration(false);
                resetSession();
              }}
            >
              <Text style={styles.celebrationButtonText}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
};