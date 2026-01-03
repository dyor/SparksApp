// Constants for GolfBrainSpark
import { Course } from './types';

export const DEFAULT_COURSE: Course = {
  id: "tam-oshanter-temp",
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
    { number: 18, par: 4, strokeIndex: 1, distanceYards: 411 },
  ],
};

export const DEFAULT_COURSE_BACK9: Course = {
  id: "tam-oshanter-temp-back9",
  name: "Tam O'Shanter Temp back 9",
  createdAt: Date.now(),
  holes: [
    // Front 9 (holes 1-9) = Back 9 of original (holes 10-18)
    { number: 1, par: 5, strokeIndex: 5, distanceYards: 461 }, // was hole 10
    { number: 2, par: 4, strokeIndex: 7, distanceYards: 360 }, // was hole 11
    { number: 3, par: 3, strokeIndex: 17, distanceYards: 124 }, // was hole 12
    { number: 4, par: 3, strokeIndex: 11, distanceYards: 185 }, // was hole 13
    { number: 5, par: 3, strokeIndex: 9, distanceYards: 207 }, // was hole 14
    { number: 6, par: 3, strokeIndex: 15, distanceYards: 140 }, // was hole 15
    { number: 7, par: 4, strokeIndex: 3, distanceYards: 367 }, // was hole 16
    { number: 8, par: 3, strokeIndex: 13, distanceYards: 171 }, // was hole 17
    { number: 9, par: 4, strokeIndex: 1, distanceYards: 411 }, // was hole 18
    // Back 9 (holes 10-18) = Front 9 of original (holes 1-9)
    { number: 10, par: 5, strokeIndex: 6, distanceYards: 450 }, // was hole 1
    { number: 11, par: 4, strokeIndex: 8, distanceYards: 344 }, // was hole 2
    { number: 12, par: 3, strokeIndex: 18, distanceYards: 123 }, // was hole 3
    { number: 13, par: 3, strokeIndex: 12, distanceYards: 180 }, // was hole 4
    { number: 14, par: 3, strokeIndex: 10, distanceYards: 195 }, // was hole 5
    { number: 15, par: 3, strokeIndex: 16, distanceYards: 140 }, // was hole 6
    { number: 16, par: 4, strokeIndex: 4, distanceYards: 367 }, // was hole 7
    { number: 17, par: 3, strokeIndex: 14, distanceYards: 164 }, // was hole 8
    { number: 18, par: 4, strokeIndex: 2, distanceYards: 406 }, // was hole 9
  ],
};

