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
  Animated,
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
  type: 'shot' | 'putt';
  direction?: 'good' | 'fire' | 'left' | 'right' | 'long' | 'short' | 'left and short' | 'left and long' | 'right and short' | 'right and long';
  lie?: 'fairway' | 'rough' | 'sand' | 'green' | 'ob'; // For shots
  puttDistance?: '<4ft' | '5-10ft' | '10+ft'; // For putts
  club?: string; // For shots
  timestamp: number;
  poorShot?: boolean; // For 💩 feature
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
    shot: Shot[];
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
      commonShots: { shot: [], putts: [] },
      recentRounds: [],
    };
  }

  const scores = holeScores.map(hs => hs.totalScore);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.min(...scores);
  const worstScore = Math.max(...scores);

  // Get all shots for this hole
  const allShots = holeScores.flatMap(hs => hs.shots);
  const shots = allShots.filter(shot => shot.type === 'shot');
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
      shot: shots,
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

const PUTT_DISTANCE_OPTIONS = ['<4ft', '5-10ft', '10+ft'] as const;

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

const DEFAULT_COURSE_BACK9: Course = {
  id: 'tam-oshanter-temp-back9',
  name: "Tam O'Shanter Temp back 9",
  createdAt: Date.now(),
  holes: [
    // Front 9 (holes 1-9) = Back 9 of original (holes 10-18)
    { number: 1, par: 5, strokeIndex: 5, distanceYards: 461 },   // was hole 10
    { number: 2, par: 4, strokeIndex: 7, distanceYards: 360 },   // was hole 11
    { number: 3, par: 3, strokeIndex: 17, distanceYards: 124 },  // was hole 12
    { number: 4, par: 3, strokeIndex: 11, distanceYards: 185 },  // was hole 13
    { number: 5, par: 3, strokeIndex: 9, distanceYards: 207 },   // was hole 14
    { number: 6, par: 3, strokeIndex: 15, distanceYards: 140 },  // was hole 15
    { number: 7, par: 4, strokeIndex: 3, distanceYards: 367 },   // was hole 16
    { number: 8, par: 3, strokeIndex: 13, distanceYards: 171 },  // was hole 17
    { number: 9, par: 4, strokeIndex: 1, distanceYards: 411 },   // was hole 18
    // Back 9 (holes 10-18) = Front 9 of original (holes 1-9)
    { number: 10, par: 5, strokeIndex: 6, distanceYards: 450 },  // was hole 1
    { number: 11, par: 4, strokeIndex: 8, distanceYards: 344 },  // was hole 2
    { number: 12, par: 3, strokeIndex: 18, distanceYards: 123 }, // was hole 3
    { number: 13, par: 3, strokeIndex: 12, distanceYards: 180 }, // was hole 4
    { number: 14, par: 3, strokeIndex: 10, distanceYards: 195 }, // was hole 5
    { number: 15, par: 3, strokeIndex: 16, distanceYards: 140 }, // was hole 6
    { number: 16, par: 4, strokeIndex: 4, distanceYards: 367 },  // was hole 7
    { number: 17, par: 3, strokeIndex: 14, distanceYards: 164 }, // was hole 8
    { number: 18, par: 4, strokeIndex: 2, distanceYards: 406 }   // was hole 9
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
    const shotShots = shots.filter(shot => shot.type === 'shot').sort((a, b) => a.timestamp - b.timestamp);
    const putts = shots.filter(shot => shot.type === 'putt').sort((a, b) => a.timestamp - b.timestamp);
    
    // Process shots by position
    shotShots.forEach((shot, index) => {
      const positionKey = `shot-${index + 1}`;
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
    shotAnalysis: {
      marginTop: 16,
    },
    todaysDistanceCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 0,
      borderRadius: 12,
      padding: 8,
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
    addButtonContainer: {
      marginTop: 20,
      alignItems: 'center',
    },
    addButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    viewButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
      gap: 12,
    },
    viewButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      flex: 1,
      maxWidth: 150,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    viewButtonTextActive: {
      color: colors.background,
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
  onClose: () => void;
  onHolePress?: (holeNumber: number) => void;
  onReturnToRound?: () => void;
  onEndRound?: () => void;
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  colors: any;
}> = ({ round, course, onClose, onHolePress, onReturnToRound, onEndRound, handicap, getBumpsForHole, colors }) => {
  console.log('RoundSummaryScreen props:', { onReturnToRound: !!onReturnToRound, onEndRound: !!onEndRound });
  
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

  const hasFireShot = (holeNumber: number) => {
    const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === holeNumber);
    if (!holeScore) return false;
    return holeScore.shots.some(shot => shot.direction === 'fire');
  };

  const hasPoorShot = (holeNumber: number) => {
    const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === holeNumber);
    if (!holeScore) return false;
    return holeScore.shots.some(shot => shot.poorShot === true);
  };

  // Calculate cumulative scores over par
  const getCumulativeScores = () => {
    const scores = [];
    let grossCumulative = 0;
    let netCumulative = 0;
    
    for (let holeNumber = 1; holeNumber <= 18; holeNumber++) {
      const hole = (course.holes || []).find(h => h.number === holeNumber);
      const holeScore = (round.holeScores || []).find(hs => hs.holeNumber === holeNumber);
      
      if (hole && holeScore) {
        const grossOverPar = holeScore.totalScore - hole.par;
        const bumps = handicap !== undefined ? getBumpsForHole(hole) : 0;
        const netOverPar = grossOverPar - bumps;
        
        grossCumulative += grossOverPar;
        netCumulative += netOverPar;
        
        scores.push({
          hole: holeNumber,
          gross: grossCumulative,
          net: netCumulative,
          par: hole.par,
          score: holeScore.totalScore,
          bumps
        });
      } else {
        scores.push({
          hole: holeNumber,
          gross: null,
          net: null,
          par: hole?.par || 0,
          score: 0,
          bumps: 0
        });
      }
    }
    
    return scores;
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
      width: '18%', // Fixed width instead of flex
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
    topActionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
      gap: 10,
    },
    bottomActionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      gap: 10,
    },
    returnToRoundButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    returnToRoundButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    endRoundButton: {
      flex: 1,
      backgroundColor: colors.error || '#ff4444',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    endRoundButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
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
    // Graph styles
    graphContainer: {
      margin: 20,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    graphTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    graph: {
      height: 220,
      width: 300,
      position: 'relative',
      paddingHorizontal: 8,
      alignSelf: 'center',
    },
    graphLine: {
      position: 'absolute',
      height: 2,
      backgroundColor: colors.primary,
    },
    graphLineNet: {
      position: 'absolute',
      height: 2,
      backgroundColor: '#4CAF50',
    },
    graphPoint: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    graphPointNet: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#4CAF50',
    },
    graphPointPositive: {
      backgroundColor: '#F44336',
    },
    graphPointNegative: {
      backgroundColor: '#4CAF50',
    },
    graphPointZero: {
      backgroundColor: '#2196F3',
    },
    graphZeroLine: {
      position: 'absolute',
      left: 8,
      right: 8,
      height: 3,
      backgroundColor: colors.border,
      top: 100, // Center of 200px graph
    },
    customChart: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    graphDataPoint: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      zIndex: 2,
    },
    graphFireEmoji: {
      position: 'absolute',
      fontSize: 16,
      zIndex: 3,
    },
    graphLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 8,
    },
    graphLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    graphLegend: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 2,
    },
    legendText: {
      fontSize: 12,
      color: colors.textSecondary,
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
      {/* Top Action Buttons */}
      <View style={styles.topActionButtons}>
        {onReturnToRound && (
          <TouchableOpacity style={styles.returnToRoundButton} onPress={onReturnToRound}>
            <Text style={styles.returnToRoundButtonText}>Return to Round</Text>
          </TouchableOpacity>
        )}
        {onEndRound && (
          <TouchableOpacity style={styles.endRoundButton} onPress={onEndRound}>
            <Text style={styles.endRoundButtonText}>End Round</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.header}>
        <Text style={styles.title}>
          Round Summary
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
                  <TouchableOpacity 
                    key={hole.number} 
                    style={styles.holeCard}
                    onPress={() => onHolePress?.(hole.number)}
                    disabled={!onHolePress}
                  >
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={`${hole.number}-bump-${i}`} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? `${score}${hasFireShot(hole.number) ? ' 🔥' : ''}${hasPoorShot(hole.number) ? ' 💩' : ''}` : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity 
                    key={hole.number} 
                    style={styles.holeCard}
                    onPress={() => onHolePress?.(hole.number)}
                    disabled={!onHolePress}
                  >
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={`${hole.number}-bump-${i}`} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? `${score}${hasFireShot(hole.number) ? ' 🔥' : ''}${hasPoorShot(hole.number) ? ' 💩' : ''}` : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity 
                    key={hole.number} 
                    style={styles.holeCard}
                    onPress={() => onHolePress?.(hole.number)}
                    disabled={!onHolePress}
                  >
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={`${hole.number}-bump-${i}`} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? `${score}${hasFireShot(hole.number) ? ' 🔥' : ''}${hasPoorShot(hole.number) ? ' 💩' : ''}` : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity 
                    key={hole.number} 
                    style={styles.holeCard}
                    onPress={() => onHolePress?.(hole.number)}
                    disabled={!onHolePress}
                  >
                    {bumps > 0 && (
                      <View style={styles.bumpIndicators}>
                        {Array.from({ length: bumps }, (_, i) => (
                          <View key={`${hole.number}-bump-${i}`} style={styles.bumpDot} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.holeNumber}>{hole.number}</Text>
                    <Text style={[
                      styles.holeScore,
                      { color: score > 0 ? getScoreColor(score, hole.par) : colors.textSecondary }
                    ]}>
                      {score > 0 ? `${score}${hasFireShot(hole.number) ? ' 🔥' : ''}${hasPoorShot(hole.number) ? ' 💩' : ''}` : '-'}
                    </Text>
                    <Text style={styles.holePar}>Par {hole.par}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Score Graphs */}
      {(() => {
        const scores = getCumulativeScores();
        if (scores.length === 0) {
          return (
            <View style={styles.graphContainer}>
              <Text style={styles.graphTitle}>Cumulative Shots Over Par</Text>
              <View style={styles.graph}>
                <Text style={{ textAlign: 'center', color: colors.text, marginTop: 40 }}>
                  Complete some holes to see your score progression
                </Text>
              </View>
            </View>
          );
        }
        
        const maxValue = Math.max(...scores.map(s => Math.max(s.gross || 0, s.net || 0)));
        const minValue = Math.min(...scores.map(s => Math.min(s.gross || 0, s.net || 0)));
        const range = maxValue - minValue;
        const graphHeight = 100;
        
        // Define validScores for both graphs
        const validGrossScores = scores.filter(s => s.gross !== null);
        const validNetScores = scores.filter(s => s.net !== null);
        
        return (
          <View>
            {/* Gross Score Graph */}
            <View style={styles.graphContainer}>
              <Text style={styles.graphTitle}>Cumulative Shots Over Par</Text>
              <View style={styles.graph}>
                {(() => {
                  const validScores = validGrossScores;
                  if (validScores.length < 2) {
                    return (
                      <Text style={{ textAlign: 'center', color: colors.text, marginTop: 40 }}>
                        Complete at least 2 holes to see score progression
                      </Text>
                    );
                  }
                  
                  // Prepare data for LineChart
                  const chartData = validScores.map((score, index) => {
                    const holeHasFire = round.holeScores?.some(hs => 
                      hs.holeNumber === score.hole && 
                      hs.shots?.some(shot => shot.direction === 'fire')
                    );
                    const holeHasPoorShot = round.holeScores?.some(hs => 
                      hs.holeNumber === score.hole && 
                      hs.shots?.some(shot => shot.poorShot === true)
                    );
                    
                    return {
                      value: score.gross,
                      label: score.hole.toString(),
                      dataPointText: score.gross > 0 ? `+${score.gross}` : score.gross.toString(),
                      dataPointColor: colors.primary,
                      dataPointRadius: 6,
                      holeHasFire,
                      holeHasPoorShot,
                      customDataPoint: (holeHasFire || holeHasPoorShot) ? (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, marginBottom: 2 }}>
                            {holeHasFire ? '🔥' : ''}{holeHasPoorShot ? '💩' : ''}
                          </Text>
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                          }} />
                        </View>
                      ) : undefined,
                    };
                  });
                  
                  return (
                    <View style={styles.graph}>
                      {/* Zero line */}
                      <View style={[styles.graphZeroLine, { top: 100 }]} />
                      
                      {/* Custom line chart - dots only */}
                      <View style={styles.customChart}>
                        {chartData.map((point, index) => {
                          const x = index * (280 / (chartData.length - 1));
                          const y = 100 - (point.value * 20); // Scale factor of 20
                          
                          return (
                            <View key={`point-${index}`}>
                              {/* Data point */}
                              <View
                                style={[
                                  styles.graphDataPoint,
                                  {
                                    left: x - 6,
                                    top: y - 6,
                                    backgroundColor: colors.primary,
                                  },
                                ]}
                              />
                              {/* Fire and poop emojis if applicable */}
                              {point.customDataPoint && (
                                <Text
                                  style={[
                                    styles.graphFireEmoji,
                                    {
                                      left: x - 8,
                                      top: y - 20,
                                    },
                                  ]}
                                >
                                  {point.holeHasFire ? '🔥' : ''}{point.holeHasPoorShot ? '💩' : ''}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.graphLabels}>
                {validGrossScores.map((score, index) => (
                  <Text key={`gross-${score.hole}`} style={styles.graphLabel}>{score.hole}</Text>
                ))}
              </View>
            </View>

            {/* Net Score Graph */}
            {handicap !== undefined && (
              <View style={styles.graphContainer}>
                <Text style={styles.graphTitle}>Cumulative Shots Over Net Par</Text>
                <View style={styles.graph}>
                  {(() => {
                    const validScores = validNetScores;
                    if (validScores.length < 2) {
                      return (
                        <Text style={{ textAlign: 'center', color: colors.text, marginTop: 40 }}>
                          Complete at least 2 holes to see net score progression
                        </Text>
                      );
                    }
                    
                    // Prepare data for LineChart
                    const chartData = validScores.map((score, index) => {
                      const holeHasFire = round.holeScores?.some(hs => 
                        hs.holeNumber === score.hole && 
                        hs.shots?.some(shot => shot.direction === 'fire')
                      );
                      const holeHasPoorShot = round.holeScores?.some(hs => 
                        hs.holeNumber === score.hole && 
                        hs.shots?.some(shot => shot.poorShot === true)
                      );
                      
                      return {
                        value: score.net,
                        label: score.hole.toString(),
                        dataPointText: score.net > 0 ? `+${score.net}` : score.net.toString(),
                        dataPointColor: '#4CAF50',
                        dataPointRadius: 6,
                        holeHasFire,
                        holeHasPoorShot,
                        customDataPoint: (holeHasFire || holeHasPoorShot) ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, marginBottom: 2 }}>
                              {holeHasFire ? '🔥' : ''}{holeHasPoorShot ? '💩' : ''}
                            </Text>
                            <View style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: '#4CAF50',
                            }} />
                          </View>
                        ) : undefined,
                      };
                    });
                    
                    return (
                      <View style={styles.graph}>
                        {/* Zero line */}
                        <View style={[styles.graphZeroLine, { top: 100 }]} />
                        
                        {/* Custom line chart - dots only */}
                        <View style={styles.customChart}>
                          {chartData.map((point, index) => {
                            const x = index * (280 / (chartData.length - 1));
                            const y = 100 - (point.value * 20); // Scale factor of 20
                            
                            return (
                              <View key={`net-point-${index}`}>
                                {/* Data point */}
                                <View
                                  style={[
                                    styles.graphDataPoint,
                                    {
                                      left: x - 6,
                                      top: y - 6,
                                      backgroundColor: '#4CAF50',
                                    },
                                  ]}
                                />
                                {/* Fire and poop emojis if applicable */}
                                {point.customDataPoint && (
                                  <Text
                                    style={[
                                      styles.graphFireEmoji,
                                      {
                                        left: x - 8,
                                        top: y - 20,
                                      },
                                    ]}
                                  >
                                    {point.holeHasFire ? '🔥' : ''}{point.holeHasPoorShot ? '💩' : ''}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}
                </View>
                <View style={styles.graphLabels}>
                  {validNetScores.map((score, index) => (
                    <Text key={`net-${score.hole}`} style={styles.graphLabel}>{score.hole}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
      })()}

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

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActionButtons}>
        {onReturnToRound && (
          <TouchableOpacity style={styles.returnToRoundButton} onPress={onReturnToRound}>
            <Text style={styles.returnToRoundButtonText}>Return to Round</Text>
          </TouchableOpacity>
        )}
        {onEndRound && (
          <TouchableOpacity style={styles.endRoundButton} onPress={onEndRound}>
            <Text style={styles.endRoundButtonText}>End Round</Text>
          </TouchableOpacity>
        )}
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
  onViewRound?: (round: Round) => void;
  onDeleteRound?: (roundId: string) => void;
  onNavigateToRound?: () => void;
  onNavigateToCourse?: (courseId: string) => void;
  colors: any;
}> = ({ onClose, courses, onUpdateCourse, onDeleteCourse, data, onUpdateSettings, onEditRound, onViewRound, onDeleteRound, onNavigateToRound, onNavigateToCourse, colors }) => {
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
  // Deduplicate rounds by ID to prevent duplicate display
  const deduplicatedRounds = (data.rounds || []).filter((round, index, self) => 
    index === self.findIndex(r => r.id === round.id)
  );
  
  const sortedRounds = deduplicatedRounds.sort((a, b) => 
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
      backgroundColor: colors.error || '#ff4444',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    editButtonText: {
      color: colors.background,
    },
    deleteButtonText: {
      color: colors.background,
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
      backgroundColor: colors.error || '#ff4444',
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeClubButtonText: {
      color: colors.background,
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
    activeRoundNote: {
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    activeRoundText: {
      color: '#FFC107',
      marginBottom: 8,
      textAlign: 'center',
    },
    returnToRoundButton: {
      backgroundColor: '#FFC107',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: 'center',
    },
    returnToRoundButtonText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '600',
    },
    activeRoundLabel: {
      fontSize: 12,
      color: '#4CAF50',
      fontWeight: '600',
      marginTop: 4,
    },
    disabledButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      opacity: 0.5,
    },
    disabledButtonText: {
      color: 'rgba(255, 255, 255, 0.5)',
    },
    noRoundsText: {
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
    },
    roundItem: {
      flexDirection: 'column',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    roundInfo: {
      marginBottom: 8,
    },
    roundCourse: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    roundId: {
      fontSize: 12,
      fontWeight: '500',
      color: '#AAAAAA',
      marginBottom: 2,
    },
    roundDate: {
      fontSize: 14,
      color: '#CCCCCC',
      marginBottom: 4,
    },
    roundScore: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
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
    showMoreButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    showMoreText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
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
            <SettingsText variant="body">
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
            {data.currentRound && (
              <View style={styles.activeRoundNote}>
                <SettingsText variant="body">
                  Editing a round is disabled until you end the current round
                </SettingsText>
                <TouchableOpacity
                  style={styles.returnToRoundButton}
                  onPress={onNavigateToRound}
                >
                  <Text style={styles.returnToRoundButtonText}>Return to Current Round</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {sortedRounds.length === 0 ? (
              <SettingsText variant="body">
                No rounds recorded yet
              </SettingsText>
            ) : (
              <>
                {displayedRounds.map((round, index) => {
                  const course = courses.find(c => c.id === round.courseId);
                  const netScore = round.totalScore - round.totalPar;
                  const isIncomplete = !round.isComplete;
                  const isActiveRound = data.currentRound?.id === round.id;
                  const canEdit = !data.currentRound || isActiveRound;
                  
                  return (
                    <View key={round.id} style={styles.roundItem}>
                      <View style={styles.roundInfo}>
                        <Text style={styles.roundCourse}>
                          {course?.name || 'Unknown Course'}
                        </Text>
                        <Text style={styles.roundId}>
                          Round #{round.id.slice(-6)}
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
                        {isActiveRound && (
                          <Text style={styles.activeRoundLabel}>
                            Currently Active
                          </Text>
                        )}
                      </View>
                      
                      <View style={[styles.roundActions, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }]}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.editButton,
                            { flex: 1, marginRight: 8 },
                            !canEdit && styles.disabledButton
                          ]}
                          onPress={() => {
                            if (isActiveRound && onViewRound) {
                              onViewRound(round);
                            } else if (canEdit && onEditRound) {
                              onEditRound(round);
                            }
                          }}
                          disabled={!canEdit}
                        >
                          <Text style={[
                            styles.actionButtonText, 
                            styles.editButtonText,
                            !canEdit && styles.disabledButtonText
                          ]}>
                            {isActiveRound ? 'View' : 'Edit'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.deleteButton,
                            { flex: 1, marginLeft: 8 },
                            isActiveRound && styles.disabledButton
                          ]}
                          onPress={() => {
                            console.log('Delete button pressed for round:', { id: round.id, courseName: round.courseName, isActiveRound });
                            if (!isActiveRound && onDeleteRound && round.id) {
                              onDeleteRound(round.id);
                            }
                          }}
                          disabled={isActiveRound}
                        >
                          <Text style={[
                            styles.actionButtonText, 
                            styles.deleteButtonText,
                            isActiveRound && styles.disabledButtonText
                          ]}>
                            Delete
                          </Text>
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
              Golf Brain helps you record detailed golf rounds with shot-by-shot tracking.{'\n'}
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
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roundInfo: {
    marginBottom: 8,
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
    justifyContent: 'center',
    minHeight: 32,
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
  activeRoundNote: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  activeRoundText: {
    color: '#FFC107',
    marginBottom: 8,
    textAlign: 'center',
  },
  returnToRoundButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  returnToRoundButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  activeRoundLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
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
  isPoorShot?: boolean;
  onSelect: (outcome: string) => void;
  onPoopSelect?: (outcome: string) => void;
  showError?: boolean;
  colors: any;
  onFlameAnimation?: () => void;
  onPoopAnimation?: () => void;
}> = ({ shotType, shotNumber, historicalData, selectedOutcome, isPoorShot = false, onSelect, onPoopSelect, showError = false, colors, onFlameAnimation, onPoopAnimation }) => {
  
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
      gap: 1,
    },
    row: {
      flex: 1,
      gap: 1,
    },
    cell: {
      aspectRatio: 1.5, // More compact, less white space
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
              const isSelected = selectedOutcome === outcomeValue || (selectedOutcome === 'fire' && outcome === 'good');
              const isGood = outcomeValue === 'good';
              
              // Determine cell color based on position
              const getCellColor = () => {
                if (isSelected) {
                  // Check if fire is selected (special case for good cell)
                  if (selectedOutcome === 'fire' && outcome === 'good') {
                    return '#FF8C00'; // Burnt orange for fire
                  }
                  // Check if good is selected
                  if (selectedOutcome === 'good' && outcomeValue === 'good') {
                    return '#228B22'; // Dark green for good
                  }
                  return colors.primary; // Default selection color
                }
                if (isGood) return '#E8F5E8'; // Light green for center when not selected
                
                // Corner cells (bad outcomes) - light red
                if (outcomeValue === 'left and long' || outcomeValue === 'right and long' || 
                    outcomeValue === 'left and short' || outcomeValue === 'right and short') {
                  return '#FFE8E8'; // Light red
                }
                
                // Outer central cells (okay outcomes) - no background color
                if (outcomeValue === 'left' || outcomeValue === 'right' || 
                    outcomeValue === 'long' || outcomeValue === 'short') {
                  return 'transparent'; // No background color
                }
                
                return colors.surface; // Default
              };

              return (
                <TouchableOpacity
                  key={outcome}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: isSelected && isPoorShot ? '#D2B48C' : getCellColor(), // Light brown for poor shots
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    }
                  ]}
                  onPress={() => onSelect(outcomeValue)}
                  onLongPress={isGood ? () => {
                    onSelect('fire');
                    onFlameAnimation?.();
                  } : () => {
                    onPoopSelect?.(outcomeValue);
                    onPoopAnimation?.();
                  }}
                >
                  <Text style={[
                    styles.cellText, 
                    { 
                      color: isSelected ? colors.background : colors.text,
                      fontWeight: isSelected ? '600' : '500'
                    }
                  ]}>
                    {outcome === 'good' ? (selectedOutcome === 'fire' ? '🔥' : 'good') : (isSelected && isPoorShot ? `${outcome} 💩` : outcome)}
                  </Text>
                  {count > 0 && !isSelected && outcome !== 'good' && (
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
  onSaveHoleData: (holeNumber: number, shots: Shot[], putts: Shot[]) => void;
  onLoadHoleData: (holeNumber: number) => { shots: Shot[]; putts: Shot[] } | null;
  onUpdateTodaysDistance: (holeNumber: number, distance: number | undefined) => void;
  onEndRound: () => void;
  onViewSummary: () => void;
  onClose: () => void;
  clubs: string[];
  handicap?: number;
  getBumpsForHole: (hole: Hole) => number;
  colors: any;
  onFlameAnimation: () => void;
  onPoopAnimation: () => void;
}>(({ course, currentHole, currentRound, data, onNextHole, onPreviousHole, onCompleteHole, onShowHistory, onSaveHoleData, onLoadHoleData, onUpdateTodaysDistance, onEndRound, onViewSummary, onClose, clubs, handicap, getBumpsForHole, colors, onFlameAnimation, onPoopAnimation }, ref) => {
  const hole = (course.holes || []).find(h => h.number === currentHole);
  const [shots, setShots] = useState<Shot[]>([]);
  const [putts, setPutts] = useState<Shot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [todaysDistance, setTodaysDistance] = useState<string>(hole?.todaysDistance?.toString() || '');
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const expectedShots = hole ? Math.max(0, hole.par - 2) : 0; // par 3 = 1, par 4 = 2, par 5 = 3
  const expectedPutts = 2;

  // Check if all default iron shots have outcomes
  const allShotsHaveOutcomes = (shots?.length || 0) >= expectedShots && 
    shots?.slice(0, expectedShots).every(shot => shot.direction);

  // Get all shots in order (iron shots first, then putts)
  const getAllShots = () => {
    const allShots = [
      ...(shots || []).map((shot, index) =>  ({ shot, type: 'shot' as const, index, id: shot.id })),
      ...(putts || []).map((shot, index) => ({ shot, type: 'putt' as const, index, id: shot.id }))
    ];
    console.log('getAllShots debug:', {
      shotsCount: (shots || []).length,
      puttsCount: (putts || []).length,
      totalShots: allShots.length,
      allShots: allShots.map(s => ({ type: s.type, index: s.index }))
    });
    return allShots;
  };

  // Get current shot being displayed using sequential indexing
  const getCurrentShot = () => {
    const allShots = getAllShots();
    return allShots[currentShotIndex] || null;
  };

  // Get current shot type and display info
  const getCurrentShotInfo = () => {
    const allShots = getAllShots();
    const currentShot = allShots[currentShotIndex];
    if (!currentShot) return null;
    
    const isShot = currentShot.type === 'shot';
    const shotNumber = isShot ? currentShot.index + 1 : currentShot.index + 1;
    const shotLabel = isShot ? `Shot ${shotNumber}` : `Putt ${shotNumber}`;
    
    return {
      shot: currentShot.shot,
      type: currentShot.type,
      shotNumber,
      shotLabel,
      isShot
    };
  };


  // Expose saveCurrentData method to parent
  useImperativeHandle(ref, () => ({
    saveCurrentData: () => {
      onSaveHoleData(currentHole, shots, putts);
      // Save today's distance
      const distanceValue = todaysDistance ? parseInt(todaysDistance) : undefined;
      onUpdateTodaysDistance(currentHole, distanceValue);
    }
  }));

  // Initialize shots when hole changes - load existing data or create defaults
  useEffect(() => {
    console.log('Shot initialization debug:', {
      currentHole,
      hole: hole?.number,
      par: hole?.par,
      expectedShots,
      expectedPutts
    });
    
    // Try to load existing data for this hole
    const existingData = onLoadHoleData(currentHole);
    
    if (existingData) {
      console.log('Loading existing data:', existingData);
      // Load existing data
      const loadedShots = existingData.shots || [];
      const loadedPutts = existingData.putts || [];
      
      // If no shots exist but we expect shots, create default shots
      if (loadedShots.length === 0 && expectedShots > 0) {
        console.log('No shots in loaded data, creating default shots');
        const defaultShots: Shot[] = Array.from({ length: expectedShots }, (_, index) => ({
          id: `shot-${Date.now()}-${index}`,
          type: 'shot',
          lie: index === expectedShots - 1 ? 'green' : 'fairway', // Last shot defaults to green
          direction: 'good', // Default to good outcome
          timestamp: Date.now(),
        }));
        setShots(defaultShots);
        console.log('Created default shots:', defaultShots);
      } else {
        setShots(loadedShots);
      }
      
      // If no putts exist but we expect putts, create default putts
      if (loadedPutts.length === 0 && expectedPutts > 0) {
        console.log('No putts in loaded data, creating default putts');
        const defaultPutts: Shot[] = Array.from({ length: expectedPutts }, (_, index) => ({
          id: `putt-${Date.now()}-${index}`,
          type: 'putt',
          puttDistance: index === 1 ? '<4ft' : '5-10ft', // Second putt is typically a tap-in
          direction: 'good', // Default to good outcome
          timestamp: Date.now(),
        }));
        setPutts(defaultPutts);
        console.log('Created default putts:', defaultPutts);
      } else {
        setPutts(loadedPutts);
      }
    } else {
      console.log('Creating default shots:', { expectedShots, expectedPutts });
      // Create default shots
      const defaultShots: Shot[] = Array.from({ length: expectedShots }, (_, index) => ({
        id: `shot-${Date.now()}-${index}`,
        type: 'shot',
        lie: index === expectedShots - 1 ? 'green' : 'fairway', // Last shot defaults to green
        direction: 'good', // Default to good outcome
        timestamp: Date.now(),
      }));

      const defaultPutts: Shot[] = Array.from({ length: expectedPutts }, (_, index) => ({
        id: `putt-${Date.now()}-${index}`,
        type: 'putt',
        puttDistance: index === 1 ? '<4ft' : '5-10ft', // Second putt is typically a tap-in
        direction: 'good', // Default to good outcome
        timestamp: Date.now(),
      }));

      console.log('Created default shots:', defaultShots);
      console.log('Created default putts:', defaultPutts);
      setShots(defaultShots);
      setPutts(defaultPutts);
    }

    // Update today's distance when hole changes
    setTodaysDistance(hole?.todaysDistance?.toString() || '');

    // Reset current shot to first shot when hole changes
    setCurrentShotIndex(0);

    // Scroll to first shot when hole changes
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [currentHole, expectedShots, expectedPutts, hole]);




  const addShot = () => {
    const newShot: Shot = {
      id: `shot-${Date.now()}-${Math.random()}`,
      type: 'shot',
      lie: 'green',
      direction: 'good', // Default to good outcome
      timestamp: Date.now(),
    };
    setShots(prev => {
      const newShots = [...prev, newShot];
      
      // If the previous shot has lie 'green', change it to 'fairway'
      if (prev.length > 0 && prev[prev.length - 1].lie === 'green') {
        const updatedPrevShots = [...prev];
        updatedPrevShots[updatedPrevShots.length - 1] = {
          ...updatedPrevShots[updatedPrevShots.length - 1],
          lie: 'fairway'
        };
        return [...updatedPrevShots, newShot];
      }
      
      return newShots;
    });
    
    // Go to the new shot (it will be the last iron shot)
    setCurrentShotIndex((shots || []).length); // Index of the new shot
    
    HapticFeedback.light();
  };

  const addPutt = () => {
    const newPutt: Shot = {
      id: `putt-${Date.now()}-${Math.random()}`,
      type: 'putt',
      puttDistance: '5-10ft',
      direction: 'good', // Default to good outcome
      timestamp: Date.now(),
    };
    setPutts(prev => [...prev, newPutt]);
    
    // Go to the new putt (it will be the last putt)
    setCurrentShotIndex((shots || []).length + (putts || []).length); // Index of the new putt
    
    HapticFeedback.light();
  };

  // Shot navigation functions
  const goToPreviousShot = () => {
    if (currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
      HapticFeedback.light();
    }
  };

  const goToNextShot = () => {
    const allShots = getAllShots();
    if (currentShotIndex < allShots.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
      HapticFeedback.light();
    }
  };

  const canGoPrevious = currentShotIndex > 0;
  const canGoNext = currentShotIndex < getAllShots().length - 1;

  const removeShot = (shotId: string, type: 'shot' | 'putt') => {
    if (type === 'shot') {
      const shotIndex = shots.findIndex(shot => shot.id === shotId);
      setShots(prev => prev.filter(shot => shot.id !== shotId));
      
      // Adjust current shot index if needed
      if (currentShotIndex === shotIndex) {
        // If we removed the current shot, go to the previous one or first available
        setCurrentShotIndex(Math.max(0, shotIndex - 1));
      } else if (currentShotIndex > shotIndex) {
        // If we removed a shot before the current one, adjust the index
        setCurrentShotIndex(currentShotIndex - 1);
      }
    } else {
      const puttIndex = (putts || []).findIndex(putt => putt.id === shotId);
      const globalIndex = (shots || []).length + puttIndex;
      setPutts(prev => prev.filter(putt => putt.id !== shotId));
      
      // Adjust current shot index if needed
      if (currentShotIndex === globalIndex) {
        // If we removed the current putt, go to the previous one or first available
        setCurrentShotIndex(Math.max(0, globalIndex - 1));
      } else if (currentShotIndex > globalIndex) {
        // If we removed a putt before the current one, adjust the index
        setCurrentShotIndex(currentShotIndex - 1);
      }
    }
    HapticFeedback.light();
  };



  const updateShot = (shotId: string, type: 'shot' | 'putt', field: keyof Shot, value: any) => {
    if (type === 'shot') {
      setShots(prev => prev.map(shot => 
        shot.id === shotId ? { ...shot, [field]: value } : shot
      ));
    } else {
      setPutts(prev => prev.map(shot => 
        shot.id === shotId ? { ...shot, [field]: value } : shot
      ));
    }
    // Clear validation error when shots are updated
    setShowValidationError(false);
    
    // No auto-advance - let user manually navigate
  };

  const totalScore = (shots || []).length + (putts || []).length;
  const netScore = totalScore - (hole?.par || 0);

  const handleCompleteHole = () => {
    if ((shots || []).length === 0 && (putts || []).length === 0) {
      Alert.alert('Error', 'Please add at least one shot to complete the hole');
      return;
    }

    // Check if all shots have been described
    const allShotsDescribed = (shots || []).every(shot => shot.direction);
    const allPuttsDescribed = (putts || []).every(putt => putt.direction); // puttDistance is optional
    
    if (!allShotsDescribed || !allPuttsDescribed) {
      setShowValidationError(true);
      Alert.alert('Error', 'Cannot go to next hole until all shots have a selected outcome or deleted');
      return;
    }

    const holeScore: HoleScore = {
      holeNumber: currentHole,
      courseId: course.id,
      shots: [...shots, ...putts],
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
    
    const shotData: { [key: string]: number } = {};
    const puttData: { [key: string]: number } = {};
    
    holeScores.forEach(holeScore => {
      (holeScore.shots || []).forEach(shot => {
        if (shot.direction) {
          if (shot.type === 'shot') {
            shotData[shot.direction] = (shotData[shot.direction] || 0) + 1;
          } else if (shot.type === 'putt') {
            puttData[shot.direction] = (puttData[shot.direction] || 0) + 1;
          }
        }
      });
    });
    
    return { shot: shotData, putts: puttData };
  };

  const historicalData = getHistoricalShotData();


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
      marginTop: 4,
      gap: 8,
    },
    todaysDistanceLabel: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
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
      padding: 12, // Reduced padding to remove excess white space
      paddingBottom: 12, // Reduced bottom padding
      marginBottom: 5, // Add 5px spacing between cards
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
      marginRight: 12,
    },
    puttDistanceDropdown: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 40,
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
    deleteShotButton: {
      backgroundColor: colors.error || '#ff4444',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteShotButtonText: {
      color: colors.background,
      fontSize: 12,
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
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
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
      padding: 2,
      paddingBottom: 4,
      paddingTop: 4,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      minHeight: 28,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 3,
      marginTop: 3,
    },
    navButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      height: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    navButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    arrowButton: {
      backgroundColor: colors.primary, // Blue for navigation
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 16,
      height: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    arrowButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 12,
    },
    // xxx
    endRoundButton: {
      backgroundColor: colors.error || '#f44336',
      borderWidth: 2,
      borderColor: colors.error || '#d32f2f',
      borderRadius: 16,
      height: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    endRoundButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 12,
    },
    disabledButton: {
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    disabledButtonText: {
      color: colors.textSecondary,
    },
    viewButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 8,
      gap: 12,
    },
    viewButton: {
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      flex: 1,
      maxWidth: 150,
    },
    viewButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    viewButtonTextActive: {
      color: colors.background,
    },
    addShotCard: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 12,
      marginBottom: 0,
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    addShotCardContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8, // Reduced padding for smaller card
    },
    addShotCardText: {
      fontSize: 18, // Reduced font size for smaller card
      fontWeight: '600',
      color: colors.background,
      marginBottom: 4, // Reduced margin for smaller card
    },
    addShotCardSubtext: {
      fontSize: 12, // Reduced font size for smaller card
      color: colors.background,
      textAlign: 'center',
      opacity: 0.8,
    },
    todaysDistanceCard: {
      backgroundColor: colors.surface,
      margin: 20,
      marginTop: 4,
      marginBottom: 8,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noShotsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    noShotsText: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: 30,
      textAlign: 'center',
    },
    addShotButtonsContainer: {
      flexDirection: 'row',
      gap: 16,
    },
    addShotButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 120,
      backgroundColor: colors.primary,
    },
    addPuttButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    addShotButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.background,
    },
    addPuttButtonText: {
      color: colors.primary,
    },
    shotNavigationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    shotCounter: {
      alignItems: 'center',
    },
    shotCounterText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    shotGridContainer: {
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      position: 'relative',
    },
    shotNavigationArrows: {
      position: 'absolute',
      bottom: 8,
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    shotArrowButton: {
      height: 32,
      width: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    disabledShotArrow: {
      backgroundColor: colors.border,
    },
    shotArrowText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    disabledShotArrowText: {
      color: colors.textSecondary,
    },
    shotRow: {
      marginBottom: 4,
    },
    shotRowContent: {
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexGrow: 1,
    },
    shotButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 40,
    },
    activeShotButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    shotButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    activeShotButtonText: {
      color: colors.background,
    },
    addShotGridButton: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    // xxx
    addShotGridButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
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

      {/* Today's Distance Card - Outside ScrollView */}
      <View style={[styles.todaysDistanceCard, { paddingHorizontal: 20 }]}>
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

      {/* Single Shot Display */}
      <View style={[styles.content, { height: 350 }]}>
        {(() => {
          const shotInfo = getCurrentShotInfo();
          if (!shotInfo) {
            // No shots yet - show add shot options
            return (
              <View style={styles.noShotsContainer}>
                <Text style={styles.noShotsText}>No shots recorded yet</Text>
                <View style={styles.addShotButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.addShotButton, styles.addShotButton]}
                    onPress={addShot}
                  >
                    <Text style={[styles.addShotButtonText, styles.addShotButtonText]}>+ Add Shot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addShotButton, styles.addPuttButton]}
                    onPress={addPutt}
                  >
                    <Text style={[styles.addShotButtonText, styles.addPuttButtonText]}>+ Add Putt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.shotCard}>
              <View style={styles.shotHeader}>
                <Text style={styles.shotNumber}>{shotInfo.shotLabel}</Text>
                <TouchableOpacity
                  style={styles.deleteShotButton}
                  onPress={() => removeShot(shotInfo.shot.id, shotInfo.type === 'shot' ? 'shot' : 'putt')}
                >
                  <Text style={styles.deleteShotButtonText}>Delete Shot</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.shotFields}>
                <View style={[styles.shotFieldRow, { flexDirection: 'row', gap: 8 }]}>
                  {shotInfo.isShot ? (
                    <>
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          options={clubs || []}
                          selectedValue={shotInfo.shot.club || ''}
                          onSelect={(value) => updateShot(shotInfo.shot.id, 'shot', 'club', value)}
                          style={styles.clubDropdown}
                          textStyle={styles.dropdownText}
                          placeholder="club (optional)"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          options={LIE_OPTIONS}
                          selectedValue={shotInfo.shot.lie || 'fairway'}
                          onSelect={(value) => updateShot(shotInfo.shot.id, 'shot', 'lie', value)}
                          style={styles.lieDropdown}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          options={PUTT_DISTANCE_OPTIONS}
                          selectedValue={shotInfo.shot.puttDistance || '5-10ft'}
                          onSelect={(value) => updateShot(shotInfo.shot.id, 'putt', 'puttDistance', value)}
                          style={styles.puttDistanceDropdown}
                          textStyle={styles.dropdownText}
                        />
                      </View>
                    </>
                  )}
                </View>
              </View>
              
              {/* Outcome Grid for this shot */}
              <View style={{ height: 20, marginTop: 12 }} />
              <OutcomeGrid
                shotType={shotInfo.type === 'shot' ? 'iron' : shotInfo.type}
                shotNumber={shotInfo.shotNumber}
                historicalData={shotInfo.isShot ? (historicalData.shot || {}) : (historicalData.putts || {})}
                selectedOutcome={shotInfo.shot.direction}
                isPoorShot={shotInfo.shot.poorShot === true}
                onSelect={(outcome) => {
                  updateShot(shotInfo.shot.id, shotInfo.type === 'shot' ? 'shot' : 'putt', 'direction', outcome);
                  // Clear poorShot flag when any cell is selected (except long press)
                  updateShot(shotInfo.shot.id, shotInfo.type === 'shot' ? 'shot' : 'putt', 'poorShot', false);
                }}
                onPoopSelect={(outcome) => {
                  updateShot(shotInfo.shot.id, shotInfo.type === 'shot' ? 'shot' : 'putt', 'direction', outcome);
                  updateShot(shotInfo.shot.id, shotInfo.type === 'shot' ? 'shot' : 'putt', 'poorShot', true);
                }}
                onFlameAnimation={onFlameAnimation}
                onPoopAnimation={onPoopAnimation}
                showError={showValidationError && !shotInfo.shot.direction}
                colors={colors}
              />
            </View>
          );
        })()}
      </View>

      {/* Shot Grid Navigation */}
      <View style={styles.shotGridContainer}>
        {/* Shots Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.shotRow}
          contentContainerStyle={styles.shotRowContent}
        >
          {(shots || []).map((shot, index) => (
            <TouchableOpacity
              key={shot.id}
              style={[
                styles.shotButton,
                currentShotIndex === index && styles.activeShotButton
              ]}
              onPress={() => setCurrentShotIndex(index)}
            >
                <Text style={[
                  styles.shotButtonText,
                  currentShotIndex === index && styles.activeShotButtonText
                ]}>s{index + 1}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Add Shot Button */}
          <TouchableOpacity
            style={styles.addShotGridButton}
            onPress={addShot}
          >
            <Text style={styles.addShotGridButtonText}>+shot</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Putts Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.shotRow}
          contentContainerStyle={styles.shotRowContent}
        >
          {(putts || []).map((putt, index) => (
            <TouchableOpacity
              key={putt.id}
              style={[
                styles.shotButton,
                currentShotIndex === (shots || []).length + index && styles.activeShotButton
              ]}
              onPress={() => setCurrentShotIndex((shots || []).length + index)}
            >
              <Text style={[
                styles.shotButtonText,
                currentShotIndex === (shots || []).length + index && styles.activeShotButtonText
              ]}>p{index + 1}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Add Putt Button */}
          <TouchableOpacity
            style={styles.addShotGridButton}
            onPress={addPutt}
          >
            <Text style={styles.addShotGridButtonText}>+putt</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Shot Navigation Arrows - At Screen Edges */}
        <View style={styles.shotNavigationArrows}>
          <TouchableOpacity
            style={[
              styles.shotArrowButton,
              !canGoPrevious && styles.disabledShotArrow
            ]}
            onPress={goToPreviousShot}
            disabled={!canGoPrevious}
          >
            <Text style={[
              styles.shotArrowText,
              !canGoPrevious && styles.disabledShotArrowText
            ]}>←</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.shotArrowButton,
              !canGoNext && styles.disabledShotArrow
            ]}
            onPress={goToNextShot}
            disabled={!canGoNext}
          >
            <Text style={[
              styles.shotArrowText,
              !canGoNext && styles.disabledShotArrowText
            ]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Permanent Navigation - Fixed above spark bottom navigation */}
      <View style={styles.permanentNavigation}>
        {/* Top Row */}
        <View style={styles.navRow}>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.arrowButton, 
              currentHole <= 1 && styles.disabledButton
            ]} 
            onPress={currentHole > 1 ? onPreviousHole : undefined}
            disabled={currentHole <= 1}
          >
            <Text style={[
              styles.buttonText, 
              styles.arrowButtonText,
              currentHole <= 1 && styles.disabledButtonText
            ]}>←</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.navButton]} onPress={onShowHistory}>
            <Text style={[styles.buttonText, styles.navButtonText]}>Hole History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.arrowButton,
              currentHole >= 18 && styles.disabledButton
            ]} 
            onPress={currentHole < 18 ? handleCompleteHole : undefined}
            disabled={currentHole >= 18}
          >
            <Text style={[
              styles.buttonText, 
              styles.arrowButtonText,
              currentHole >= 18 && styles.disabledButtonText
            ]}>→</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.button, styles.navButton]} onPress={handleViewSummary}>
            <Text style={[styles.buttonText, styles.navButtonText]}>Round Summary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.endRoundButton]} onPress={onEndRound}>
            <Text style={[styles.buttonText, styles.endRoundButtonText]}>End Round</Text>
          </TouchableOpacity>
        </View>
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
    courses: [DEFAULT_COURSE, DEFAULT_COURSE_BACK9],
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
  const [roundEnded, setRoundEnded] = useState(false);
  const [flameAnimation, setFlameAnimation] = useState<{ visible: boolean; flames: Array<{ id: string; x: number; y: number; rotation: number; scale: number; targetY: number; translateY: Animated.Value }> }>({
    visible: false,
    flames: []
  });

  const [poopAnimation, setPoopAnimation] = useState<{ visible: boolean; poops: Array<{ id: string; x: number; y: number; rotation: number; scale: number; targetY: number; translateY: Animated.Value }> }>({
    visible: false,
    poops: []
  });


  // Load saved data on mount
  useEffect(() => {
    const savedData = getSparkData('golf-brain') as GolfTrackerData;
    if (savedData) {
      // Ensure default courses are always available
      const hasDefaultCourse = savedData.courses?.some((course: Course) => course.id === DEFAULT_COURSE.id);
      const hasDefaultBack9Course = savedData.courses?.some((course: Course) => course.id === DEFAULT_COURSE_BACK9.id);
      
      let courses = savedData.courses || [];
      if (!hasDefaultCourse) {
        courses = [DEFAULT_COURSE, ...courses];
      }
      if (!hasDefaultBack9Course) {
        courses = [DEFAULT_COURSE_BACK9, ...courses];
      }
      
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
      setData(prev => ({
        ...prev,
        currentRound: inProgressRound,
      }));
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
    setRoundEnded(false); // Reset round ended state when starting new round
    
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
    setData(prev => ({
      ...prev,
      currentRound: newRound,
    }));
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
    setData(prev => ({
      ...prev,
      currentRound: updatedRound,
    }));

    // Note: Round completion is now handled by handleEndRound() when "End Round" is clicked
    // This prevents duplicate rounds from being created
    
    // Move to next hole if not hole 18
    if (holeScore.holeNumber < 18) {
      const nextHole = holeScore.holeNumber + 1;
      setCurrentHole(nextHole);
      
      // Clear any temporary data for the next hole to ensure it starts fresh
      setTempHoleData(prev => {
        const updated = { ...prev };
        delete updated[nextHole];
        return updated;
      });
    }

    HapticFeedback.success();
  };

  const handleNextHole = () => {
    if (currentHole < 18) {
      // Save current hole data before navigating
      if (holeDetailRef.current) {
        holeDetailRef.current.saveCurrentData();
      }
      const nextHole = currentHole + 1;
      setCurrentHole(nextHole);
      
      // Clear any temporary data for the next hole to ensure it starts fresh
      setTempHoleData(prev => {
        const updated = { ...prev };
        delete updated[nextHole];
        return updated;
      });
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
  const [tempHoleData, setTempHoleData] = useState<Record<number, { shots: Shot[]; putts: Shot[] }>>({});
  const holeDetailRef = useRef<{ saveCurrentData: () => void }>(null);

  const handleSaveHoleData = (holeNumber: number, shots: Shot[], putts: Shot[]) => {
    console.log('handleSaveHoleData called:', {
      holeNumber,
      shots: shots || [],
      putts: putts || [],
      shotsCount: (shots || []).length,
      puttsCount: (putts || []).length,
      currentRound: currentRound?.id
    });
    
    // Save to temporary storage for navigation
    setTempHoleData(prev => ({
      ...prev,
      [holeNumber]: { shots: shots, putts }
    }));

    // Also save to permanent database if we have a current round
    if (currentRound) {
      const holeScore: HoleScore = {
        holeNumber,
        courseId: currentRound.courseId,
        shots: [...(shots || []), ...(putts || [])],
        totalScore: (shots || []).length + (putts || []).length,
        par: selectedCourse?.holes.find(h => h.number === holeNumber)?.par || 4,
        netScore: ((shots || []).length + (putts || []).length) - (selectedCourse?.holes.find(h => h.number === holeNumber)?.par || 4),
        completedAt: Date.now(),
      };
      
      console.log('Saving hole score to permanent database:', holeScore);

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

        const updatedCurrentRound = {
          ...currentRound,
          holeScores: [
            ...(currentRound.holeScores || []).filter(hs => hs.holeNumber !== holeNumber),
            holeScore
          ]
        };

        console.log('Updating current round with hole data:', {
          holeNumber,
          updatedHoleScores: updatedCurrentRound.holeScores.length,
          currentRoundId: currentRound.id
        });

        return {
          ...prev,
          rounds: updatedRounds,
          currentRound: updatedCurrentRound
        };
      });

      // Also update local currentRound state to stay in sync
      setCurrentRound(prev => {
        if (!prev) return null;
        return {
          ...prev,
          holeScores: [
            ...(prev.holeScores || []).filter(hs => hs.holeNumber !== holeNumber),
            holeScore
          ]
        };
      });
    }
  };

  const handleLoadHoleData = (holeNumber: number) => {
    console.log('handleLoadHoleData called for hole:', holeNumber);
    console.log('tempHoleData:', tempHoleData);
    
    // First check temporary storage (for current session)
    if (tempHoleData[holeNumber]) {
      const tempData = tempHoleData[holeNumber];
      console.log('Found temp data for hole', holeNumber, ':', tempData);
      // Migrate putts in temporary storage if needed
      const migratedPutts = (tempData.putts || []).map(putt => ({
        ...putt,
        puttDistance: putt.puttDistance || (putt as any).feet ? 
          (putt as any).feet < 4 ? '<4ft' as const : 
          (putt as any).feet <= 10 ? '5-10ft' as const : '10+ft' as const : 
          undefined
      })) as Shot[];
      const result = { ...tempData, shots: tempData.shots || [], putts: migratedPutts };
      console.log('Returning temp data:', result);
      return result;
    }

    // Then check permanent database (for previously saved data)
    if (currentRound) {
      const existingHoleScore = (currentRound.holeScores || []).find(hs => hs.holeNumber === holeNumber);
      if (existingHoleScore) {
        const shots = (existingHoleScore.shots || []).filter(shot => shot.type === 'shot');
        const putts = (existingHoleScore.shots || []).filter(shot => shot.type === 'putt').map(putt => ({
          ...putt,
          // Migrate old 'feet' field to 'puttDistance' if needed
          puttDistance: putt.puttDistance || (putt as any).feet ? 
            (putt as any).feet < 4 ? '<4ft' as const : 
            (putt as any).feet <= 10 ? '5-10ft' as const : '10+ft' as const : 
            undefined
        })) as Shot[];
        return { shots: shots, putts };
      }
    }

    console.log('No data found for hole', holeNumber, 'returning null');
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
    console.log('handleEditRound called with round:', { id: round.id, courseId: round.courseId, courseName: round.courseName });
    
    // Check if there's an active round
    if (data.currentRound && data.currentRound.id !== round.id) {
      console.log('Active round in progress, showing alert');
      Alert.alert(
        'Active Round in Progress',
        'You must end your current round before editing another round.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    console.log('Setting round as current and navigating to round summary');
    // Set the round as current and navigate to round summary
    setData(prev => ({
      ...prev,
      currentRound: round,
    }));
    // Also update local currentRound state for consistency
    setCurrentRound(round);
    const course = data.courses.find(c => c.id === round.courseId);
    console.log('Found course for round:', { courseId: round.courseId, course: course?.name || 'Not found' });
    setSelectedCourse(course || null);
    setCurrentScreen('round-summary');
    console.log('Navigation state set:', { currentScreen: 'round-summary', selectedCourse: course?.name, currentRound: round.id });
    // Close settings when navigating to round summary
    if (onCloseSettings) {
      onCloseSettings();
    }
  };

  const handleViewRound = (round: Round) => {
    // For active rounds, just navigate to round summary without changing current round
    setCurrentRound(round);
    setData(prev => ({
      ...prev,
      currentRound: round,
    }));
    setSelectedCourse(data.courses.find(c => c.id === round.courseId) || null);
    setCurrentScreen('round-summary');
    // Close settings when navigating to round summary
    if (onCloseSettings) {
      onCloseSettings();
    }
  };

  const handleDeleteRound = (roundId: string) => {
    console.log('handleDeleteRound called with roundId:', roundId);
    console.log('Current rounds before deletion:', (data.rounds || []).map(r => ({ id: r.id, courseName: r.courseName })));
    
    // Safety check - if roundId is undefined or empty, don't delete anything
    if (!roundId) {
      console.error('handleDeleteRound called with empty roundId');
      return;
    }
    
    setData(prev => {
      const filteredRounds = (prev.rounds || []).filter(round => {
        const shouldKeep = round.id !== roundId;
        console.log(`Round ${round.id} ${shouldKeep ? 'kept' : 'deleted'} (comparing with ${roundId})`);
        return shouldKeep;
      });
      console.log('Rounds after filtering:', filteredRounds.map(r => ({ id: r.id, courseName: r.courseName })));
      
      return {
        ...prev,
        rounds: filteredRounds,
        // If we're deleting the current round, clear it
        currentRound: prev.currentRound?.id === roundId ? undefined : prev.currentRound,
      };
    });
    // Also clear local currentRound state if we're deleting the current round
    if (currentRound?.id === roundId) {
      setCurrentRound(null);
    }
  };

  const handleEndRound = () => {
    console.log('End Round clicked - saving current hole and going to round summary');
    
    if (currentRound) {
      console.log('Saving current hole and going to round summary:', { id: currentRound.id, courseName: currentRound.courseName });
      
      // Save current hole data FIRST
      try {
        if (holeDetailRef.current) {
          console.log('Calling saveCurrentData from holeDetailRef');
          holeDetailRef.current.saveCurrentData();
        } else {
          console.log('holeDetailRef.current is null - cannot save current data');
        }
      } catch (error) {
        console.error('Error calling saveCurrentData:', error);
      }
      
      // Go to round summary with round still active
      setCurrentScreen('round-summary');
    } else {
      console.log('No current round to save');
      setCurrentScreen('round-summary');
    }
  };

  const handleHolePress = (holeNumber: number) => {
    setCurrentHole(holeNumber);
    setCurrentScreen('hole-detail');
  };

  const handleActuallyEndRound = () => {
    console.log('Actually ending round - marking as complete and going to settings');
    
    if (currentRound) {
      // Create the completed round
      const completedRound = {
        ...currentRound,
        completedAt: Date.now(),
        isComplete: true,
      };
      console.log('Saving completed round:', completedRound);
      
      // Save the completed round to the rounds array
      setData(prev => {
        const newRounds = [...(prev.rounds || []), completedRound];
        console.log('Rounds after adding completed round:', newRounds.map(r => ({ id: r.id, courseName: r.courseName })));
        
        return {
          ...prev,
          rounds: newRounds,
          currentRound: undefined, // Clear the active round
        };
      });
      
      // Clear the current round
      setCurrentRound(null);
      setCurrentScreen('course-selection');
    }
  };

  const handleReturnToRound = () => {
    console.log('Return to round clicked - going back to hole detail');
    setCurrentScreen('hole-detail');
  };

  const handleViewSummary = () => {
    console.log('View summary clicked - saving current hole and going to round summary');
    
    // Save current hole data first
    try {
      if (holeDetailRef.current) {
        console.log('Calling saveCurrentData from holeDetailRef');
        holeDetailRef.current.saveCurrentData();
      } else {
        console.log('holeDetailRef.current is null - cannot save current data');
      }
    } catch (error) {
      console.error('Error calling saveCurrentData:', error);
    }
    
    setCurrentScreen('round-summary');
  };

  const triggerFlameAnimation = () => {
    // Create multiple flame emojis starting from bottom, animating to top
    const flames = Array.from({ length: 8 }, (_, i) => {
      const startY = 600 + Math.random() * 200; // Start from bottom of screen
      const targetY = Math.random() * 200 + 50; // Target position near top
      const translateY = new Animated.Value(startY);
      
      // Start the animation
      Animated.timing(translateY, {
        toValue: targetY,
        duration: 2000 + Math.random() * 1000, // Random duration between 2-3 seconds
        useNativeDriver: true,
      }).start();
      
      return {
        id: `flame-${i}-${Date.now()}`,
        x: Math.random() * 300 + 50, // Random x position
        y: startY,
        rotation: 0, // No rotation - normal orientation
        scale: Math.random() * 0.6 + 0.8, // Random scale between 0.8 and 1.4
        targetY: targetY,
        translateY: translateY,
      };
    });

    setFlameAnimation({
      visible: true,
      flames
    });

    // Hide animation after 3 seconds
    setTimeout(() => {
      setFlameAnimation({
        visible: false,
        flames: []
      });
    }, 3000);
  };

  const triggerPoopAnimation = () => {
    // Create multiple poop emojis starting from top, animating down
    const poops = Array.from({ length: 6 }, (_, i) => {
      const startY = -100 - Math.random() * 100; // Start from above screen
      const targetY = 600 + Math.random() * 200; // Target position near bottom
      const translateY = new Animated.Value(startY);
      
      // Start the animation
      Animated.timing(translateY, {
        toValue: targetY,
        duration: 1500 + Math.random() * 1000, // Random duration between 1.5-2.5 seconds
        useNativeDriver: true,
      }).start();
      
      return {
        id: `poop-${i}-${Date.now()}`,
        x: Math.random() * 300 + 50, // Random x position
        y: startY,
        rotation: Math.random() * 360, // Random rotation for more realistic falling
        scale: Math.random() * 0.4 + 0.6, // Random scale between 0.6 and 1.0
        targetY: targetY,
        translateY: translateY,
      };
    });

    setPoopAnimation({
      visible: true,
      poops
    });

    // Hide animation after 3 seconds
    setTimeout(() => {
      setPoopAnimation({
        visible: false,
        poops: []
      });
    }, 3000);
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
        commonShots: { shot: [], putts: [] },
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
      setData(prev => ({
        ...prev,
        currentRound: round,
      }));
      setCurrentHole(round.holeScores.length > 0 ? round.holeScores[round.holeScores.length - 1].holeNumber + 1 : 1);
      setCurrentScreen('hole-detail');
    }
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
    console.log('handleDeleteCourse called with courseId:', courseId);
    console.log('Current rounds before course deletion:', (data.rounds || []).map(r => ({ id: r.id, courseId: r.courseId, courseName: r.courseName })));
    
    setData(prev => {
      const filteredRounds = prev.rounds.filter(round => round.courseId !== courseId);
      console.log('Rounds after course deletion:', filteredRounds.map(r => ({ id: r.id, courseId: r.courseId, courseName: r.courseName })));
      
      return {
        ...prev,
        courses: prev.courses.filter(course => course.id !== courseId),
        rounds: filteredRounds,
      };
    });
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
        onViewRound={handleViewRound}
        onDeleteRound={handleDeleteRound}
        onNavigateToRound={() => {
          setCurrentScreen('round-summary');
          setSelectedCourse(data.courses.find(c => c.id === data.currentRound?.courseId) || null);
          // Close settings when navigating to round summary
          if (onCloseSettings) {
            onCloseSettings();
          }
        }}
        onNavigateToCourse={(courseId) => {
          setSelectedCourse(data.courses.find(c => c.id === courseId) || null);
          setCurrentScreen('hole-detail');
        }}
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
          onViewSummary={handleViewSummary}
          onClose={() => setCurrentScreen('course-selection')}
          clubs={data.settings.clubs || DEFAULT_CLUBS}
          handicap={data.settings.handicap}
          getBumpsForHole={getBumpsForHole}
          colors={colors}
          onFlameAnimation={triggerFlameAnimation}
          onPoopAnimation={triggerPoopAnimation}
        />
      )}

      {currentScreen === 'round-summary' && selectedCourse && currentRound && (
        <RoundSummaryScreen
          round={currentRound}
          course={selectedCourse}
          onClose={() => {
            // Clear currentRound when leaving round summary
            setCurrentRound(null);
            setData(prev => ({
              ...prev,
              currentRound: undefined,
            }));
            setCurrentScreen(roundEnded ? 'course-selection' : 'hole-detail');
          }}
          onHolePress={handleHolePress}
          onReturnToRound={handleReturnToRound}
          onEndRound={handleActuallyEndRound}
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

      {/* Flame Animation Overlay */}
      {flameAnimation.visible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          {flameAnimation.flames.map((flame) => (
            <Animated.Text
              key={flame.id}
              style={{
                position: 'absolute',
                left: flame.x,
                top: 0, // Fixed top position
                fontSize: 30,
                transform: [
                  { translateY: flame.translateY },
                  { scale: flame.scale }
                ],
                opacity: 0.8,
              }}
            >
              🔥
            </Animated.Text>
          ))}
        </View>
      )}

      {/* Poop Animation Overlay */}
      {poopAnimation.visible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 1000,
          backgroundColor: 'rgba(139, 69, 19, 0.1)', // Light brown background
        }}>
          {poopAnimation.poops.map((poop) => (
            <Animated.Text
              key={poop.id}
              style={{
                position: 'absolute',
                left: poop.x,
                top: 0, // Fixed top position
                fontSize: 25,
                transform: [
                  { translateY: poop.translateY },
                  { scale: poop.scale },
                  { rotate: `${poop.rotation}deg` }
                ],
                opacity: 0.9,
              }}
            >
              💩
            </Animated.Text>
          ))}
        </View>
      )}
    </View>
  );
};
