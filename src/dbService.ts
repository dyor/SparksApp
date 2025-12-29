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
  strokes: number;
  putts: number;
}

const ROUNDS_KEY = "@sparks_rounds_v1";
const SCORES_KEY_PREFIX = "@sparks_scores_v1:"; // + roundId

export async function initDB() {
  // lightweight stub: ensure rounds key exists
  const existing = await AsyncStorage.getItem(ROUNDS_KEY);
  if (!existing) {
    const defaultRounds: Round[] = [
      {
        id: 1,
        course_id: 1,
        course_name: "Local Course",
        createdAt: new Date().toISOString(),
      },
    ];
    await AsyncStorage.setItem(ROUNDS_KEY, JSON.stringify(defaultRounds));
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
  // Return simple 18-hole layout (par 4, par 3 and par 5 mixed)
  const pars = [4, 4, 3, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5, 4, 3];
  return pars.map((par, idx) => ({
    hole_number: idx + 1,
    par,
    course_id: courseId,
  }));
}

export async function getScores(
  roundId: number
): Promise<Array<{ hole_number: number; strokes: number; putts: number }>> {
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
  strokes: number,
  putts: number
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

export default {
  initDB,
  getRounds,
  getHoles,
  getScores,
  saveScore,
};
