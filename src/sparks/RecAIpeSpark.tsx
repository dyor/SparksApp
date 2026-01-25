import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import { GeminiService } from '../services/GeminiService';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SaveCancelButtons,
} from '../components/SettingsComponents';
import { AISettingsNote } from '../components/AISettingsNote';
import { HapticFeedback } from '../utils/haptics';
import { StarRating } from '../components/StarRating';
import { Audio } from 'expo-av';

interface Recipe {
    id: string;
    title: string;
    originalPrompt: string;
    ingredients: string;
    instructions: string;
    createdAt: string;
    shoppingChecked: number[];
    cookingChecked: number[];
    rating?: number;
}

interface RecAIpeData {
    recipes: Recipe[];
    settings?: {
        silentAlarms: boolean;
    };
}

const STARTER_RECIPE: Recipe = {
    id: 'starter-1',
    title: 'Chocolate Chip Oatmeal Cookies',
    originalPrompt: 'Classic chocolate chip oatmeal cookies',
    ingredients: `1 cup (2 sticks) unsalted butter, softened
1 cup packed brown sugar
1/2 cup granulated sugar
2 large eggs
2 teaspoons pure vanilla extract
1 1/2 cups all-purpose flour
1 teaspoon baking soda
1 teaspoon ground cinnamon
1/2 teaspoon salt
3 cups old-fashioned rolled oats
1 cup semi-sweet chocolate chips`,
    instructions: `Preheat and Prepare: Preheat your oven to 375°F (190°C). Line two baking sheets with parchment paper.

Cream Butter and Sugars: In a large bowl, cream together the unsalted butter, softened (1 cup/2 sticks), the packed brown sugar (1 cup), and the granulated sugar (1/2 cup) using an electric mixer until light and fluffy.

Add Wet Ingredients: Beat in the large eggs (2), one at a time, followed by the pure vanilla extract (2 teaspoons).

Combine Dry Ingredients: In a separate medium bowl, whisk together the all-purpose flour (1 1/2 cups), the baking soda (1 teaspoon), the ground cinnamon (1 teaspoon), and the salt (1/2 teaspoon).

Mix Together: Gradually add the dry ingredient mixture to the wet ingredient mixture, mixing on low speed until just combined.

Fold in Add-ins: Stir in the old-fashioned rolled oats (3 cups) and the semi-sweet chocolate chips (1 cup) until evenly distributed throughout the dough.

Scoop and Bake: Drop rounded spoonfuls of dough onto the prepared baking sheets.

Bake: Bake in the preheated oven for 8 to 10 minutes, or until the edges are golden brown.

Cool: Let the cookies cool on the baking sheets for 5 minutes before transferring them to a wire rack to cool completely.`,
    createdAt: new Date().toISOString(),
    shoppingChecked: [],
    cookingChecked: [],
    rating: 5,
};

const timerRegex = /\{\{(.*?)\}\}/g;

export const RecAIpeSpark: React.FC<SparkProps> = ({ showSettings, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    const [data, setData] = useState<RecAIpeData>({ recipes: [] });
    const [mode, setMode] = useState<'list' | 'create' | 'preview' | 'view' | 'edit' | 'refine' | 'shop' | 'cook'>('list');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [createPrompt, setCreatePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedRecipe, setGeneratedRecipe] = useState<Partial<Recipe> | null>(null);
    const [editText, setEditText] = useState('');
    const [refinePrompt, setRefinePrompt] = useState('');
    const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    const isHydrated = useSparkStore(state => state.isHydrated);
    const insets = useSafeAreaInsets();

    const parseDuration = (dText: string): number => {
        // Simple parser for "20 minutes", "1 hour", "5 mins", etc.
        const num = parseInt(dText.match(/\d+/)?.[0] || '0');
        if (dText.toLowerCase().includes('hour')) return num * 3600;
        if (dText.toLowerCase().includes('min')) return num * 60;
        if (dText.toLowerCase().includes('sec')) return num;
        return num * 60; // Default to minutes
    };

    // Check API key availability
    useEffect(() => {
        GeminiService.getApiKey()
            .then(() => setApiKeyAvailable(true))
            .catch(() => setApiKeyAvailable(false));
    }, []);

    // Load data and restore state
    useEffect(() => {
        if (!isHydrated) return;
        if (dataLoaded) return;

        console.log('🔄 RecAIpeSpark: Loading data, isHydrated:', isHydrated);
        const saved = getSparkData('recaipe') as any;
        if (saved?.recipes && saved.recipes.length > 0) {
            console.log(`📦 RecAIpeSpark: Loading ${saved.recipes.length} recipes`);
            setData({ recipes: saved.recipes, settings: saved.settings });
            // Restore previous state
            if (saved.lastMode) {
                setMode(saved.lastMode);
            }
            if (saved.lastRecipeId) {
                const recipe = saved.recipes.find((r: Recipe) => r.id === saved.lastRecipeId);
                if (recipe) {
                    setSelectedRecipe(recipe);
                }
            }
            setDataLoaded(true);
        } else {
            console.log('📦 RecAIpeSpark: No recipes found, using starter');
            // Initialize with starter recipe
            const initialData = { recipes: [STARTER_RECIPE] };
            setData(initialData);
            setSparkData('recaipe', initialData);
            setDataLoaded(true);
        }
    }, [isHydrated, getSparkData, dataLoaded]);

    // Save data with state
    const saveData = (newData: RecAIpeData) => {
        setData(newData);
        const dataWithState = {
            ...newData,
            lastMode: mode,
            lastRecipeId: selectedRecipe?.id,
        };
        setSparkData('recaipe', dataWithState);
    };

    // Update state persistence whenever mode or recipe changes
    useEffect(() => {
        if (!dataLoaded) return;

        if (data.recipes.length > 0) {
            const dataWithState = {
                recipes: data.recipes,
                settings: data.settings,
                lastMode: mode,
                lastRecipeId: selectedRecipe?.id,
            };
            setSparkData('recaipe', dataWithState);
        }
    }, [mode, selectedRecipe?.id, data.recipes, data.settings, dataLoaded]);

    // AI Generation
    const generateRecipe = async (prompt: string, currentRecipe?: string) => {
        setIsGenerating(true);
        try {
            const systemPrompt = currentRecipe
                ? `Refine this recipe based on the user request.
                   Current Recipe: ${currentRecipe}
                   User Request: "${prompt}"`
                : `Create a professional recipe based on: "${prompt}"`;

            const fullPrompt = `${systemPrompt}

            FORMATTING RULES:
            1. title: Creative name for the dish.
            2. ingredients: List each ingredient on a new line. In instructions, include quantities in parentheses briefly.
            3. instructions: Write clear, step-by-step sentences. Break into small paragraphs.
            4. TIMERS: Wrap all durations (e.g. 20 minutes) in double curly braces: {{20 minutes}}.

            RETURN JSON ONLY:
            {
                "title": "String",
                "ingredients": "String (newline separated)",
                "instructions": "String (newline separated paragraphs)"
            }`;

            const parsed = await GeminiService.generateJSON<{
                title: string;
                ingredients: string;
                instructions: string;
            }>(fullPrompt);

            setGeneratedRecipe(parsed);
            setMode('preview');
            HapticFeedback.success();
        } catch (error: any) {
            console.error('Generate error:', error);
            if (!GeminiService.isApiKeyError(error)) {
                Alert.alert('Generation Error', error.message || 'Failed to generate recipe');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // Recipe management
    const saveRecipe = (recipe: Partial<Recipe>) => {
        const newRecipe: Recipe = {
            id: Date.now().toString(),
            title: recipe.title || 'Untitled Recipe',
            originalPrompt: createPrompt,
            ingredients: recipe.ingredients || '',
            instructions: recipe.instructions || '',
            createdAt: new Date().toISOString(),
            shoppingChecked: [],
            cookingChecked: [],
            rating: recipe.rating,
        };

        const newData = { recipes: [newRecipe, ...data.recipes] };
        saveData(newData);
        setSelectedRecipe(newRecipe);
        setMode('shop');
        HapticFeedback.success();
    };

    const updateRecipe = (updated: Recipe) => {
        const newData = {
            recipes: data.recipes.map(r => r.id === updated.id ? updated : r)
        };
        saveData(newData);
        setSelectedRecipe(updated);
    };

    const deleteRecipe = () => {
        if (!selectedRecipe) return;

        Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const newData = { recipes: data.recipes.filter(r => r.id !== selectedRecipe.id) };
                    saveData(newData);
                    setMode('list');
                    setSelectedRecipe(null);
                    HapticFeedback.success();
                }
            }
        ]);
    };

    const parseEditText = (text: string): { title: string, ingredients: string, instructions: string } => {
        const lines = text.trim().split('\n');
        const title = lines[0].trim();

        const ingredientsIndex = lines.findIndex(l => l.trim().toLowerCase() === 'ingredients');
        const instructionsIndex = lines.findIndex(l => l.trim().toLowerCase() === 'instructions');

        const ingredients = lines.slice(ingredientsIndex + 1, instructionsIndex).filter(l => l.trim()).join('\n');
        const instructions = lines.slice(instructionsIndex + 1).filter(l => l.trim()).join('\n\n');

        return { title, ingredients, instructions };
    };

    const getIngredientsList = (recipe: Recipe): string[] => {
        return recipe.ingredients.split('\n').filter(l => l.trim());
    };

    const getInstructionsList = (recipe: Recipe): string[] => {
        return recipe.instructions.split('\n\n').filter(l => l.trim());
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 20,
            paddingTop: Platform.OS === 'ios' ? 10 : 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 64,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
            flex: 1,
            textAlign: 'center',
        },
        backButton: {
            position: 'absolute',
            left: 20,
            zIndex: 10,
            padding: 8,
            marginLeft: -8,
        },
        backButtonText: {
            fontSize: 24,
            color: colors.primary,
            fontWeight: '600',
        },
        headerRight: {
            position: 'absolute',
            right: 20,
            zIndex: 10,
        },
        addButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        addButtonText: {
            fontSize: 24,
            color: '#fff',
            fontWeight: 'bold',
        },
        content: {
            flex: 1,
        },
        scrollContent: {
            padding: 20,
            paddingTop: 0,
            paddingBottom: Math.max(insets.bottom + 40, 60),
        },
        recipeCard: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        recipeInfo: {
            flex: 1,
            marginRight: 12,
        },
        recipeTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
        },
        emptyState: {
            alignItems: 'center',
            padding: 40,
            marginTop: 40,
        },
        emptyEmoji: {
            fontSize: 64,
            marginBottom: 16,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
        },
        emptySubtext: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.text,
            minHeight: 120,
            textAlignVertical: 'top',
        },
        button: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 16,
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
        },
        buttonSecondary: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        buttonSecondaryText: {
            color: colors.text,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: '600',
            color: colors.text,
            marginTop: 20,
            marginBottom: 12,
        },
        ingredientItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
        },
        ingredientBullet: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.primary,
            marginRight: 12,
        },
        ingredientText: {
            fontSize: 16,
            color: colors.text,
            flex: 1,
        },
        paragraph: {
            fontSize: 16,
            color: colors.text,
            lineHeight: 24,
            marginBottom: 16,
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 8,
        },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: colors.border,
            marginRight: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
        },
        checkboxChecked: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        checkboxCheck: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
        },
        checkboxText: {
            flex: 1,
            fontSize: 16,
            color: colors.text,
        },
        checkboxTextStrike: {
            textDecorationLine: 'line-through',
            color: colors.textSecondary,
        },
        navigationRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
        },
        navButton: {
            padding: 12,
            minWidth: 60,
        },
        navButtonText: {
            fontSize: 24,
            color: colors.primary,
        },
        pageIndicator: {
            fontSize: 16,
            color: colors.textSecondary,
        },
        buttonRow: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 20,
        },
        buttonFlex: {
            flex: 1,
        },
        deleteButton: {
            backgroundColor: colors.error + '20',
            borderWidth: 1,
            borderColor: colors.error,
        },
        deleteButtonText: {
            color: colors.error,
        },
    });

    const InstructionStep: React.FC<{
        text: string;
        isChecked: boolean;
        onToggle: () => void;
        isSilent?: boolean;
        colors: any;
    }> = ({ text, isChecked, onToggle, isSilent, colors }) => {
        const [timerActive, setTimerActive] = useState(false);
        const [timeLeft, setTimeLeft] = useState(0); // in seconds
        const [totalTime, setTotalTime] = useState(0);
        const [isFinished, setIsFinished] = useState(false);
        const [sound, setSound] = useState<Audio.Sound | null>(null);

        // Extraction: Find the duration in the {{...}} syntax
        const match = timerRegex.exec(text);
        timerRegex.lastIndex = 0; // Reset regex to avoid skipping matches on re-renders
        const durationText = match ? match[1] : null;
        const cleanText = text.replace(timerRegex, (m, g) => g);

        useEffect(() => {
            return () => {
                if (sound) {
                    sound.unloadAsync();
                }
            };
        }, [sound]);

        const playAlarm = async () => {
            if (isSilent) return;
            try {
                const { sound: alarmSound } = await Audio.Sound.createAsync(
                    { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                    { shouldPlay: true }
                );
                setSound(alarmSound);
            } catch (error) {
                console.log('Error playing sound:', error);
            }
        };

        useEffect(() => {
            let interval: NodeJS.Timeout;
            if (timerActive && timeLeft > 0) {
                interval = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            setTimerActive(false);
                            setIsFinished(true);
                            playAlarm();
                            HapticFeedback.success();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
            return () => clearInterval(interval);
        }, [timerActive, timeLeft, isSilent]);

        const startTimer = () => {
            if (!durationText) return;
            const seconds = parseDuration(durationText);
            setTotalTime(seconds);
            setTimeLeft(seconds);
            setTimerActive(true);
            setIsFinished(false);
            HapticFeedback.light();
        };

        const formatTime = (seconds: number) => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

        return (
            <View style={{ marginBottom: 16 }}>
                <TouchableOpacity style={styles.checkboxRow} onPress={onToggle}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                        {isChecked && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.checkboxText, isChecked && styles.checkboxTextStrike]}>
                        {cleanText}
                    </Text>
                </TouchableOpacity>

                {durationText && !isChecked && (
                    <View style={{ marginLeft: 36, marginTop: 4 }}>
                        {!timerActive && !isFinished ? (
                            <TouchableOpacity
                                style={[styles.button, { paddingVertical: 8, marginTop: 0, width: 160 }]}
                                onPress={startTimer}
                            >
                                <Text style={[styles.buttonText, { fontSize: 13 }]}>Start {durationText} Timer</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{
                                backgroundColor: isFinished ? colors.primary + '20' : colors.surface,
                                padding: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: isFinished ? colors.primary : colors.border,
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: isFinished ? colors.primary : colors.text }}>
                                        {isFinished ? 'FINISHED!' : formatTime(timeLeft)}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {isFinished ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setIsFinished(false);
                                                    if (sound) sound.stopAsync();
                                                }}
                                                style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                                            >
                                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Dismiss</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => setTimeLeft(prev => prev + 60)}
                                                    style={{ backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                                >
                                                    <Text style={{ fontSize: 12 }}>+1m</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setTimerActive(!timerActive)}
                                                    style={{ backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                                >
                                                    <Text style={{ fontSize: 12 }}>{timerActive ? 'Pause' : 'Resume'}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setTimerActive(false);
                                                        setTimeLeft(0);
                                                    }}
                                                    style={{ backgroundColor: colors.error + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                                >
                                                    <Text style={{ color: colors.error, fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                                {!isFinished && (
                                    <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', backgroundColor: colors.primary, width: `${(1 - progress) * 100}%` }} />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // Settings Screen
    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="RecAIpe Settings"
                        subtitle="AI-powered recipe generation"
                        icon="🍳"
                        sparkId="recaipe"
                    />

                    <View style={{ padding: 20 }}>
                        <AISettingsNote sparkName="RecAIpe" />
                    </View>

                    <View style={{ padding: 20 }}>
                        <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8, fontWeight: '600' }}>
                            About RecAIpe
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                            Powered by Gemini AI to generate custom recipes based on your descriptions.
                        </Text>

                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            {apiKeyAvailable === null
                                ? '⏳ Checking...'
                                : apiKeyAvailable
                                    ? '✅ API key configured'
                                    : '❌ API key not configured'}
                        </Text>

                        <View style={{ marginTop: 24 }}>
                            <Text style={{ fontSize: 16, color: colors.text, marginBottom: 12, fontWeight: '600' }}>
                                Timer Settings
                            </Text>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: colors.surface,
                                padding: 16,
                                borderRadius: 12
                            }}>
                                <View>
                                    <Text style={{ fontSize: 16, color: colors.text }}>Silent Alarms</Text>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Haptics only, no sound chime</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        const newSettings = { ...data.settings, silentAlarms: !data.settings?.silentAlarms };
                                        setData({ ...data, settings: newSettings });
                                        setSparkData('recaipe', { ...data, settings: newSettings });
                                        HapticFeedback.light();
                                    }}
                                    style={{
                                        width: 50,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: data.settings?.silentAlarms ? colors.primary : colors.border,
                                        padding: 2,
                                        justifyContent: 'center'
                                    }}
                                >
                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: '#fff',
                                        alignSelf: data.settings?.silentAlarms ? 'flex-end' : 'flex-start',
                                        elevation: 2,
                                    }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <SettingsFeedbackSection sparkName="RecAIpe" sparkId="recaipe" />

                    <SaveCancelButtons
                        onSave={onCloseSettings || (() => { })}
                        onCancel={onCloseSettings || (() => { })}
                        saveText="Done"
                        cancelText="Close"
                    />
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    // List View
    if (mode === 'list') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>🍳 RecAIpe</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.addButton} onPress={() => {
                            setCreatePrompt('');
                            setMode('create');
                            HapticFeedback.light();
                        }}>
                            <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    {data.recipes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🍳</Text>
                            <Text style={styles.emptyText}>No recipes yet</Text>
                            <Text style={styles.emptySubtext}>
                                Tap + to create your first AI-generated recipe
                            </Text>
                        </View>
                    ) : (
                        data.recipes.map(recipe => (
                            <TouchableOpacity
                                key={recipe.id}
                                style={styles.recipeCard}
                                onPress={() => {
                                    setSelectedRecipe(recipe);
                                    setMode('view');
                                    HapticFeedback.selection();
                                }}
                            >
                                <View style={styles.recipeInfo}>
                                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                                </View>
                                {recipe.rating !== undefined && recipe.rating > 0 && (
                                    <StarRating
                                        rating={recipe.rating}
                                        onRatingChange={() => { }}
                                        disabled
                                        size={16}
                                        showLabel={false}
                                    />
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    }

    // Create View
    if (mode === 'create') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode('list')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Recipe</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <TextInput
                        style={styles.input}
                        multiline
                        placeholder="e.g., oatmeal cookies - no nuts, hint of vanilla!"
                        placeholderTextColor={colors.textSecondary}
                        value={createPrompt}
                        onChangeText={setCreatePrompt}
                    />

                    <TouchableOpacity
                        style={[styles.button, !createPrompt.trim() && { opacity: 0.5 }]}
                        disabled={!createPrompt.trim() || isGenerating}
                        onPress={() => generateRecipe(createPrompt)}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Generate Recipe</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Preview View
    if (mode === 'preview' && generatedRecipe) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => {
                        setMode('create');
                        setGeneratedRecipe(null);
                    }}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Preview Recipe</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <TextInput
                        style={[styles.input, { minHeight: 50 }]}
                        value={generatedRecipe.title}
                        onChangeText={(text) => setGeneratedRecipe({ ...generatedRecipe, title: text })}
                        placeholder="Recipe title"
                        placeholderTextColor={colors.textSecondary}
                    />

                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 8 }]}>Initial Rating</Text>
                        <StarRating
                            rating={generatedRecipe.rating || 0}
                            onRatingChange={(newRating) => {
                                setGeneratedRecipe({ ...generatedRecipe, rating: newRating });
                                HapticFeedback.success();
                            }}
                            size={30}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {generatedRecipe.ingredients?.split('\n').filter(l => l.trim()).map((item, i) => (
                        <View key={i} style={styles.ingredientItem}>
                            <View style={styles.ingredientBullet} />
                            <Text style={styles.ingredientText}>{item}</Text>
                        </View>
                    ))}

                    <Text style={styles.sectionTitle}>Instructions</Text>
                    {generatedRecipe.instructions?.split('\n\n').filter(l => l.trim()).map((para, i) => (
                        <Text key={i} style={styles.paragraph}>{para}</Text>
                    ))}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonFlex]}
                            onPress={() => {
                                const fullText = `${generatedRecipe.title}\n\nIngredients\n${generatedRecipe.ingredients}\n\nInstructions\n${generatedRecipe.instructions}`;
                                setEditText(fullText);
                                setMode('edit');
                            }}
                        >
                            <Text style={styles.buttonText}>Edit Recipe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonFlex]}
                            onPress={() => {
                                setRefinePrompt('');
                                setMode('refine');
                            }}
                        >
                            <Text style={styles.buttonText}>Refine Recipe</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => saveRecipe(generatedRecipe)}
                    >
                        <Text style={styles.buttonText}>Save & Make Recipe</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Edit View
    if (mode === 'edit') {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode(generatedRecipe ? 'preview' : 'view')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Recipe</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <TextInput
                        style={[styles.input, { minHeight: 400 }]}
                        multiline
                        value={editText}
                        onChangeText={setEditText}
                        placeholder="Edit your recipe..."
                        placeholderTextColor={colors.textSecondary}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            const parsed = parseEditText(editText);
                            if (selectedRecipe) {
                                updateRecipe({
                                    ...selectedRecipe,
                                    ...parsed,
                                });
                                setMode('view');
                            } else if (generatedRecipe) {
                                setGeneratedRecipe({ ...generatedRecipe, ...parsed });
                                setMode('preview');
                            }
                            HapticFeedback.success();
                        }}
                    >
                        <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Refine View
    if (mode === 'refine') {
        const currentRecipeText = generatedRecipe
            ? `${generatedRecipe.title}\n\nIngredients\n${generatedRecipe.ingredients}\n\nInstructions\n${generatedRecipe.instructions}`
            : selectedRecipe
                ? `${selectedRecipe.title}\n\nIngredients\n${selectedRecipe.ingredients}\n\nInstructions\n${selectedRecipe.instructions}`
                : '';

        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode(generatedRecipe ? 'preview' : 'view')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Refine Recipe</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>Current Recipe</Text>
                    <View style={[styles.input, { minHeight: 200 }]}>
                        <Text style={{ color: colors.text }}>{currentRecipeText}</Text>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>What would you like to change?</Text>
                    <TextInput
                        style={styles.input}
                        multiline
                        placeholder="e.g., Make it spicier"
                        placeholderTextColor={colors.textSecondary}
                        value={refinePrompt}
                        onChangeText={setRefinePrompt}
                    />

                    <TouchableOpacity
                        style={[styles.button, !refinePrompt.trim() && { opacity: 0.5 }]}
                        disabled={!refinePrompt.trim() || isGenerating}
                        onPress={() => generateRecipe(refinePrompt, currentRecipeText)}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Refine Recipe</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // View Recipe
    if (mode === 'view' && selectedRecipe) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode('list')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{selectedRecipe.title}</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {getIngredientsList(selectedRecipe).map((item, i) => (
                        <View key={i} style={styles.ingredientItem}>
                            <View style={styles.ingredientBullet} />
                            <Text style={styles.ingredientText}>{item}</Text>
                        </View>
                    ))}

                    <Text style={styles.sectionTitle}>Instructions</Text>
                    {getInstructionsList(selectedRecipe).map((para, i) => (
                        <Text key={i} style={styles.paragraph}>{para}</Text>
                    ))}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonFlex]}
                            onPress={() => {
                                const fullText = `${selectedRecipe.title}\n\nIngredients\n${selectedRecipe.ingredients}\n\nInstructions\n${selectedRecipe.instructions}`;
                                setEditText(fullText);
                                setMode('edit');
                            }}
                        >
                            <Text style={styles.buttonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonFlex]}
                            onPress={() => {
                                setRefinePrompt('');
                                setMode('refine');
                            }}
                        >
                            <Text style={styles.buttonText}>Refine</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            setMode('shop');
                            HapticFeedback.light();
                        }}
                    >
                        <Text style={styles.buttonText}>Make Recipe</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.deleteButton]}
                        onPress={deleteRecipe}
                    >
                        <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Recipe</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Shopping Mode
    if (mode === 'shop' && selectedRecipe) {
        const ingredients = getIngredientsList(selectedRecipe);

        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode('view')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Shopping List</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{selectedRecipe.title}</Text>

                    {ingredients.map((item, i) => {
                        const isChecked = selectedRecipe.shoppingChecked.includes(i);

                        return (
                            <TouchableOpacity
                                key={i}
                                style={styles.checkboxRow}
                                onPress={() => {
                                    const newChecked = isChecked
                                        ? selectedRecipe.shoppingChecked.filter(idx => idx !== i)
                                        : [...selectedRecipe.shoppingChecked, i];

                                    updateRecipe({
                                        ...selectedRecipe,
                                        shoppingChecked: newChecked,
                                    });
                                    HapticFeedback.selection();
                                }}
                            >
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Text style={styles.checkboxCheck}>✓</Text>}
                                </View>
                                <Text style={[styles.checkboxText, isChecked && styles.checkboxTextStrike]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            updateRecipe({
                                ...selectedRecipe,
                                shoppingChecked: [],
                            });
                            setMode('cook');
                            HapticFeedback.success();
                        }}
                    >
                        <Text style={styles.buttonText}>Finish Shopping</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Cooking Mode
    if (mode === 'cook' && selectedRecipe) {
        const instructions = getInstructionsList(selectedRecipe);

        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setMode('shop')}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Cooking</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{selectedRecipe.title}</Text>

                    {instructions.map((instruction, i) => {
                        const isChecked = selectedRecipe.cookingChecked.includes(i);

                        return (
                            <InstructionStep
                                key={i}
                                text={instruction}
                                isChecked={isChecked}
                                isSilent={data.settings?.silentAlarms}
                                colors={colors}
                                onToggle={() => {
                                    const newChecked = isChecked
                                        ? selectedRecipe.cookingChecked.filter(idx => idx !== i)
                                        : [...selectedRecipe.cookingChecked, i];

                                    updateRecipe({
                                        ...selectedRecipe,
                                        cookingChecked: newChecked,
                                    });
                                    HapticFeedback.selection();
                                }}
                            />
                        );
                    })}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            updateRecipe({
                                ...selectedRecipe,
                                cookingChecked: [],
                            });
                            setMode('view');
                            HapticFeedback.success();
                        }}
                    >
                        <Text style={styles.buttonText}>Finish Recipe</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Safety checks for mode inconsistency
    if ((mode === 'view' || mode === 'shop' || mode === 'cook') && !selectedRecipe) {
        setMode('list');
        return null; // Next render will be list
    }

    if (mode === 'preview' && !generatedRecipe) {
        setMode('list');
        return null;
    }

    // Final fallback to ensure we don't return null
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🍳 RecAIpe</Text>
            </View>
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Something went wrong</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setMode('list')}
                >
                    <Text style={styles.buttonText}>Return to List</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default RecAIpeSpark;
