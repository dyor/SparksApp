import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSparkStore } from "./store/sparkStore";

export interface Hole {
  hole_number: number;
  par: number;
  course_id: number;
}

export interface Round {
  id: number;
  course_id: number;
  course_name: string;
  createdAt: string;
  expected_round_time?: number; // in minutes
  start_time?: string; // ISO string
  end_time?: string; // ISO string
}

export interface ScoreRecord {
  round_id: number;
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  completed_at?: string; // ISO string
}

export interface Course {
  id: number;
  name: string;
  holes: Array<{ hole_number: number; par: number }>;
  expected_round_time?: number; // in minutes
}

const ROUNDS_KEY = "@sparks_rounds_v1";
const SCORES_KEY_PREFIX = "@sparks_scores_v1:"; // + roundId
const COURSES_KEY = "@sparks_courses_v1"; // stores array of courses

export async function initDB() {
  const data = useSparkStore.getState().getSparkData("scorecard");

  // If already initialized in Zustand, we're good
  if (data && data.rounds && data.courses) {
    return;
  }

  // Otherwise, try to migrate from AsyncStorage
  console.log("[dbService] Initializing Scorecard data in Zustand...");

  let rounds: Round[] = [];
  let courses: Course[] = [];
  const scores: Record<number, ScoreRecord[]> = {};

  try {
    const existingRounds = await AsyncStorage.getItem(ROUNDS_KEY);
    rounds = existingRounds ? JSON.parse(existingRounds) : [];

    const existingCourses = await AsyncStorage.getItem(COURSES_KEY);
    courses = existingCourses ? JSON.parse(existingCourses) : [];

    // Migrate scores for each round
    for (const r of rounds) {
      const s = await AsyncStorage.getItem(SCORES_KEY_PREFIX + r.id);
      if (s) {
        scores[r.id] = JSON.parse(s);
      }
    }
  } catch (e) {
    console.error("[dbService] Error during migration:", e);
  }

  // If no courses, add default
  if (courses.length === 0) {
    courses = [
      {
        id: 1,
        name: "Local Course",
        holes: [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3].map(
          (par, idx) => ({ hole_number: idx + 1, par })
        ),
      },
    ];
  }

  useSparkStore.getState().setSparkData("scorecard", {
    rounds,
    courses,
    scores,
    initialized: true,
  });
}

export async function getRounds(): Promise<Round[]> {
  const data = useSparkStore.getState().getSparkData("scorecard");
  return data.rounds || [];
}

export async function getHoles(courseId: number): Promise<Hole[]> {
  const data = useSparkStore.getState().getSparkData("scorecard");
  const courses = (data.courses || []) as Course[];
  const course = courses.find((c) => c.id === courseId);

  if (course) {
    return course.holes.map((h) => ({
      hole_number: h.hole_number,
      par: h.par,
      course_id: courseId,
    }));
  }

  // Fallback to default 18-hole layout
  const pars = [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3];
  return pars.map((par, idx) => ({
    hole_number: idx + 1,
    par,
    course_id: courseId,
  }));
}

export async function getScores(roundId: number): Promise<ScoreRecord[]> {
  const data = useSparkStore.getState().getSparkData("scorecard");
  const scores = data.scores || {};
  return scores[roundId] || [];
}

export async function saveScore(
  roundId: number,
  holeNumber: number,
  strokes: number | null,
  putts: number | null,
  completed_at?: string
): Promise<void> {
  const data = useSparkStore.getState().getSparkData("scorecard");
  const allScores = { ...(data.scores || {}) };
  const existing = [...(allScores[roundId] || [])];

  const idx = existing.findIndex((r) => r.hole_number === holeNumber);
  const record: ScoreRecord = {
    round_id: roundId,
    hole_number: holeNumber,
    strokes,
    putts,
    completed_at,
  };

  if (idx === -1) {
    existing.push(record);
  } else {
    existing[idx] = record;
  }

  allScores[roundId] = existing;
  useSparkStore.getState().setSparkData("scorecard", { scores: allScores });
}

// Courses management

export async function getCourses(): Promise<Course[]> {
  const data = useSparkStore.getState().getSparkData("scorecard");
  return data.courses || [];
}

export async function createCourse(
  name: string,
  holes: Array<{ hole_number: number; par: number }>,
  expected_round_time?: number
): Promise<Course> {
  const courses = [...(await getCourses())];
  const id = courses.length ? Math.max(...courses.map((c) => c.id)) + 1 : 1;
  const course: Course = { id, name, holes, expected_round_time };
  courses.push(course);

  useSparkStore.getState().setSparkData("scorecard", { courses });
  return course;
}

export async function updateCourse(
  courseId: number,
  name: string,
  holes: Array<{ hole_number: number; par: number }>,
  expected_round_time?: number
): Promise<void> {
  const courses = [...(await getCourses())];
  const idx = courses.findIndex((c) => c.id === courseId);
  if (idx !== -1) {
    courses[idx] = { id: courseId, name, holes, expected_round_time };
    useSparkStore.getState().setSparkData("scorecard", { courses });
  }
}

export async function deleteCourse(courseId: number): Promise<void> {
  const courses = (await getCourses()).filter((c) => c.id !== courseId);
  useSparkStore.getState().setSparkData("scorecard", { courses });
}

export async function deleteRound(roundId: number): Promise<void> {
  const rounds = (await getRounds()).filter((r) => r.id !== roundId);
  const data = useSparkStore.getState().getSparkData("scorecard");
  const allScores = { ...(data.scores || {}) };
  delete allScores[roundId];

  useSparkStore.getState().setSparkData("scorecard", {
    rounds,
    scores: allScores,
  });
}

// Rounds
export async function createRoundForCourse(courseId: number): Promise<Round> {
  const courses = await getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) throw new Error("Course not found");

  const rounds = [...(await getRounds())];
  const id = rounds.length ? Math.max(...rounds.map((r) => r.id)) + 1 : 1;
  const round: Round = {
    id,
    course_id: courseId,
    course_name: course.name,
    createdAt: new Date().toISOString(),
    expected_round_time: course.expected_round_time,
  };
  rounds.push(round);

  useSparkStore.getState().setSparkData("scorecard", { rounds });
  return round;
}

export async function updateRound(round: Round): Promise<void> {
  const rounds = [...(await getRounds())];
  const idx = rounds.findIndex((r) => r.id === round.id);
  if (idx !== -1) {
    rounds[idx] = round;
    useSparkStore.getState().setSparkData("scorecard", { rounds });
  }
}

export default {
  initDB,
  getRounds,
  getHoles,
  getScores,
  saveScore,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createRoundForCourse,
};
