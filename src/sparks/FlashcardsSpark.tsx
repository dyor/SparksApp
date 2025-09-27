import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, TextInput, Alert, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
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
  SettingsItem,
  SettingsText,
  SettingsRemoveButton
} from '../components/SettingsComponents';

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

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Flashcard Settings"
          subtitle="Manage your English-Spanish phrases"
          icon="⚙️"
        />

        <SettingsSection title="Add New Phrase">
          <SettingsInput
            placeholder="English phrase"
            value={newCard.english}
            onChangeText={(text) => setNewCard({ ...newCard, english: text })}
          />
          <SettingsInput
            placeholder="Spanish translation"
            value={newCard.spanish}
            onChangeText={(text) => setNewCard({ ...newCard, spanish: text })}
          />
          <SettingsButton title="Add Phrase" onPress={addCustomCard} />
        </SettingsSection>

        <SettingsSection title={`Your Phrases (${customCards.length})`}>
          {customCards.map((card) => (
            <SettingsItem key={card.id}>
              <SettingsText>{card.english} → {card.spanish}</SettingsText>
              <SettingsRemoveButton onPress={() => removeCard(card.id)} />
            </SettingsItem>
          ))}
        </SettingsSection>

        <SaveCancelButtons onSave={saveSettings} onCancel={onClose} />
      </SettingsScrollView>
    </SettingsContainer>
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
  const [audioSessionSet, setAudioSessionSet] = useState(false);

  // Animation values
  const celebrationAnimation = useRef(new Animated.Value(0)).current;
  const cardSlideAnimation = useRef(new Animated.Value(0)).current;
  const cardFlipAnimation = useRef(new Animated.Value(0)).current;

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('flashcards');
    if (savedData.cards && savedData.cards.length > 0) {
      setCards(savedData.cards);
    } else {
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
  }, [cards]);

  // Initialize audio session on component mount
  useEffect(() => {
    setupAudioSession();
  }, []);

  // Setup audio session for iOS silent mode compatibility
  const setupAudioSession = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true, // This is key for iOS silent mode
      });
      setAudioSessionSet(true);
    } catch (error) {
      console.error('Audio session setup failed:', error);
    }
  };

  // Text-to-speech function
  const speakSpanish = async (text: string) => {
    try {
      // Ensure audio session is set up
      if (!audioSessionSet) {
        await setupAudioSession();
      }

      // Stop any current speech first
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        Speech.stop();
      }

      Speech.speak(text, {
        language: 'es-ES', // Use Spain Spanish for more authentic accent
        rate: 0.7,
        pitch: 1.1,
        volume: 1.0,
        onStart: () => {
          HapticFeedback.light();
        },
        onDone: () => {
          HapticFeedback.light();
        },
        onError: (error) => {
          console.error('Speech error:', error);
        },
      });
    } catch (error) {
      console.error('Error in speakSpanish:', error);
    }
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
    if (cards.length === 0) {
      return;
    }

    const shuffledCards = shuffleArray(cards);

    // Clear any existing countdown first
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Reset all session state in batch
    setSessionQueue(shuffledCards);
    setAnsweredCorrectly(new Set());
    setSeenCards(new Set());
    setTotalAsked(0);
    setIsCompleted(false);
    setShowCelebration(false);
    setCurrentCard(null);
    setShowAnswer(false);
    setIsCountingDown(false);

    // Set session active LAST to ensure all other state is ready
    setSessionActive(true);

    // Start the first card immediately
    setTimeout(() => {
      // Use the shuffledCards we just created instead of relying on sessionQueue state
      if (shuffledCards.length > 0) {
        // Start the first card directly
        const firstCard = shuffledCards[0];
        setCurrentCard(firstCard);
        setSessionQueue(prev => prev.slice(1)); // Remove first card from queue
        setShowAnswer(false);
        setIsCountingDown(true);

        // Start countdown
        let countdown = 5;
        setCountdown(countdown);
        countdownRef.current = setInterval(() => {
          countdown--;
          setCountdown(countdown);
          if (countdown <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setIsCountingDown(false);
            setShowAnswer(true);
            flipCard(); // Trigger flip animation when timer ends
          }
        }, 1000);
      }
    }, 100);
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

  // Animation functions
  const slideInCard = () => {
    cardSlideAnimation.setValue(-300); // Start off-screen
    cardFlipAnimation.setValue(0); // Reset flip

    Animated.spring(cardSlideAnimation, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const flipCard = () => {
    HapticFeedback.light();
    Animated.spring(cardFlipAnimation, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const slideOutCard = () => {
    return new Promise<void>((resolve) => {
      Animated.timing(cardSlideAnimation, {
        toValue: 300, // Slide out to the right
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        resolve();
      });
    });
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
    if (!sessionActive) {
      return;
    }

    if (sessionQueue.length === 0) {
      checkCompletion();
      return;
    }

    // Take the first card from the queue and remove it
    const nextCard = sessionQueue[0];

    // Remove the card from the queue since we're about to show it
    setSessionQueue(prev => prev.slice(1));

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

    // Slide in the new card
    slideInCard();

    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCountingDown(false);
          setShowAnswer(true);
          // Flip the card and speak Spanish when answer is revealed
          flipCard();
          // Auto-play Spanish when answer is revealed
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
      // Mark as answered correctly - don't add back to queue
      setAnsweredCorrectly(prev => new Set([...prev, currentCard.id]));
      HapticFeedback.success();
    } else {
      // Put the current card at the end of the queue to ask again later
      setSessionQueue(prev => [...prev, currentCard]);
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

    // Start next card
    setTimeout(() => {
      if (sessionActive && !isCompleted) {
        startNextCard();
      }
    }, 500);
  };

  const handleManualFlip = () => {
    if (!showAnswer && isCountingDown) {
      // Clear the countdown and flip immediately
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      setIsCountingDown(false);
      setShowAnswer(true);
      flipCard();
      if (currentCard) {
        speakSpanish(currentCard.spanish);
      }
    }
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
    // Reset animations
    cardSlideAnimation.setValue(0);
    cardFlipAnimation.setValue(0);
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
    animatedCardContainer: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      padding: 15,
      marginBottom: 10,
      alignItems: 'center',
      minHeight: 80,
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
      marginBottom: 15,
    },
    repeatButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignSelf: 'center',
      marginBottom: 10,
    },
    repeatButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    flipButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginTop: 15,
    },
    flipButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
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
          <View style={styles.animatedCardContainer}>
            {!showAnswer ? (
              /* Front of card (English) */
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={styles.englishText}>{currentCard.english}</Text>

                {isCountingDown && (
                  <View style={styles.countdownContainer}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                    <Text style={styles.countdownLabel}>Think about the translation...</Text>
                    <TouchableOpacity style={styles.flipButton} onPress={handleManualFlip}>
                      <Text style={styles.flipButtonText}>🔄 Flip Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* Back of card (Spanish) */
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={styles.englishText}>{currentCard.english}</Text>
                <Text style={styles.spanishText}>{currentCard.spanish}</Text>
                <TouchableOpacity
                  style={styles.repeatButton}
                  onPress={() => speakSpanish(currentCard.spanish)}
                >
                  <Text style={styles.repeatButtonText}>Repeat</Text>
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
                <Text style={styles.answerButtonText}>✕ Wrong</Text>
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