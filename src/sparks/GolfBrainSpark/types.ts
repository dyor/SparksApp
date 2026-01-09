// Data Models for GolfBrainSpark

export interface Course {
  id: string;
  name: string;
  holes: Hole[];
  createdAt: number;
}

export interface Hole {
  number: number;
  par: number; // 3, 4, or 5
  strokeIndex: number; // 1-18 (relative difficulty)
  distanceYards?: number; // Distance to hole in yards
  todaysDistance?: number; // Today's distance (optional, can vary day to day)
}

export interface Shot {
  id: string;
  type: "shot" | "putt";
  direction?:
    | "good"
    | "fire"
    | "left"
    | "right"
    | "long"
    | "short"
    | "left and short"
    | "left and long"
    | "right and short"
    | "right and long"
    | "penalty";
  lie?: "fairway" | "rough" | "sand" | "green" | "ob" | "water"; // For shots
  puttDistance?: "<4ft" | "5-10ft" | "10+ft"; // For putts
  club?: string; // For shots
  videoUri?: string; // For swing recordings
  timestamp: number;
  poorShot?: boolean; // For 💩 feature
}

export interface HoleScore {
  holeNumber: number;
  courseId: string;
  shots: Shot[];
  totalScore: number;
  par: number;
  netScore: number; // Score relative to par
  completedAt: number;
}

export interface Round {
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

export interface GolfBrainData {
  courses: Course[];
  rounds: Round[];
  currentRound?: Round;
  currentHole?: number;
  currentShotIndex?: number;
  settings: {
    defaultCourse?: string;
    showHints: boolean;
    autoAdvance: boolean;
    clubs: string[];
    handicap?: number;
    defaultClubs: {
      par5: {
        shot1: string;
        shot2: string;
        shot3: string;
      };
      par4: {
        shot1: string;
        shot2: string;
      };
      par3: {
        shot1: string;
      };
    };
    swingRecording: {
      countdownSeconds: number;
      durationSeconds: number;
    };
  };
}

// Historical data aggregation for hole analysis
export interface HoleHistory {
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

export interface GolfBrainSparkProps {
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onStateChange?: (state: any) => void;
  onComplete?: (result: any) => void;
}

