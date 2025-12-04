import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import Svg, { Circle } from 'react-native-svg';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
} from '../components/SettingsComponents';

interface FinalClockSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
    onStateChange?: (state: any) => void;
}

type Gender = 'male' | 'female' | null;
type DrinkingLevel = 'none' | 'light' | 'heavy' | null;
type WeightLevel = 'normal' | 'light' | 'heavy' | null;
type ExerciseLevel = 'never' | 'weekly' | 'daily' | null;

interface TimeRemaining {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    decaseconds: number; // tenths of seconds
    totalDays: number;
}

export const FinalClockSpark: React.FC<FinalClockSparkProps> = ({ showSettings = false, onCloseSettings, onStateChange }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    // Form state
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<Gender>(null);
    const [isSmoker, setIsSmoker] = useState<boolean | null>(null);
    const [drinking, setDrinking] = useState<DrinkingLevel>(null);
    const [weight, setWeight] = useState<WeightLevel>(null);
    const [exercise, setExercise] = useState<ExerciseLevel>(null);

    // Calculated state
    const [deathDate, setDeathDate] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
    const [isSetup, setIsSetup] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [storedAge, setStoredAge] = useState<number | null>(null);
    const [darkMode, setDarkMode] = useState(false);

    // Load saved death date and dark mode preference
    useEffect(() => {
        const loadData = () => {
            const data = getSparkData('final-clock');
            if (data?.deathDate) {
                setDeathDate(new Date(data.deathDate));
                if (data?.age) {
                    setStoredAge(data.age);
                }
                setIsSetup(true);
            }
            if (data?.darkMode !== undefined) {
                setDarkMode(data.darkMode);
            }
        };
        loadData();
    }, []);

    // Notify parent about dark mode state
    useEffect(() => {
        onStateChange?.({ darkMode });
    }, [darkMode, onStateChange]);

    // Update countdown every 100ms for decaseconds (tenths of seconds)
    useEffect(() => {
        if (!deathDate) return;

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 100); // Update every 100ms for decaseconds

        return () => clearInterval(timer);
    }, [deathDate]);

    // Calculate time remaining
    useEffect(() => {
        if (!deathDate) return;

        const now = currentTime.getTime();
        const death = deathDate.getTime();
        const diff = death - now;

        if (diff <= 0) {
            setTimeRemaining({
                years: 0,
                months: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                decaseconds: 0,
                totalDays: 0,
            });
            return;
        }

        const totalMilliseconds = diff;
        const decaseconds = Math.floor((totalMilliseconds % 1000) / 100); // tenths of seconds
        const seconds = Math.floor(totalMilliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const years = Math.floor(days / 365.25);
        const months = Math.floor((days % 365.25) / 30.44);

        setTimeRemaining({
            years,
            months: months,
            days: Math.floor(days % 30.44),
            hours: hours % 24,
            minutes: minutes % 60,
            seconds: seconds % 60,
            decaseconds,
            totalDays: days,
        });
    }, [currentTime, deathDate]);

    const calculateLifeExpectancy = () => {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 120.');
            return;
        }

        if (gender === null) {
            Alert.alert('Missing Information', 'Please select your gender.');
            return;
        }

        if (isSmoker === null) {
            Alert.alert('Missing Information', 'Please indicate if you smoke.');
            return;
        }

        if (drinking === null) {
            Alert.alert('Missing Information', 'Please select your alcohol consumption level.');
            return;
        }

        if (weight === null) {
            Alert.alert('Missing Information', 'Please select your weight status.');
            return;
        }

        if (exercise === null) {
            Alert.alert('Missing Information', 'Please select your exercise frequency.');
            return;
        }

        // Base life expectancy (CDC 2023 data)
        let lifeExpectancy = gender === 'male' ? 76 : 81;

        // Apply lifestyle adjustments
        if (isSmoker) lifeExpectancy -= 10;

        if (drinking === 'light') lifeExpectancy -= 1;
        else if (drinking === 'heavy') lifeExpectancy -= 5;

        if (weight === 'light') lifeExpectancy -= 2;
        else if (weight === 'heavy') lifeExpectancy -= 5;

        if (exercise === 'daily') lifeExpectancy += 3;
        else if (exercise === 'weekly') lifeExpectancy += 2;
        else if (exercise === 'never') lifeExpectancy -= 1;

        // Calculate years remaining
        const yearsRemaining = lifeExpectancy - ageNum;

        if (yearsRemaining <= 0) {
            Alert.alert(
                'Statistical Anomaly',
                "Based on actuarial data, you're already living on borrowed time! Consider this your bonus round. 🎰"
            );
            return;
        }

        // Calculate death date
        const now = new Date();
        const projectedDeathDate = new Date(now);
        projectedDeathDate.setFullYear(now.getFullYear() + yearsRemaining);

        setDeathDate(projectedDeathDate);
        setStoredAge(ageNum);
        // Only store the calculated expiry date and age, not lifestyle choices
        setSparkData('final-clock', { 
            deathDate: projectedDeathDate.toISOString(),
            age: ageNum
        });
        setIsSetup(true);
        HapticFeedback.success();
    };

    const handleRecalculate = () => {
        setIsSetup(false);
        setDeathDate(null);
        setTimeRemaining(null);
        setStoredAge(null);
        // Reset all form fields
        setAge('');
        setGender(null);
        setIsSmoker(null);
        setDrinking(null);
        setWeight(null);
        setExercise(null);
        HapticFeedback.medium();
    };

    const getTimeRemainingPercent = (): number => {
        if (!deathDate || !timeRemaining || !storedAge) return 0;
        // Calculate total expected lifespan from birth to death
        // Total lifespan = age (in days) + time remaining (in days)
        const ageInDays = storedAge * 365.25;
        const totalLifespanDays = ageInDays + timeRemaining.totalDays;
        // Return percentage of time remaining (not time lived)
        if (totalLifespanDays <= 0) return 0;
        return Math.min(1, Math.max(0, timeRemaining.totalDays / totalLifespanDays));
    };

    const formatNumber = (num: number): string => {
        return num.toString().padStart(2, '0');
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        setSparkData('final-clock', { 
            ...getSparkData('final-clock'),
            darkMode: newDarkMode 
        });
        HapticFeedback.light();
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            padding: 20,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 32,
            textAlign: 'center',
        },
        formGroup: {
            marginBottom: 24,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
        },
        input: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: colors.text,
        },
        segmentedControl: {
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 4,
            gap: 4,
        },
        segment: {
            flex: 1,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        segmentActive: {
            backgroundColor: colors.primary,
        },
        segmentText: {
            fontSize: 14,
            color: colors.text,
            fontWeight: '500',
        },
        segmentTextActive: {
            color: '#fff',
            fontWeight: '600',
        },
        toggleContainer: {
            flexDirection: 'row',
            gap: 12,
        },
        toggleButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.border,
            alignItems: 'center',
        },
        toggleButtonActive: {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '20',
        },
        toggleButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        calculateButton: {
            backgroundColor: colors.primary,
            padding: 18,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 12,
        },
        calculateButtonText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#fff',
        },
        countdownContainer: {
            alignItems: 'center',
            paddingVertical: 40,
        },
        circleContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
        },
        circleText: {
            position: 'absolute',
            alignItems: 'center',
        },
        progressPercent: {
            fontSize: 48,
            fontWeight: 'bold',
            color: colors.text,
        },
        progressLabel: {
            fontSize: 16,
            color: colors.textSecondary,
            marginTop: 4,
        },
        timeGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 32,
        },
        timeBox: {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            minWidth: 100,
            alignItems: 'center',
        },
        timeValue: {
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.primary,
        },
        timeLabel: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 4,
        },
        editButton: {
            backgroundColor: colors.border,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        editButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        warningText: {
            fontSize: 14,
            color: colors.textSecondary,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 24,
        },
        closeButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 24,
        },
        closeButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff',
        },
    });

    const renderSettings = () => {
        const data = getSparkData('final-clock');
        const currentDarkMode = data?.darkMode || false;

        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader
                        title="Final Clock Settings"
                        subtitle="Manage your life expectancy calculations"
                        icon="☠️"
                        sparkId="final-clock"
                    />
                    
                    <SettingsFeedbackSection sparkName="Final Clock" sparkId="final-clock" />
                    
                    <View style={[styles.formGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 }]}>
                        <Text style={styles.label}>Dark Mode</Text>
                        <TouchableOpacity
                            onPress={() => {
                                const newDarkMode = !currentDarkMode;
                                setDarkMode(newDarkMode);
                                setSparkData('final-clock', { 
                                    ...data,
                                    darkMode: newDarkMode 
                                });
                                HapticFeedback.light();
                            }}
                            style={{
                                width: 50,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: currentDarkMode ? colors.primary : colors.border,
                                justifyContent: 'center',
                                paddingHorizontal: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 13,
                                    backgroundColor: '#fff',
                                    transform: [{ translateX: currentDarkMode ? 20 : 0 }],
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity style={styles.closeButton} onPress={onCloseSettings}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </SettingsScrollView>
            </SettingsContainer>
        );
    };

    if (showSettings) {
        return renderSettings();
    }

    if (!isSetup) {
        return (
            <View style={styles.container}>
                <ScrollView style={styles.scrollContent}>
                    <Text style={styles.title}>☠️ Final Clock</Text>
                    <Text style={styles.subtitle}>
                        How much time do you have left? Let's find out.
                    </Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Current Age</Text>
                        <TextInput
                            style={styles.input}
                            value={age}
                            onChangeText={setAge}
                            keyboardType="number-pad"
                            placeholder="Enter your age"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, gender === 'male' && styles.segmentActive]}
                                onPress={() => { setGender('male'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, gender === 'male' && styles.segmentTextActive]}>
                                    Male
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, gender === 'female' && styles.segmentActive]}
                                onPress={() => { setGender('female'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, gender === 'female' && styles.segmentTextActive]}>
                                    Female
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Do you smoke?</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, isSmoker === false && styles.segmentActive]}
                                onPress={() => { setIsSmoker(false); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, isSmoker === false && styles.segmentTextActive]}>
                                    No
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, isSmoker === true && styles.segmentActive]}
                                onPress={() => { setIsSmoker(true); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, isSmoker === true && styles.segmentTextActive]}>
                                    Yes
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Alcohol Consumption</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, drinking === 'none' && styles.segmentActive]}
                                onPress={() => { setDrinking('none'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, drinking === 'none' && styles.segmentTextActive]}>
                                    None
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, drinking === 'light' && styles.segmentActive]}
                                onPress={() => { setDrinking('light'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, drinking === 'light' && styles.segmentTextActive]}>
                                    A Little
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, drinking === 'heavy' && styles.segmentActive]}
                                onPress={() => { setDrinking('heavy'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, drinking === 'heavy' && styles.segmentTextActive]}>
                                    A Lot
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Weight Status</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, weight === 'normal' && styles.segmentActive]}
                                onPress={() => { setWeight('normal'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, weight === 'normal' && styles.segmentTextActive]}>
                                    Normal ||
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, weight === 'light' && styles.segmentActive]}
                                onPress={() => { setWeight('light'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, weight === 'light' && styles.segmentTextActive]}>
                                    Pudgy ()
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, weight === 'heavy' && styles.segmentActive]}
                                onPress={() => { setWeight('heavy'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, weight === 'heavy' && styles.segmentTextActive]}>
                                    Big O
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Exercise Frequency</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, exercise === 'never' && styles.segmentActive]}
                                onPress={() => { setExercise('never'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, exercise === 'never' && styles.segmentTextActive]}>
                                    Never!
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, exercise === 'weekly' && styles.segmentActive]}
                                onPress={() => { setExercise('weekly'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, exercise === 'weekly' && styles.segmentTextActive]}>
                                    Weekly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, exercise === 'daily' && styles.segmentActive]}
                                onPress={() => { setExercise('daily'); HapticFeedback.light(); }}
                            >
                                <Text style={[styles.segmentText, exercise === 'daily' && styles.segmentTextActive]}>
                                    Daily
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.calculateButton} onPress={calculateLifeExpectancy}>
                        <Text style={styles.calculateButtonText}>Calculate My Time</Text>
                    </TouchableOpacity>

                    <Text style={styles.warningText}>
                        Based on CDC actuarial data. For motivational purposes only.
                    </Text>
                </ScrollView>
            </View>
        );
    }

    // Countdown display
    const timeRemainingPercent = getTimeRemainingPercent();
    const size = 200;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - timeRemainingPercent);

    // Dark mode styles
    const darkModeStyles = StyleSheet.create({
        container: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000000',
        },
        darkModeText: {
            fontSize: 30,
            fontWeight: '900',
            color: '#FF0000',
            fontFamily: 'monospace',
            textShadowColor: '#FF0000',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 40,
            letterSpacing: 2,
            lineHeight: 40,
            flexShrink: 0,
            includeFontPadding: false,
            textAlign: 'center',
        },
        darkModeTextWrapper: {
            position: 'absolute',
            left: 100, // Space for button
            top: 0,
            width: Dimensions.get('window').width - 100,
            height: Dimensions.get('window').height,
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            paddingTop: 20,
        },
        darkModeTextContainer: {
            width: Dimensions.get('window').height - 200, // Full screen height minus padding
            minHeight: 50, // Minimum height for text
            justifyContent: 'center',
            alignItems: 'center',
        },
        darkModeContainer: {
            flex: 1,
            backgroundColor: '#000000',
            width: '100%',
            overflow: 'visible',
        },
        darkModeButton: {
            backgroundColor: '#333333',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 60,
            minHeight: 60,
        },
        darkModeButtonContainer: {
            position: 'absolute',
            left: 20,
            top: '50%',
            transform: [{ translateY: -30 }, { rotate: '90deg' }],
            zIndex: 10,
        },
        darkModeButtonText: {
            fontSize: 24,
            fontWeight: '600',
            color: '#FFFFFF',
        },
    });

    // Dark mode display
    if (darkMode && isSetup && timeRemaining) {
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        
        // Position text on left side (top when rotated 90deg)
        // Position at top-left, rotate 90deg, translate to visible position
        // After rotation: element's left becomes bottom, top becomes right
        // We want it on the left side, so position at top and translate after rotation
        const textWidth = screenHeight - 200;
        const textHeight = 50;
        
        // Rotate around top-left corner, then translate to visible area
        // After rotation, translate down (positive Y) to bring it into view
        // The rotation happens around the element's center, so we need to account for that
        const textTransform = [
            { rotate: '90deg' },
            { translateX: screenWidth - textHeight / 2 }, // Move to right edge
            { translateY: screenHeight / 2 - textWidth / 2 } // Center vertically (becomes horizontal when rotated)
        ];
        
        return (
            <View style={darkModeStyles.container}>
                <View style={darkModeStyles.darkModeContainer}>
                    <View style={darkModeStyles.darkModeTextWrapper}>
                        <View style={[
                            darkModeStyles.darkModeTextContainer,
                            { transform: textTransform }
                        ]}>
                            <Text 
                                style={darkModeStyles.darkModeText}
                                numberOfLines={1}
                                adjustsFontSizeToFit={false}
                            >
                                {timeRemaining.years.toString().padStart(2, '0')}:
                                {timeRemaining.months.toString().padStart(3, '0')}:
                                {timeRemaining.days.toString().padStart(2, '0')}:
                                {timeRemaining.hours.toString().padStart(2, '0')}:
                                {timeRemaining.minutes.toString().padStart(2, '0')}:
                                {timeRemaining.seconds.toString().padStart(2, '0')}:
                                {timeRemaining.decaseconds}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={darkModeStyles.darkModeButtonContainer}>
                    <TouchableOpacity style={darkModeStyles.darkModeButton} onPress={toggleDarkMode}>
                        <Text style={darkModeStyles.darkModeButtonText}>🔥</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.countdownContainer}>
                <Text style={styles.title}>☠️ Final Clock</Text>
                <Text style={styles.subtitle}>Time Remaining</Text>

                <View style={styles.circleContainer}>
                    <Svg width={size} height={size}>
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={colors.border}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={colors.primary}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            rotation="-90"
                            origin={`${size / 2}, ${size / 2}`}
                        />
                    </Svg>
                    <View style={styles.circleText}>
                        <Text style={styles.progressPercent}>{Math.round(timeRemainingPercent * 100)}%</Text>
                        <Text style={styles.progressLabel}>Time Left</Text>
                    </View>
                </View>

                {timeRemaining && (
                    <View style={styles.timeGrid}>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{timeRemaining.years}</Text>
                            <Text style={styles.timeLabel}>Years</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{timeRemaining.months}</Text>
                            <Text style={styles.timeLabel}>Months</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{formatNumber(timeRemaining.days)}</Text>
                            <Text style={styles.timeLabel}>Days</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{formatNumber(timeRemaining.hours)}</Text>
                            <Text style={styles.timeLabel}>Hours</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{formatNumber(timeRemaining.minutes)}</Text>
                            <Text style={styles.timeLabel}>Minutes</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeValue}>{formatNumber(timeRemaining.seconds)}</Text>
                            <Text style={styles.timeLabel}>Seconds</Text>
                        </View>
                    </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                    <TouchableOpacity style={styles.editButton} onPress={handleRecalculate}>
                        <Text style={styles.editButtonText}>Recalculate</Text>
                    </TouchableOpacity>
                    {isSetup && (
                        <TouchableOpacity style={styles.editButton} onPress={toggleDarkMode}>
                            <Text style={styles.editButtonText}>Dark Mode</Text>
                        </TouchableOpacity>
                    )}
                </View>


            </ScrollView>
        </View>
    );
};
