import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    Alert,
    TextInput,
} from 'react-native';
import { Svg, Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { SparkProps } from '../types/spark';
import {
    SettingsSection,
    SettingsInput,
    SettingsButton,
    SettingsToggle,
    SettingsHeader,
    SettingsFeedbackSection,
    SaveCancelButtons,
    SettingsContainer,
    SettingsScrollView
} from '../components/SettingsComponents';
import { HapticFeedback } from '../utils/haptics';

interface WeightEntry {
    id: string;
    date: string; // ISO string
    weight: number;
}

interface WeightTrackerData {
    entries: WeightEntry[];
    goalWeight: number | null;
    unit: 'lbs' | 'kg';
    showLabels: boolean;
}

const DEFAULT_DATA: WeightTrackerData = {
    entries: [],
    goalWeight: null,
    unit: 'lbs',
    showLabels: true,
};

export const WeightTrackerSpark: React.FC<SparkProps> = ({
    showSettings,
    onCloseSettings,
}) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    // Load data
    const [data, setData] = useState<WeightTrackerData>(() => {
        const saved = getSparkData('weight-tracker');
        return saved ? { ...DEFAULT_DATA, ...saved } : DEFAULT_DATA;
    });

    // Input State
    const [direction, setDirection] = useState<'higher' | 'same' | 'lower' | null>(null);
    const [diffPounds, setDiffPounds] = useState(0);
    const [diffTenths, setDiffTenths] = useState(0);
    const [firstWeightInput, setFirstWeightInput] = useState('');

    // Save data wrapper
    const saveData = (newData: WeightTrackerData) => {
        setData(newData);
        setSparkData('weight-tracker', newData);
    };

    // Sort entries by date (newest first)
    const sortedEntries = useMemo(() => {
        return [...data.entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.entries]);

    const lastEntry = sortedEntries[0];
    const lastWeight = lastEntry ? lastEntry.weight : null;

    // Get initial weight (first entry chronologically)
    const initialWeight = useMemo(() => {
        if (data.entries.length === 0) return null;
        const sorted = [...data.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return sorted[0].weight;
    }, [data.entries]);

    // Calculate goal percentage
    const goalPercentage = useMemo(() => {
        if (!lastWeight || !data.goalWeight || !initialWeight) return null;
        if (initialWeight === data.goalWeight) return 100; // Already at goal
        const progress = (initialWeight - lastWeight) / (initialWeight - data.goalWeight) * 100;
        return Math.max(0, Math.min(100, progress)); // Clamp between 0-100
    }, [lastWeight, data.goalWeight, initialWeight]);

    // Check if weighed in this week
    const hasWeighedThisWeek = useMemo(() => {
        if (!lastEntry) return false;
        const lastDate = new Date(lastEntry.date);
        const now = new Date();
        // Simple check: same ISO week or within last 7 days? 
        // Let's use within last 6 days (so once a week roughly)
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 7;
    }, [lastEntry]);

    const handleSaveWeighIn = () => {
        let newWeight = 0;

        if (!lastWeight) {
            // First time ever - should probably have a direct input for first weight
            // But for now, let's assume they enter a base weight if no history
            // Wait, if no history, we can't do "Higher/Lower".
            // We need a fallback for first entry.
            Alert.alert("Welcome!", "Please enter your starting weight in Settings first.");
            return;
        }

        if (direction === 'same') {
            newWeight = lastWeight;
        } else if (direction === 'higher') {
            newWeight = lastWeight + diffPounds + (diffTenths / 10);
        } else if (direction === 'lower') {
            newWeight = lastWeight - (diffPounds + (diffTenths / 10));
        } else {
            return;
        }

        const newEntry: WeightEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            weight: parseFloat(newWeight.toFixed(1)),
        };

        saveData({
            ...data,
            entries: [...data.entries, newEntry],
        });

        setDirection(null);
        setDiffPounds(0);
        setDiffTenths(0);
        HapticFeedback.success();
    };

    // Chart Logic
    const Chart = () => {
        if (data.entries.length < 2) return (
            <View style={styles.emptyChart}>
                <Text style={{ color: colors.textSecondary }}>Not enough data for graph</Text>
            </View>
        );

        const chartEntries = [...data.entries]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-12); // Last 12 entries

        const width = Dimensions.get('window').width - 40;
        const height = 220;
        const padding = 30;

        const weights = chartEntries.map(e => e.weight);
        // Include goal weight in range calculation if it exists
        const allValues = data.goalWeight ? [...weights, data.goalWeight] : weights;
        const minWeight = Math.min(...allValues) - 2;
        const maxWeight = Math.max(...allValues) + 2;
        const range = maxWeight - minWeight || 1;

        const getX = (index: number) => padding + (index * (width - 2 * padding)) / (chartEntries.length - 1);
        const getY = (weight: number) => height - padding - ((weight - minWeight) / range) * (height - 2 * padding);

        const pathData = chartEntries.map((e, i) =>
            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(e.weight)}`
        ).join(' ');

        return (
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
                <Svg width={width} height={height}>
                    {/* Grid lines */}
                    <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />
                    <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth="1" />

                    {/* Goal Weight Line */}
                    {data.goalWeight && (
                        <>
                            <Line
                                x1={padding}
                                y1={getY(data.goalWeight)}
                                x2={width - padding}
                                y2={getY(data.goalWeight)}
                                stroke={colors.success || '#4CAF50'}
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                            <SvgText
                                x={width - padding + 2}
                                y={getY(data.goalWeight) + 4}
                                fontSize="10"
                                fill={colors.success || '#4CAF50'}
                                textAnchor="start"
                            >
                                Goal
                            </SvgText>
                        </>
                    )}

                    {/* Data Line */}
                    <Path
                        d={pathData}
                        stroke={colors.primary}
                        strokeWidth="3"
                        fill="none"
                    />

                    {/* Data Points */}
                    {chartEntries.map((e, i) => (
                        <React.Fragment key={e.id}>
                            <Circle
                                cx={getX(i)}
                                cy={getY(e.weight)}
                                r="4"
                                fill={colors.background}
                                stroke={colors.primary}
                                strokeWidth="2"
                            />
                            {/* Labels if enabled */}
                            {data.showLabels && (
                                <SvgText
                                    x={getX(i)}
                                    y={getY(e.weight) - 10}
                                    fontSize="10"
                                    fill={colors.text}
                                    textAnchor="middle"
                                >
                                    {e.weight}
                                </SvgText>
                            )}
                            {/* Date Labels - show month/day */}
                            <SvgText
                                x={getX(i)}
                                y={height - 10}
                                fontSize="10"
                                fill={colors.textSecondary}
                                textAnchor="middle"
                            >
                                {new Date(e.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </SvgText>
                        </React.Fragment>
                    ))}
                </Svg>
            </View>
        );
    };

    // Manual Entry State
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualWeight, setManualWeight] = useState('');

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Weight Tracker Settings"
                        subtitle="Configure display and manage data"
                        icon="⚖️"
                        sparkId="weight-tracker"
                    />

                    <SettingsFeedbackSection sparkName="Weight Tracker" sparkId="weight-tracker" />

                    <SettingsSection title="Display">
                        <SettingsToggle
                            label="Show Weight Labels"
                            value={data.showLabels}
                            onValueChange={(val) => saveData({ ...data, showLabels: val })}
                        />
                        <SettingsToggle
                            label="Use Kilograms (kg)"
                            value={data.unit === 'kg'}
                            onValueChange={(isKg) => saveData({ ...data, unit: isKg ? 'kg' : 'lbs' })}
                        />
                    </SettingsSection>

                    <SettingsSection title="Goal">
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text }}>Goal Weight</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
                                Set your target weight to track progress.
                            </Text>
                            <View style={{ gap: 12 }}>
                                <View>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Weight ({data.unit})</Text>
                                    <SettingsInput
                                        placeholder={`Goal in ${data.unit}`}
                                        value={data.goalWeight?.toString() || ''}
                                        onChangeText={(val) => {
                                            const num = parseFloat(val);
                                            saveData({ ...data, goalWeight: isNaN(num) ? null : num });
                                        }}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    </SettingsSection>

                    <SettingsSection title="Manage Data">
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text }}>Add Historical Entry</Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
                                Enter a past weight to fill in your history.
                            </Text>

                            <View style={{ gap: 12 }}>
                                <View>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Date (YYYY-MM-DD)</Text>
                                    <SettingsInput
                                        placeholder="YYYY-MM-DD"
                                        value={manualDate}
                                        onChangeText={setManualDate}
                                    />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Weight ({data.unit})</Text>
                                    <SettingsInput
                                        placeholder={`Weight in ${data.unit}`}
                                        value={manualWeight}
                                        onChangeText={setManualWeight}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <SettingsButton
                                    title="Add Entry"
                                    onPress={() => {
                                        const w = parseFloat(manualWeight);
                                        const d = new Date(manualDate);

                                        if (isNaN(w)) {
                                            Alert.alert("Error", "Please enter a valid weight.");
                                            return;
                                        }
                                        if (isNaN(d.getTime())) {
                                            Alert.alert("Error", "Please enter a valid date (YYYY-MM-DD).");
                                            return;
                                        }

                                        const newEntry = {
                                            id: Date.now().toString(),
                                            date: d.toISOString(),
                                            weight: w
                                        };

                                        // Merge and sort
                                        const updatedEntries = [...data.entries, newEntry].sort((a, b) =>
                                            new Date(b.date).getTime() - new Date(a.date).getTime()
                                        );

                                        saveData({ ...data, entries: updatedEntries });
                                        setManualWeight('');
                                        Alert.alert("Success", "Historical entry added.");
                                    }}
                                />
                            </View>
                        </View>

                        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text }}>Danger Zone</Text>
                            <SettingsButton
                                title="Clear All Data"
                                onPress={() => {
                                    Alert.alert('Clear Data', 'Are you sure? This cannot be undone.', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Clear', style: 'destructive', onPress: () => saveData(DEFAULT_DATA) }
                                    ]);
                                }}
                                variant="danger"
                            />
                        </View>
                    </SettingsSection>

                    <SaveCancelButtons
                        onSave={onCloseSettings || (() => {})}
                        onCancel={onCloseSettings || (() => {})}
                        saveText="Done"
                        cancelText="Close"
                    />
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    // Main UI
    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>

                {/* Title */}
                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.title, { color: colors.text }]}>⚖️ Weight Tracker</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                        Track your weight, set goals, and visualize progress
                    </Text>
                </View>

                {/* Current Stats */}
                {lastWeight && (
                    <View style={{ alignItems: 'center', marginBottom: 10 }}>
                        {data.showLabels ? (
                            <Text style={[styles.bigStat, { color: colors.text, fontSize: 32 }]}>
                                {lastWeight} <Text style={{ fontSize: 16 }}>{data.unit}</Text>
                            </Text>
                        ) : null}
                        {data.goalWeight && (
                            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                                {data.showLabels && (
                                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                                        Goal: {data.goalWeight} {data.unit}
                                    </Text>
                                )}
                                {goalPercentage !== null && (
                                    <Text style={{ color: colors.success || '#4CAF50', fontSize: 14, fontWeight: '600' }}>
                                        {goalPercentage.toFixed(0)}% to goal
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Graph */}
                <Chart />

                {/* Weigh-in Interface */}
                {!hasWeighedThisWeek ? (
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Time to Weigh In!</Text>

                        {lastWeight ? (
                            <>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Last week: {lastWeight} {data.unit}
                                </Text>

                                {/* Direction Selection */}
                                <View style={styles.directionRow}>
                                    {['higher', 'same', 'lower'].map((dir) => (
                                        <TouchableOpacity
                                            key={dir}
                                            style={[
                                                styles.directionButton,
                                                direction === dir && { backgroundColor: colors.primary },
                                                { borderColor: colors.border }
                                            ]}
                                            onPress={() => {
                                                setDirection(dir as any);
                                                HapticFeedback.selection();
                                            }}
                                        >
                                            <Text style={[
                                                styles.directionText,
                                                direction === dir ? { color: '#fff' } : { color: colors.text }
                                            ]}>
                                                {dir.charAt(0).toUpperCase() + dir.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Amount Selection */}
                                {direction && direction !== 'same' && (
                                    <View style={styles.amountContainer}>
                                        <Text style={[styles.amountLabel, { color: colors.text }]}>
                                            Difference: {diffPounds}.{diffTenths} {data.unit}
                                        </Text>

                                        <View style={styles.pickerRow}>
                                            {/* Pounds */}
                                            <View style={styles.pickerColumn}>
                                                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Lbs/Kg</Text>
                                                <View style={styles.stepper}>
                                                    <TouchableOpacity onPress={() => setDiffPounds(Math.max(0, diffPounds - 1))} style={styles.stepBtn}><Text style={styles.stepText}>-</Text></TouchableOpacity>
                                                    <Text style={[styles.stepValue, { color: colors.text }]}>{diffPounds}</Text>
                                                    <TouchableOpacity onPress={() => setDiffPounds(diffPounds + 1)} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* Tenths */}
                                            <View style={styles.pickerColumn}>
                                                <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>.Tenths</Text>
                                                <View style={styles.stepper}>
                                                    <TouchableOpacity onPress={() => setDiffTenths(Math.max(0, diffTenths - 1))} style={styles.stepBtn}><Text style={styles.stepText}>-</Text></TouchableOpacity>
                                                    <Text style={[styles.stepValue, { color: colors.text }]}>.{diffTenths}</Text>
                                                    <TouchableOpacity onPress={() => setDiffTenths(Math.min(9, diffTenths + 1))} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Submit Button */}
                                {direction && (
                                    <TouchableOpacity
                                        style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                        onPress={handleSaveWeighIn}
                                    >
                                        <Text style={styles.submitButtonText}>
                                            Submit {direction === 'same' ? lastWeight :
                                                direction === 'higher' ? (lastWeight + diffPounds + diffTenths / 10).toFixed(1) :
                                                    (lastWeight - (diffPounds + diffTenths / 10)).toFixed(1)}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <View style={{ padding: 20 }}>
                                <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 20 }}>
                                    Welcome! What's your current weight?
                                </Text>
                                <View style={{ marginBottom: 20 }}>
                                    <TextInput
                                        style={[
                                            styles.firstWeightInput,
                                            {
                                                backgroundColor: colors.background,
                                                borderColor: colors.border,
                                                color: colors.text,
                                            }
                                        ]}
                                        placeholder={`Enter weight in ${data.unit}`}
                                        placeholderTextColor={colors.textSecondary}
                                        value={firstWeightInput}
                                        onChangeText={setFirstWeightInput}
                                        keyboardType="numeric"
                                        autoFocus={true}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        { backgroundColor: colors.primary },
                                        !firstWeightInput && { opacity: 0.5 }
                                    ]}
                                    onPress={() => {
                                        const weight = parseFloat(firstWeightInput);
                                        if (isNaN(weight) || weight <= 0) {
                                            Alert.alert("Invalid Weight", "Please enter a valid weight.");
                                            return;
                                        }

                                        const newEntry: WeightEntry = {
                                            id: Date.now().toString(),
                                            date: new Date().toISOString(),
                                            weight: parseFloat(weight.toFixed(1)),
                                        };

                                        saveData({
                                            ...data,
                                            entries: [...data.entries, newEntry],
                                        });

                                        setFirstWeightInput('');
                                        HapticFeedback.success();
                                    }}
                                    disabled={!firstWeightInput}
                                >
                                    <Text style={styles.submitButtonText}>Save Weight</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.cardTitle, { color: colors.success }]}>All Set!</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            You've weighed in this week. See you next week!
                        </Text>
                        {data.showLabels ? (
                            <Text style={[styles.bigStat, { color: colors.text }]}>
                                {lastWeight} <Text style={{ fontSize: 20 }}>{data.unit}</Text>
                            </Text>
                        ) : goalPercentage !== null ? (
                            <Text style={[styles.bigStat, { color: colors.success || '#4CAF50', fontSize: 36 }]}>
                                {goalPercentage.toFixed(0)}%
                            </Text>
                        ) : null}
                    </View>
                )}

            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        borderRadius: 20,
        padding: 20,
        marginTop: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 24,
    },
    directionRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 10,
    },
    directionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    directionText: {
        fontWeight: '600',
        fontSize: 16,
    },
    amountContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    amountLabel: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    pickerRow: {
        flexDirection: 'row',
        gap: 40,
    },
    pickerColumn: {
        alignItems: 'center',
    },
    pickerLabel: {
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    stepValue: {
        fontSize: 24,
        fontWeight: 'bold',
        width: 40,
        textAlign: 'center',
    },
    submitButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    bigStat: {
        fontSize: 48,
        fontWeight: 'bold',
        marginTop: 12,
    },
    emptyChart: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    firstWeightInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 12,
    },
});

export default WeightTrackerSpark;
