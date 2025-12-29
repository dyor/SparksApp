import AsyncStorage from "@react-native-async-storage/async-storage";

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
}

export interface ScoreRecord {
  round_id: number;
  hole_number: number;
  strokes: number | null;
  putts: number | null;
}

const ROUNDS_KEY = "@sparks_rounds_v1";
const SCORES_KEY_PREFIX = "@sparks_scores_v1:"; // + roundId
const COURSES_KEY = "@sparks_courses_v1"; // stores array of courses

export async function initDB() {
  // ensure rounds key exists
  const existing = await AsyncStorage.getItem(ROUNDS_KEY);
  if (!existing) {
    await AsyncStorage.setItem(ROUNDS_KEY, JSON.stringify([]));
  }

  // ensure courses key exists with a default sample course
  const existingCourses = await AsyncStorage.getItem(COURSES_KEY);
  if (!existingCourses) {
    const defaultCourse = {
      id: 1,
      name: "Local Course",
      holes: [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3].map(
        (par, idx) => ({ hole_number: idx + 1, par })
      ),
    };
    await AsyncStorage.setItem(COURSES_KEY, JSON.stringify([defaultCourse]));
  }
}

export async function getRounds(): Promise<Round[]> {
  const raw = await AsyncStorage.getItem(ROUNDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Round[];
  } catch (e) {
    return [];
  }
}

export async function getHoles(courseId: number): Promise<Hole[]> {
  // Read from stored courses if present
  try {
    const raw = await AsyncStorage.getItem(COURSES_KEY);
    if (raw) {
      const courses = JSON.parse(raw) as Array<{
        id: number;
        name: string;
        holes: Array<{ hole_number: number; par: number }>;
      }>;
      const course = courses.find((c) => c.id === courseId);
      if (course) {
        return course.holes.map((h) => ({
          hole_number: h.hole_number,
          par: h.par,
          course_id: courseId,
        }));
      }
    }
  } catch (e) {
    // fallthrough
  }

  // Fallback to default 18-hole layout
  const pars = [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3];
  return pars.map((par, idx) => ({
    hole_number: idx + 1,
    par,
    course_id: courseId,
  }));
}

export async function getScores(
  roundId: number
): Promise<
  Array<{ hole_number: number; strokes: number | null; putts: number | null }>
> {
  const key = SCORES_KEY_PREFIX + roundId;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export async function saveScore(
  roundId: number,
  holeNumber: number,
  strokes: number | null,
  putts: number | null
): Promise<void> {
  const key = SCORES_KEY_PREFIX + roundId;
  const existing = await getScores(roundId);
  const idx = existing.findIndex((r) => r.hole_number === holeNumber);
  const record = { hole_number: holeNumber, strokes, putts };
  if (idx === -1) {
    existing.push(record);
  } else {
    existing[idx] = record;
  }
  await AsyncStorage.setItem(key, JSON.stringify(existing));
}

// Courses management
export interface Course {
  id: number;
  name: string;
  holes: Array<{ hole_number: number; par: number }>;
}

export async function getCourses(): Promise<Course[]> {
  const raw = await AsyncStorage.getItem(COURSES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Course[];
  } catch (e) {
    return [];
  }
}

export async function createCourse(
  name: string,
  holes: Array<{ hole_number: number; par: number }>
): Promise<Course> {
  const courses = await getCourses();
  const id = courses.length ? Math.max(...courses.map((c) => c.id)) + 1 : 1;
  const course = { id, name, holes };
  courses.push(course);
  await AsyncStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  return course;
}

export async function updateCourse(
  courseId: number,
  name: string,
  holes: Array<{ hole_number: number; par: number }>
): Promise<void> {
  const courses = await getCourses();
  const idx = courses.findIndex((c) => c.id === courseId);
  if (idx !== -1) {
    courses[idx] = { id: courseId, name, holes };
    await AsyncStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  }
}

export async function deleteCourse(courseId: number): Promise<void> {
  const courses = await getCourses();
  const remaining = courses.filter((c) => c.id !== courseId);
  await AsyncStorage.setItem(COURSES_KEY, JSON.stringify(remaining));
}

// Rounds
export async function createRoundForCourse(courseId: number): Promise<Round> {
  const courses = await getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) throw new Error("Course not found");

  const rounds = await getRounds();
  const id = rounds.length ? Math.max(...rounds.map((r) => r.id)) + 1 : 1;
  const round: Round = {
    id,
    course_id: courseId,
    course_name: course.name,
    createdAt: new Date().toISOString(),
  };
  rounds.push(round);
  await AsyncStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  return round;
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
