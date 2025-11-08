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
  SettingsRemoveButton,
  SettingsFeedbackSection,
} from '../components/SettingsComponents';
import AddPhraseModal, { Phrase } from '../components/AddPhraseModal';

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
  const [showAddModal, setShowAddModal] = useState(false);

  const addCustomCard = (newPhrase: Omit<Phrase, 'id'>) => {
    const newTranslationCard: TranslationCard = {
      id: Math.max(...customCards.map(c => c.id), 0) + 1,
      english: newPhrase.english.trim(),
      spanish: newPhrase.spanish.trim(),
      correctCount: 0,
      incorrectCount: 0,
      lastAsked: null,
      needsReview: false,
    };

    setCustomCards([...customCards, newTranslationCard]);
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

        <SettingsFeedbackSection sparkName="Flashcards" sparkId="flashcards" />

        <SettingsSection title="Add New Phrase">
          <SettingsButton title="+ Add New Phrase" onPress={() => setShowAddModal(true)} />
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

      <AddPhraseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddPhrase={addCustomCard}
        initialSpeaker="friend1"
        showSpeakerSelection={false}
      />
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
  const [showAddPhraseModal, setShowAddPhraseModal] = useState(false);
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [autoPlayPhase, setAutoPlayPhase] = useState<'english' | 'spanish1' | 'spanish2' | null>(null);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0); // 0-1 for current phase progress

  // Animation values
  const celebrationAnimation = useRef(new Animated.Value(0)).current;
  const cardSlideAnimation = useRef(new Animated.Value(0)).current;
  const cardFlipAnimation = useRef(new Animated.Value(0)).current;

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayActiveRef = useRef(false);
  const progressIntervalsRef = useRef<NodeJS.Timeout[]>([]);

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

  // Sync ref with autoPlayActive state
  useEffect(() => {
    autoPlayActiveRef.current = autoPlayActive;
  }, [autoPlayActive]);

  // Cleanup timers on unmount or when autoplay stops
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      // Clear all progress intervals
      progressIntervalsRef.current.forEach(interval => clearInterval(interval));
      progressIntervalsRef.current = [];
    };
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

  // Text-to-speech function - returns a promise that resolves when speech is done
  const speakSpanish = (text: string, language: string = 'es-ES'): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure audio session is set up
        if (!audioSessionSet) {
          await setupAudioSession();
        }

        // Stop any current speech first and wait for it to fully stop
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
          Speech.stop();
          // Wait 500ms for speech to fully stop before starting new speech
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Even if not speaking, give a brief delay to ensure system is ready
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        let speechStarted = false;
        let speechResolved = false;

        Speech.speak(text, {
          language: language, // Default to Spanish, but can be changed
          rate: 0.7,
          pitch: 1.1,
          volume: 1.0,
          onStart: () => {
            speechStarted = true;
            HapticFeedback.light();
          },
          onDone: () => {
            HapticFeedback.light();
            speechResolved = true;
            // Wait an additional 800ms after speech completes to ensure it's fully finished
            setTimeout(() => {
              resolve();
            }, 800);
          },
          onError: (error) => {
            console.error('Speech error:', error);
            if (!speechResolved) {
              reject(error);
            }
          },
        });

        // Fallback timeout in case onStart/onDone don't fire
        setTimeout(() => {
          if (!speechStarted) {
            console.warn('Speech did not start within timeout, resolving anyway');
            resolve();
          }
        }, 5000);
      } catch (error) {
        console.error('Error in speakSpanish:', error);
        reject(error);
      }
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

  const handleAddPhrase = (newPhrase: Omit<Phrase, 'id'>) => {
    const newCard: TranslationCard = {
      id: Date.now(),
      english: newPhrase.english,
      spanish: newPhrase.spanish,
      correctCount: 0,
      incorrectCount: 0,
      lastAsked: null,
      needsReview: false
    };
    
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setSparkData('flashcards', { cards: updatedCards });
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
    setAutoPlayActive(false);
    autoPlayActiveRef.current = false;
    setAutoPlayPhase(null);
    setAutoPlayProgress(0);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    // Clear all progress intervals
    progressIntervalsRef.current.forEach(interval => clearInterval(interval));
    progressIntervalsRef.current = [];
    // Reset animations
    cardSlideAnimation.setValue(0);
    cardFlipAnimation.setValue(0);
  };

  const stopAutoPlay = () => {
    setAutoPlayActive(false);
    autoPlayActiveRef.current = false;
    setAutoPlayPhase(null);
    setAutoPlayProgress(0);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    // Clear all progress intervals
    progressIntervalsRef.current.forEach(interval => clearInterval(interval));
    progressIntervalsRef.current = [];
  };

  const startAutoPlay = () => {
    // Initialize session same as regular mode
    if (cards.length === 0) {
      return;
    }

    const shuffledCards = shuffleArray(cards);

    // Clear any existing timers
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    // Clear all progress intervals
    progressIntervalsRef.current.forEach(interval => clearInterval(interval));
    progressIntervalsRef.current = [];

    // Reset all session state
    setSessionQueue(shuffledCards);
    setAnsweredCorrectly(new Set());
    setSeenCards(new Set());
    setTotalAsked(0);
    setIsCompleted(false);
    setShowCelebration(false);
    setCurrentCard(null);
    setShowAnswer(false);
    setIsCountingDown(false);
    setSessionActive(true);
    setAutoPlayActive(true);
    autoPlayActiveRef.current = true;

    // Start with first card - set card immediately to avoid loading state
    if (shuffledCards.length > 0) {
      const firstCard = shuffledCards[0];
      setCurrentCard(firstCard);
      setShowAnswer(false);
      setSessionQueue(shuffledCards.slice(1));
      
      // Then start processing after a brief delay
      setTimeout(() => {
        processAutoPlayCard(firstCard, shuffledCards.slice(1));
      }, 100);
    }
  };

  const processAutoPlayCard = async (card: TranslationCard, remainingQueue: TranslationCard[]) => {
    // Set current card immediately to avoid loading state
    setCurrentCard(card);
    setShowAnswer(false);
    setSessionQueue(remainingQueue);
    setAutoPlayPhase('english');
    setAutoPlayProgress(0);

    // Track if this is a new card
    if (!seenCards.has(card.id)) {
      setTotalAsked(prev => prev + 1);
      setSeenCards(prev => new Set([...prev, card.id]));
    }

    // Slide in the card
    slideInCard();

    try {
      // Phase 1: Speak English and wait
      if (!autoPlayActiveRef.current) return;
      
      // Start progress animation for phase 1 (red)
      const phase1Duration = 8000; // 8 seconds - increased to give more time
      const phase1Start = Date.now();
      const progressInterval = setInterval(() => {
        if (!autoPlayActiveRef.current) {
          clearInterval(progressInterval);
          return;
        }
        const elapsed = Date.now() - phase1Start;
        const progress = Math.min(elapsed / phase1Duration, 1);
        setAutoPlayProgress(progress);
      }, 100);
      progressIntervalsRef.current.push(progressInterval);
      
      await speakSpanish(card.english, 'en-US');
      
      // Wait remaining time if speech finished early - ensure minimum duration
      const elapsed = Date.now() - phase1Start;
      if (elapsed < phase1Duration) {
        await new Promise(resolve => setTimeout(resolve, phase1Duration - elapsed));
      }
      
      clearInterval(progressInterval);
      progressIntervalsRef.current = progressIntervalsRef.current.filter(i => i !== progressInterval);
      setAutoPlayProgress(1);

      // Phase 2: Show Spanish and speak first time
      if (!autoPlayActiveRef.current) return;
      
      setShowAnswer(true);
      flipCard();
      setAutoPlayPhase('spanish1');
      setAutoPlayProgress(0);
      
      const phase2Duration = 8000; // 8 seconds - increased to give more time
      const phase2Start = Date.now();
      const progressInterval2 = setInterval(() => {
        if (!autoPlayActiveRef.current) {
          clearInterval(progressInterval2);
          return;
        }
        const elapsed = Date.now() - phase2Start;
        const progress = Math.min(elapsed / phase2Duration, 1);
        setAutoPlayProgress(progress);
      }, 100);
      progressIntervalsRef.current.push(progressInterval2);
      
      await speakSpanish(card.spanish);
      
      // Wait remaining time if speech finished early - ensure minimum duration
      const elapsed2 = Date.now() - phase2Start;
      if (elapsed2 < phase2Duration) {
        await new Promise(resolve => setTimeout(resolve, phase2Duration - elapsed2));
      }
      
      clearInterval(progressInterval2);
      progressIntervalsRef.current = progressIntervalsRef.current.filter(i => i !== progressInterval2);
      setAutoPlayProgress(1);

      // Phase 3: Repeat Spanish
      if (!autoPlayActiveRef.current) return;
      
      setAutoPlayPhase('spanish2');
      setAutoPlayProgress(0);
      
      const phase3Duration = 5000; // 5 seconds - increased to give more time for repeat
      const phase3Start = Date.now();
      const progressInterval3 = setInterval(() => {
        if (!autoPlayActiveRef.current) {
          clearInterval(progressInterval3);
          return;
        }
        const elapsed = Date.now() - phase3Start;
        const progress = Math.min(elapsed / phase3Duration, 1);
        setAutoPlayProgress(progress);
      }, 100);
      progressIntervalsRef.current.push(progressInterval3);
      
      await speakSpanish(card.spanish);
      
      // Wait remaining time if speech finished early - ensure minimum duration
      const elapsed3 = Date.now() - phase3Start;
      if (elapsed3 < phase3Duration) {
        await new Promise(resolve => setTimeout(resolve, phase3Duration - elapsed3));
      }
      
      clearInterval(progressInterval3);
      progressIntervalsRef.current = progressIntervalsRef.current.filter(i => i !== progressInterval3);
      setAutoPlayProgress(1);

      // Mark as answered correctly and advance
      if (!autoPlayActiveRef.current) return;
      
      setAnsweredCorrectly(prev => {
        const newAnsweredCorrectly = new Set([...prev, card.id]);
        
        // Update card statistics
        const updatedCards = cards.map(c => {
          if (c.id === card.id) {
            return {
              ...c,
              correctCount: c.correctCount + 1,
              lastAsked: new Date(),
            };
          }
          return c;
        });
        setCards(updatedCards);

        // Check if completed
        if (newAnsweredCorrectly.size === cards.length) {
          setIsCompleted(true);
          setShowCelebration(true);
          setSessionActive(false);
          setAutoPlayActive(false);
          autoPlayActiveRef.current = false;
          setAutoPlayPhase(null);
          triggerCelebration();
          onComplete?.({
            totalCards: cards.length,
            correctAnswers: newAnsweredCorrectly.size,
            accuracy: totalAsked > 0 ? (newAnsweredCorrectly.size / totalAsked) * 100 : 0
          });
        } else {
          // For autoplay, we can transition immediately without waiting for slide animation
          // Slide out current card and continue
          slideOutCard();
          setAutoPlayPhase(null);
          setAutoPlayProgress(0);
          
          // Immediately set next card to avoid loading state
          if (remainingQueue.length > 0) {
            const nextCard = remainingQueue[0];
            // Set card immediately, then process after brief delay for animation
            setCurrentCard(nextCard);
            setShowAnswer(false);
            setSessionQueue(remainingQueue.slice(1));
            
            setTimeout(() => {
              processAutoPlayCard(nextCard, remainingQueue.slice(1));
            }, 300); // Brief delay for slide animation
          } else {
            // Queue is empty but not all answered correctly - reshuffle remaining cards
            const incorrectlyAnswered = updatedCards.filter(c => !newAnsweredCorrectly.has(c.id));
            if (incorrectlyAnswered.length > 0) {
              const reshuffled = shuffleArray(incorrectlyAnswered);
              const nextCard = reshuffled[0];
              // Set card immediately
              setCurrentCard(nextCard);
              setShowAnswer(false);
              setSessionQueue(reshuffled.slice(1));
              
              setTimeout(() => {
                processAutoPlayCard(nextCard, reshuffled.slice(1));
              }, 300);
            }
          }
        }
        
        return newAnsweredCorrectly;
      });
    } catch (error) {
      console.error('Error in processAutoPlayCard:', error);
      // Continue anyway
      setAutoPlayPhase(null);
      setAutoPlayProgress(0);
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
    centeredAddButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      marginBottom: 20,
      alignSelf: 'center',
    },
    centeredAddButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: '600',
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
    autoLearnButton: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 25,
      marginBottom: 20,
    },
    autoLearnButtonText: {
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
    stopAutoPlayButton: {
      backgroundColor: colors.error,
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
    stopAutoPlayButtonText: {
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
    autoplayProgressContainer: {
      marginVertical: 15,
      marginHorizontal: 20,
      position: 'relative',
      height: 8,
    },
    autoplayProgressBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: colors.border,
    },
    autoplayProgressSection: {
      flex: 1,
      opacity: 0.3,
    },
    autoplayProgressRed: {
      backgroundColor: '#FF4444',
    },
    autoplayProgressYellow: {
      backgroundColor: '#FFD700',
    },
    autoplayProgressBlue: {
      backgroundColor: '#4444FF',
    },
    autoplayProgressIndicator: {
      position: 'absolute',
      top: -4,
      width: 16,
      height: 16,
      marginLeft: -8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    autoplayProgressBall: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#000',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
    },
    startAutoLearnContainer: {
      marginTop: 15,
      marginBottom: 10,
      alignItems: 'center',
    },
    startAutoLearnButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
    },
    startAutoLearnButtonText: {
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
        onClose={onCloseSettings || (() => {})}
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
          <TouchableOpacity style={styles.centeredAddButton} onPress={() => setShowAddPhraseModal(true)}>
            <Text style={styles.centeredAddButtonText}>+ Add New Phrase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton} onPress={startNewSession}>
            <Text style={styles.startButtonText}>🧠 Start Learning</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.autoLearnButton} onPress={startAutoPlay}>
            <Text style={styles.autoLearnButtonText}>🚗 Auto Learn</Text>
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

          {/* Autoplay Progress Bar */}
          {autoPlayActive && autoPlayPhase && (
            <View style={styles.autoplayProgressContainer}>
              <View style={styles.autoplayProgressBar}>
                {/* Red section - English */}
                <View style={[
                  styles.autoplayProgressSection,
                  styles.autoplayProgressRed,
                  autoPlayPhase === 'english' && { opacity: 1 }
                ]} />
                {/* Yellow section - Spanish 1 */}
                <View style={[
                  styles.autoplayProgressSection,
                  styles.autoplayProgressYellow,
                  autoPlayPhase === 'spanish1' && { opacity: 1 }
                ]} />
                {/* Blue section - Spanish 2 */}
                <View style={[
                  styles.autoplayProgressSection,
                  styles.autoplayProgressBlue,
                  autoPlayPhase === 'spanish2' && { opacity: 1 }
                ]} />
              </View>
              {/* Progress indicator (ball/arrow) */}
              <View style={[
                styles.autoplayProgressIndicator,
                {
                  left: `${((autoPlayPhase === 'english' ? 0 : autoPlayPhase === 'spanish1' ? 1 : 2) + autoPlayProgress) * (100 / 3)}%`
                }
              ]}>
                <View style={styles.autoplayProgressBall} />
              </View>
            </View>
          )}

          {showAnswer && !autoPlayActive && (
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

          {/* Start Auto Learn button - visible when session is active but autoplay is not */}
          {sessionActive && !autoPlayActive && (
            <View style={styles.startAutoLearnContainer}>
              <TouchableOpacity style={styles.startAutoLearnButton} onPress={startAutoPlay}>
                <Text style={styles.startAutoLearnButtonText}>🚗 Start Auto Learn</Text>
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
        {autoPlayActive && (
          <TouchableOpacity 
            style={[styles.bottomButton, styles.stopAutoPlayButton]} 
            onPress={stopAutoPlay}
          >
            <Text style={styles.stopAutoPlayButtonText} numberOfLines={1}>Stop Auto Play</Text>
          </TouchableOpacity>
        )}
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

      {/* Add Phrase Modal */}
      <AddPhraseModal
        visible={showAddPhraseModal}
        onClose={() => setShowAddPhraseModal(false)}
        onAddPhrase={handleAddPhrase}
        initialSpeaker="friend1"
        showSpeakerSelection={false}
      />
    </ScrollView>
  );
};