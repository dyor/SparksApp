import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Animated,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { HapticFeedback } from '../utils/haptics';
import { ServiceFactory } from '../services/ServiceFactory';
import { getFirestore, collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,

  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SettingsButton,
} from '../components/SettingsComponents';

// Dropdown Component
const Dropdown: React.FC<{
  options: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  style?: any;
  textStyle?: any;
}> = ({ options, selectedValue, onSelect, placeholder, style, textStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={[style, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 50 }]}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>{selectedValue || placeholder}</Text>
        <Text style={[textStyle, { fontSize: 12 }]}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={{ backgroundColor: 'white', borderRadius: 12, width: width * 0.8, maxHeight: height * 0.5 }}>
            <ScrollView>
              {options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#eee',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, color: '#333' }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

interface SparkSubmission {
  id: string;
  userId: string;
  timestamp: number;
  sparkName: string;
  description: string;
  customer: string;
  customerPayment: string;
  creationPayment: string;
  email: string;
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'built';
}

const PAYMENT_OPTIONS = [
  'Exactly $0',
  'About $100',
  'Maybe $500-$1000',
  'Over $1000'
];

const JOURNEY_THEMES = [
  { icon: '🧙‍♂️', title: 'Meet the Wizard', description: 'Your journey begins here' },
  { icon: '🥚', title: 'Dragon Egg', description: 'Give your Spark a name' },
  { icon: '🐉', title: 'Glorious Spark', description: 'Describe its powers' },
  { icon: '🏰', title: 'Loyal Villagers', description: 'Who will it help?' },
  { icon: '💰', title: '[Spark Name] Riches', description: 'The Spark\'s reward' },
  { icon: '💎', title: 'Wizard\'s Reward', description: 'An old wizard needs gold' },
  { icon: '🍺', title: 'Tavern', description: 'Where to find you' },
  { icon: '✨', title: 'Final Checkpoint', description: 'Review the incantations' },
  { icon: '🎉', title: 'Success!', description: 'Your Spark has been summoned!' },
];

interface SparkSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (data: any) => void;
  onComplete?: (result: any) => void;
}

export default function SparkSpark({ showSettings = false, onCloseSettings }: SparkSparkProps) {
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));
  const [pastSubmissions, setPastSubmissions] = useState<SparkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [formData, setFormData] = useState({
    sparkName: '',
    description: '',
    customer: '',
    customerPayment: '',
    creationPayment: 'Exactly $0',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewIconIndex, setReviewIconIndex] = useState(0);
  const [reviewIconOpacity] = useState(new Animated.Value(1));

  const pageCount = 9;
  const totalSteps = 7;

  // Animate the review page icons
  useEffect(() => {
    if (currentPage === totalSteps) {
      const icons = ['🧙‍♂️', '🥚', '🐉', '🏰', '💰', '💎', '🍺', '✨'];
      let currentIndex = 0;

      const animateIcons = () => {
        Animated.sequence([
          Animated.timing(reviewIconOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(reviewIconOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          currentIndex = (currentIndex + 1) % icons.length;
          setReviewIconIndex(currentIndex);
          animateIcons();
        });
      };

      const interval = setInterval(() => {
        animateIcons();
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [currentPage, reviewIconOpacity]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation functions
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getCharCount = (field: string) => {
    return formData[field as keyof typeof formData].length;
  };

  const canProceedToNext = () => {
    switch (currentPage) {
      case 1: // Spark Name
        return formData.sparkName.trim().length >= 3;
      case 2: // Description
        return formData.description.trim().length >= 30;
      case 3: // Customer
        return formData.customer.trim().length >= 10;
      case 4: // Customer Payment
        return formData.customerPayment.trim().length >= 2;
      case 5: // Creation Payment
        return formData.creationPayment !== '';
      case 6: // Email
        return isValidEmail(formData.email.trim());
      default:
        return true;
    }
  };

  const getMinChars = (page: number) => {
    switch (page) {
      case 1: return 3;
      case 2: return 30;
      case 3: return 10;
      case 4: return 2;
      default: return 0;
    }
  };

  const animatePageTransition = (callback: () => void, isForward = true) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: isForward ? 1 : -1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 200);
  };

  const handleNext = () => {
    if (currentPage < pageCount - 1 && canProceedToNext()) {
      HapticFeedback.medium();
      const nextPage = currentPage + 1;

      // Simple transition without intermediate screen
      setCurrentPage(nextPage);
    }
  };

  const handleBack = () => {
    if (currentPage > 0 && !submitted) {
      HapticFeedback.medium();
      if (currentPage === 1) {
        // Go back to intro page (page 0)
        setCurrentPage(0);
      } else {
        animatePageTransition(() => {
          setCurrentPage(currentPage - 1);
        }, false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canProceedToNext() || submitting) return;

    setSubmitting(true);
    HapticFeedback.success();

    try {
      const AnalyticsService = await ServiceFactory.getAnalyticsService();
      const sessionInfo = AnalyticsService.getSessionInfo();

      const submission: SparkSubmission = {
        id: `spark_${Date.now()}_${Math.random()}`,
        userId: sessionInfo.userId || sessionInfo.sessionId || 'anonymous',
        timestamp: Date.now(),
        sparkName: formData.sparkName,
        description: formData.description,
        customer: formData.customer,
        customerPayment: formData.customerPayment,
        creationPayment: formData.creationPayment,
        email: formData.email,
        status: 'submitted',
      };

      const db = getFirestore();
      await setDoc(doc(collection(db, 'sparkSubmissions'), submission.id), submission);

      setSubmitted(true);
      setCurrentPage(8);
    } catch (error) {
      console.error('Error submitting Spark:', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit your Spark idea. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCharCounter = (field: string, page: number) => {
    const count = getCharCount(field);
    const min = getMinChars(page);
    const isValid = count >= min;

    return (
      <Text style={[
        styles.charCounter,
        {
          color: isValid ? '#4CAF50' : colors.textSecondary,
          fontWeight: isValid ? '600' : '400'
        }
      ]}>
        {count} / {min} (minimum)
      </Text>
    );
  };

  const renderProgressBar = () => {
    const progress = currentPage / totalSteps;

    return (
      <View style={[styles.progressBarContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: colors.primary,
              }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {Math.round(progress * 100)}% Complete
        </Text>
      </View>
    );
  };

  const renderJourneyMap = () => {
    return (
      <View style={[styles.journeyMap, { backgroundColor: colors.surface }]}>
        {JOURNEY_THEMES.slice(1, 8).map((theme, index) => {
          const isActive = currentPage === index + 1;
          const isCompleted = currentPage > index + 1;

          return (
            <React.Fragment key={index}>
              <View style={styles.mapPoint}>
                <View
                  style={[
                    styles.mapIconContainer,
                    {
                      backgroundColor: isActive ? colors.primary : isCompleted ? '#4CAF50' : colors.background,
                      borderColor: isActive ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={styles.mapIcon}>{theme.icon}</Text>
                </View>
              </View>
              {index < 6 && (
                <View
                  style={[
                    styles.mapLine,
                    { backgroundColor: isCompleted ? '#4CAF50' : colors.border }
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderIntro = () => {
    const theme = JOURNEY_THEMES[0];

    return (
      <Animated.View
        style={[
          styles.pageContainer,
          { opacity: fadeAnim },
          {
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-width, 0, width]
              })
            }]
          }
        ]}
      >
        <ScrollView
          style={styles.introScrollView}
          contentContainerStyle={styles.introScrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.introBackground}>
            <Text style={styles.journeyEmoji}>🗺️</Text>
          </View>

          <View style={[styles.introCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.introIcon}>{theme.icon}</Text>
            <Text style={[styles.introTitle, { color: colors.text }]}>Greetings, Adventurer!</Text>
            <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
              I am the Spark Wizard
            </Text>

            <Text style={[styles.introDescription, { color: colors.text }]}>
              I can see that you have come to me with a vision.{'\n\n'}
              You are going to tell me about your Spark. I will use my spells & potions to bring it to life before the sun next rises.{'\n\n'}
              Together, we will summon a magical Spark that will bring joy to some needy villagers.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  HapticFeedback.medium();
                  setCurrentPage(1);
                }}
              >
                <Text style={styles.primaryButtonText}>Let's begin your Quest 🧙‍♂️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => {
                  HapticFeedback.light();
                  if (onCloseSettings) {
                    onCloseSettings();
                  }
                }}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Close Spark Wizard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderFormPage = () => {
    const pages = [
      {
        icon: '🥚',
        title: 'Behold Your Spark',
        subtitle: 'Every great spark needs a name. What shall we call yours?',
        message: 'Here is your Spark - so fragile, so small, so much work to do - but do not worry about that. I have done this many times. You just need to start by giving me its name.',
        field: 'sparkName',
        placeholder: 'e.g., Travel Planner, History Flashcards',
        multiline: false,
      },
      {
        icon: '🐉',
        title: 'Envision Your Glorious Spark',
        subtitle: 'What will people use this spark to do? How will they interact with it?',
        message: `Tell me what ${formData.sparkName || 'your Spark'} will do when it is fully grown - what powers will it have? Describe the magic your Spark will wield!`,
        field: 'description',
        placeholder: 'Describe the powers and abilities of your Spark...',
        multiline: true,
      },
      {
        icon: '🏰',
        title: 'Who Will Your Spark Serve?',
        subtitle: 'Every Spark needs people who will benefit from its magic. Describe your loyal villagers.',
        message: 'Who will this Spark help when it is fully grown?',
        field: 'customer',
        placeholder: 'e.g., College students studying late at night, Busy parents juggling schedules, Athletes tracking performance',
        multiline: true,
      },
      {
        icon: '💰',
        title: 'The Spark\'s Reward',
        subtitle: `Consider how ${formData.sparkName || 'your Spark'} will sustain itself in the marketplace.`,
        message: 'Will your Spark help people out of the kindness of your heart, or will the loyal villagers shower you with gold in honor of this Spark?',
        field: 'customerPayment',
        placeholder: 'e.g., Yes, villagers would pay $2.99 for this Spark, or No, this should be free for all',
        multiline: true,
      },
      {
        icon: '💎',
        title: 'An Old Wizard Needs His Gold',
        subtitle: 'The more you provide, the more magnificent your Spark can become.',
        message: `Would you be able to help an old wizard out with some riches? I could give your Spark some super powers if you do! How much might you pay to see ${formData.sparkName || 'your Spark'} come to life. `,
        field: 'creationPayment',
        placeholder: '',
        multiline: false,
        dropdown: true,
      },
      {
        icon: '🍺',
        title: 'Where Shall I Find You?',
        subtitle: `I need a way to deliver unto you ${formData.sparkName || 'your Spark'} when it is summoned.`,
        message: 'When the Spark is ready, shall I find you at the local tavern? Or shall I send for you?',
        field: 'email',
        placeholder: 'your.email@example.com',
        multiline: false,
      },
    ];

    const page = pages[currentPage - 1];
    const theme = JOURNEY_THEMES[currentPage];
    const value = formData[page.field as keyof typeof formData];
    const showCounter = [1, 2, 3, 4].includes(currentPage);

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View
          style={[
            styles.pageContainer,
            {
              opacity: fadeAnim,
              backgroundColor: colors.background,
            },
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width, 0, width]
                })
              }]
            }
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Journey Map */}
            {renderJourneyMap()}

            {/* Progress Bar */}
            {renderProgressBar()}

            {/* Themed Background */}
            <View style={[styles.themedBackground, { opacity: 0.05 }]}>
              <Text style={styles.backgroundEmoji}>{theme.icon}</Text>
            </View>

            {/* Form Card */}
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <View style={styles.themeHeader}>
                <Text style={styles.themeIcon}>{page.icon}</Text>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeTitle, { color: colors.text }]}>{page.title}</Text>
                </View>
              </View>

              <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>{page.subtitle}</Text>
              <Text style={[styles.formMessage, { color: colors.text }]}>{page.message}</Text>

              {page.dropdown ? (
                <Dropdown
                  options={PAYMENT_OPTIONS}
                  selectedValue={value}
                  onSelect={(val) => updateFormData(page.field, val)}
                  style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
                  textStyle={[styles.dropdownText, { color: colors.text }]}
                />
              ) : (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                        minHeight: page.multiline ? 120 : 50,
                      }
                    ]}
                    placeholder={page.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={(text) => updateFormData(page.field, text)}
                    multiline={page.multiline}
                    returnKeyType="next"
                    onSubmitEditing={() => canProceedToNext() && handleNext()}
                  />
                  {showCounter && renderCharCounter(page.field, currentPage)}
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  };

  const renderReview = () => {
    const theme = JOURNEY_THEMES[7];
    const icons = ['🧙‍♂️', '🥚', '🐉', '🏰', '💰', '💎', '🍺', '✨'];
    const currentIcon = icons[reviewIconIndex];

    return (
      <Animated.View
        style={[
          styles.pageContainer,
          {
            opacity: fadeAnim,
            backgroundColor: colors.background,
          },
          {
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-width, 0, width]
              })
            }]
          }
        ]}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.reviewScrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={[styles.reviewBackground]}>
            <Animated.Text style={[styles.animatedReviewIcon, { opacity: reviewIconOpacity }]}>
              {currentIcon}
            </Animated.Text>
          </View>

          <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
            <Animated.Text style={[styles.reviewIcon, { opacity: reviewIconOpacity }]}>
              {currentIcon}
            </Animated.Text>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Almost There! ✨</Text>
            <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>
              Let me review the magical incantations we have prepared for your Spark...
            </Text>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Spark Name</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.sparkName}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.description}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Target Customers</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.customer}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Payment Model</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.customerPayment}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Your Investment</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.creationPayment}</Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>{formData.email}</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderSuccess = () => {
    const theme = JOURNEY_THEMES[8];

    return (
      <Animated.View
        style={[
          styles.pageContainer,
          {
            opacity: fadeAnim,
            backgroundColor: colors.background,
          }
        ]}
      >
        <View style={styles.successBackground}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successEmoji}>✨</Text>
          <Text style={styles.successEmoji}>🌟</Text>
        </View>

        <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.successIcon}>{theme.icon}</Text>
          <Text style={[styles.successTitle, { color: colors.text }]}>Journey Complete! 🎊</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Your Spark idea has been submitted
          </Text>
          <Text style={[styles.successDescription, { color: colors.text }]}>
            We'll review your idea and get back to you at{'\n'}
            <Text style={{ fontWeight: '600', color: colors.primary }}>{formData.email}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              HapticFeedback.medium();
              setCurrentPage(0);
              setFormData({
                sparkName: '',
                description: '',
                customer: '',
                customerPayment: '',
                creationPayment: 'Exactly $0',
                email: '',
              });
            }}
          >
            <Text style={styles.primaryButtonText}>Start Another Journey</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderNavigation = () => {
    if (currentPage === 0 || currentPage === 8) return null;

    return (
      <View style={[styles.navigationBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
          onPress={handleBack}
          disabled={currentPage === 1}
        >
          <Text style={[styles.navButtonText, { color: currentPage === 1 ? colors.textSecondary : colors.primary }]}>
            ← Retreat
          </Text>
        </TouchableOpacity>

        {currentPage === totalSteps ? (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && styles.navButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !canProceedToNext()}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitButtonText]}>Summon My Spark! ✨</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              !canProceedToNext() && styles.navButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!canProceedToNext()}
          >
            <Text style={[styles.nextButtonText, { color: canProceedToNext() ? '#FFFFFF' : colors.textSecondary }]}>
              {canProceedToNext() ? 'Advance →' : 'Advance...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Settings implementation (keeping existing settings code)
  const loadPastSubmissions = async () => {
    if (!showSettings) return;

    setLoadingSubmissions(true);
    try {
      const db = getFirestore();
      const AnalyticsService = await ServiceFactory.getAnalyticsService();
      const sessionInfo = AnalyticsService.getSessionInfo();
      const userId = sessionInfo.userId || sessionInfo.sessionId || 'anonymous';

      const submissionsQuery = query(
        collection(db, 'sparkSubmissions'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(submissionsQuery);
      const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SparkSubmission));

      setPastSubmissions(submissions);
    } catch (error) {
      console.error('Error loading past submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (showSettings) {
      loadPastSubmissions();
    }
  }, [showSettings]);

  const renderSettings = () => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'submitted': return '#FFA500';
        case 'reviewed': return '#2196F3';
        case 'approved': return '#4CAF50';
        case 'rejected': return '#F44336';
        case 'built': return '#9C27B0';
        default: return '#757575';
      }
    };

    return (
      <SettingsContainer>
        <SettingsScrollView>
          <SettingsHeader
            title="Spark Spark Settings"
            subtitle="Manage your Spark ideas and submissions"
            icon="✨"
            sparkId="spark-spark"
          />

          <SettingsFeedbackSection sparkName="Spark Spark" sparkId="spark-spark" />

          <SettingsSection title="Your Spark Submissions">
            <View style={{ padding: 16, backgroundColor: 'transparent' }}>
              {loadingSubmissions ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Loading...</Text>
              ) : pastSubmissions.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  No submissions yet. Submit a Spark idea to get started!
                </Text>
              ) : (
                pastSubmissions.map((submission) => (
                  <TouchableOpacity
                    key={submission.id}
                    style={[
                      styles.submissionCard,
                      { backgroundColor: colors.surface, borderColor: colors.border }
                    ]}
                  >
                    <View style={styles.submissionHeader}>
                      <Text style={[styles.submissionTitle, { color: colors.text }]}>
                        {submission.sparkName}
                      </Text>
                      <View
                        style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}
                      >
                        <Text style={styles.statusBadgeText}>{submission.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.submissionDescription, { color: colors.textSecondary }]}>
                      {submission.description.substring(0, 100)}...
                    </Text>
                    <View style={styles.submissionMeta}>
                      <Text style={[styles.submissionDate, { color: colors.textSecondary }]}>
                        {formatDate(submission.timestamp)}
                      </Text>
                      <Text style={[styles.submissionEmail, { color: colors.textSecondary }]}>
                        {submission.email}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </SettingsSection>

          <SettingsSection title="About">
            <View style={{ padding: 16, backgroundColor: 'transparent' }}>
              <SettingsText variant="body">
                Spark Spark allows you to submit ideas for new Sparks to be built. Define your vision,
                target customers, and potential pricing. Your ideas will be reviewed and may be implemented
                by our engineering team.
              </SettingsText>
            </View>
          </SettingsSection>

          <View style={styles.settingsButtonContainer}>
            <TouchableOpacity
              style={[styles.settingsCloseButton, { borderColor: colors.border }]}
              onPress={onCloseSettings}
            >
              <Text style={[styles.settingsCloseButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </SettingsScrollView>
      </SettingsContainer>
    );
  };

  if (showSettings) {
    return renderSettings();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {currentPage === 0 && renderIntro()}
      {currentPage >= 1 && currentPage <= totalSteps - 1 && renderFormPage()}
      {currentPage === totalSteps && renderReview()}
      {currentPage === 8 && renderSuccess()}
      {renderNavigation()}
    </View>
  );
}

// ... existing styles plus new ones ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  introScrollView: {
    flex: 1,
  },
  introScrollContent: {
    paddingTop: 20,
  },
  introBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.1,
  },
  journeyEmoji: {
    fontSize: 200,
  },
  introCard: {
    marginTop: 20,
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  introIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  introDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundEmoji: {
    fontSize: 150,
    opacity: 0.1,
  },
  journeyMap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  mapPoint: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 24,
  },
  mapLine: {
    width: 30,
    height: 2,
    alignSelf: 'center',
    marginTop: 0,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  themeIcon: {
    fontSize: 50,
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 12,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 30,
  },
  formSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  formMessage: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  reviewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.05,
  },
  animatedReviewIcon: {
    fontSize: 200,
    textAlign: 'center',
  },
  reviewScrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  reviewCard: {
    padding: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 60,
  },
  reviewIcon: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    opacity: 0.2,
  },
  successEmoji: {
    fontSize: 100,
    margin: 20,
  },
  successCard: {
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 80,
  },
  successIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  transitionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionContent: {
    alignItems: 'center',
  },
  transitionIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  transitionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  submissionCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  submissionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  submissionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submissionDate: {
    fontSize: 12,
  },
  submissionEmail: {
    fontSize: 12,
  },
  settingsButtonContainer: {
    padding: 20,
  },
  settingsCloseButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  settingsCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
