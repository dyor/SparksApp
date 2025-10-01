import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSparkStore } from '../store';
import { HapticFeedback } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import {
  SettingsContainer,
  SettingsScrollView,
  SettingsHeader,
  SettingsSection,
  SettingsFeedbackSection,
  SettingsText,
  SaveCancelButtons,
} from '../components/SettingsComponents';

// Data Models
interface Course {
  id: string;
  name: string;
  holes: Hole[];
  createdAt: number;
}

interface Hole {
  number: number;
  par: number; // 3, 4, or 5
  strokeIndex: number; // 1-18 (relative difficulty)
  distanceYards?: number; // Distance to hole in yards
  todaysDistance?: number; // Today's distance (optional, can vary day to day)
}

interface Shot {
  id: string;
  type: 'iron' | 'putt';
  direction?: 'good' | 'left' | 'right' | 'long' | 'short' | 'left and short' | 'left and long' | 'right and short' | 'right and long';
  lie?: 'fairway' | 'rough' | 'sand' | 'green' | 'ob'; // For iron shots
  puttDistance?: '<4ft' | '5-10ft' | '10+ft'; // For putts
  club?: string; // For iron shots
  timestamp: number;
}

interface HoleScore {
  holeNumber: number;
  courseId: string;
  shots: Shot[];
  totalScore: number;
  par: number;
  netScore: number; // Score relative to par
  completedAt: number;
}

interface Round {
  id: string;
  courseId: string;
  courseName: string;
  holeScores: HoleScore[];
  totalScore: number;
  totalPar: number;
  startedAt: number;
  completedAt?: number;
  isComplete: boolean;
}

interface GolfTrackerData {
  courses: Course[];
  rounds: Round[];
  currentRound?: Round;
  settings: {
    defaultCourse?: string;
    showHints: boolean;
    autoAdvance: boolean;
    clubs: string[];
    handicap?: number;
  };
}

// Historical data aggregation for hole analysis
interface HoleHistory {
  holeNumber: number;
  courseId: string;
  totalRounds: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  commonShots: {
    iron: Shot[];
    putts: Shot[];
  };
  recentRounds: HoleScore[];
}

// Helper function to calculate hole history
const calculateHoleHistory = (holeNumber: number, courseId: string, rounds: Round[]): HoleHistory => {
  const holeScores = rounds
    .filter(round => round.courseId === courseId && round.isComplete)
    .flatMap(round => round.holeScores)
    .filter(holeScore => holeScore.holeNumber === holeNumber);

  if (holeScores.length === 0) {
    return {
      holeNumber,
      courseId,
      totalRounds: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      commonShots: { iron: [], putts: [] },
      recentRounds: [],
    };
  }

  const scores = holeScores.map(hs => hs.totalScore);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.min(...scores);
  const worstScore = Math.max(...scores);

  // Get all shots for this hole
  const allShots = holeScores.flatMap(hs => hs.shots);
  const ironShots = allShots.filter(shot => shot.type === 'iron');
  const puttShots = allShots.filter(shot => shot.type === 'putt');

  // Get recent rounds (last 5)
  const recentRounds = holeScores
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 5);

  return {
    holeNumber,
    courseId,
    totalRounds: holeScores.length,
    averageScore: Math.round(averageScore * 10) / 10,
    bestScore,
    worstScore,
    commonShots: {
      iron: ironShots,
      putts: puttShots,
    },
    recentRounds,
  };
};

interface GolfTrackerSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

// Constants
// Shot quality grid layout (3x3)
const SHOT_QUALITY_GRID = [
  ['left and long', 'left', 'left and short'],
  ['long', 'good', 'short'],
  ['right and long', 'right', 'right and short']
] as const;

const LIE_OPTIONS = ['fairway', 'rough', 'sand', 'green', 'ob'] as const;

const PUTT_DISTANCE_OPTIONS = [
  { label: 'Less than 4 feet', value: '<4ft' },
  { label: '5 to 10 feet', value: '5-10ft' },
  { label: '10+ feet', value: '10+ft' }
] as const;

const DEFAULT_CLUBS = [
  'Driver',
  '3-Wood',
  '5-Wood',
  '4-Iron',
  '5-Iron',
  '6-Iron',
  '7-Iron',
  '8-Iron',
  '9-Iron',
  'Pitching Wedge',
  'Gap Wedge',
  'Sand Wedge',
  'Lob Wedge',
  'Putter',
];

const DEFAULT_COURSE: Course = {
  id: 'tam-oshanter-temp',
  name: "Tam O'Shanter Temp",
  createdAt: Date.now(),
  holes: [
    { number: 1, par: 5, strokeIndex: 6, distanceYards: 450 },
    { number: 2, par: 4, strokeIndex: 8, distanceYards: 344 },
    { number: 3, par: 3, strokeIndex: 18, distanceYards: 123 },
    { number: 4, par: 3, strokeIndex: 12, distanceYards: 180 },
    { number: 5, par: 3, strokeIndex: 10, distanceYards: 195 },
    { number: 6, par: 3, strokeIndex: 16, distanceYards: 140 },
    { number: 7, par: 4, strokeIndex: 4, distanceYards: 367 },
    { number: 8, par: 3, strokeIndex: 14, distanceYards: 164 },
    { number: 9, par: 4, strokeIndex: 2, distanceYards: 406 },
    { number: 10, par: 5, strokeIndex: 5, distanceYards: 461 },
    { number: 11, par: 4, strokeIndex: 7, distanceYards: 360 },
    { number: 12, par: 3, strokeIndex: 17, distanceYards: 124 },
    { number: 13, par: 3, strokeIndex: 11, distanceYards: 185 },
    { number: 14, par: 3, strokeIndex: 9, distanceYards: 207 },
    { number: 15, par: 3, strokeIndex: 15, distanceYards: 140 },
    { number: 16, par: 4, strokeIndex: 3, distanceYards: 367 },
    { number: 17, par: 3, strokeIndex: 13, distanceYards: 171 },
    { number: 18, par: 4, strokeIndex: 1, distanceYards: 411 }
  ]
};

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

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={[style, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
      >
        <Text style={textStyle}>{selectedValue || placeholder}</Text>
        <Text style={[textStyle, { fontSize: 12 }]}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 6,
          zIndex: 1000,
          maxHeight: 200,
        }}>
          <ScrollView style={{ maxHeight: 200 }}>
            {options?.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#eee',
                }}
              >
                <Text style={[textStyle, { color: '#333' }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Function to analyze historical data by shot position
const analyzeHistoricalDataByShotPosition = (holeHistory: HoleHistory) => {
  const shotPositionData: { [key: string]: { [key: string]: number } } = {};
  
  // Process each round's hole score
  holeHistory.recentRounds.forEach(holeScore => {
    const shots = holeScore.shots || [];
    
    // Group shots by type and position
    const ironShots = shots.filter(shot => shot.type === 'iron').sort((a, b) => a.timestamp - b.timestamp);
    const putts = shots.filter(shot => shot.type === 'putt').sort((a, b) => a.timestamp - b.timestamp);
    
    // Process iron shots by position
    ironShots.forEach((shot, index) => {
      const positionKey = `iron-${index + 1}`;
      if (!shotPositionData[positionKey]) {
        shotPositionData[positionKey] = {};
      }
      if (shot.direction) {
        shotPositionData[positionKey][shot.direction] = (shotPositionData[positionKey][shot.direction] || 0) + 1;
      }
    });
    
    // Process putts by position
    putts.forEach((putt, index) => {
      const positionKey = `putt-${index + 1}`;
      if (!shotPositionData[positionKey]) {
        shotPositionData[positionKey] = {};
      }
      if (putt.direction) {
        shotPositionData[positionKey][putt.direction] = (shotPositionData[positionKey][putt.direction] || 0) + 1;
      }
    });
  });
  
  return shotPositionData;
};

// Hole History Modal Component
const HoleHistoryModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  holeHistory: HoleHistory;
  courseName: string;
  colors: any;
}> = ({ visible, onClose, holeHistory, courseName, colors }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number, par: number) => {
    const netScore = score - par;
    if (netScore < 0) return '#4CAF50'; // Green for under par
    if (netScore === 0) return '#2196F3'; // Blue for par
    if (netScore <= 2) return '#FF9800'; // Orange for bogey/double bogey
    return '#F44336'; // Red for worse
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 500,
      maxHeight: '90%',
      flex: 1,
    },
    scrollContent: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    courseName: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 24,
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      marginTop: 16,
    },
    recentRoundsList: {
      marginBottom: 16,
    },
    roundItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    roundDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    roundScore: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    roundNetScore: {
      fontSize: 12,
      marginLeft: 8,
    },
    shotAnalysis: {
      marginTop: 16,
    },
    todaysDistanceCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionButtonsCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    navigationButtons: {
      flexDirection: 'row',
      padding: 20,
      paddingBottom: 40, // Move up from bottom
      gap: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 80,
    },
    addShotCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addPuttContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    addShotContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    todaysDistanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionHeader: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    expectedText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    closeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    closeButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (holeHistory.totalRounds === 0) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hole {holeHistory.holeNumber} History</Text>
            <Text style={styles.courseName}>{courseName}</Text>
            
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No rounds played on this hole yet</Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Hole {holeHistory.holeNumber} History</Text>
          <Text style={styles.courseName}>{courseName}</Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Statistics */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{holeHistory.totalRounds}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{holeHistory.averageScore}</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: getScoreColor(holeHistory.bestScore, 4) }]}>
                  {holeHistory.bestScore}
                </Text>
                <Text style={styles.statLabel}>Best</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: getScoreColor(holeHistory.worstScore, 4) }]}>
                  {holeHistory.worstScore}
                </Text>
                <Text style={styles.statLabel}>Worst</Text>
              </View>
            </View>

            {/* Recent Rounds */}
            <Text style={styles.sectionTitle}>Recent Rounds</Text>
            <View style={styles.recentRoundsList}>
              {holeHistory.recentRounds.map((round, index) => {
                const netScore = round.totalScore - round.par;
                return (
                  <View key={index} style={styles.roundItem}>
                    <Text style={styles.roundDate}>
                      {formatDate(round.completedAt)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.roundScore, { color: getScoreColor(round.totalScore, round.par) }]}>
                        {round.totalScore}
                      </Text>
                      <Text style={[styles.roundNetScore, { color: getScoreColor(round.totalScore, round.par) }]}>
                        ({netScore > 0 ? `+${netScore}` : netScore === 0 ? 'E' : netScore})
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Historical Shot Analysis by Position */}
            <View style={styles.shotAnalysis}>
              <Text style={styles.sectionTitle}>Historical Shot Patterns</Text>
              {(() => {
                const shotPositionData = analyzeHistoricalDataByShotPosition(holeHistory);
                const shotPositions = Object.keys(shotPositionData).sort();
                
                return shotPositions.map(positionKey => {
                  const [shotType, shotNumber] = positionKey.split('-');
                  const historicalData = shotPositionData[positionKey];
                  
                  return (
                    <HistoricalOutcomeGrid
                      key={positionKey}
                      shotType={shotType as 'iron' | 'putt'}
                      shotNumber={parseInt(shotNumber)}
                      historicalData={historicalData}
                      colors={colors}
                    />
                  );
                });
              })()}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Round Summary Screen Component
const RoundSummaryScreen: React.FC<{
  round: Round;
  course: Course;
  onNewRound: () => void;
  onViewRounds: () => void;
  onClose: () => void;
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  colors: any;
}> = ({ round, course, onNewRound, onViewRounds, onClose, handicap, getBumpsForHole, colors }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number, par: number) => {
    const netScore = score - par;
    if (netScore < 0) return '#4CAF50'; // Green for under par
    if (netScore === 0) return '#2196F3'; // Blue for par
    if (netScore <= 2) return '#FF9800'; // Orange for bogey/double bogey
    return '#F44336'; // Red for worse
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
      alignItems: 'center',
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
    incompleteText: {
      fontSize: 14,
      color: colors.primary,
      textAlign: 'center',
      marginTop: 4,
      fontWeight: '500',
    },
    scorecard: {
      backgroundColor: colors.surface,
      margin: 20,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scorecardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    courseName: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    totalScore: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    holesGrid: {
      gap: 8,
    },
    frontNine: {
      backgroundColor: '#E3F2FD', // Light blue for front 9
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
    },
    backNine: {
      backgroundColor: '#E8F5E8', // Light green for back 9
      borderRadius: 8,
      padding: 8,
    },
    frontNineTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    backNineTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    holesRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    holesRowLast: {
      flexDirection: 'row',
      gap: 8,
    },
    holeCard: {
      flex: 1,
      aspectRatio: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    holeNumber: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    holeScore: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    holePar: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    bumpIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    bumpIndicators: {
      position: 'absolute',
      top: 4,
      right: 4,
      flexDirection: 'row',
      gap: 2,
    },
    bumpDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      margin: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    buttons: {
      padding: 20,
      gap: 12,
    },
    button: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.primary,
    },
  });

  // Calculate current total score for incomplete rounds
  const currentTotalScore = (round.holeScores || []).reduce((sum, hs) => sum + hs.totalScore, 0);
  const currentTotalPar = (round.holeScores || []).reduce((sum, hs) => sum + hs.par, 0);
  const netScore = currentTotalScore - currentTotalPar;
  const underParHoles = (round.holeScores || []).filter(hs => hs.totalScore < hs.par).length;
  const parHoles = (round.holeScores || []).filter(hs => hs.totalScore === hs.par).length;
  const overParHoles = (round.holeScores || []).filter(hs => hs.totalScore > hs.par).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.title}>
          {round.isComplete ? 'Round Complete!' : 'Round Summary'}
        </Text>
        <Text style={styles.subtitle}>
          {course.name} • {formatDate(round.completedAt || round.startedAt)}
        </Text>
        {!round.isComplete && (
          <Text style={styles.incompleteText}>
            Through {round.holeScores?.length || 0} holes
          </Text>
        )}
      </View>

      {/* Scorecard */}
      <View style={styles.scorecard}>
        <View style={styles.scorecardHeader}>
          <Text style={styles.courseName}>Scorecard</Text>
          <Text style={styles.totalScore}>
            {currentTotalScore} ({netScore > 0 ? `+${netScore}` : netScore === 0 ? 'E' : netScore})
          </Text>
        </View>

        <View style={styles.holesGrid}>
          {/* Front 9 */}
          <View style={styles.frontNine}>
            <Text style={styles.frontNineTitle}>Front 9</Text>
            
            {/* Row 1: Holes 1-4 */}
            <View style={styles.holesRow}>
              {[1, 2, 3, 4].map(holeNumber => {
                const hole = (course.holes || []).find(h => h.number === holeNumber);
                if (!hole) return null;
                const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === hole.number);
                const score = holeScore?.totalScore || 0;
                const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
                
                return (
                  <View key={hole.number} style={styles.holeCard}>
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={i} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? score : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </View>
                );
              })}
            </View>
            
            {/* Row 2: Holes 5-9 */}
            <View style={styles.holesRowLast}>
              {[5, 6, 7, 8, 9].map(holeNumber => {
                const hole = (course.holes || []).find(h => h.number === holeNumber);
                if (!hole) return null;
                const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === hole.number);
                const score = holeScore?.totalScore || 0;
                const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
                
                return (
                  <View key={hole.number} style={styles.holeCard}>
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={i} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? score : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Back 9 */}
          <View style={styles.backNine}>
            <Text style={styles.backNineTitle}>Back 9</Text>
            
            {/* Row 3: Holes 10-13 */}
            <View style={styles.holesRow}>
              {[10, 11, 12, 13].map(holeNumber => {
                const hole = (course.holes || []).find(h => h.number === holeNumber);
                if (!hole) return null;
                const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === hole.number);
                const score = holeScore?.totalScore || 0;
                const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
                
                return (
                  <View key={hole.number} style={styles.holeCard}>
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={i} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? score : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </View>
                );
              })}
            </View>
            
            {/* Row 4: Holes 14-18 */}
            <View style={styles.holesRowLast}>
              {[14, 15, 16, 17, 18].map(holeNumber => {
                const hole = (course.holes || []).find(h => h.number === holeNumber);
                if (!hole) return null;
                const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === hole.number);
                const score = holeScore?.totalScore || 0;
                const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
                
                return (
                  <View key={hole.number} style={styles.holeCard}>
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={i} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? score : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{round.totalScore}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getScoreColor(round.totalScore, round.totalPar) }]}>
            {netScore > 0 ? `+${netScore}` : netScore === 0 ? 'E' : netScore}
          </Text>
          <Text style={styles.statLabel}>Net</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{underParHoles}</Text>
          <Text style={styles.statLabel}>Under Par</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>{parHoles}</Text>
          <Text style={styles.statLabel}>Par</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>{overParHoles}</Text>
          <Text style={styles.statLabel}>Over Par</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onNewRound}>
          <Text style={[styles.buttonText, styles.primaryButtonText]}>Start New Round</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onViewRounds}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>View All Rounds</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Course Edit Modal
const EditCourseModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  course: Course;
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  colors: any;
}> = ({ visible, onClose, course, onUpdateCourse, colors }) => {
  const [courseName, setCourseName] = useState(course?.name || '');
  const [parList, setParList] = useState(course?.holes?.map(h => h.par).join(' ') || '');
  const [difficultyList, setDifficultyList] = useState(course?.holes?.map(h => h.strokeIndex).join(' ') || '');
  const [distanceList, setDistanceList] = useState(course?.holes?.filter(h => h.distanceYards).map(h => h.distanceYards).join(' ') || '');

  // Guard clause to prevent rendering if course is null
  if (!course) {
    return null;
  }

  const parseSpaceSeparatedList = (input: string, min: number, max: number): number[] => {
    if (!input.trim()) return [];
    return input
      .trim()
      .split(/\s+/)
      .map(item => parseInt(item))
      .filter(num => !isNaN(num) && num >= min && num <= max);
  };

  const handleUpdate = () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const pars = parseSpaceSeparatedList(parList, 3, 5);
    const difficulties = parseSpaceSeparatedList(difficultyList, 1, 18);
    const distances = parseSpaceSeparatedList(distanceList, 50, 600);

    // If no pars provided, default to 18 par 4s
    const finalPars = pars.length > 0 ? pars : Array(18).fill(4);
    
    // If no difficulties provided, default to sequential 1-18
    const finalDifficulties = difficulties.length > 0 ? difficulties : Array.from({ length: finalPars.length }, (_, i) => i + 1);

    // If no distances provided, don't set distanceYards at all (make it optional)
    const finalDistances = distances.length > 0 ? distances : [];

    // Ensure we have the same number of pars and difficulties
    const holeCount = Math.max(finalPars.length, finalDifficulties.length);
    const holes: Hole[] = Array.from({ length: holeCount }, (_, index) => ({
      number: index + 1,
      par: finalPars[index] || 4,
      strokeIndex: finalDifficulties[index] || index + 1,
      // Only set distanceYards if distances were provided
      ...(finalDistances.length > 0 && { distanceYards: finalDistances[index] || undefined }),
    }));

    onUpdateCourse(course.id, {
      name: courseName.trim(),
      holes,
    });

    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 500,
      maxHeight: '90%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      fontStyle: 'italic',
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    updateButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    updateButtonText: {
      color: colors.background,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Course</Text>

          <TextInput
            style={styles.input}
            placeholder="Course Name"
            placeholderTextColor={colors.textSecondary}
            value={courseName}
            onChangeText={setCourseName}
          />

          <Text style={styles.fieldLabel}>Par List</Text>
          <TextInput
            style={styles.input}
            placeholder="4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 5"
            placeholderTextColor={colors.textSecondary}
            value={parList}
            onChangeText={setParList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of pars (3-5).
          </Text>

          <Text style={styles.fieldLabel}>Difficulty Index List</Text>
          <TextInput
            style={styles.input}
            placeholder="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18"
            placeholderTextColor={colors.textSecondary}
            value={difficultyList}
            onChangeText={setDifficultyList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of difficulty indexes (1-18).
          </Text>

          <Text style={styles.fieldLabel}>Distance List</Text>
          <TextInput
            style={styles.input}
            placeholder="400 350 150 550 400 380 140 520 400 420 160 580 400 360 130 500 400 450"
            placeholderTextColor={colors.textSecondary}
            value={distanceList}
            onChangeText={setDistanceList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of distances in yards (50-600).
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.updateButton]} onPress={handleUpdate}>
              <Text style={[styles.buttonText, styles.updateButtonText]}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Settings Component
const GolfTrackerSettings: React.FC<{
  onClose: () => void;
  courses: Course[];
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void;
  onDeleteCourse: (courseId: string) => void;
  data: GolfTrackerData;
  onUpdateSettings: (settings: Partial<GolfTrackerData['settings']>) => void;
  onEditRound?: (round: Round) => void;
  onDeleteRound?: (roundId: string) => void;
  colors: any;
}> = ({ onClose, courses, onUpdateCourse, onDeleteCourse, data, onUpdateSettings, onEditRound, onDeleteRound, colors }) => {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [showAllRounds, setShowAllRounds] = useState(false);
  
  // Local state for settings changes
  const [localSettings, setLocalSettings] = useState<GolfTrackerData['settings']>(data.settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
  };

  const handleDeleteCourse = (courseId: string) => {
    Alert.alert(
      'Delete Course',
      'Are you sure you want to delete this course? This will also delete all associated round data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteCourse(courseId);
            HapticFeedback.light();
          },
        },
      ]
    );
  };

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    onClose();
  };

  const handleCancelSettings = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setLocalSettings(data.settings);
              setHasChanges(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  // Rounds management functions
  const sortedRounds = (data.rounds || []).sort((a, b) => 
    (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt)
  );
  
  const displayedRounds = showAllRounds ? sortedRounds : sortedRounds.slice(0, 10);
  
  const handleShowMoreRounds = () => {
    setShowAllRounds(true);
  };
  
  const handleEditRound = (round: Round) => {
    Alert.alert(
      'Edit Round',
      'Editing this round will make it active again. You cannot start a new round until this one is completed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Round', onPress: () => {
          // This will be handled by the parent component
          onEditRound?.(round);
        }},
      ]
    );
  };
  
  const handleDeleteRound = (round: Round) => {
    const course = courses.find(c => c.id === round.courseId);
    Alert.alert(
      'Delete Round',
      `Are you sure you want to delete this round from ${course?.name || 'Unknown Course'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          onDeleteRound?.(round.id);
        }},
      ]
    );
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const getScoreColor = (score: number, par: number) => {
    const netScore = score - par;
    if (netScore < 0) return '#4CAF50'; // Green for under par
    if (netScore === 0) return '#2196F3'; // Blue for par
    return '#F44336'; // Red for over par
  };

  const updateLocalSetting = (key: keyof GolfTrackerData['settings'], value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleAddClub = () => {
    const clubs = localSettings.clubs || DEFAULT_CLUBS;
    if (newClubName.trim() && !clubs.includes(newClubName.trim())) {
      updateLocalSetting('clubs', [...clubs, newClubName.trim()]);
      setNewClubName('');
      HapticFeedback.light();
    }
  };

  const styles = StyleSheet.create({
    courseCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    courseName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    courseInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    courseActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    editButton: {
      backgroundColor: colors.primary,
    },
    deleteButton: {
      backgroundColor: '#ff4444',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    editButtonText: {
      color: colors.background,
    },
    deleteButtonText: {
      color: '#fff',
    },
    handicapContainer: {
      marginBottom: 16,
    },
    handicapInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    handicapHelp: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    clubList: {
      marginBottom: 16,
    },
    clubItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    clubName: {
      fontSize: 16,
      color: colors.text,
    },
    removeClubButton: {
      backgroundColor: '#ff4444',
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeClubButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    addClubContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    addClubInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    addClubButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addClubButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });

  return (
    <SettingsContainer>
      <SettingsScrollView>
        <SettingsHeader
          title="Golf Brain Settings"
          subtitle="Manage your golf scoring and course preferences"
          icon="🏌️‍♂️"
        />

        <SettingsSection title="Handicap">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body" style={{ marginBottom: 12 }}>
              Your handicap index for stroke calculations
            </SettingsText>
            <View style={styles.handicapContainer}>
              <TextInput
                style={styles.handicapInput}
                placeholder="Enter handicap (0-54)"
                placeholderTextColor={colors.textSecondary}
                value={localSettings.handicap?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num) && num >= 0 && num <= 54) {
                    updateLocalSetting('handicap', num);
                  } else if (text === '') {
                    updateLocalSetting('handicap', undefined);
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.handicapHelp}>
                {localSettings.handicap !== undefined 
                  ? localSettings.handicap === 0 
                    ? 'No strokes on any hole'
                    : localSettings.handicap <= 18
                      ? `You get 1 stroke on holes with difficulty index ≤ ${localSettings.handicap}`
                      : `You get 1 stroke on all holes, plus an extra stroke on holes with difficulty index ≤ ${localSettings.handicap - 18}`
                  : 'Set your handicap to see stroke adjustments'
                }
              </Text>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Clubs">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body" style={{ marginBottom: 12 }}>
              Manage your golf clubs for shot tracking
            </SettingsText>
            <View style={styles.clubList}>
              {(localSettings.clubs || DEFAULT_CLUBS).map((club, index) => (
                <View key={index} style={styles.clubItem}>
                  <Text style={styles.clubName}>{club}</Text>
                  <TouchableOpacity
                    style={styles.removeClubButton}
                    onPress={() => {
                      const clubs = localSettings.clubs || DEFAULT_CLUBS;
                      const newClubs = clubs.filter((_, i) => i !== index);
                      updateLocalSetting('clubs', newClubs);
                    }}
                  >
                    <Text style={styles.removeClubButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addClubContainer}>
              <TextInput
                style={styles.addClubInput}
                placeholder="Add new club..."
                placeholderTextColor={colors.textSecondary}
                value={newClubName}
                onChangeText={setNewClubName}
                onSubmitEditing={handleAddClub}
              />
              <TouchableOpacity style={styles.addClubButton} onPress={handleAddClub}>
                <Text style={styles.addClubButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Courses">
          {courses.length === 0 ? (
            <View style={{ padding: 16, backgroundColor: 'transparent' }}>
              <SettingsText variant="body">
                No courses created yet. Create your first course to get started!
              </SettingsText>
            </View>
          ) : (
            courses.map(course => (
              <View key={course.id} style={styles.courseCard}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseInfo}>
                  {course.holes.length} holes • Created {new Date(course.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.courseActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditCourse(course)}
                  >
                    <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteCourse(course.id)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </SettingsSection>

        <SettingsSection title="Recent Rounds">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body" style={{ marginBottom: 12 }}>
              Manage your golf rounds and scores
            </SettingsText>
            
            {sortedRounds.length === 0 ? (
              <SettingsText variant="body" style={styles.noRoundsText}>
                No rounds recorded yet
              </SettingsText>
            ) : (
              <>
                {displayedRounds.map((round, index) => {
                  const course = courses.find(c => c.id === round.courseId);
                  const netScore = round.totalScore - round.totalPar;
                  const isIncomplete = !round.isComplete;
                  
                  return (
                    <View key={round.id} style={styles.roundItem}>
                      <View style={styles.roundInfo}>
                        <Text style={styles.roundCourse}>
                          {course?.name || 'Unknown Course'}
                        </Text>
                        <Text style={styles.roundDate}>
                          {formatDate(round.completedAt || round.startedAt)}
                        </Text>
                        <Text style={[
                          styles.roundScore,
                          { color: isIncomplete ? colors.primary : getScoreColor(round.totalScore, round.totalPar) }
                        ]}>
                          {isIncomplete ? 'Incomplete' : `${round.totalScore} (${netScore > 0 ? `+${netScore}` : netScore === 0 ? 'E' : netScore})`}
                        </Text>
                        {isIncomplete && (
                          <Text style={styles.incompleteText}>
                            Through {round.holeScores?.length || 0} holes
                          </Text>
                        )}
                      </View>
                      
                      <View style={styles.roundActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => handleEditRound(round)}
                        >
                          <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDeleteRound(round)}
                        >
                          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {sortedRounds.length > displayedRounds.length && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={handleShowMoreRounds}
                  >
                    <Text style={styles.showMoreText}>
                      Show {Math.min(50, sortedRounds.length - displayedRounds.length)} more rounds
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </SettingsSection>

        <SettingsFeedbackSection sparkName="Golf Brain" />

        <SettingsSection title="About">
          <View style={{ padding: 16, backgroundColor: 'transparent' }}>
            <SettingsText variant="body">
              Golf Brain helps you record detailed golf rounds with shot-by-shot analysis.{'\n'}
              Track courses, scores, and analyze your performance over time.
            </SettingsText>
          </View>
        </SettingsSection>

        <View style={GolfTrackerSettingsStyles.saveCancelContainer}>
          <SaveCancelButtons
            onSave={handleSaveSettings}
            onCancel={handleCancelSettings}
            saveDisabled={!hasChanges}
          />
        </View>
      </SettingsScrollView>

      {editingCourse && (
        <EditCourseModal
          visible={editingCourse !== null}
          onClose={() => setEditingCourse(null)}
          course={editingCourse}
          onUpdateCourse={onUpdateCourse}
          colors={colors}
        />
      )}
    </SettingsContainer>
  );
};

// GolfTrackerSettings Styles
const GolfTrackerSettingsStyles = StyleSheet.create({
  saveCancelContainer: {
    padding: 20,
    paddingTop: 0,
  },
  noRoundsText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  roundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roundInfo: {
    flex: 1,
  },
  roundCourse: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roundDate: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  roundScore: {
    fontSize: 14,
    fontWeight: '500',
  },
  incompleteText: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  roundActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButtonText: {
    color: '#FFFFFF',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  showMoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
});

// Outcome Grid Component
const OutcomeGrid: React.FC<{
  shotType: 'iron' | 'putt';
  shotNumber: number;
  historicalData: { [key: string]: number };
  selectedOutcome?: string;
  onSelect: (outcome: string) => void;
  showError?: boolean;
  colors: any;
}> = ({ shotType, shotNumber, historicalData, selectedOutcome, onSelect, showError = false, colors }) => {
  const outcomes = [
    ['left\nlong', 'left', 'left\nshort'],
    ['long', 'good', 'short'],
    ['right\nlong', 'right', 'right\nshort']
  ];

  // Map display labels to stored values
  const getOutcomeValue = (displayLabel: string) => {
    const mapping: { [key: string]: string } = {
      'left\nlong': 'left and long',
      'long': 'long',
      'right\nlong': 'right and long',
      'left': 'left',
      'good': 'good',
      'right': 'right',
      'left\nshort': 'left and short',
      'short': 'short',
      'right\nshort': 'right and short'
    };
    return mapping[displayLabel] || displayLabel;
  };

  const getDisplayLabel = (value: string) => {
    const mapping: { [key: string]: string } = {
      'left and long': 'left\nlong',
      'long': 'long',
      'right and long': 'right\nlong',
      'left': 'left',
      'good': 'good',
      'right': 'right',
      'left and short': 'left\nshort',
      'short': 'short',
      'right and short': 'right\nshort'
    };
    return mapping[value] || value;
  };

  const maxCount = Math.max(...Object.values(historicalData), 1);

  const getOpacity = (outcome: string) => {
    const count = historicalData[outcome] || 0;
    return Math.max(0.2, count / maxCount);
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    grid: {
      flexDirection: 'row',
      gap: 4,
    },
    row: {
      flex: 1,
      gap: 4,
    },
    cell: {
      aspectRatio: 1.5, // 2:3 height:width ratio (width/height = 1.5)
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cellText: {
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 12,
    },
    countText: {
      fontSize: 8,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>
        {shotType === 'iron' ? `Shot ${shotNumber}` : `Putt ${shotNumber}`} - Select Outcome
      </Text> */}
      <View style={[styles.grid, showError && { borderColor: colors.error || '#ff4444', borderWidth: 2, borderRadius: 8 }]}>
        {outcomes.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((outcome) => {
              const outcomeValue = getOutcomeValue(outcome);
              const count = historicalData[outcomeValue] || 0;
              const isSelected = selectedOutcome === outcomeValue;
              const isGood = outcomeValue === 'good';
              
              // Determine cell color based on position
              const getCellColor = () => {
                if (isSelected) return colors.primary;
                if (isGood) return '#E8F5E8'; // Light green for center
                
                // Corner cells (bad outcomes) - light red
                if (outcomeValue === 'left and long' || outcomeValue === 'right and long' || 
                    outcomeValue === 'left and short' || outcomeValue === 'right and short') {
                  return '#FFE8E8'; // Light red
                }
                
                // Outer central cells (okay outcomes) - light yellow
                if (outcomeValue === 'left' || outcomeValue === 'right' || 
                    outcomeValue === 'long' || outcomeValue === 'short') {
                  return '#FFF8E1'; // Light yellow
                }
                
                return colors.surface; // Default
              };

              return (
                <TouchableOpacity
                  key={outcome}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: getCellColor(),
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    }
                  ]}
                  onPress={() => onSelect(outcomeValue)}
                >
                  <Text style={[
                    styles.cellText, 
                    { 
                      color: isSelected ? colors.background : colors.text,
                      fontWeight: isSelected ? '600' : '500'
                    }
                  ]}>
                    {outcome === 'good' ? 'good' : outcome}
                  </Text>
                  {count > 0 && !isSelected && (
                    <Text style={[styles.countText, { color: colors.textSecondary }]}>
                      {count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

// Historical Outcome Grid Component
const HistoricalOutcomeGrid: React.FC<{
  shotType: 'iron' | 'putt';
  shotNumber: number;
  historicalData: { [key: string]: number };
  colors: any;
}> = ({ shotType, shotNumber, historicalData, colors }) => {
  const outcomes = [
    ['left\nlong', 'left', 'left\nshort'],
    ['long', 'good', 'short'],
    ['right\nlong', 'right', 'right\nshort']
  ];

  // Map display labels to stored values
  const getOutcomeValue = (displayLabel: string) => {
    const mapping: { [key: string]: string } = {
      'left\nlong': 'left and long',
      'long': 'long',
      'right\nlong': 'right and long',
      'left': 'left',
      'good': 'good',
      'right': 'right',
      'left\nshort': 'left and short',
      'short': 'short',
      'right\nshort': 'right and short'
    };
    return mapping[displayLabel] || displayLabel;
  };

  const maxCount = Math.max(...Object.values(historicalData), 1);

  const getIntensity = (outcome: string) => {
    const count = historicalData[outcome] || 0;
    return count / maxCount;
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    grid: {
      flexDirection: 'row',
      gap: 4,
    },
    row: {
      flex: 1,
      gap: 4,
    },
    cell: {
      aspectRatio: 1.5, // 2:3 height:width ratio (width/height = 1.5)
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cellText: {
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 12,
    },
    countText: {
      fontSize: 8,
      marginTop: 2,
      fontWeight: '600',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
      marginRight: 8,
    },
    legendCell: {
      width: 12,
      height: 12,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {shotType === 'iron' ? `Shot ${shotNumber}` : `Putt ${shotNumber}`} - Historical Patterns
      </Text>
      <View style={styles.grid}>
        {outcomes.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((outcome) => {
              const outcomeValue = getOutcomeValue(outcome);
              const count = historicalData[outcomeValue] || 0;
              const intensity = getIntensity(outcomeValue);
              const isGood = outcomeValue === 'good';
              
              // Blue gradient scaling (light to dark)
              const alpha = Math.max(0.1, intensity);
              const backgroundColor = isGood 
                ? `rgba(76, 175, 80, ${alpha})` 
                : `rgba(33, 150, 243, ${alpha})`;
              
              return (
                <View
                  key={outcome}
                  style={[
                    styles.cell,
                    { backgroundColor }
                  ]}
                >
                  <Text style={[styles.cellText, { color: colors.text }]}>
                    {outcome === 'good' ? 'good' : outcome}
                  </Text>
                  {count > 0 && (
                    <Text style={[styles.countText, { color: colors.text }]}>
                      {count}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      
      {/* Frequency Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
          <View
            key={index}
            style={[
              styles.legendCell,
              { backgroundColor: `rgba(33, 150, 243, ${intensity})` }
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

// Handicap Onboarding Modal
const HandicapOnboardingModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSetHandicap: (handicap: number) => void;
  colors: any;
}> = ({ visible, onClose, onSetHandicap, colors }) => {
  const [handicap, setHandicap] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateHandicap = (value: string) => {
    const num = parseInt(value);
    const valid = !isNaN(num) && num >= 0 && num <= 54;
    setIsValid(valid);
    return valid;
  };

  const handleSubmit = () => {
    const num = parseInt(handicap);
    if (validateHandicap(handicap)) {
      onSetHandicap(num);
      onClose();
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      width: 300,
      maxWidth: '90%',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 120,
    },
    cancelButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    submitButtonText: {
      color: colors.surface,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={() => {}} // Prevent closing by tapping outside
      >
        <TouchableOpacity 
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()} // Prevent event bubbling
        >
          <Text style={styles.title}>Set Your Handicap</Text>
          <TextInput
            style={styles.input}
            value={handicap}
            onChangeText={(text) => {
              setHandicap(text);
              validateHandicap(text);
            }}
            placeholder="Enter handicap (0-54)"
            keyboardType="numeric"
            maxLength={2}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={!isValid}
            >
              <Text style={[styles.buttonText, styles.submitButtonText]}>Set Handicap</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Course Selection Component
const CourseSelectionScreen: React.FC<{
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateCourse: () => void;
  colors: any;
}> = ({ courses, onSelectCourse, onCreateCourse, colors }) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
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
    },
    courseList: {
      paddingHorizontal: 20,
    },
    courseCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    courseName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    courseInfo: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 40,
    },
    createButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Course</Text>
        <Text style={styles.subtitle}>Choose a course to start your round</Text>
      </View>

      <ScrollView style={styles.courseList}>
        {!courses || courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No courses yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first course to get started!
            </Text>
          </View>
        ) : (
          courses?.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => onSelectCourse(course)}
            >
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseInfo}>
                {course.holes.length} holes • Last played: Never
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.createButton} onPress={onCreateCourse}>
        <Text style={styles.createButtonText}>+ Create New Course</Text>
      </TouchableOpacity>
    </View>
  );
};

// Hole Detail Screen Component
const HoleDetailScreen = React.forwardRef<{ saveCurrentData: () => void }, {
  course: Course;
  currentHole: number;
  currentRound?: Round;
  data: GolfTrackerData;
  onNextHole: () => void;
  onPreviousHole: () => void;
  onCompleteHole: (holeScore: HoleScore) => void;
  onShowHistory: () => void;
  onSaveHoleData: (holeNumber: number, ironShots: Shot[], putts: Shot[]) => void;
  onLoadHoleData: (holeNumber: number) => { ironShots: Shot[]; putts: Shot[] } | null;
  onUpdateTodaysDistance: (holeNumber: number, distance: number | undefined) => void;
  onEndRound: () => void;
  onViewSummary: () => void;
  onClose: () => void;
  clubs: string[];
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  colors: any;
}>(({ course, currentHole, currentRound, data, onNextHole, onPreviousHole, onCompleteHole, onShowHistory, onSaveHoleData, onLoadHoleData, onUpdateTodaysDistance, onEndRound, onViewSummary, onClose, clubs, handicap, getBumpsForHole, colors }, ref) => {
  const hole = (course.holes || []).find(h => h.number === currentHole);
  const [ironShots, setIronShots] = useState<Shot[]>([]);
  const [putts, setPutts] = useState<Shot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [todaysDistance, setTodaysDistance] = useState<string>(hole?.todaysDistance?.toString() || '');
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [currentShotType, setCurrentShotType] = useState<'iron' | 'putt'>('iron');
  const scrollViewRef = useRef<ScrollView>(null);
  const expectedIronShots = hole ? Math.max(0, hole.par - 2) : 0; // par 3 = 1, par 4 = 2, par 5 = 3
  const expectedPutts = 2;

  // Check if all default iron shots have outcomes
  const allIronShotsHaveOutcomes = ironShots.length >= expectedIronShots && 
    ironShots.slice(0, expectedIronShots).every(shot => shot.direction);

  // Get all shots in order (iron shots first, then putts)
  const getAllShots = () => {
    return [
      ...ironShots.map((shot, index) => ({ shot, type: 'iron' as const, index, id: shot.id })),
      ...putts.map((shot, index) => ({ shot, type: 'putt' as const, index, id: shot.id }))
    ];
  };

  // Get current shot being displayed
  const getCurrentShot = () => {
    if (currentShotType === 'iron') {
      return ironShots[currentShotIndex] || null;
    } else {
      return putts[currentShotIndex] || null;
    }
  };

  // Calculate shot card height for snap behavior
  const SHOT_CARD_HEIGHT = 400; // Fixed height for consistent snapping

  // Snap to current shot
  const snapToCurrentShot = () => {
    const allShots = getAllShots();
    const currentGlobalIndex = currentShotType === 'iron' ? currentShotIndex : ironShots.length + currentShotIndex;
    const scrollY = currentGlobalIndex * SHOT_CARD_HEIGHT;
    
    // For putts, add extra offset to account for navigation bar
    const isPutt = currentShotType === 'putt';
    const extraOffset = isPutt ? 100 : 0; // Extra space for putts to clear navigation bar
    
    scrollViewRef.current?.scrollTo({ y: scrollY + extraOffset, animated: true });
  };

  // Advance to next shot with snap
  const advanceToNextShot = () => {
    const allShots = getAllShots();
    const currentGlobalIndex = currentShotType === 'iron' ? currentShotIndex : ironShots.length + currentShotIndex;
    
    if (currentGlobalIndex < allShots.length - 1) {
      const nextShot = allShots[currentGlobalIndex + 1];
      setCurrentShotType(nextShot.type);
      setCurrentShotIndex(nextShot.index);
      
      // Snap to the next shot
      setTimeout(() => {
        snapToCurrentShot();
      }, 100);
    } else {
      // If this is the last shot, scroll to show the Add Putt button
      setTimeout(() => {
        const addPuttButtonY = (allShots.length) * SHOT_CARD_HEIGHT;
        scrollViewRef.current?.scrollTo({ y: addPuttButtonY, animated: true });
      }, 100);
    }
  };

  // Expose saveCurrentData method to parent
  useImperativeHandle(ref, () => ({
    saveCurrentData: () => {
      onSaveHoleData(currentHole, ironShots, putts);
      // Save today's distance
      const distanceValue = todaysDistance ? parseInt(todaysDistance) : undefined;
      onUpdateTodaysDistance(currentHole, distanceValue);
    }
  }));

  // Initialize shots when hole changes - load existing data or create defaults
  useEffect(() => {
    // Try to load existing data for this hole
    const existingData = onLoadHoleData(currentHole);
    
    if (existingData) {
      // Load existing data
      setIronShots(existingData.ironShots);
      setPutts(existingData.putts);
    } else {
      // Create default shots
      const defaultIronShots: Shot[] = Array.from({ length: expectedIronShots }, (_, index) => ({
        id: `iron-${Date.now()}-${index}`,
        type: 'iron',
        lie: index === expectedIronShots - 1 ? 'green' : 'fairway', // Last iron shot defaults to green
        timestamp: Date.now(),
      }));

      const defaultPutts: Shot[] = Array.from({ length: expectedPutts }, (_, index) => ({
        id: `putt-${Date.now()}-${index}`,
        type: 'putt',
        puttDistance: index === 1 ? '<4ft' : '5-10ft', // Second putt is typically a tap-in
        timestamp: Date.now(),
      }));

      setIronShots(defaultIronShots);
      setPutts(defaultPutts);
    }

    // Update today's distance when hole changes
    setTodaysDistance(hole?.todaysDistance?.toString() || '');

    // Reset current shot to first shot when hole changes
    setCurrentShotIndex(0);
    setCurrentShotType('iron');

    // Scroll to top when hole changes
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [currentHole, expectedIronShots, expectedPutts, onLoadHoleData, hole]);

  // Snap to current shot when shots change
  useEffect(() => {
    const timer = setTimeout(() => {
      snapToCurrentShot();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [ironShots, putts, currentShotIndex, currentShotType]);


  const addIronShot = () => {
    const newShot: Shot = {
      id: `iron-${Date.now()}-${Math.random()}`,
      type: 'iron',
      lie: 'fairway',
      timestamp: Date.now(),
    };
    setIronShots(prev => {
      const newShots = [...prev, newShot];
      // Scroll to the newly added shot
      setTimeout(() => {
        const newShotIndex = newShots.length - 1;
        const scrollY = newShotIndex * SHOT_CARD_HEIGHT;
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 100);
      return newShots;
    });
    HapticFeedback.light();
  };

  const addPutt = () => {
    const newPutt: Shot = {
      id: `putt-${Date.now()}-${Math.random()}`,
      type: 'putt',
      puttDistance: '5-10ft',
      timestamp: Date.now(),
    };
    setPutts(prev => {
      const newPutts = [...prev, newPutt];
      // Scroll to the newly added putt
      setTimeout(() => {
        const allShots = [...ironShots, ...newPutts];
        const newPuttIndex = allShots.length - 1;
        const scrollY = newPuttIndex * SHOT_CARD_HEIGHT;
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 100);
      return newPutts;
    });
    HapticFeedback.light();
  };

  const removeShot = (shotId: string, type: 'iron' | 'putt') => {
    if (type === 'iron') {
      setIronShots(prev => prev.filter(shot => shot.id !== shotId));
    } else {
      setPutts(prev => prev.filter(shot => shot.id !== shotId));
    }
    HapticFeedback.light();
  };



  const updateShot = (shotId: string, type: 'iron' | 'putt', field: keyof Shot, value: any) => {
    if (type === 'iron') {
      setIronShots(prev => prev.map(shot => 
        shot.id === shotId ? { ...shot, [field]: value } : shot
      ));
    } else {
      setPutts(prev => prev.map(shot => 
        shot.id === shotId ? { ...shot, [field]: value } : shot
      ));
    }
    // Clear validation error when shots are updated
    setShowValidationError(false);
    
    // Auto-advance to next shot when outcome is selected
    if (field === 'direction') {
      setTimeout(() => {
        advanceToNextShot();
      }, 300); // Small delay to show the selection
    }
  };

  const totalScore = ironShots.length + putts.length;
  const netScore = totalScore - (hole?.par || 0);

  const handleCompleteHole = () => {
    if (ironShots.length === 0 && putts.length === 0) {
      Alert.alert('Error', 'Please add at least one shot to complete the hole');
      return;
    }

    // Check if all shots have been described
    const allIronShotsDescribed = ironShots.every(shot => shot.direction);
    const allPuttsDescribed = putts.every(putt => putt.direction); // puttDistance is optional
    
    if (!allIronShotsDescribed || !allPuttsDescribed) {
      setShowValidationError(true);
      Alert.alert('Error', 'Cannot go to next hole until all shots have a selected outcome or deleted');
      return;
    }

    const holeScore: HoleScore = {
      holeNumber: currentHole,
      courseId: course.id,
      shots: [...ironShots, ...putts],
      totalScore,
      par: hole?.par || 0,
      netScore,
      completedAt: Date.now(),
    };

    onCompleteHole(holeScore);
    HapticFeedback.success();
  };

  const handleViewSummary = () => {
    // Show current round summary
    onViewSummary();
  };

  // Analyze historical shot data for this hole
  const getHistoricalShotData = () => {
    if (!currentRound) return { iron: {}, putts: {} };
    
    // Get all rounds for this course and hole
    const allRounds = (data.rounds || []).filter(round => round.courseId === course.id);
    const holeScores = allRounds.flatMap(round => 
      (round.holeScores || []).filter(hs => hs.holeNumber === currentHole)
    );
    
    const ironData: { [key: string]: number } = {};
    const puttData: { [key: string]: number } = {};
    
    holeScores.forEach(holeScore => {
      (holeScore.shots || []).forEach(shot => {
        if (shot.direction) {
          if (shot.type === 'iron') {
            ironData[shot.direction] = (ironData[shot.direction] || 0) + 1;
          } else if (shot.type === 'putt') {
            puttData[shot.direction] = (puttData[shot.direction] || 0) + 1;
          }
        }
      });
    });
    
    return { iron: ironData, putts: puttData };
  };

  const historicalData = getHistoricalShotData();

  const handleEndRound = () => {
    Alert.alert(
      'End Round',
      'Are you sure you want to end this round? You can resume it later from the course selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Round',
          style: 'destructive',
          onPress: () => {
            // Save current data before ending round
            onSaveHoleData(currentHole, ironShots, putts);
            // Call parent's end round handler
            onEndRound();
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    holeInfo: {
      flex: 1,
    },
    holeNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    holeDetails: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    todaysDistanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    todaysDistanceLabel: {
      fontSize: 18,
      color: colors.text,
      fontWeight: 'bold',
    },
    todaysDistanceInput: {
      width: 80,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
    },
    bumpInfo: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
      marginTop: 4,
    },
    scoreDisplay: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    scoreText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: 'bold',
    },
    netScoreText: {
      color: colors.background,
      fontSize: 12,
      opacity: 0.8,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bumpEmoji: {
      fontSize: 14,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      width: `${(currentHole / 18) * 100}%`,
    },
    commonShotsSection: {
      backgroundColor: colors.surface,
      margin: 20,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      marginTop: 8,
    },
    shotList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    shotTag: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    shotTagText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '500',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    expectedText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    shotCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shotHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    shotNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    shotFields: {
      gap: 8,
    },
    shotFieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      width: 60,
    },
    dropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    puttDistanceLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    puttDistanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    puttDistanceDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
    dropdownText: {
      fontSize: 14,
      color: colors.text,
    },
    lieDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    clubDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
    },
    requiredField: {
      borderColor: '#ff4444',
      borderWidth: 2,
    },
    feetInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      minHeight: 40,
    },
    removeButton: {
      backgroundColor: colors.error || '#ff4444',
      borderRadius: 6,
      padding: 8,
    },
    removeButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
    addButton: {
      backgroundColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    addButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    bottomButtons: {
      padding: 20,
      paddingTop: 0,
      gap: 12,
    },
    actionButtonsContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    navigationButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 48,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.primary,
    },
    historyButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    historyButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 16,
    },
    actionButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      color: colors.text,
      fontWeight: '500',
    },
    endRoundButton: {
      backgroundColor: colors.error || '#ff4444',
    },
    endRoundButtonText: {
      color: colors.background,
      fontWeight: '600',
    },
    actionButtonsCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 16,
    },
    nextHoleContainer: {
      margin: 20,
      marginTop: 8,
      marginBottom: 20,
    },
    permanentNavigation: {
      flexDirection: 'row',
      padding: 12,
      paddingBottom: 40,
      gap: 6,
      backgroundColor: '#f5f5f5', // Light gray background
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 60,
    },
    navButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    navButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 16,
    },
  });

  if (!hole) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 50 }}>
          Hole not found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.holeInfo}>
          <Text style={styles.holeNumber}>Hole {currentHole}</Text>
          <Text style={styles.holeDetails}>
            Par {hole.par} • Stroke Index {hole.strokeIndex}
            {hole.distanceYards && ` • ${hole.distanceYards} yards`}
          </Text>
          {handicap !== undefined && (
            <Text style={styles.bumpInfo}>
              {getBumpsForHole(hole) > 0 
                ? `You get ${getBumpsForHole(hole)} stroke${getBumpsForHole(hole) === 1 ? '' : 's'} on this hole`
                : 'No strokes on this hole'
              }
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.scoreDisplay}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>{totalScore}</Text>
              {handicap !== undefined && getBumpsForHole(hole) > 0 && (
                <Text style={styles.bumpEmoji}>
                  {getBumpsForHole(hole) === 1 ? '☝️' : '✌️'}
                </Text>
              )}
            </View>
            <Text style={styles.netScoreText}>
              {netScore > 0 ? `+${netScore}` : netScore === 0 ? 'E' : netScore}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView 
        ref={scrollViewRef} 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        snapToInterval={SHOT_CARD_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const currentIndex = Math.round(offsetY / SHOT_CARD_HEIGHT);
          const allShots = getAllShots();
          
          if (currentIndex < allShots.length) {
            const shot = allShots[currentIndex];
            setCurrentShotType(shot.type);
            setCurrentShotIndex(shot.index);
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Today's Distance Card */}
        <View style={styles.todaysDistanceCard}>
          <View style={styles.todaysDistanceContainer}>
            <Text style={styles.todaysDistanceLabel}>Today's Distance (optional):</Text>
            <TextInput
              style={styles.todaysDistanceInput}
              placeholder="yards"
              placeholderTextColor={colors.textSecondary}
              value={todaysDistance}
              onChangeText={setTodaysDistance}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>


        {/* Iron Shots Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Iron Shots</Text>
            <Text style={styles.expectedText}>
              {expectedIronShots} shots for par {hole.par}
            </Text>
          </View>
        </View>

        {/* All Shots - Iron Shots First */}
        {ironShots.map((shot, index) => (
          <View key={shot.id} style={[styles.shotCard, { height: SHOT_CARD_HEIGHT }]}>
            <View style={styles.shotHeader}>
              <Text style={styles.shotNumber}>Shot {index + 1}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeShot(shot.id, 'iron')}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.shotFields}>
              <View style={[styles.shotFieldRow, { flexDirection: 'row', gap: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    options={clubs || []}
                    selectedValue={shot.club || ''}
                    onSelect={(value) => updateShot(shot.id, 'iron', 'club', value)}
                    style={styles.clubDropdown}
                    textStyle={styles.dropdownText}
                    placeholder="club (optional)"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    options={LIE_OPTIONS}
                    selectedValue={shot.lie || 'fairway'}
                    onSelect={(value) => updateShot(shot.id, 'iron', 'lie', value)}
                    style={styles.lieDropdown}
                    textStyle={styles.dropdownText}
                  />
                </View>
              </View>
            </View>
            {/* lets add some spacing here */}
            <View style={{ height: 40 }} />
            {/* Outcome Grid for this shot */}
            <OutcomeGrid
              shotType="iron"
              shotNumber={index + 1}
              historicalData={historicalData.iron}
              selectedOutcome={shot.direction}
              onSelect={(outcome) => {
                updateShot(shot.id, 'iron', 'direction', outcome);
              }}
              showError={showValidationError && !shot.direction}
              colors={colors}
            />
          </View>
        ))}

        {/* Add Iron Shot Button - Always visible */}
        <View style={styles.addShotContainer}>
          <TouchableOpacity style={styles.addButton} onPress={addIronShot}>
            <Text style={styles.addButtonText}>+ Add Iron Shot</Text>
          </TouchableOpacity>
        </View>

        {/* Putter Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Putter</Text>
          <Text style={styles.expectedText}>
            {expectedPutts} putts expected
          </Text>
        </View>

        {/* All Putts */}
        {putts.map((putt, index) => (
          <View key={putt.id} style={[styles.shotCard, { height: SHOT_CARD_HEIGHT }]}>
            <View style={styles.shotHeader}>
              <Text style={styles.shotNumber}>Putt {index + 1}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeShot(putt.id, 'putt')}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.shotFields}>
              <Text style={styles.puttDistanceLabel}>Putt Distance</Text>
              <View style={styles.puttDistanceRow}>
                <Dropdown
                  options={PUTT_DISTANCE_OPTIONS.map(option => option.value)}
                  selectedValue={putt.puttDistance || ''}
                  onSelect={(value) => updateShot(putt.id, 'putt', 'puttDistance', value)}
                  style={styles.puttDistanceDropdown}
                  textStyle={styles.dropdownText}
                  placeholder="Select distance (optional)"
                />
              </View>
            </View>
            
            {/* Outcome Grid for this putt */}
            <OutcomeGrid
              shotType="putt"
              shotNumber={index + 1}
              historicalData={historicalData.putts}
              selectedOutcome={putt.direction}
              onSelect={(outcome) => {
                updateShot(putt.id, 'putt', 'direction', outcome);
              }}
              showError={showValidationError && !putt.direction}
              colors={colors}
            />
          </View>
        ))}

        {/* Add Putt Button */}
        <View style={styles.addPuttContainer}>
          <TouchableOpacity style={styles.addButton} onPress={addPutt}>
            <Text style={styles.addButtonText}>+ Add Putt</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>

      {/* Permanent Navigation - Fixed above spark bottom navigation */}
      <View style={styles.permanentNavigation}>
        <TouchableOpacity style={[styles.button, styles.navButton]} onPress={onClose}>
          <Text style={[styles.buttonText, styles.navButtonText]}>✕</Text>
        </TouchableOpacity>
        
        {currentHole > 1 && (
          <TouchableOpacity style={[styles.button, styles.navButton]} onPress={onPreviousHole}>
            <Text style={[styles.buttonText, styles.navButtonText]}>←</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={[styles.button, styles.navButton]} onPress={onShowHistory}>
          <Text style={[styles.buttonText, styles.navButtonText]}>📊</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.navButton]} onPress={handleViewSummary}>
          <Text style={[styles.buttonText, styles.navButtonText]}>📋</Text>
        </TouchableOpacity>
        
        {currentHole < 18 ? (
          <TouchableOpacity style={[styles.button, styles.navButton]} onPress={handleCompleteHole}>
            <Text style={[styles.buttonText, styles.navButtonText]}>→</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.navButton]} onPress={handleEndRound}>
            <Text style={[styles.buttonText, styles.navButtonText]}>🏁</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// Course Creation Modal
const CreateCourseModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onCreateCourse: (course: Omit<Course, 'id' | 'createdAt'>) => void;
  colors: any;
}> = ({ visible, onClose, onCreateCourse, colors }) => {
  const [courseName, setCourseName] = useState('');
  const [parList, setParList] = useState('');
  const [difficultyList, setDifficultyList] = useState('');
  const [distanceList, setDistanceList] = useState('');

  const parseSpaceSeparatedList = (input: string, min: number, max: number): number[] => {
    if (!input.trim()) return [];
    return input
      .trim()
      .split(/\s+/)
      .map(item => parseInt(item))
      .filter(num => !isNaN(num) && num >= min && num <= max);
  };

  const handleCreate = () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const pars = parseSpaceSeparatedList(parList, 3, 5);
    const difficulties = parseSpaceSeparatedList(difficultyList, 1, 18);
    const distances = parseSpaceSeparatedList(distanceList, 50, 600); // 50-600 yards

    // If no pars provided, default to 18 par 4s
    const finalPars = pars.length > 0 ? pars : Array(18).fill(4);
    
    // If no difficulties provided, default to sequential 1-18
    const finalDifficulties = difficulties.length > 0 ? difficulties : Array.from({ length: finalPars.length }, (_, i) => i + 1);

    // If no distances provided, don't set distanceYards at all (make it optional)
    const finalDistances = distances.length > 0 ? distances : [];

    // Ensure we have the same number of pars and difficulties
    const holeCount = Math.max(finalPars.length, finalDifficulties.length);
    const holes: Hole[] = Array.from({ length: holeCount }, (_, index) => ({
      number: index + 1,
      par: finalPars[index] || 4,
      strokeIndex: finalDifficulties[index] || index + 1,
      // Only set distanceYards if distances were provided
      ...(finalDistances.length > 0 && { distanceYards: finalDistances[index] || undefined }),
    }));

    onCreateCourse({
      name: courseName.trim(),
      holes,
    });

    // Reset form
    setCourseName('');
    setParList('');
    setDifficultyList('');
    setDistanceList('');
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 500,
      maxHeight: '90%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    helpText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      fontStyle: 'italic',
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    createButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: colors.text,
    },
    createButtonText: {
      color: colors.background,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Course</Text>

          <TextInput
            style={styles.input}
            placeholder="Course Name"
            placeholderTextColor={colors.textSecondary}
            value={courseName}
            onChangeText={setCourseName}
          />

          <Text style={styles.fieldLabel}>Par List (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 5"
            placeholderTextColor={colors.textSecondary}
            value={parList}
            onChangeText={setParList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of pars (3-5). Defaults to 18 par 4s if empty.
          </Text>

          <Text style={styles.fieldLabel}>Difficulty Index List (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18"
            placeholderTextColor={colors.textSecondary}
            value={difficultyList}
            onChangeText={setDifficultyList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of difficulty indexes (1-18). Defaults to sequential 1-18 if empty.
          </Text>

          <Text style={styles.fieldLabel}>Distance List (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="400 350 150 550 400 380 140 520 400 420 160 580 400 360 130 500 400 450"
            placeholderTextColor={colors.textSecondary}
            value={distanceList}
            onChangeText={setDistanceList}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            Space-separated list of distances in yards (50-600). Defaults to reasonable distances based on par if empty.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreate}>
              <Text style={[styles.buttonText, styles.createButtonText]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const GolfTrackerSpark: React.FC<GolfTrackerSparkProps> = ({
  showSettings = false,
  onCloseSettings,
  onStateChange,
}) => {
  const { getSparkData, setSparkData } = useSparkStore();
  const { colors } = useTheme();

  const [data, setData] = useState<GolfTrackerData>({
    courses: [DEFAULT_COURSE],
    rounds: [],
    settings: {
      showHints: true,
      autoAdvance: false,
      clubs: DEFAULT_CLUBS,
    },
  });

  const [currentScreen, setCurrentScreen] = useState<'course-selection' | 'hole-detail' | 'round-summary'>('course-selection');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHandicapOnboarding, setShowHandicapOnboarding] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('golf-brain') as GolfTrackerData;
    if (savedData) {
      // Ensure default course is always available
      const hasDefaultCourse = savedData.courses?.some((course: Course) => course.id === DEFAULT_COURSE.id);
      const courses = hasDefaultCourse ? savedData.courses : [DEFAULT_COURSE, ...(savedData.courses || [])];
      
      const mergedData = {
        ...savedData,
        courses,
        rounds: savedData.rounds || [],
        settings: {
          showHints: savedData.settings?.showHints ?? true,
          autoAdvance: savedData.settings?.autoAdvance ?? false,
          clubs: savedData.settings?.clubs ?? DEFAULT_CLUBS,
          handicap: savedData.settings?.handicap,
        },
      };
      setData(mergedData);
      if (savedData.currentRound) {
        setCurrentRound(savedData.currentRound);
        setSelectedCourse(savedData.courses.find(c => c.id === savedData.currentRound?.courseId) || null);
        setCurrentScreen('hole-detail');
      }
    }
  }, [getSparkData]);

  // Handle screen navigation based on data state
  useEffect(() => {
    // If no courses exist, go to course selection
    if (data.courses && data.courses.length === 0) {
      setCurrentScreen('course-selection');
      return;
    }

    // Check for rounds in progress
    const inProgressRound = data.rounds?.find(round => !round.isComplete);
    if (inProgressRound && data.courses) {
      const course = data.courses.find(c => c.id === inProgressRound.courseId);
      if (course) {
        setSelectedCourse(course);
        setCurrentRound(inProgressRound);
        setCurrentScreen('hole-detail');
        return;
      }
    }

    // Default to course selection if we have courses but no active round
    if (data.courses && data.courses.length > 0 && currentScreen === 'hole-detail' && !selectedCourse) {
      setCurrentScreen('course-selection');
    }
  }, [data.courses, data.rounds, currentScreen, selectedCourse]);

  // Show handicap onboarding when no handicap is set
  useEffect(() => {
    if (
      currentScreen === 'hole-detail' &&
      data.settings.handicap === undefined &&
      !showSettings
    ) {
      setShowHandicapOnboarding(true);
    } else if (data.settings.handicap !== undefined || currentScreen !== 'hole-detail') {
      setShowHandicapOnboarding(false);
    }
  }, [data.settings.handicap, showSettings, currentScreen]);

  // Save data whenever it changes
  useEffect(() => {
    setSparkData('golf-brain', data);
    onStateChange?.({ courseCount: data.courses?.length || 0, roundCount: data.rounds?.length || 0 });
  }, [data]); // Removed setSparkData and onStateChange from dependencies

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCurrentHole(1);
    
    // Create new round
    const newRound: Round = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      courseId: course.id,
      courseName: course.name,
      holeScores: [],
      totalScore: 0,
      totalPar: (course.holes || []).reduce((sum, hole) => sum + hole.par, 0),
      startedAt: Date.now(),
      isComplete: false,
    };
    
    setCurrentRound(newRound);
    setCurrentScreen('hole-detail');
    HapticFeedback.light();
  };

  const handleCreateCourse = (courseData: Omit<Course, 'id' | 'createdAt'>) => {
    const newCourse: Course = {
      ...courseData,
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      createdAt: Date.now(),
    };

    setData(prev => ({
      ...prev,
      courses: [...(prev.courses || []), newCourse],
    }));

    HapticFeedback.success();
  };

  const handleCompleteHole = (holeScore: HoleScore) => {
    if (!currentRound || !selectedCourse) return;

    const updatedRound = {
      ...currentRound,
      holeScores: [...currentRound.holeScores.filter(h => h.holeNumber !== holeScore.holeNumber), holeScore],
      totalScore: currentRound.holeScores
        .filter(h => h.holeNumber !== holeScore.holeNumber)
        .reduce((sum, h) => sum + h.totalScore, 0) + holeScore.totalScore,
    };

    setCurrentRound(updatedRound);

    // Check if round is complete
    if (holeScore.holeNumber === 18) {
      const completedRound = {
        ...updatedRound,
        completedAt: Date.now(),
        isComplete: true,
      };

      setData(prev => ({
        ...prev,
        rounds: [...(prev.rounds || []), completedRound],
        currentRound: undefined,
      }));

      setCurrentScreen('round-summary');
    } else {
      setCurrentHole(holeScore.holeNumber + 1);
    }

    HapticFeedback.success();
  };

  const handleNextHole = () => {
    if (currentHole < 18) {
      // Save current hole data before navigating
      if (holeDetailRef.current) {
        holeDetailRef.current.saveCurrentData();
      }
      setCurrentHole(prev => prev + 1);
    }
  };

  const handlePreviousHole = () => {
    if (currentHole > 1) {
      // Save current hole data before navigating
      if (holeDetailRef.current) {
        holeDetailRef.current.saveCurrentData();
      }
      setCurrentHole(prev => prev - 1);
    }
  };

  const handleShowHistory = () => {
    setShowHistoryModal(true);
  };

  // Store temporary hole data for navigation
  const [tempHoleData, setTempHoleData] = useState<Record<number, { ironShots: Shot[]; putts: Shot[] }>>({});
  const holeDetailRef = useRef<{ saveCurrentData: () => void }>(null);

  const handleSaveHoleData = (holeNumber: number, ironShots: Shot[], putts: Shot[]) => {
    // Save to temporary storage for navigation
    setTempHoleData(prev => ({
      ...prev,
      [holeNumber]: { ironShots, putts }
    }));

    // Also save to permanent database if we have a current round
    if (currentRound) {
      const holeScore: HoleScore = {
        holeNumber,
        courseId: currentRound.courseId,
        shots: [...ironShots, ...putts],
        totalScore: ironShots.length + putts.length,
        par: selectedCourse?.holes.find(h => h.number === holeNumber)?.par || 4,
        netScore: (ironShots.length + putts.length) - (selectedCourse?.holes.find(h => h.number === holeNumber)?.par || 4),
        completedAt: Date.now(),
      };

      // Update the current round with this hole's data
      setData(prev => {
        const updatedRounds = (prev.rounds || []).map(round => 
          round.id === currentRound.id 
            ? {
                ...round,
                holeScores: [
                  ...(round.holeScores || []).filter(hs => hs.holeNumber !== holeNumber),
                  holeScore
                ]
              }
            : round
        );

        return {
          ...prev,
          rounds: updatedRounds,
          currentRound: {
            ...currentRound,
            holeScores: [
              ...(currentRound.holeScores || []).filter(hs => hs.holeNumber !== holeNumber),
              holeScore
            ]
          }
        };
      });
    }
  };

  const handleLoadHoleData = (holeNumber: number) => {
    // First check temporary storage (for current session)
    if (tempHoleData[holeNumber]) {
      const tempData = tempHoleData[holeNumber];
      // Migrate putts in temporary storage if needed
      const migratedPutts = (tempData.putts || []).map(putt => ({
        ...putt,
        puttDistance: putt.puttDistance || (putt as any).feet ? 
          (putt as any).feet < 4 ? '<4ft' : 
          (putt as any).feet <= 10 ? '5-10ft' : '10+ft' : 
          undefined
      }));
      return { ...tempData, ironShots: tempData.ironShots || [], putts: migratedPutts };
    }

    // Then check permanent database (for previously saved data)
    if (currentRound) {
      const existingHoleScore = (currentRound.holeScores || []).find(hs => hs.holeNumber === holeNumber);
      if (existingHoleScore) {
        const ironShots = (existingHoleScore.shots || []).filter(shot => shot.type === 'iron');
        const putts = (existingHoleScore.shots || []).filter(shot => shot.type === 'putt').map(putt => ({
          ...putt,
          // Migrate old 'feet' field to 'puttDistance' if needed
          puttDistance: putt.puttDistance || (putt as any).feet ? 
            (putt as any).feet < 4 ? '<4ft' : 
            (putt as any).feet <= 10 ? '5-10ft' : '10+ft' : 
            undefined
        }));
        return { ironShots, putts };
      }
    }

    return null;
  };

  const handleUpdateTodaysDistance = (holeNumber: number, distance: number | undefined) => {
    if (!selectedCourse) return;
    
    // Update the course's hole todaysDistance
    const updatedCourse = {
      ...selectedCourse,
      holes: selectedCourse.holes.map(hole => 
        hole.number === holeNumber 
          ? { ...hole, todaysDistance: distance }
          : hole
      )
    };
    
    // Update the course in the data
    const updatedData = {
      ...data,
      courses: (data.courses || []).map(course => 
        course.id === selectedCourse.id ? updatedCourse : course
      )
    };
    
    setSparkData('golf-brain', updatedData);
    setSelectedCourse(updatedCourse);
  };

  const handleSetHandicap = (handicap: number) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, handicap }
    }));
    setShowHandicapOnboarding(false);
    HapticFeedback.light();
  };

  const handleEditRound = (round: Round) => {
    // Check if there's an active round
    if (data.currentRound && data.currentRound.id !== round.id) {
      Alert.alert(
        'Active Round in Progress',
        'You must end your current round before editing another round.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    // Set the round as current and navigate to hole detail
    setData(prev => ({
      ...prev,
      currentRound: round,
    }));
    setCurrentScreen('hole-detail');
    setCurrentHole(1); // Start from hole 1 when editing
  };

  const handleDeleteRound = (roundId: string) => {
    setData(prev => ({
      ...prev,
      rounds: (prev.rounds || []).filter(round => round.id !== roundId),
      // If we're deleting the current round, clear it
      currentRound: prev.currentRound?.id === roundId ? undefined : prev.currentRound,
    }));
  };

  const handleEndRound = () => {
    if (currentRound) {
      const completedRound = {
        ...currentRound,
        completedAt: Date.now(),
        isComplete: true,
      };
      setData(prev => ({
        ...prev,
        rounds: [...(prev.rounds || []), completedRound],
        currentRound: undefined,
      }));
    }
    setCurrentScreen('round-summary');
  };

  // Calculate bumps for a hole based on handicap
  const getBumpsForHole = (hole: Hole): number => {
    if (data.settings.handicap === undefined || data.settings.handicap === 0) {
      return 0;
    }
    
    const handicap = data.settings.handicap;
    const strokeIndex = hole.strokeIndex;
    
    // For handicaps 1-18: 1 stroke on holes with difficulty index <= handicap
    if (handicap <= 18) {
      return strokeIndex <= handicap ? 1 : 0;
    }
    
    // For handicaps > 18: 
    // - 1 stroke on all 18 holes (difficulty index 1-18)
    // - Additional strokes on the most difficult holes
    const extraStrokes = handicap - 18;
    let bumps = 1; // Base stroke for all holes
    
    // Add extra strokes starting from difficulty index 1
    if (strokeIndex <= extraStrokes) {
      bumps += 1;
    }
    
    return bumps;
  };

  const getCurrentHoleHistory = (): HoleHistory => {
    if (!selectedCourse) {
      return {
        holeNumber: currentHole,
        courseId: '',
        totalRounds: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        commonShots: { iron: [], putts: [] },
        recentRounds: [],
      };
    }
    return calculateHoleHistory(currentHole, selectedCourse.id, data.rounds);
  };

  const handleResumeRound = (round: Round) => {
    const course = data.courses.find(c => c.id === round.courseId);
    if (course) {
      setSelectedCourse(course);
      setCurrentRound(round);
      setCurrentHole(round.holeScores.length > 0 ? round.holeScores[round.holeScores.length - 1].holeNumber + 1 : 1);
      setCurrentScreen('hole-detail');
    }
  };

  const handleNewRound = () => {
    setCurrentScreen('course-selection');
    setSelectedCourse(null);
    setCurrentRound(null);
    setCurrentHole(1);
  };

  const handleViewRounds = () => {
    // TODO: Implement rounds list view
    setCurrentScreen('course-selection');
  };

  const handleUpdateCourse = (courseId: string, updates: Partial<Course>) => {
    setData(prev => ({
      ...prev,
      courses: (prev.courses || []).map(course =>
        course.id === courseId ? { ...course, ...updates } : course
      ),
    }));
    HapticFeedback.success();
  };

  const handleDeleteCourse = (courseId: string) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.filter(course => course.id !== courseId),
      rounds: prev.rounds.filter(round => round.courseId !== courseId),
    }));
    HapticFeedback.light();
  };

  const handleUpdateSettings = (settings: Partial<GolfTrackerData['settings']>) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
    HapticFeedback.light();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  if (showSettings) {
    return (
      <GolfTrackerSettings
        onClose={onCloseSettings || (() => {})}
        courses={data.courses}
        onUpdateCourse={handleUpdateCourse}
        onDeleteCourse={handleDeleteCourse}
        data={data}
        onUpdateSettings={handleUpdateSettings}
        onEditRound={handleEditRound}
        onDeleteRound={handleDeleteRound}
        colors={colors}
      />
    );
  }

  return (
    <View style={styles.container}>
      {currentScreen === 'course-selection' && (
        <CourseSelectionScreen
          courses={data.courses || []}
          onSelectCourse={handleSelectCourse}
          onCreateCourse={() => setShowCreateModal(true)}
          colors={colors}
        />
      )}

      {currentScreen === 'hole-detail' && selectedCourse && currentRound && (
        <HoleDetailScreen
          ref={holeDetailRef}
          course={selectedCourse}
          currentHole={currentHole}
          currentRound={currentRound}
          data={data}
          onNextHole={handleNextHole}
          onPreviousHole={handlePreviousHole}
          onCompleteHole={handleCompleteHole}
          onShowHistory={handleShowHistory}
          onSaveHoleData={handleSaveHoleData}
          onLoadHoleData={handleLoadHoleData}
          onUpdateTodaysDistance={handleUpdateTodaysDistance}
          onEndRound={handleEndRound}
          onViewSummary={() => setCurrentScreen('round-summary')}
          onClose={() => setCurrentScreen('course-selection')}
          clubs={data.settings.clubs || DEFAULT_CLUBS}
          handicap={data.settings.handicap}
          getBumpsForHole={getBumpsForHole}
          colors={colors}
        />
      )}

      {currentScreen === 'round-summary' && selectedCourse && currentRound && (
        <RoundSummaryScreen
          round={currentRound}
          course={selectedCourse}
          onNewRound={handleNewRound}
          onViewRounds={handleViewRounds}
          onClose={() => setCurrentScreen('hole-detail')}
          handicap={data.settings.handicap}
          getBumpsForHole={getBumpsForHole}
          colors={colors}
        />
      )}

      <CreateCourseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateCourse={handleCreateCourse}
        colors={colors}
      />

      <HoleHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        holeHistory={getCurrentHoleHistory()}
        courseName={selectedCourse?.name || ''}
        colors={colors}
      />

      {currentScreen === 'hole-detail' && (
        <HandicapOnboardingModal
          visible={showHandicapOnboarding}
          onClose={() => setShowHandicapOnboarding(false)}
          onSetHandicap={handleSetHandicap}
          colors={colors}
        />
      )}
    </View>
  );
};
