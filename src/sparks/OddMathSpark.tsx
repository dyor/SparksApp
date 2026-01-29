import React, { useState, useEffect, useRef } from 'react';
import {
    Share,
    Animated,
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { GeminiService } from '../services/GeminiService';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { BaseSpark } from '../components/BaseSpark';
import { CelebrationOverlay, CelebrationOverlayRef } from '../components/CelebrationOverlay';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SettingsFeedbackSection,
    SaveCancelButtons,
} from '../components/SettingsComponents';
import styled from 'styled-components/native';

const { width } = Dimensions.get('window');

// --- Types ---

type Difficulty = 'easy' | 'medium' | 'hard' | 'weird';
type Category = 'arithmetic' | 'logic' | 'patterns' | 'funny' | 'estimation' | 'tricks' | 'mixed' | 'algebra' | 'number-theory' | 'ai';
type AgeGroup = 'kid' | 'teen' | 'adult' | 'einstein';

interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // Index of options
    explanation: string;
    isWeird?: boolean;
}

interface OddMathData {
    highScores: Record<string, number>; // key: "category-difficulty"
    totalAnswered: number;
    lastCategory: Category | 'favorites';
    lastDifficulty: Difficulty;
    lastAgeGroup: AgeGroup;
    favorites: Question[];
}

interface OddMathSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
}

// --- Constants & Data ---

const VERSION = "2.0.0";

const CATEGORIES: { id: Category; name: string; icon: string }[] = [
    { id: 'arithmetic', name: 'Arithmetic', icon: '➕' },
    { id: 'algebra', name: 'Algebra', icon: '𝓍' },
    { id: 'number-theory', name: 'Numbers', icon: '🔢' },
    { id: 'logic', name: 'Logic', icon: '🧠' },
    { id: 'patterns', name: 'Patterns', icon: '🧩' },
    { id: 'funny', name: 'Funny Words', icon: '🤡' },
    { id: 'estimation', name: 'Estimation', icon: '📏' },
    { id: 'tricks', name: 'Trick Questions', icon: '🪄' },
    { id: 'mixed', name: 'Mixed Mode', icon: '🌪️' },
    { id: 'ai', name: 'AI Infinity', icon: '🧠✨' },
];

const AGE_GROUPS: { id: AgeGroup; name: string; description: string; emoji: string }[] = [
    { id: 'kid', name: 'Kid', description: 'Fun and building confidence', emoji: '🧒' },
    { id: 'teen', name: 'Teen', description: 'School-level challenges', emoji: '🧑' },
    { id: 'adult', name: 'Adult', description: 'Brain-bending puzzles', emoji: '🧑‍💼' },
    { id: 'einstein', name: 'Einstein', description: 'Pure mathematical torture', emoji: '🧠⚡' },
];

const SPECIAL_CATEGORIES = [
    { id: 'favorites', name: 'Favorites', icon: '⭐' },
];

const DIFFICULTIES: { id: Difficulty; name: string; color: string }[] = [
    { id: 'easy', name: 'Easy', color: '#4CAF50' },
    { id: 'medium', name: 'Medium', color: '#FF9800' },
    { id: 'hard', name: 'Hard', color: '#F44336' },
    { id: 'weird', name: 'Weird Mode', color: '#9C27B0' },
];

const STATIC_QUESTIONS: Record<Category, Record<Difficulty, Question[]>> = {
    arithmetic: {
        easy: [
            { id: 'a-e-1', text: 'If you have 3 apples and you take away 2, how many apples do you have?', options: ['1', '2', '3', '0'], correctAnswer: 1, explanation: 'You just took them! You have 2.' },
        ],
        medium: [],
        hard: [],
        weird: [
            { id: 'a-w-1', text: 'If 1+1 = 3, and 2+2 = 6, what is 3+3?', options: ['6', '9', '12', 'Banana'], correctAnswer: 1, explanation: 'In this weird math, each number is multiplied by 1.5 before adding? No, it looks like x + x = 3x. So 3+3=9.' },
        ],
    },
    logic: {
        easy: [
            { id: 'l-e-1', text: 'A man is looking at a photograph. His friend asks who it is. He replies: "Brothers and sisters I have none, but that man\'s father is my father\'s son." Who is in the photo?', options: ['Himself', 'His son', 'His father', 'His uncle'], correctAnswer: 1, explanation: '"My father\'s son" is himself. So "that man\'s father is me". He is the father of the man in the photo.' },
        ],
        medium: [
            { id: 'l-m-1', text: 'If a doctor gives you 3 pills and tells you to take one every half hour, how long will they last?', options: ['1.5 hours', '1 hour', '0.5 hours', '2 hours'], correctAnswer: 1, explanation: 'Take the first at 0:00, second at 0:30, third at 1:00. Total time: 1 hour.' },
        ],
        hard: [
            { id: 'l-h-1', text: 'What is next in the sequence: O, T, T, F, F, S, S, E, ...?', options: ['T', 'N', 'E', 'S'], correctAnswer: 1, explanation: 'One, Two, Three, Four, Five, Six, Seven, Eight... Nine!' },
        ],
        weird: [],
    },
    patterns: {
        easy: [
            { id: 'p-e-1', text: 'What comes next: 1, 11, 21, 1211, 111221, ...?', options: ['312211', '132112', '111321', '3211'], correctAnswer: 0, explanation: 'This is the "Look and Say" sequence. One 1, Two 1s, One 2 One 1, etc.' },
        ],
        medium: [],
        hard: [],
        weird: [],
    },
    funny: {
        easy: [
            { id: 'f-e-1', text: 'If a plane crashes on the border between the US and Canada, where do they bury the survivors?', options: ['US', 'Canada', 'Nowhere', 'In the middle'], correctAnswer: 2, explanation: 'You don\'t bury survivors!' },
        ],
        medium: [
            { id: 'f-m-1', text: 'What occurs once in a minute, twice in a moment, but never in a thousand years?', options: ['The letter M', 'A mistake', 'A second', 'A blink'], correctAnswer: 0, explanation: 'Look at the letters in "minute", "moment", and "thousand years".' },
        ],
        hard: [
            { id: 'f-h-1', text: 'A clerk in a butcher shop is 5 feet 10 inches tall. What does he weigh?', options: ['180 lbs', '210 lbs', 'Meat', 'Heavily'], correctAnswer: 2, explanation: 'He weighs meat for a living!' },
        ],
        weird: [],
    },
    estimation: {
        easy: [
            { id: 'e-e-1', text: 'How many golf balls would it take to fill a school bus? (Approximately)', options: ['50,000', '500,000', '5,000,000', '12'], correctAnswer: 1, explanation: 'Roughly 500,000. It\'s a classic Fermi problem.' },
        ],
        medium: [],
        hard: [],
        weird: [],
    },
    tricks: {
        easy: [
            { id: 't-e-1', text: 'How many months have 28 days?', options: ['1', '12', '6', 'Depends on the year'], correctAnswer: 1, explanation: 'All of them!' },
        ],
        medium: [
            { id: 't-m-1', text: 'If you have a match and enter a room with a lamp, a heater, and a candle, which do you light first?', options: ['Lamp', 'Heater', 'Candle', 'The Match'], correctAnswer: 3, explanation: 'Gotta light the match first!' },
        ],
        hard: [
            { id: 't-h-1', text: 'How can a man go eight days without sleep?', options: ['Coffee', 'Medication', 'He sleeps at night', 'Willpower'], correctAnswer: 2, explanation: 'He just sleeps at night!' },
            { id: 't-h-2', text: 'A snail is at the bottom of a 30-foot well. Each day he climbs up 3 feet, but at night he slips back 2 feet. How many days will it take him to reach the top?', options: ['30', '28', '29', '27'], correctAnswer: 1, explanation: 'On the 28th day, he starts at 27 feet and climbs 3 feet, reaching the top (30 feet) before he can slip back.' },
        ],
        weird: [],
    },
    algebra: {
        easy: [
            { id: 'alg-e-1', text: 'If 2x + 5 = 13, what is x?', options: ['3', '4', '8', '2'], correctAnswer: 1, explanation: '2x = 13 - 5 = 8. So x = 4.' },
        ],
        medium: [
            { id: 'alg-m-1', text: 'Solve for x: x/4 + 7 = 12', options: ['20', '4', '1.25', '16'], correctAnswer: 0, explanation: 'x/4 = 5. x = 20.' },
            { id: 'alg-m-2', text: 'If 3(x - 2) = 15, what is x?', options: ['7', '3', '5', '9'], correctAnswer: 0, explanation: 'x - 2 = 5, so x = 7.' },
        ],
        hard: [
            { id: 'alg-h-1', text: 'What is the sum of the roots of x² - 7x + 10 = 0?', options: ['7', '10', '-7', '2'], correctAnswer: 0, explanation: 'By Vieta\'s formulas, the sum of roots is -b/a = -(-7)/1 = 7.' },
            { id: 'alg-h-2', text: 'If 2^x + 2^(x+1) = 48, what is x?', options: ['3', '4', '5', '2'], correctAnswer: 1, explanation: '2^x + 2*2^x = 3*2^x = 48. 2^x = 16. x = 4.' },
        ],
        weird: [
            { id: 'alg-w-1', text: 'If x ⚡ y = x² - y², what is (5 ⚡ 3) ⚡ 4?', options: ['240', '256', '272', '12'], correctAnswer: 0, explanation: '5 ⚡ 3 = 25 - 9 = 16. 16 ⚡ 4 = 16² - 4² = 256 - 16 = 240.' },
        ],
    },
    'number-theory': {
        easy: [
            { id: 'nt-e-1', text: 'Which of these is a prime number?', options: ['9', '15', '2', '21'], correctAnswer: 2, explanation: '2 is the only even prime number.' },
        ],
        medium: [
            { id: 'nt-m-1', text: 'What is 17 mod 5?', options: ['1', '2', '3', '4'], correctAnswer: 1, explanation: '17 divided by 5 is 3 with a remainder of 2.' },
            { id: 'nt-m-2', text: 'What is the binary representation of 13?', options: ['1101', '1011', '1110', '1001'], correctAnswer: 0, explanation: '13 = 8 + 4 + 1. So 1101.' },
        ],
        hard: [
            { id: 'nt-h-1', text: 'How many divisors does 36 have?', options: ['8', '9', '10', '7'], correctAnswer: 1, explanation: '36 = 2² * 3². Divisors: (2+1)*(2+1) = 9. (1, 2, 3, 4, 6, 9, 12, 18, 36).' },
            { id: 'nt-h-2', text: 'If n is a prime number, what is (n-1)! mod n?', options: ['0', '1', 'n-1', 'Depends'], correctAnswer: 2, explanation: 'This is Wilson\'s Theorem: (p-1)! ≡ -1 ≡ p-1 (mod p).' },
        ],
        weird: [
            { id: 'nt-w-1', text: 'In base 3, what is 12 + 21?', options: ['33', '110', '100', '210'], correctAnswer: 1, explanation: '12_3 (5) + 21_3 (7) = 12_10. 12 in base 3 is 110 (1*9 + 1*3 + 0*1).' },
        ],
    },
    mixed: {
        easy: [],
        medium: [],
        hard: [],
        weird: [],
    }
};

// --- Question Generator ---

const generateArithmetic = (difficulty: Difficulty, age: AgeGroup): Question => {
    let a, b, op, ans;
    const ops = ['+', '-', '*'];
    op = ops[Math.floor(Math.random() * ops.length)];

    // Scale ranges based on age
    let range = 10;
    if (age === 'teen') range = 50;
    if (age === 'adult') range = 100;
    if (age === 'einstein') range = 500;

    switch (difficulty) {
        case 'easy':
            a = Math.floor(Math.random() * range / 2) + 1;
            b = Math.floor(Math.random() * range / 2) + 1;
            break;
        case 'medium':
            a = Math.floor(Math.random() * range) + range / 4;
            b = Math.floor(Math.random() * range) + range / 4;
            break;
        case 'hard':
            a = Math.floor(Math.random() * range * 2) + range / 2;
            b = Math.floor(Math.random() * range * 2) + range / 2;
            if (age === 'einstein') {
                op = Math.random() < 0.5 ? '*' : '/';
                if (op === '/') {
                    b = Math.floor(Math.random() * 20) + 2;
                    a = b * (Math.floor(Math.random() * 50) + 1);
                } else {
                    a = Math.floor(Math.random() * 90) + 10;
                    b = Math.floor(Math.random() * 90) + 10;
                }
            }
            break;
        case 'weird':
            a = Math.floor(Math.random() * 9) + 1;
            b = Math.floor(Math.random() * 9) + 1;
            // Weird logic: result is concat of sum and diff
            return {
                id: `gen-a-w-${Date.now()}`,
                text: `If 5 + 3 = 82, and 9 + 4 = 135, what is ${a} + ${b}?`,
                options: [
                    `${(a + b).toString() + (a - b).toString()}`,
                    `${(a - b).toString() + (a + b).toString()}`,
                    `${a + b}`,
                    'Pizza'
                ],
                correctAnswer: 0,
                explanation: 'The pattern is Sum followed by Difference (e.g., 5+3=8, 5-3=2 -> 82).'
            };
    }

    if (op === '+') ans = a + b;
    else if (op === '-') ans = a - b;
    else if (op === '*') ans = a * b;
    else ans = a / b;

    const options = [ans];
    while (options.length < 4) {
        const delta = Math.floor(Math.random() * 20) - 10;
        const wrong = ans + delta;
        if (wrong !== ans && !options.includes(wrong) && (op !== '/' || wrong >= 0)) {
            options.push(wrong);
        }
    }
    const shuffled = options.sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.indexOf(ans);

    return {
        id: `gen-a-${difficulty}-${Date.now()}`,
        text: `What is ${a} ${op} ${b}?`,
        options: shuffled.map(String),
        correctAnswer: correctIdx,
        explanation: `Simply ${a} ${op} ${b} = ${ans}.`
    };
};

const generateAlgebra = (difficulty: Difficulty, age: AgeGroup): Question => {
    // Basic x + a = b
    const a = Math.floor(Math.random() * 20) + 1;
    const x = Math.floor(Math.random() * 10) + 1;
    const b = a + x;

    if (difficulty === 'easy' || age === 'kid') {
        return {
            id: `gen-alg-e-${Date.now()}`,
            text: `If x + ${a} = ${b}, what is x?`,
            options: [x.toString(), (x + 2).toString(), (x - 1).toString(), (b).toString()],
            correctAnswer: 0,
            explanation: `x = ${b} - ${a} = ${x}.`
        };
    }

    // Quadratic: x² + (p+q)x + pq = 0
    if (age === 'einstein' && difficulty === 'hard') {
        const p = Math.floor(Math.random() * 10) + 1;
        const q = Math.floor(Math.random() * 10) + 1;
        const b_coeff = p + q;
        const c_coeff = p * q;
        return {
            id: `gen-alg-q-${Date.now()}`,
            text: `Solve for positive roots: x² - ${b_coeff}x + ${c_coeff} = 0. What is one of the roots?`,
            options: [p.toString(), (p + 3).toString(), (c_coeff - b_coeff).toString(), '0'],
            correctAnswer: 0,
            explanation: `The equation factors to (x - ${p})(x - ${q}) = 0. Roots are ${p} and ${q}.`
        };
    }

    // mx + c = d
    const m = Math.floor(Math.random() * 5) + 2;
    const c = Math.floor(Math.random() * 15) + 1;
    const x2 = Math.floor(Math.random() * 10) + 2;
    const d = m * x2 + c;

    return {
        id: `gen-alg-m-${Date.now()}`,
        text: `Solve for x: ${m}x + ${c} = ${d}`,
        options: [x2.toString(), (x2 + 3).toString(), (d - c).toString(), 'x'],
        correctAnswer: 0,
        explanation: `${m}x = ${d} - ${c} = ${m * x2}. So x = ${x2}.`
    };
};

// --- Styled Components ---

const Container = styled.View`
  flex: 1;
  background-color: ${props => props.theme.background};
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const Header = styled.View`
  padding: 24px;
  align-items: center;
`;

const Title = styled.Text`
  font-size: 32px;
  font-weight: 800;
  color: ${props => props.theme.text};
  text-align: center;
`;

const Subtitle = styled.Text`
  font-size: 16px;
  color: ${props => props.theme.textSecondary};
  margin-top: 8px;
  text-align: center;
`;

const Card = styled.TouchableOpacity`
  background-color: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
  border-width: 1px;
  border-color: ${props => props.theme.border};
  flex-direction: row;
  align-items: center;
  margin-horizontal: 16px;
`;

const CardIcon = styled.Text`
  font-size: 24px;
  margin-right: 16px;
`;

const CardText = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.text};
  flex: 1;
`;

const Badge = styled.View<{ bgColor: string }>`
  background-color: ${props => props.bgColor};
  padding: 4px 12px;
  border-radius: 12px;
`;

const BadgeText = styled.Text`
  color: #fff;
  font-size: 12px;
  font-weight: bold;
`;

const QuizContainer = styled.View`
    flex: 1;
    padding: 20px;
`;

const QuestionText = styled.Text`
    font-size: 24px;
    font-weight: bold;
    color: ${props => props.theme.text};
    margin-bottom: 24px;
    text-align: center;
`;

const OptionButton = styled.TouchableOpacity<{ isSelected?: boolean; isCorrect?: boolean; isWrong?: boolean }>`
    background-color: ${props => {
        if (props.isCorrect) return '#4CAF50';
        if (props.isWrong) return '#F44336';
        if (props.isSelected) return props.theme.primary;
        return props.theme.surface;
    }};
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 12px;
    border-width: 2px;
    border-color: ${props => props.isSelected ? props.theme.primary : props.theme.border};
`;

const OptionText = styled.Text<{ isSelected?: boolean; isAnswered?: boolean }>`
    font-size: 18px;
    color: ${props => (props.isSelected || props.isAnswered) ? '#fff' : props.theme.text};
    text-align: center;
    font-weight: 500;
`;

const FeedbackText = styled.Text<{ isCorrect: boolean }>`
    font-size: 18px;
    font-weight: 600;
    color: ${props => props.isCorrect ? '#4CAF50' : '#F44336'};
    margin-vertical: 16px;
    text-align: center;
`;

const ExplanationText = styled.Text`
    font-size: 16px;
    color: ${props => props.theme.textSecondary};
    text-align: center;
    margin-bottom: 24px;
`;

const NextButton = styled.TouchableOpacity`
    background-color: ${props => props.theme.primary};
    padding: 16px;
    border-radius: 12px;
    align-items: center;
`;

const NextButtonText = styled.Text`
    color: #fff;
    font-size: 18px;
    font-weight: bold;
`;

const StatsRow = styled.View`
    flex-direction: row;
    justify-content: space-around;
    padding: 16px;
    background-color: ${props => props.theme.surface};
    border-radius: 12px;
    margin-bottom: 20px;
`;

const StatItem = styled.View`
    align-items: center;
`;

const StatValue = styled.Text`
    font-size: 20px;
    font-weight: bold;
    color: ${props => props.theme.text};
`;

const StatLabel = styled.Text`
    font-size: 12px;
    color: ${props => props.theme.textSecondary};
`;

// --- Main Component ---

export const OddMathSpark: React.FC<OddMathSparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData, isHydrated } = useSparkStore();
    const celebrationRef = useRef<CelebrationOverlayRef>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const [gameState, setGameState] = useState<'menu' | 'age' | 'difficulty' | 'playing' | 'summary'>('menu');
    const [selectedCategory, setSelectedCategory] = useState<Category | 'favorites'>('mixed');
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
    const [selectedAge, setSelectedAge] = useState<AgeGroup>('adult');
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [score, setScore] = useState(0);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
    const [aiCache, setAiCache] = useState<Question[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (isAiLoading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isAiLoading]);

    const [persistData, setPersistData] = useState<OddMathData>({
        highScores: {},
        totalAnswered: 0,
        lastCategory: 'mixed',
        lastDifficulty: 'medium',
        lastAgeGroup: 'adult',
        favorites: [],
    });

    // Hydrate data
    useEffect(() => {
        if (isHydrated) {
            const data = getSparkData('odd-math') as OddMathData | null;
            if (data) {
                setPersistData(data);
                setSelectedCategory(data.lastCategory || 'mixed');
                setSelectedDifficulty(data.lastDifficulty || 'medium');
                setSelectedAge(data.lastAgeGroup || 'adult');
            }
        }
    }, [isHydrated]);

    const saveStats = (newScore: number) => {
        const key = `${selectedCategory}-${selectedDifficulty}`;
        const newHighScores = { ...persistData.highScores };
        if (!newHighScores[key] || newScore > newHighScores[key]) {
            newHighScores[key] = newScore;
        }

        const newData: OddMathData = {
            ...persistData,
            highScores: newHighScores,
            totalAnswered: persistData.totalAnswered + questionsAnswered,
            lastCategory: selectedCategory,
            lastDifficulty: selectedDifficulty,
            lastAgeGroup: selectedAge,
            favorites: persistData.favorites || [],
        };
        setPersistData(newData);
        setSparkData('odd-math', newData);
    };

    const toggleFavorite = (question: Question) => {
        HapticFeedback.light();
        let newFavorites = [...(persistData.favorites || [])];
        const index = newFavorites.findIndex(q => q.id === question.id);

        if (index >= 0) {
            newFavorites.splice(index, 1);
        } else {
            newFavorites.push(question);
        }

        const newData = { ...persistData, favorites: newFavorites };
        setPersistData(newData);
        setSparkData('odd-math', newData);
    };

    const handleShare = async (question: Question) => {
        HapticFeedback.light();
        const message = `OddMath Question: ${question.text}\n\nOptions:\n${question.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nAnswer: ${question.options[question.correctAnswer]}\n\nExplanation: ${question.explanation}`;

        try {
            await Share.share({
                message: message,
                title: 'OddMath Question'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const fetchAIQuestions = async (count: number = 3) => {
        setIsAiLoading(true);
        try {
            const prompt = `You are a quirky, witty, and clever math game show host for "OddMath".
Generate ${count} unique, odd, and engaging math or logic questions for the following settings:
Category: ${selectedCategory === 'ai' ? 'Any' : selectedCategory}
Difficulty: ${selectedDifficulty}
Age Group: ${selectedAge}

Output MUST be a JSON array of objects with the following structure:
{
  "id": "string (unique)",
  "text": "string (the question)",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": number (index 0-3),
  "explanation": "string (fun and snappy explanation)"
}

Ensure the questions are "odd" - meaning they might be tricky word problems, lateral thinking, or surprising math facts.
Keep it appropriate for the selected Age Group.
Difficulty should strictly match: ${selectedDifficulty}.`;

            const result = await GeminiService.generateJSON<Question[]>(prompt);
            if (result && Array.isArray(result)) {
                setAiCache(prev => [...prev, ...result]);
                return result;
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            // Fallback will be handled in getNextQuestion
        } finally {
            setIsAiLoading(false);
        }
        return [];
    };

    const getNextQuestion = async () => {
        if (selectedCategory === 'favorites') {
            if (sessionQuestions.length === 0) {
                const favs = [...(persistData.favorites || [])].sort(() => Math.random() - 0.5);
                setSessionQuestions(favs);
                if (favs.length > 0) {
                    setCurrentQuestion(favs[0]);
                } else {
                    setCurrentQuestion(null);
                    setGameState('menu');
                }
            } else {
                const nextIdx = questionsAnswered;
                if (nextIdx < sessionQuestions.length) {
                    setCurrentQuestion(sessionQuestions[nextIdx]);
                } else {
                    saveStats(score);
                    setGameState('summary');
                }
            }
        } else if (selectedCategory === 'ai') {
            if (aiCache.length === 0) {
                setIsAiLoading(true);
                const results = await fetchAIQuestions(3);
                if (results && results.length > 0) {
                    setCurrentQuestion(results[0]);
                    setAiCache(results.slice(1));
                } else {
                    // Critical Fallback
                    setCurrentQuestion(generateArithmetic('easy', selectedAge));
                }
                setIsAiLoading(false);
            } else {
                setCurrentQuestion(aiCache[0]);
                setAiCache(prev => prev.slice(1));
                // Background fetch if cache is low
                if (aiCache.length < 2) {
                    fetchAIQuestions(2);
                }
            }
        } else {
            let category = selectedCategory as Category;
            if (category === 'mixed') {
                const cats: Category[] = (CATEGORIES.map(c => c.id) as Category[]).filter(c => c !== 'mixed' && c !== 'favorites' && c !== 'ai');
                category = cats[Math.floor(Math.random() * cats.length)];
            }

            const statics = STATIC_QUESTIONS[category as Category][selectedDifficulty];

            // Randomly choose between static and generated if applicable
            if (category === 'arithmetic' && (Math.random() < 0.8)) {
                setCurrentQuestion(generateArithmetic(selectedDifficulty, selectedAge));
            } else if (category === 'algebra' && (Math.random() < 0.6)) {
                setCurrentQuestion(generateAlgebra(selectedDifficulty, selectedAge));
            } else if (statics && statics.length > 0) {
                const q = statics[Math.floor(Math.random() * statics.length)];
                setCurrentQuestion({ ...q, id: q.id + '-' + Date.now() });
            } else {
                // Fallback to generated arithmetic if no static questions or specific generator
                setCurrentQuestion(generateArithmetic('easy', selectedAge));
            }
        }

        setIsAnswered(false);
        setSelectedOption(null);
    };

    const handleStart = (category: Category | 'favorites') => {
        HapticFeedback.light();
        setSelectedCategory(category);
        if (category === 'favorites') {
            if (!persistData.favorites || persistData.favorites.length === 0) {
                alert('No favorites yet! Star some questions during gameplay.');
                return;
            }
            setScore(0);
            setQuestionsAnswered(0);
            setStreak(0);
            setSessionQuestions([]); // Will be populated in getNextQuestion
            setGameState('playing');
        } else {
            setGameState('age');
        }
    };

    const handleAgeSelect = (age: AgeGroup) => {
        HapticFeedback.light();
        setSelectedAge(age);
        setGameState('difficulty');
    };

    const handleDifficultySelect = (diff: Difficulty) => {
        HapticFeedback.light();
        setSelectedDifficulty(diff);
        setScore(0);
        setQuestionsAnswered(0);
        setStreak(0);
        setGameState('playing');
        // We need to call getNextQuestion which depends on things just set... 
        // safer to use useEffect or a wrapping function.
    };

    useEffect(() => {
        if (gameState === 'playing' && questionsAnswered === 0) {
            getNextQuestion();
        }
    }, [gameState]);

    const handleAnswer = (index: number) => {
        if (isAnswered) return;

        setSelectedOption(index);
        setIsAnswered(true);
        setQuestionsAnswered(prev => prev + 1);

        if (index === currentQuestion?.correctAnswer) {
            setScore(prev => prev + 1);
            setStreak(prev => prev + 1);
            HapticFeedback.success();
            celebrationRef.current?.triggerConfetti();
        } else {
            setStreak(0);
            HapticFeedback.error();
            if (selectedDifficulty === 'weird' || Math.random() < 0.3) {
                celebrationRef.current?.triggerPoop();
            }
        }
    };

    const handleNext = () => {
        HapticFeedback.light();
        if (questionsAnswered >= 10) {
            saveStats(score);
            setGameState('summary');
        } else {
            getNextQuestion();
        }
    };

    const renderMenu = () => (
        <Content>
            <Header>
                <Title>OddMath</Title>
                <Subtitle>Fun, weird, and clever math questions!</Subtitle>
            </Header>
            {CATEGORIES.map(cat => (
                <Card key={cat.id} onPress={() => handleStart(cat.id)}>
                    <CardIcon>{cat.icon}</CardIcon>
                    <CardText>{cat.name}</CardText>
                    <Text style={{ color: colors.textSecondary }}>→</Text>
                </Card>
            ))}

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20, marginHorizontal: 24 }} />

            {SPECIAL_CATEGORIES.map(cat => (
                <Card key={cat.id} onPress={() => handleStart(cat.id as any)}>
                    <CardIcon>{cat.icon}</CardIcon>
                    <CardText>{cat.name}</CardText>
                    <Badge bgColor={colors.primary}>
                        <BadgeText>{persistData.favorites?.length || 0}</BadgeText>
                    </Badge>
                </Card>
            ))}
        </Content>
    );

    const renderAgeSelection = () => (
        <Content contentContainerStyle={{ justifyContent: 'center', flex: 1 }}>
            <Header>
                <Title>Who's Playing?</Title>
                <Subtitle>Choose your challenge level</Subtitle>
            </Header>
            {AGE_GROUPS.map(age => (
                <Card key={age.id} onPress={() => handleAgeSelect(age.id)}>
                    <CardIcon>{age.emoji}</CardIcon>
                    <CardText>{age.name}</CardText>
                    <Text style={{ color: colors.textSecondary }}>{age.description}</Text>
                </Card>
            ))}
            <TouchableOpacity
                style={{ marginTop: 20, alignSelf: 'center' }}
                onPress={() => setGameState('menu')}
            >
                <Subtitle>← Back to Categories</Subtitle>
            </TouchableOpacity>
        </Content>
    );

    const renderDifficulty = () => (
        <Content contentContainerStyle={{ justifyContent: 'center', flex: 1 }}>
            <Header>
                <Title>Pick Difficulty</Title>
                <Subtitle>How weird should it get?</Subtitle>
            </Header>
            {DIFFICULTIES.map(diff => (
                <Card key={diff.id} onPress={() => handleDifficultySelect(diff.id)}>
                    <CardText style={{ textAlign: 'center' }}>{diff.name}</CardText>
                    <Badge bgColor={diff.color}>
                        <BadgeText>{diff.id.toUpperCase()}</BadgeText>
                    </Badge>
                </Card>
            ))}
            <TouchableOpacity
                style={{ marginTop: 20, alignSelf: 'center' }}
                onPress={() => setGameState('age')}
            >
                <Subtitle>← Back to Age Selection</Subtitle>
            </TouchableOpacity>
        </Content>
    );

    const renderQuiz = () => {
        if (isAiLoading && !currentQuestion) {
            return (
                <QuizContainer style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.Text style={{ fontSize: 64, transform: [{ scale: pulseAnim }] }}>🧠</Animated.Text>
                    <Title style={{ marginTop: 20 }}>Gemini is thinking...</Title>
                    <Subtitle>Generating a clever question for you</Subtitle>
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                </QuizContainer>
            );
        }

        if (!currentQuestion) return null;

        return (
            <QuizContainer>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity onPress={() => setGameState('menu')} style={{ padding: 8 }}>
                        <Subtitle style={{ marginTop: 0 }}>🏠 Menu</Subtitle>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (questionsAnswered > 0) {
                                    // Logic for 'back' if applicable, but usually refers to menu or next
                                    setGameState('difficulty');
                                }
                            }}
                            style={{ padding: 8 }}
                        >
                            <Subtitle style={{ marginTop: 0 }}>← Back</Subtitle>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNext} style={{ padding: 8 }}>
                            <Subtitle style={{ marginTop: 0 }}>Next →</Subtitle>
                        </TouchableOpacity>
                    </View>
                </View>

                <StatsRow>
                    <StatItem>
                        <StatValue>{score}/{questionsAnswered}</StatValue>
                        <StatLabel>SCORE</StatLabel>
                    </StatItem>
                    <StatItem>
                        <StatValue>{streak}</StatValue>
                        <StatLabel>STREAK</StatLabel>
                    </StatItem>
                    <StatItem>
                        <StatValue>{10 - questionsAnswered}</StatValue>
                        <StatLabel>REMAINING</StatLabel>
                    </StatItem>
                </StatsRow>

                <QuestionText>{currentQuestion.text}</QuestionText>

                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => toggleFavorite(currentQuestion)} style={{ padding: 10 }}>
                        <Text style={{ fontSize: 24 }}>{persistData.favorites?.some(q => q.id === currentQuestion.id) ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleShare(currentQuestion)} style={{ padding: 10, marginLeft: 20 }}>
                        <Text style={{ fontSize: 24 }}>📤</Text>
                    </TouchableOpacity>
                </View>

                {currentQuestion.options.map((option, idx) => {
                    const isCorrect = isAnswered && idx === currentQuestion.correctAnswer;
                    const isWrong = isAnswered && selectedOption === idx && idx !== currentQuestion.correctAnswer;
                    const isSelected = selectedOption === idx;

                    return (
                        <OptionButton
                            key={idx}
                            onPress={() => handleAnswer(idx)}
                            isSelected={isSelected}
                            isCorrect={isCorrect}
                            isWrong={isWrong}
                            disabled={isAnswered}
                        >
                            <OptionText isSelected={isSelected} isAnswered={isAnswered}>{option}</OptionText>
                        </OptionButton>
                    );
                })}

                {isAnswered && (
                    <Animated.View style={{ marginTop: 20 }}>
                        <FeedbackText isCorrect={selectedOption === currentQuestion.correctAnswer}>
                            {selectedOption === currentQuestion.correctAnswer ? '✨ Correct! ✨' : '🛑 Whoops! 🛑'}
                        </FeedbackText>
                        <ExplanationText>{currentQuestion.explanation}</ExplanationText>
                        <NextButton onPress={handleNext}>
                            <NextButtonText>{questionsAnswered >= 10 ? 'View Summary' : 'Next Question'}</NextButtonText>
                        </NextButton>
                    </Animated.View>
                )}
            </QuizContainer>
        );
    };

    const renderSummary = () => (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
            <Header>
                <Title>Session Over!</Title>
                <CardIcon style={{ fontSize: 64, marginTop: 20 }}>🏆</CardIcon>
            </Header>

            <StatsRow>
                <StatItem>
                    <StatValue>{score}/10</StatValue>
                    <StatLabel>FINAL SCORE</StatLabel>
                </StatItem>
                <StatItem>
                    <StatValue>{Math.round((score / 10) * 100)}%</StatValue>
                    <StatLabel>ACCURACY</StatLabel>
                </StatItem>
            </StatsRow>

            <NextButton onPress={() => setGameState('menu')}>
                <NextButtonText>Back to Menu</NextButtonText>
            </NextButton>

            <TouchableOpacity
                style={{ marginTop: 20, alignSelf: 'center' }}
                onPress={() => handleDifficultySelect(selectedDifficulty)}
            >
                <Subtitle>Play Again ({selectedDifficulty})</Subtitle>
            </TouchableOpacity>
        </View>
    );

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="OddMath Settings"
                        subtitle="Configure your math experience"
                        icon="🔢"
                        sparkId="odd-math"
                    />
                    <SettingsSection title="Personal Best">
                        {Object.entries(persistData?.highScores || {}).length > 0 ? (
                            Object.entries(persistData?.highScores || {}).map(([key, value]) => (
                                <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: colors.text }}>{key.replace('-', ' ')}</Text>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{value}/10</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: colors.textSecondary }}>No high scores yet! Play some games.</Text>
                        )}
                    </SettingsSection>

                    <SettingsSection title="Total Stats">
                        <Text style={{ color: colors.text }}>Total Questions Answered: {persistData.totalAnswered}</Text>
                    </SettingsSection>

                    <SettingsSection title="Profile">
                        <Text style={{ color: colors.text }}>Current Age Level: {persistData.lastAgeGroup?.toUpperCase() || 'ADULT'}</Text>
                    </SettingsSection>

                    <SettingsSection title="App Info">
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Version: {VERSION}</Text>
                    </SettingsSection>

                    <SettingsFeedbackSection sparkName="OddMath" sparkId="odd-math" />
                    <SaveCancelButtons
                        onSave={() => onCloseSettings?.()}
                        onCancel={() => onCloseSettings?.()}
                    />
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    return (
        <BaseSpark>
            <Container theme={{ background: colors.background, text: colors.text, textSecondary: colors.textSecondary, border: colors.border, surface: colors.surface, primary: colors.primary }}>
                {gameState === 'menu' && renderMenu()}
                {gameState === 'age' && renderAgeSelection()}
                {gameState === 'difficulty' && renderDifficulty()}
                {gameState === 'playing' && renderQuiz()}
                {gameState === 'summary' && renderSummary()}
                <CelebrationOverlay ref={celebrationRef} />
            </Container>
        </BaseSpark>
    );
};

export default OddMathSpark;
