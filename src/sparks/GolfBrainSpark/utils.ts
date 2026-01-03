// Utility functions for GolfBrainSpark
import { Round, HoleScore, HoleHistory } from './types';

// Date formatting utilities
export const formatDate = (timestamp: number, format?: 'short' | 'medium' | 'long') => {
  const date = new Date(timestamp);
  const formatType = format || 'short';
  switch (formatType) {
    case 'long':
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case 'medium':
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case 'short':
    default:
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  }
};

// Score color utilities
export const getScoreColor = (score: number, par: number, variant: 'standard' | 'simple' = 'standard') => {
  const netScore = score - par;
  if (variant === 'simple') {
    if (netScore < 0) return "#4CAF50"; // Green for under par
    if (netScore === 0) return "#2196F3"; // Blue for par
    return "#F44336"; // Red for over par
  }
  // Standard variant
  if (netScore < 0) return "#4CAF50"; // Green for under par
  if (netScore === 0) return "#2196F3"; // Blue for par
  if (netScore <= 2) return "#FF9800"; // Orange for bogey/double bogey
  return "#F44336"; // Red for worse
};

// Helper function to calculate hole history
export const calculateHoleHistory = (
  holeNumber: number,
  courseId: string,
  rounds: Round[]
): HoleHistory => {
  const holeScores = rounds
    .filter((round) => round.courseId === courseId && round.isComplete)
    .flatMap((round) => round.holeScores)
    .filter((holeScore) => holeScore.holeNumber === holeNumber);

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

  const scores = holeScores.map((hs) => hs.totalScore);
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bestScore = Math.min(...scores);
  const worstScore = Math.max(...scores);

  // Get all shots for this hole
  const allShots = holeScores.flatMap((hs) => hs.shots);
  const shots = allShots.filter((shot) => shot.type === "shot");
  const puttShots = allShots.filter((shot) => shot.type === "putt");

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

// Constants
export const SHOT_QUALITY_GRID = [
  ["left and long", "left", "left and short"],
  ["long", "good", "short"],
  ["right and long", "right", "right and short"],
] as const;

export const LIE_OPTIONS = [
  "fairway",
  "rough",
  "sand",
  "green",
  "ob",
  "water",
] as const;

export const PUTT_DISTANCE_OPTIONS = ["<4ft", "5-10ft", "10+ft"] as const;

export const DEFAULT_CLUBS = [
  "[Driver]",
  "Driver",
  "[Woods]",
  "3-Wood",
  "5-Wood",
  "[Irons]",
  "4-Iron",
  "5-Iron",
  "6-Iron",
  "7-Iron",
  "8-Iron",
  "9-Iron",
  "[Wedges]",
  "Pitching Wedge",
  "Gap Wedge",
  "Sand Wedge",
  "Lob Wedge",
  "[Putter]",
  "Putter",
];

