import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet,
    Text, TextInput, TouchableOpacity, useColorScheme, View, ScrollView,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useSparkStore } from '../store/sparkStore';
import { HapticFeedback } from '../utils/haptics';
import { GeminiService } from '../services/GeminiService';
import { useTheme } from '../contexts/ThemeContext';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection,
    SettingsButton,
    SettingsSection
} from '../components/SettingsComponents';
import { ServiceFactory } from '../services/ServiceFactory';

// --- Types & Interfaces ---

interface Hole {
    hole_number: number;
    par: number;
    stroke_index: number;
}

interface Course {
    id: number;
    name: string;
    rating: number;
    slope: number;
    expected_time?: string; // H:MM
    holes: Hole[];
}

interface Round {
    id: number;
    course_id: number;
    course_name: string;
    timestamp: number;
    begin_time?: number;
    end_time?: number;
    total_strokes?: number;
    total_putts?: number;
    is_completed: boolean;
    handicap_used?: number;
    net_score?: number;
    handicap_differential?: number;
}

interface Score {
    round_id: number;
    hole_number: number;
    strokes: number;
    putts: number;
    timestamp?: number;
}

interface ScorecardData {
    courses: Course[];
    rounds: Round[];
    scores: Score[];
}

interface HomeScreenProps {
    rounds: Round[];
    deleteRound: (id: number) => void;
    setActiveRoundId: (id: number | null) => void;
    setCurrentView: (view: 'home' | 'courses' | 'scoring') => void;
    colors: any;
    styles: any;
}

interface CoursesViewProps {
    courses: Course[];
    setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
    startRound: (courseId: number) => void;
    setCurrentView: (view: 'home' | 'courses' | 'scoring') => void;
    colors: any;
    styles: any;
}

interface ScoringViewProps {
    activeRoundId: number;
    rounds: Round[];
    setRounds: React.Dispatch<React.SetStateAction<Round[]>>;
    courses: Course[];
    scores: Score[];
    saveHoleScore: (roundId: number, holeNumber: number, strokes: number, putts: number) => void;
    markRoundComplete: (roundId: number) => void;
    setBeginTime: (roundId: number) => void;
    setCurrentView: (view: 'home' | 'courses' | 'scoring') => void;
    setShowHelp: (show: boolean) => void;
    colorMode: 'light' | 'dark';
    setColorMode: (mode: 'light' | 'dark') => void;
    colors: any;
    styles: any;
}

interface SettingsViewProps {
    colorMode: 'light' | 'dark';
    setColorMode: (mode: 'light' | 'dark') => void;
    onCloseSettings?: () => void;
}

// --- Colors ---

const Colors = {
    light: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#666666',
        border: '#F0F0F0',
        primary: '#1A8744', // Golf green
        error: '#E53935',
        danger: '#E53935',
        success: '#1A8744',
        card: '#FFFFFF',
        icon: '#1A8744',
        placeholder: '#BDBDBD',
    },
    dark: {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#AAAAAA',
        border: '#333333',
        primary: '#2E7D32',
        error: '#FF5252',
        danger: '#FF5252',
        success: '#2E7D32',
        card: '#1E1E1E',
        icon: '#2E7D32',
        placeholder: '#757575',
    }
};

// --- Handicap Service Logic ---

const HandicapService = {
    calculateNetDoubleBogey(scores: Score[], holes: Hole[], courseHandicap: number): number {
        let adjustedScore = 0;
        const holeCount = holes.length;
        for (const hole of holes) {
            const score = scores.find(s => s.hole_number === hole.hole_number);
            const strokesReceived = this.getStrokesForHole(courseHandicap, hole.stroke_index, holeCount);
            const maxScore = hole.par + 2 + strokesReceived;

            if (score && score.strokes > 0) {
                adjustedScore += Math.min(score.strokes, maxScore);
            } else {
                adjustedScore += maxScore;
            }
        }
        return adjustedScore;
    },

    getStrokesForHole(courseHandicap: number, strokeIndex: number, holeCount: number = 18): number {
        if (!strokeIndex) return 0;
        const baseHoles = holeCount === 9 ? 9 : 18;
        let strokes = Math.floor(courseHandicap / baseHoles);
        const remainder = courseHandicap % baseHoles;
        if (remainder > 0 && strokeIndex <= remainder) {
            strokes += 1;
        } else if (remainder < 0 && strokeIndex > (baseHoles + remainder)) {
            strokes -= 1;
        }
        return strokes;
    },

    calculateDifferential(adjustedGrossScore: number, rating: number, slope: number, holeCount: number = 18): number {
        const differential = (adjustedGrossScore - rating) * (113 / slope);
        const scaledDiff = holeCount === 9 ? differential * 2 : differential;
        return Math.round(scaledDiff * 10) / 10;
    },

    calculateHandicap(differentials: number[]): number | null {
        if (differentials.length < 2) return null;
        const sorted = [...differentials].sort((a, b) => a - b);
        let numToAverage = 1;
        if (differentials.length <= 5) numToAverage = 1;
        else if (differentials.length <= 8) numToAverage = 2;
        else if (differentials.length <= 11) numToAverage = 3;
        else if (differentials.length <= 16) numToAverage = 4;
        else if (differentials.length <= 19) numToAverage = 5;
        else numToAverage = 8;

        const sum = sorted.slice(0, numToAverage).reduce((acc, val) => acc + val, 0);
        return Math.round((sum / numToAverage) * 10) / 10;
    },

    calculateCourseHandicap(handicapIndex: number, slope: number, rating: number, par: number, holeCount: number = 18): number {
        const indexToUse = holeCount === 9 ? handicapIndex / 2 : handicapIndex;
        const adjustedHandicap = (indexToUse * (slope / 113)) + (rating - par);
        return Math.round(adjustedHandicap);
    },

    calculateNetScore(grossScore: number, courseHandicap: number): number {
        return grossScore - courseHandicap;
    }
};

// --- Helper Components ---

const HoleRow = React.forwardRef<any, {
    hole: Hole;
    score: { strokes: string; putts: string; timestamp?: number };
    onSave: (holeNumber: number, strokes: string, putts: string) => void;
    colors: any;
    styles: any;
    expectedElapsedTime?: number;
    beginTime?: number;
}>(({ hole, score, onSave, colors, styles, expectedElapsedTime, beginTime }, ref) => {
    const [localStrokes, setLocalStrokes] = useState(score.strokes);
    const [localPutts, setLocalPutts] = useState(score.putts);

    const strokesInputRef = useRef<TextInput>(null);
    const puttsInputRef = useRef<TextInput>(null);

    React.useImperativeHandle(ref, () => ({
        focusStrokes: () => strokesInputRef.current?.focus(),
        focusPutts: () => puttsInputRef.current?.focus(),
    }));

    useEffect(() => {
        setLocalStrokes(score.strokes);
        setLocalPutts(score.putts);
    }, [score.strokes, score.putts]);

    const handleBlur = () => {
        onSave(hole.hole_number, localStrokes, localPutts);
    };

    const strokesValue = parseInt(localStrokes) || 0;
    const netValue = strokesValue > 0 ? strokesValue - hole.par : 0;

    const actualTimestamp = score.timestamp;

    // Pace Calculation
    let paceDiff = 0;
    if (strokesValue > 0 && actualTimestamp && beginTime && expectedElapsedTime !== undefined) {
        const actualElapsed = (actualTimestamp - beginTime) / 60000;
        paceDiff = Math.round(expectedElapsedTime - actualElapsed);
    }

    return (
        <View style={styles.tableRow}>
            <View style={styles.holeCol}>
                <Text style={styles.holeNumber}>#{hole.hole_number}</Text>
            </View>
            <View style={styles.parCol}>
                <Text style={styles.parText}>{hole.par}</Text>
            </View>
            <View style={styles.inputCol}>
                <TextInput
                    ref={strokesInputRef}
                    style={styles.tableInput}
                    value={localStrokes}
                    onChangeText={setLocalStrokes}
                    onBlur={handleBlur}
                    keyboardType="numeric"
                    placeholderTextColor={colors.placeholder}
                    maxLength={2}
                />
            </View>
            <View style={styles.inputCol}>
                <TextInput
                    ref={puttsInputRef}
                    style={[
                        styles.tableInput,
                        (parseInt(localPutts) >= parseInt(localStrokes) && parseInt(localStrokes) > 0) && { borderColor: colors.error, borderWidth: 2 }
                    ]}
                    value={localPutts}
                    onChangeText={setLocalPutts}
                    onBlur={handleBlur}
                    keyboardType="numeric"
                    placeholderTextColor={colors.placeholder}
                    maxLength={2}
                />
            </View>
            <View style={styles.netCol}>
                <Text style={[styles.netText, netValue < 0 && { color: colors.error }]}>
                    {strokesValue > 0 ? (netValue > 0 ? `+${netValue}` : netValue) : ''}
                </Text>
            </View>
            <View style={styles.paceCol}>
                <Text style={styles.paceText}>
                    {strokesValue > 0 && !isNaN(paceDiff) ? (paceDiff > 0 ? `+${paceDiff}` : paceDiff) : ''}
                </Text>
            </View>
        </View>
    );
});

const HomeScreen: React.FC<HomeScreenProps> = ({
    rounds,
    deleteRound,
    setActiveRoundId,
    setCurrentView,
    colors,
    styles
}) => {
    const finishedRounds = rounds.filter(r => r.is_completed);
    const avgScore = finishedRounds.length > 0 ? Math.round(finishedRounds.reduce((sum, r) => sum + (r.total_strokes || 0), 0) / finishedRounds.length) : '--';

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.header, { justifyContent: 'space-between' }]}>
                <Text style={styles.title}>Scorecards</Text>
                <TouchableOpacity onPress={() => setCurrentView('courses')}>
                    <Ionicons name="settings-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.newRoundButton} onPress={() => setCurrentView('courses')}>
                <Text style={styles.newRoundButtonText}>NEW ROUND</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Rounds (Avg: {avgScore})</Text>
            </View>

            <FlatList
                data={rounds}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    const durationInMinutes = (item.end_time && item.begin_time) ? Math.round((item.end_time - item.begin_time) / 60000) : 0;
                    const h = Math.floor(durationInMinutes / 60);
                    const m = durationInMinutes % 60;
                    const durationStr = durationInMinutes > 0 ? `${h}:${m.toString().padStart(2, '0')}` : '--:--';

                    // Re-calculate pace based on last hole's differential if needed, 
                    // but for now we'll just show the strokes/putts/time.
                    // To show Pace accurately, we'd need the course expected time too.

                    return (
                        <View style={styles.roundCard}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => { setActiveRoundId(item.id); setCurrentView('scoring'); }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={styles.courseName}>{item.course_name} {item.is_completed && '✅'}</Text>
                                    <Text style={styles.roundDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                                </View>

                                {item.is_completed ? (
                                    <>
                                        <Text style={styles.roundStats}>
                                            Score: {item.total_strokes} • Putts: {item.total_putts || '--'} • Time: {durationStr}
                                        </Text>
                                        <Text style={[styles.roundStats, { marginTop: 2, color: colors.primary }]}>
                                            Handicap: {item.handicap_used?.toFixed(1) || 'N/A'} • Net: {item.net_score}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[styles.roundStats, { color: colors.textSecondary }]}>In Progress...</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => deleteRound(item.id)}>
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>No rounds yet.</Text>}
            />
        </View>
    );
};

const CoursesView: React.FC<CoursesViewProps> = ({
    courses,
    setCourses,
    startRound,
    setCurrentView,
    colors,
    styles
}) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [rating, setRating] = useState('72.0');
    const [slope, setSlope] = useState('113');
    const [roundTime, setRoundTime] = useState('4:00');
    const [holeCount, setHoleCount] = useState<'9' | '18'>('18');
    const [holeDetails, setHoleDetails] = useState<Record<number, { par: number, si: string }>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [genderPreference, setGenderPreference] = useState<'Men' | 'Ladies'>('Men');
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');

    useEffect(() => {
        if (showModal && !editingCourseId) {
            const count = parseInt(holeCount);
            const details: Record<number, { par: number, si: string }> = {};
            for (let i = 1; i <= count; i++) {
                details[i] = { par: 4, si: i.toString() };
            }
            setHoleDetails(details);
            setRoundTime(holeCount === '9' ? '2:00' : '4:00');
        }
    }, [holeCount, showModal, editingCourseId]);

    const startEdit = (course: Course) => {
        setEditingCourseId(course.id);
        setName(course.name);
        setRating(course.rating.toString());
        setSlope(course.slope.toString());
        setRoundTime(course.expected_time || '4:00');
        setHoleCount(course.holes.length === 9 ? '9' : '18');

        const details: Record<number, { par: number, si: string }> = {};
        course.holes.forEach(h => {
            details[h.hole_number] = { par: h.par, si: h.stroke_index.toString() };
        });
        setHoleDetails(details);
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingCourseId(null);
        setName('');
        setRating('72.0');
        setSlope('113');
        setRoundTime('4:00');
        setHoleCount('18');
        setHoleDetails({});
        setFormError(null);
        setShowModal(false);
    };

    const updateHoleDetail = (num: number, field: 'par' | 'si', value: any) => {
        setHoleDetails(prev => ({
            ...prev,
            [num]: { ...prev[num], [field]: value }
        }));
    };

    const processImage = async (launcher: any) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant permission to access your photos to scan a scorecard.');
                return;
            }

            const result = await launcher({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets?.[0]?.base64) {
                setIsScanning(true);
                setFormError(null);
                HapticFeedback.light();

                const prompt = `
                    Analyze this golf scorecard image.
                    The user is looking for info for the ${genderPreference} and "Standard" or "White" tees.
                    
                    Extract the following into a JSON object:
                    - "name": string (The course name)
                    - "rating": number (Course Rating for ${genderPreference} white/standard tees)
                    - "slope": number (Slope Rating for ${genderPreference} white/standard tees)
                    - "holes": array of 9 or 18 objects:
                      {
                        "hole_number": number,
                        "par": number,
                        "stroke_index": number
                      }
                    
                    Only return valid JSON. If you cannot find info for ${genderPreference} or standard tees, use the closest available set.
                    Make sure you extract ALL holes (usually 9 or 18).
                `;

                const data = await GeminiService.generateJSON<any>(prompt, [result.assets[0].base64]);

                if (data && data.name) {
                    setName(data.name);
                    setRating(data.rating?.toString() || '72.0');
                    setSlope(data.slope?.toString() || '113');
                    if (data.holes && data.holes.length > 0) {
                        setHoleCount(data.holes.length <= 9 ? '9' : '18');
                        const details: Record<number, { par: number, si: string }> = {};
                        data.holes.forEach((h: any) => {
                            details[h.hole_number] = {
                                par: h.par || 4,
                                si: h.stroke_index?.toString() || h.hole_number.toString()
                            };
                        });
                        setHoleDetails(details);
                    }
                    HapticFeedback.success();
                }
            }
        } catch (error: any) {
            console.error("Scan error:", error);
            setFormError("Failed to scan scorecard. Please try again or enter manually.");
            Alert.alert("Scan Error", "Failed to process the image. Ensure the card is clear and well-lit.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleScanCard = () => {
        if (Platform.OS === 'web') {
            processImage(ImagePicker.launchImageLibraryAsync);
            return;
        }
        Alert.alert(
            "Scan Scorecard",
            "Choose an image source",
            [
                { text: "Camera", onPress: () => processImage(ImagePicker.launchCameraAsync) },
                { text: "Photo Library", onPress: () => processImage(ImagePicker.launchImageLibraryAsync) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleDeleteCourse = () => {
        if (!courseToDelete) return;
        setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
        setCourseToDelete(null);
        setDeleteConfirmName('');
        HapticFeedback.success();
    };

    const saveCourse = () => {
        setFormError(null);
        if (!name.trim()) {
            setFormError("Please enter a course name");
            Alert.alert("Error", "Please enter a course name");
            return;
        }

        const count = parseInt(holeCount);
        const holeNums = Array.from({ length: count }, (_, i) => i + 1);

        const errors: string[] = [];
        const sis: number[] = [];

        for (const num of holeNums) {
            const detail = holeDetails[num];
            const si = parseInt(detail?.si || "");

            if (isNaN(si)) {
                errors.push(`Hole ${num} is missing a Stroke Index.`);
            } else if (si < 1 || si > count) {
                errors.push(`Hole ${num} Stroke Index must be between 1 and ${count}.`);
            } else {
                sis.push(si);
            }
        }

        if (errors.length > 0) {
            setFormError(errors[0]);
            Alert.alert("Validation Error", errors[0]);
            return;
        }

        const uniqueSis = new Set(sis);
        if (uniqueSis.size !== sis.length) {
            setFormError("Each hole must have a unique Stroke Index.");
            Alert.alert("Validation Error", "Each hole must have a unique Stroke Index.");
            return;
        }

        const holes: Hole[] = Object.keys(holeDetails).map(numStr => {
            const num = parseInt(numStr);
            const detail = holeDetails[num];
            return {
                hole_number: num,
                par: (detail && !isNaN(detail.par)) ? detail.par : 4,
                stroke_index: (detail && parseInt(detail.si)) ? parseInt(detail.si) : num
            };
        }).sort((a, b) => a.hole_number - b.hole_number);

        const courseData: Course = {
            id: editingCourseId || Date.now(),
            name,
            rating: parseFloat(rating) || 72.0,
            slope: parseFloat(slope) || 113,
            expected_time: roundTime,
            holes
        };

        if (editingCourseId) {
            setCourses(prev => prev.map(c => c.id === editingCourseId ? courseData : c));
        } else {
            setCourses(prev => [...prev, courseData]);
        }

        resetForm();
        HapticFeedback.success();
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setCurrentView('home')}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Courses</Text>
                <TouchableOpacity onPress={() => setShowModal(true)}>
                    <Ionicons name="add" size={30} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={courses}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.roundCard}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => startRound(item.id)}>
                            <Text style={styles.courseName}>{item.name}</Text>
                            <Text style={styles.roundDate}>Rating: {item.rating} • Slope: {item.slope} • {item.holes.length} holes</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={() => startEdit(item)}>
                                <Ionicons name="create-outline" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setCourseToDelete(item); setDeleteConfirmName(''); }}>
                                <Ionicons name="trash-outline" size={24} color={colors.danger} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => startRound(item.id)}>
                                <Ionicons name="play-circle" size={30} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>Add a course to start.</Text>}
            />

            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitleText}>{editingCourseId ? 'Edit Course' : 'New Course'}</Text>
                            <TouchableOpacity onPress={resetForm}><Ionicons name="close" size={28} color={colors.text} /></TouchableOpacity>
                        </View>

                        {formError && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={20} color="#fff" />
                                <Text style={styles.errorBannerText}>{formError}</Text>
                            </View>
                        )}

                        {!editingCourseId && (
                            <View style={styles.scanSection}>
                                <TouchableOpacity
                                    style={[styles.scanButton, isScanning && { opacity: 0.7 }]}
                                    onPress={handleScanCard}
                                    disabled={isScanning}
                                >
                                    {isScanning ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Ionicons name="camera-outline" size={20} color="#fff" />
                                    )}
                                    <Text style={styles.scanButtonText}>{isScanning ? 'Scanning...' : 'Scan Card'}</Text>
                                </TouchableOpacity>

                                <View style={styles.genderToggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.genderOption, genderPreference === 'Men' && styles.genderOptionActive]}
                                        onPress={() => setGenderPreference('Men')}
                                    >
                                        <Text style={[styles.genderOptionText, genderPreference === 'Men' && styles.genderOptionTextActive]}>Men</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.genderOption, genderPreference === 'Ladies' && styles.genderOptionActive]}
                                        onPress={() => setGenderPreference('Ladies')}
                                    >
                                        <Text style={[styles.genderOptionText, genderPreference === 'Ladies' && styles.genderOptionTextActive]}>Ladies</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <ScrollView style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Course Name</Text>
                            <TextInput style={styles.modernInput} value={name} onChangeText={setName} placeholder="Enter course name" placeholderTextColor={colors.placeholder} />

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Course Rating</Text>
                                    <TextInput style={styles.modernInput} value={rating} onChangeText={setRating} keyboardType="numeric" placeholder="72.0" placeholderTextColor={colors.placeholder} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Slope Rating</Text>
                                    <TextInput style={styles.modernInput} value={slope} onChangeText={setSlope} keyboardType="numeric" placeholder="113" placeholderTextColor={colors.placeholder} />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Expected Time (H:MM)</Text>
                                    <TextInput style={styles.modernInput} value={roundTime} onChangeText={setRoundTime} placeholder="4:00" placeholderTextColor={colors.placeholder} />
                                </View>
                                {!editingCourseId && (
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Holes</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity style={[styles.miniTabButton, holeCount === '9' && styles.miniTabButtonActive]} onPress={() => setHoleCount('9')}><Text style={[styles.miniTabButtonText, holeCount === '9' && { color: '#fff' }]}>9</Text></TouchableOpacity>
                                            <TouchableOpacity style={[styles.miniTabButton, holeCount === '18' && styles.miniTabButtonActive]} onPress={() => setHoleCount('18')}><Text style={[styles.miniTabButtonText, holeCount === '18' && { color: '#fff' }]}>18</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.sectionTitle}>Hole Details (Par & Stroke Index)</Text>

                            {Object.keys(holeDetails).sort((a, b) => parseInt(a) - parseInt(b)).map(numStr => {
                                const num = parseInt(numStr);
                                const detail = holeDetails[num];
                                if (!detail) return null;
                                return (
                                    <View key={num} style={styles.holeEditRow}>
                                        <Text style={styles.holeEditLabel}>Hole {num}</Text>
                                        <View style={styles.parButtonGroup}>
                                            {[3, 4, 5].map(p => (
                                                <TouchableOpacity
                                                    key={p}
                                                    onPress={() => updateHoleDetail(num, 'par', p)}
                                                    style={[styles.parButton, detail.par === p && styles.parButtonActive]}
                                                >
                                                    <Text style={[styles.parButtonText, detail.par === p && styles.parButtonTextActive]}>{p}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput
                                            style={styles.siInput}
                                            value={detail.si}
                                            onChangeText={(val) => updateHoleDetail(num, 'si', val)}
                                            placeholder="SI"
                                            placeholderTextColor={colors.placeholder}
                                            keyboardType="numeric"
                                            maxLength={2}
                                        />
                                    </View>
                                )
                            })}
                        </ScrollView>

                        <TouchableOpacity style={styles.saveCourseButton} onPress={saveCourse}>
                            <Text style={styles.saveCourseButtonText}>Save Course</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!courseToDelete} transparent animationType="fade">
                <View style={styles.modalOverlayCenter}>
                    <View style={[styles.modalContent, { height: 'auto', borderRadius: 24, padding: 24 }]}>
                        <Text style={styles.modalTitleText}>Delete Course?</Text>
                        <Text style={[styles.roundDate, { marginBottom: 20 }]}>
                            To delete "{courseToDelete?.name}", please type its name exactly below.
                        </Text>

                        <TextInput
                            style={[styles.modernInput, { marginBottom: 20 }]}
                            value={deleteConfirmName}
                            onChangeText={setDeleteConfirmName}
                            placeholder="Course Name"
                            placeholderTextColor={colors.placeholder}
                            autoFocus
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[styles.miniTabButton, { flex: 1, height: 45, backgroundColor: colors.background }]}
                                onPress={() => setCourseToDelete(null)}
                            >
                                <Text style={[styles.labelSmall, { fontSize: 14 }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.miniTabButton,
                                    { flex: 1, height: 45, backgroundColor: colors.danger },
                                    deleteConfirmName !== courseToDelete?.name && { opacity: 0.5 }
                                ]}
                                disabled={deleteConfirmName !== courseToDelete?.name}
                                onPress={handleDeleteCourse}
                            >
                                <Text style={[styles.labelSmall, { fontSize: 14, color: '#fff' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const ScoringView: React.FC<ScoringViewProps> = ({
    activeRoundId,
    rounds,
    setRounds,
    courses,
    scores,
    saveHoleScore,
    markRoundComplete,
    setBeginTime,
    setCurrentView,
    setShowHelp,
    colorMode,
    setColorMode,
    colors,
    styles
}) => {
    const round = rounds.find(r => r.id === activeRoundId);
    const course = courses.find(c => c.id === round?.course_id);
    const roundScores = scores.filter(s => s.round_id === activeRoundId);
    const [isRecording, setIsRecording] = useState(false);
    const speechTimeoutRef = useRef<any>(null);

    if (!round || !course) return null;

    const scoreMap: Record<number, { strokes: string, putts: string, timestamp?: number }> = {};
    roundScores.forEach(s => {
        scoreMap[s.hole_number] = { strokes: s.strokes.toString(), putts: s.putts.toString(), timestamp: s.timestamp };
    });

    const totals = {
        strokes: roundScores.reduce((sum, s) => sum + s.strokes, 0),
        putts: roundScores.reduce((sum, s) => sum + s.putts, 0),
        par: course.holes.reduce((sum, h) => sum + h.par, 0),
    };

    // Handicap Index N/A display
    const finishedRounds = rounds.filter(r => r.is_completed && r.handicap_differential !== undefined);
    const currentHandicapIndex = HandicapService.calculateHandicap(finishedRounds.map(r => r.handicap_differential!));
    const courseHandicap = currentHandicapIndex !== null
        ? HandicapService.calculateCourseHandicap(currentHandicapIndex, course.slope, course.rating, totals.par, course.holes.length)
        : 0;
    const indexText = currentHandicapIndex !== null
        ? `${currentHandicapIndex.toFixed(1)} (CH: ${courseHandicap})`
        : "N/A";

    // Pace logic
    const cumulativePar = course.holes.reduce((acc, h, i) => {
        const prevHoleNum = course.holes[i - 1]?.hole_number;
        const par = h.par || 0;
        acc[h.hole_number] = (acc[prevHoleNum] || 0) + (isNaN(par) ? 0 : par);
        return acc;
    }, {} as Record<number, number>);

    const totalCoursePar = totals.par || 72; // Avoid division by zero
    const [h, m] = (course.expected_time || "4:00").split(':').map(val => parseInt(val) || 0);
    const expectedTimeTotalMinutes = h * 60 + m;

    const holePaceMap = course.holes.reduce((acc, h) => {
        acc[h.hole_number] = ((cumulativePar[h.hole_number] || 0) / totalCoursePar) * expectedTimeTotalMinutes;
        return acc;
    }, {} as Record<number, number>);

    // Voice
    useSpeechRecognitionEvent("start", () => setIsRecording(true));
    useSpeechRecognitionEvent("end", () => setIsRecording(false));
    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results[event.results.length - 1]?.transcript;
        if (transcript) {
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = setTimeout(() => {
                parseVoice(transcript);
            }, 800);
        }
    });

    const canComplete = course.holes.every(h => scoreMap[h.hole_number]?.strokes && parseInt(scoreMap[h.hole_number].strokes) > 0);

    const parseVoice = (text: string) => {
        // Extract all numbers from the text
        const matches = text.match(/\d+/g);
        if (!matches) return;

        const nums = matches.map(m => parseInt(m));

        if (nums.length === 3) {
            // Specific Hole: [hole] [strokes] [putts]
            const [h, s, p] = nums;
            if (s > 0 && p >= s) {
                Alert.alert("Invalid Input", `Hole #${h}: Putts must be less than strokes (${s} vs ${p}).`);
                return;
            }
            saveHoleScore(activeRoundId!, h, s, p);
        } else if (nums.length === 2) {
            // Next Hole: [strokes] [putts]
            const nextHole = course.holes.find(h => !scoreMap[h.hole_number]?.strokes);
            if (nextHole) {
                const [s, p] = nums;
                if (s > 0 && p >= s) {
                    Alert.alert("Invalid Input", `Hole #${nextHole.hole_number}: Putts must be less than strokes (${s} vs ${p}).`);
                    return;
                }
                saveHoleScore(activeRoundId!, nextHole.hole_number, s, p);
            }
        }
    };

    const handleToggleMic = async () => {
        if (isRecording) ExpoSpeechRecognitionModule.stop();
        else {
            const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (res.granted) ExpoSpeechRecognitionModule.start({ lang: "en-US" });
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setCurrentView('home')}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{course.name}</Text>
                    <Text style={styles.helpText}>Ex: 5 2</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => setShowHelp(true)}><Ionicons name="help-circle-outline" size={24} color={colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}><Ionicons name={colorMode === 'light' ? "moon-outline" : "sunny-outline"} size={24} color={colors.primary} /></TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleMic} style={[styles.micButtonSmall, isRecording && { backgroundColor: colors.danger }]}><Ionicons name={isRecording ? "mic" : "mic-outline"} size={18} color="#fff" /></TouchableOpacity>
                </View>
            </View>

            {/* Sub-header Area */}
            <View style={styles.subHeader}>
                <View>
                    <Text style={styles.labelSmall}>INDEX</Text>
                    <Text style={[styles.indexValue, { color: colors.primary }]}>{indexText}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.completeRoundHeaderButton, !canComplete && { backgroundColor: '#cccccc', opacity: 0.7 }]}
                    onPress={() => markRoundComplete(activeRoundId!)}
                    disabled={!canComplete}
                >
                    <Text style={styles.completeRoundHeaderButtonText}>COMPLETE ROUND</Text>
                </TouchableOpacity>
            </View>

            {/* Consolidated Time Row */}
            <View style={styles.timeInfoRow}>
                <Text style={styles.timeInfoText}>
                    Rnd: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.timeInfoText}>Start: </Text>
                    <TouchableOpacity
                        style={!round.begin_time ? styles.setButtonTiny : null}
                        onPress={() => setBeginTime(activeRoundId!)}
                        disabled={!!round.begin_time}
                    >
                        <Text style={[styles.timeInfoText, !round.begin_time && styles.setButtonTinyText]}>
                            {round.begin_time ? new Date(round.begin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "SET"}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.timeInfoText}>
                    End: {round.end_time ? new Date(round.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                </Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.holeCol]}>HOLE</Text>
                <Text style={[styles.tableHeaderText, styles.parCol]}>PAR</Text>
                <Text style={[styles.tableHeaderText, styles.inputCol]}>SCORE</Text>
                <Text style={[styles.tableHeaderText, styles.inputCol]}>PUTTS</Text>
                <Text style={[styles.tableHeaderText, styles.netCol]}>NET</Text>
                <Text style={[styles.tableHeaderText, styles.paceCol]}>+/- MIN</Text>
            </View>

            <FlatList
                data={course.holes}
                keyExtractor={h => h.hole_number.toString()}
                renderItem={({ item }) => (
                    <HoleRow
                        hole={item}
                        score={scoreMap[item.hole_number] || { strokes: '', putts: '' }}
                        onSave={(h, s, p) => saveHoleScore(activeRoundId!, h, parseInt(s) || 0, parseInt(p) || 0)}
                        colors={colors}
                        styles={styles}
                        expectedElapsedTime={holePaceMap[item.hole_number]}
                        beginTime={round.begin_time}
                    />
                )}
                ListFooterComponent={
                    <View style={styles.tableFooterRow}>
                        <Text style={[styles.footerText, styles.holeCol]}>Total</Text>
                        <Text style={[styles.footerText, styles.parCol]}>{totals.par}</Text>
                        <Text style={[styles.footerText, styles.inputCol]}>{totals.strokes}</Text>
                        <Text style={[styles.footerText, styles.inputCol]}>{totals.putts}</Text>
                        <Text style={[styles.footerText, styles.netCol]}></Text>
                        <Text style={[styles.footerText, styles.paceCol]}></Text>
                    </View>
                }
            />
        </KeyboardAvoidingView>
    );
};

const SettingsView: React.FC<SettingsViewProps> = ({
    colorMode,
    setColorMode,
    onCloseSettings
}) => (
    <SettingsContainer>
        <SettingsScrollView>
            <SettingsHeader title="Scorecard Settings" subtitle="Configure your golf preferences" icon="⛳" sparkId="scorecard" />
            <SettingsFeedbackSection sparkName="Scorecard" sparkId="scorecard" />

            <SettingsSection title="Appearance">
                <SettingsButton
                    title={`Mode: ${colorMode === 'light' ? 'Light' : 'Dark'}`}
                    onPress={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}
                    variant="outline"
                />
            </SettingsSection>

            <SettingsButton title="Close" onPress={() => onCloseSettings?.()} />
        </SettingsScrollView>
    </SettingsContainer>
);

// --- Main Spark Component ---

export const ScorecardSpark: React.FC<{ showSettings?: boolean, onCloseSettings?: () => void }> = ({ showSettings, onCloseSettings }) => {
    const getSparkData = useSparkStore(state => state.getSparkData);
    const setSparkData = useSparkStore(state => state.setSparkData);

    // Local State for Navigation/View
    const [currentView, setCurrentView] = useState<'home' | 'scoring' | 'courses'>('home');
    const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
    const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

    // Data State
    const [courses, setCourses] = useState<Course[]>([]);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [scores, setScores] = useState<Score[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // Derived State
    const colors = Colors[colorMode];
    const styles = useMemo(() => getStyles(colors), [colors]);

    // Initial Load & Cleanup
    useEffect(() => {
        const data = getSparkData('scorecard') as ScorecardData;
        if (data) {
            // Defensive cleanup of any NaN values that might have entered the state
            const cleanCourses = (data.courses || []).map(c => ({
                ...c,
                rating: isNaN(c.rating) ? 72.0 : c.rating,
                slope: isNaN(c.slope) ? 113 : c.slope,
                holes: (c.holes || []).map(h => ({
                    ...h,
                    par: isNaN(h.par) ? 4 : h.par,
                    stroke_index: isNaN(h.stroke_index) ? h.hole_number : h.stroke_index
                }))
            }));

            const cleanRounds = (data.rounds || []).map(r => {
                const base = {
                    ...r,
                    begin_time: isNaN(r.begin_time as number) ? undefined : r.begin_time,
                    end_time: isNaN(r.end_time as number) ? undefined : r.end_time,
                };

                // Migration: Scale existing 9-hole differentials to 18-hole equivalents
                const course = cleanCourses.find(c => c.id === r.course_id);
                if (r.is_completed && r.handicap_differential !== undefined && course?.holes.length === 9 && !(r as any).diff_scaled) {
                    return {
                        ...base,
                        handicap_differential: Math.round(r.handicap_differential * 2 * 10) / 10,
                        diff_scaled: true
                    };
                }
                return base;
            });

            const cleanScores = (data.scores || []).filter(s => !isNaN(s.strokes) && !isNaN(s.putts));

            setCourses(cleanCourses);
            setRounds(cleanRounds);
            setScores(cleanScores);
        }
    }, [getSparkData]);

    // Save Changes
    useEffect(() => {
        setSparkData('scorecard', { courses, rounds, scores });
    }, [courses, rounds, scores, setSparkData]);

    useEffect(() => {
        ServiceFactory.getAnalyticsService().trackSparkOpen('scorecard', 'Scorecard');
    }, []);

    // --- Actions ---

    const startRound = (courseId: number) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        const newRound: Round = {
            id: Date.now(),
            course_id: courseId,
            course_name: course.name,
            timestamp: Date.now(),
            begin_time: Date.now(),
            is_completed: false,
        };

        setRounds(prev => [newRound, ...prev]);
        setActiveRoundId(newRound.id);
        setCurrentView('scoring');
        HapticFeedback.light();
    };

    const deleteRound = (id: number) => {
        const performDelete = () => {
            setRounds(prev => prev.filter(r => r.id !== id));
            setScores(prev => prev.filter(s => s.round_id !== id));
            HapticFeedback.medium();
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Delete this round?")) performDelete();
        } else {
            Alert.alert("Delete Round", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: performDelete }
            ]);
        }
    };

    const setBeginTime = (roundId: number) => {
        setRounds(prev => prev.map(r => {
            if (r.id === roundId && !r.begin_time) {
                return { ...r, begin_time: Date.now() };
            }
            return r;
        }));
        HapticFeedback.medium();
    };

    const saveHoleScore = (roundId: number, holeNumber: number, strokes: number, putts: number) => {
        const safeStrokes = isNaN(strokes) ? 0 : strokes;
        const safePutts = isNaN(putts) ? 0 : putts;

        if (safeStrokes > 0 && safePutts >= safeStrokes) {
            Alert.alert("Invalid Score", "Putts must be less than total strokes.");
            return;
        }

        setScores(prev => {
            const others = prev.filter(s => !(s.round_id === roundId && s.hole_number === holeNumber));
            if (safeStrokes === 0 && safePutts === 0) return others;
            return [...others, { round_id: roundId, hole_number: holeNumber, strokes: safeStrokes, putts: safePutts, timestamp: Date.now() }];
        });

        // Update round times if needed
        setRounds(prev => prev.map(r => {
            if (r.id === roundId) {
                let begin_time = r.begin_time;
                let end_time = r.end_time;

                const course = courses.find(c => c.id === r.course_id);
                if (course && holeNumber === course.holes.length && safeStrokes > 0) end_time = Date.now();
                return { ...r, begin_time, end_time };
            }
            return r;
        }));
        HapticFeedback.light();
    };

    const markRoundComplete = (roundId: number) => {
        const round = rounds.find(r => r.id === roundId);
        const course = courses.find(c => c && c.id === round?.course_id);
        if (!round || !course) return;

        const roundScores = scores.filter(s => s.round_id === roundId);

        // Validation: Ensure all holes have scores
        const missingHoles = course.holes
            .filter(h => !roundScores.find(s => s.hole_number === h.hole_number))
            .map(h => h.hole_number);

        if (missingHoles.length > 0) {
            Alert.alert(
                "Incomplete Round",
                `Please enter scores for all holes before completing the round. Missing: ${missingHoles.join(', ')}`
            );
            return;
        }

        const totalStrokes = roundScores.reduce((sum, s) => sum + s.strokes, 0);

        // Calculate handicap using only COMPLETED rounds for the index
        const previousCompletedRounds = rounds.filter(r => r.is_completed && r.handicap_differential !== undefined);
        const currentHandicapIndex = HandicapService.calculateHandicap(previousCompletedRounds.map(r => r.handicap_differential!));
        const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
        const courseHandicap = currentHandicapIndex !== null
            ? HandicapService.calculateCourseHandicap(currentHandicapIndex, course.slope, course.rating, totalPar, course.holes.length)
            : 0;

        const adjustedGross = HandicapService.calculateNetDoubleBogey(roundScores, course.holes, courseHandicap);
        const differential = HandicapService.calculateDifferential(adjustedGross, course.rating, course.slope, course.holes.length);
        const netScore = HandicapService.calculateNetScore(totalStrokes, courseHandicap);

        setRounds(prev => prev.map(r => r.id === roundId ? {
            ...r,
            is_completed: true,
            total_strokes: totalStrokes,
            total_putts: roundScores.reduce((sum, s) => sum + s.putts, 0),
            handicap_used: currentHandicapIndex ?? undefined,
            net_score: netScore,
            handicap_differential: differential,
            end_time: r.end_time || Date.now()
        } : r));

        setCurrentView('home');
        Alert.alert("Round Complete", `Score: ${totalStrokes}\nNet: ${netScore}\nDiff: ${differential}`);
    };


    if (showSettings) return (
        <SettingsView
            colorMode={colorMode}
            setColorMode={setColorMode}
            onCloseSettings={onCloseSettings}
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            {currentView === 'home' && (
                <HomeScreen
                    rounds={rounds}
                    deleteRound={deleteRound}
                    setActiveRoundId={setActiveRoundId}
                    setCurrentView={setCurrentView}
                    colors={colors}
                    styles={styles}
                />
            )}
            {currentView === 'courses' && (
                <CoursesView
                    courses={courses}
                    setCourses={setCourses}
                    startRound={startRound}
                    setCurrentView={setCurrentView}
                    colors={colors}
                    styles={styles}
                />
            )}
            {currentView === 'scoring' && activeRoundId && (
                <ScoringView
                    activeRoundId={activeRoundId}
                    rounds={rounds}
                    setRounds={setRounds}
                    courses={courses}
                    scores={scores}
                    saveHoleScore={saveHoleScore}
                    markRoundComplete={markRoundComplete}
                    setBeginTime={setBeginTime}
                    setCurrentView={setCurrentView}
                    setShowHelp={setShowHelp}
                    colorMode={colorMode}
                    setColorMode={setColorMode}
                    colors={colors}
                    styles={styles}
                />
            )}

            <Modal visible={showHelp} transparent animationType="fade">
                <View style={styles.modalOverlayCenter}>
                    <View style={styles.helpCard}>
                        <Text style={styles.helpCardTitle}>Help & Voice Commands</Text>
                        <ScrollView>
                            <Text style={[styles.helpDescription, { fontWeight: 'bold', color: colors.primary }]}>Voice Commands:</Text>
                            <Text style={styles.helpDescription}>• Use the microphone button and say only the numbers. Any words or punctuation will be ignored.</Text>
                            <Text style={styles.helpDescription}>• Next Hole: Say "[strokes] [putts]" (e.g., "5 1")</Text>
                            <Text style={styles.helpDescription}>• Specific Hole: Say "[hole] [strokes] [putts]" (e.g., "1 4 2")</Text>
                            <Text style={styles.helpDescription}>• Examples: "5-1", "5:1", and "5 and 1" all parse as "5 1"</Text>

                            <Text style={[styles.helpDescription, { fontWeight: 'bold', color: colors.primary, marginTop: 12 }]}>Scoring Info:</Text>
                            <Text style={styles.helpDescription}>• BEGIN: Press SET at your tee time or it will be inferred from Hole 1 finish.</Text>
                            <Text style={styles.helpDescription}>• NET: Shows score relative to par. Red means under par.</Text>
                            <Text style={styles.helpDescription}>• +/- MIN: Minutes ahead (+) or behind (-) the target pace.</Text>
                        </ScrollView>
                        <TouchableOpacity style={styles.closeHelpButton} onPress={() => setShowHelp(false)}>
                            <Text style={styles.closeHelpButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// --- Styles ---

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    helpText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: colors.surface },
    labelSmall: { fontSize: 10, color: colors.textSecondary, fontWeight: '700' },
    indexValue: { fontSize: 20, fontWeight: 'bold' },
    completeRoundHeaderButton: { backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    completeRoundHeaderButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoBox: { alignItems: 'center', minWidth: 80 },
    infoValue: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 4 },
    timeInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    timeInfoText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    setButtonTiny: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    setButtonTinyText: { color: '#FFF' },
    setButton: { backgroundColor: colors.primary, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 4, marginTop: 2 },
    setButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderText: { fontSize: 11, color: colors.textSecondary, fontWeight: 'bold', textAlign: 'center' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    holeCol: { width: 45 },
    parCol: { width: 45 },
    inputCol: { flex: 1 },
    netCol: { width: 45 },
    paceCol: { width: 60 },
    holeNumber: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    parText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
    tableInput: { backgroundColor: '#F9F9F9', borderRadius: 6, paddingVertical: 4, textAlign: 'center', color: colors.text, borderWidth: 1, borderColor: '#E0E0E0', marginHorizontal: 4, fontSize: 16 },
    netText: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center' },
    paceText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    tableFooterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: '#F8F8F8', borderTopWidth: 2, borderTopColor: colors.border },
    footerText: { fontSize: 16, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
    newRoundButton: { backgroundColor: colors.primary, margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
    newRoundButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    sectionHeader: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    roundCard: { backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    courseName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    roundDate: { fontSize: 14, color: colors.textSecondary },
    roundStats: { fontSize: 14, color: colors.primary, fontWeight: '500', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitleText: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    modernInput: { backgroundColor: colors.background, borderRadius: 12, padding: 14, color: colors.text, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    holeEditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    holeEditLabel: { width: 60, fontSize: 16, fontWeight: '500', color: colors.text },
    parButtonGroup: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
    parButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    parButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    parButtonText: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    parButtonTextActive: { color: '#fff' },
    siInput: { width: 50, backgroundColor: colors.background, borderRadius: 8, padding: 8, textAlign: 'center', color: colors.text, borderWidth: 1, borderColor: colors.border },
    scanSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    scanButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, justifyContent: 'center' },
    scanButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    genderToggleContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border },
    genderOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    genderOptionActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    genderOptionText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    genderOptionTextActive: { color: colors.primary },
    saveCourseButton: { backgroundColor: colors.success, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    saveCourseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    miniTabButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    miniTabButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    miniTabButtonText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
    helpCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, maxHeight: '80%' },
    helpCardTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
    helpDescription: { fontSize: 16, color: colors.text, marginBottom: 12 },
    closeHelpButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeHelpButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    micButtonSmall: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger, padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
    errorBannerText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});
