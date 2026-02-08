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
    TouchableWithoutFeedback
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticFeedback } from '../../utils/haptics';
import { SparkletService } from '../../services/SparkletService';

const { width } = Dimensions.get('window');

// --- Helper Components ---
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
                    <View style={{ backgroundColor: 'white', borderRadius: 12, width: width * 0.8, maxHeight: 400 }}>
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

// --- Wizard Data ---
const PAYMENT_OPTIONS = [
    'Exactly $0',
    'About $10',
    'Maybe $50',
    'Over $100'
];

const JOURNEY_THEMES = [
    { icon: '🧙‍♂️', title: 'Meet the Wizard' },
    { icon: '🐉', title: 'Glorious Sparklet' },
    { icon: '🥚', title: 'Dragon Egg' },
    { icon: '✨', title: 'Final Checkpoint' },
    { icon: '🎉', title: 'Success!' },
];

export interface SparkletWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

export const SparkletWizard: React.FC<SparkletWizardProps> = ({ onComplete, onCancel }) => {
    const { colors } = useTheme();
    const [currentPage, setCurrentPage] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const [formData, setFormData] = useState({
        title: '',
        purpose: '',
        similarity: 'New (Original Idea)',
        email: '',
    });

    const [existingSparklets, setExistingSparklets] = useState<string[]>(['New (Original Idea)']);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [reviewIconIndex, setReviewIconIndex] = useState(0);
    const reviewIconOpacity = useRef(new Animated.Value(1)).current;

    const totalSteps = 4;

    // Fetch existing sparklets for similarity selection
    useEffect(() => {
        const fetchSparklets = async () => {
            try {
                const sparklets = await SparkletService.getAllSparklets();
                const publishedTitles = sparklets
                    .filter(s => s.metadata.status === 'published' || s.metadata.isPublished)
                    .map(s => s.metadata.title);

                setExistingSparklets(['New (Original Idea)', ...Array.from(new Set(publishedTitles))]);
            } catch (error) {
                console.error('Error fetching sparklets for wizard:', error);
            }
        };
        fetchSparklets();
    }, []);

    // Animation loop for review page
    useEffect(() => {
        let interval: any;
        if (currentPage === totalSteps) {
            const icons = ['🧙‍♂️', '🥚', '🐉', '🏰', '💰', '💎', '🍺', '✨'];
            interval = setInterval(() => {
                Animated.sequence([
                    Animated.timing(reviewIconOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.timing(reviewIconOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]).start(() => {
                    setReviewIconIndex(prev => (prev + 1) % icons.length);
                });
            }, 2000);
        }
        return () => interval && clearInterval(interval);
    }, [currentPage]);

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const canProceedToNext = () => {
        switch (currentPage) {
            case 1: return formData.title.trim().length >= 3;
            case 2: return formData.purpose.trim().length >= 10;
            case 3: return formData.email.includes('@');
            default: return true;
        }
    };

    const handleNext = () => {
        if (currentPage < 5 && canProceedToNext()) {
            HapticFeedback.medium();
            setCurrentPage(currentPage + 1);
        }
    };

    const handleBack = () => {
        if (currentPage > 0 && !submitted) {
            HapticFeedback.medium();
            setCurrentPage(currentPage - 1);
        }
    };

    const handleSubmit = async () => {
        if (!canProceedToNext() || submitting) return;
        setSubmitting(true);
        HapticFeedback.success();

        try {
            await SparkletService.submitSparkletSubmission({
                ...formData,
                type: 'dynamic_request',
            });
            setSubmitted(true);
            setCurrentPage(5);
        } catch (error) {
            console.error('Error submitting Sparklet:', error);
            Alert.alert('Summoning Failed', 'The magic fizzled out. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderProgressBar = () => {
        const progress = currentPage / totalSteps;
        return (
            <View style={[styles.progressBarContainer, { borderColor: colors.border }]}>
                <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: colors.primary }]} />
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {renderProgressBar()}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    {currentPage === 0 && (
                        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.pageContent}>
                                <Text style={styles.introEmoji}>🧙‍♂️</Text>
                                <Text style={[styles.title, { color: colors.text }]}>Greetings, Builder!</Text>
                                <Text style={[styles.description, { color: colors.textSecondary }]}>
                                    Summon a dynamic Sparklet. Describe your vision, and I will brew the code.
                                </Text>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => setCurrentPage(1)}>
                                    <Text style={styles.buttonText}>Enter the Forge 🔥</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onCancel} style={styles.laterButton}>
                                    <Text style={{ color: colors.textSecondary }}>Maybe Later</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                    {currentPage >= 1 && currentPage <= 3 && (
                        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.pageContent}>
                                <Text style={styles.formIcon}>{JOURNEY_THEMES[currentPage].icon}</Text>
                                <Text style={[styles.title, { color: colors.text }]}>
                                    {currentPage === 1 && 'What is its name?'}
                                    {currentPage === 2 && 'What is its purpose?'}
                                    {currentPage === 3 && 'Where is your email address?'}
                                </Text>

                                {currentPage === 2 && (
                                    <View style={{ width: '100%', marginBottom: 15 }}>
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13 }}>Similar to an existing Sparklet? (Optional)</Text>
                                        <Dropdown
                                            options={existingSparklets}
                                            selectedValue={formData.similarity}
                                            onSelect={(val) => updateFormData('similarity', val)}
                                            placeholder="Select existing..."
                                            style={[styles.input, { borderColor: colors.border, marginBottom: 15 }]}
                                            textStyle={{ color: colors.text }}
                                        />
                                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13 }}>New functionality/vision:</Text>
                                        <TextInput
                                            style={[styles.input, { borderColor: colors.border, color: colors.text, height: 100, textAlignVertical: 'top' }]}
                                            value={formData.purpose}
                                            onChangeText={(t) => updateFormData('purpose', t)}
                                            placeholder="Describe what it does..."
                                            placeholderTextColor={colors.textSecondary}
                                            multiline
                                            autoFocus
                                        />
                                    </View>
                                )}

                                {(currentPage === 1 || currentPage === 3) && (
                                    <TextInput
                                        style={[styles.input, { borderColor: colors.border, color: colors.text, height: 50 }]}
                                        value={currentPage === 1 ? formData.title : formData.email}
                                        onChangeText={(t) => updateFormData(currentPage === 1 ? 'title' : 'email', t)}
                                        placeholder="Type here..."
                                        placeholderTextColor={colors.textSecondary}
                                        autoFocus
                                    />
                                )}

                                <View style={styles.navRow}>
                                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                                        <Text style={{ color: colors.textSecondary }}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleNext} disabled={!canProceedToNext()} style={[styles.nextButton, { backgroundColor: canProceedToNext() ? colors.primary : colors.border }]}>
                                        <Text style={styles.buttonText}>Next</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                    {currentPage === 4 && (
                        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.pageContent}>
                                <Animated.Text style={[styles.reviewEmoji, { opacity: reviewIconOpacity }]}>{['🧙‍♂️', '🥚', '🐉', '🏰', '💰', '💎', '🍺', '✨'][reviewIconIndex]}</Animated.Text>
                                <Text style={[styles.title, { color: colors.text }]}>Final Checkpoint ✨</Text>
                                <View style={styles.reviewList}>
                                    <Text style={[styles.reviewText, { color: colors.text }]}>• Name: {formData.title}</Text>
                                    <Text style={[styles.reviewText, { color: colors.text }]}>• Similarity: {formData.similarity}</Text>
                                    <Text style={[styles.reviewText, { color: colors.text }]}>• Purpose: {formData.purpose.substring(0, 50)}...</Text>
                                    <Text style={[styles.reviewText, { color: colors.text }]}>• Email: {formData.email}</Text>
                                </View>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={submitting}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Summon Sparklet! ✨</Text>}
                                </TouchableOpacity>
                                {!submitting && (
                                    <TouchableOpacity onPress={handleBack} style={{ marginTop: 10 }}>
                                        <Text style={{ color: colors.textSecondary }}>Wait, let me change something</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>
                    )}
                    {currentPage === 5 && (
                        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.pageContent}>
                                <Text style={styles.introEmoji}>🎉</Text>
                                <Text style={[styles.title, { color: colors.text }]}>It is Done!</Text>
                                <Text style={[styles.description, { color: colors.textSecondary }]}>
                                    The Wizard is now weaving the code. Check the list in a moment.
                                </Text>
                                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onComplete}>
                                    <Text style={styles.buttonText}>Return Home</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    progressBarContainer: { padding: 10, borderBottomWidth: 1 },
    progressTrack: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%' },
    scrollContent: { flexGrow: 1 },
    pageContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    introEmoji: { fontSize: 60, marginBottom: 10 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    description: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 },
    primaryButton: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    laterButton: { marginTop: 15 },
    formIcon: { fontSize: 40, marginBottom: 10 },
    input: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
    navRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    backButton: { padding: 10 },
    nextButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    reviewEmoji: { fontSize: 50, marginBottom: 10 },
    reviewList: { width: '100%', marginBottom: 20 },
    reviewText: { fontSize: 14, marginBottom: 5 }
});
