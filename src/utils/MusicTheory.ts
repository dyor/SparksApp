// Basic guitar chord voicings (approximate frequencies in Hz)
// We emulate a strum by providing the notes of the chord.

export const CHORD_FREQUENCIES: Record<string, number[]> = {
    // Major Chords
    'C': [130.81, 164.81, 196.00, 261.63, 329.63], // C3, E3, G3, C4, E4
    'D': [146.83, 220.00, 293.66, 369.99],         // D3, A3, D4, F#4
    'E': [82.41, 123.47, 164.81, 207.65, 246.94, 329.63], // E2, B2, E3, G#3, B3, E4
    'F': [87.31, 130.81, 174.61, 220.00, 261.63, 349.23], // F2 (barre), C3, F3, A3, C4, F4
    'G': [98.00, 123.47, 146.83, 196.00, 246.94, 392.00], // G2, B2, D3, G3, B3, G4
    'A': [110.00, 164.81, 220.00, 277.18, 329.63],        // A2, E3, A3, C#4, E4
    'B': [123.47, 185.00, 246.94, 311.13, 369.99],        // B2, F#3, B3, D#4, F#4

    // Minor Chords
    'Cm': [130.81, 196.00, 261.63, 311.13],        // C3, G3, C4, Eb4
    'Dm': [146.83, 220.00, 293.66, 349.23],        // D3, A3, D4, F4
    'Em': [82.41, 123.47, 164.81, 196.00, 246.94, 329.63], // E2, B2, E3, G3, B3, E4
    'Fm': [87.31, 130.81, 174.61, 207.65, 261.63], // F2, C3, F3, Ab3, C4
    'Gm': [98.00, 146.83, 196.00, 233.08, 293.66], // G2, D3, G3, Bb3, D4
    'Am': [110.00, 164.81, 220.00, 261.63, 329.63],        // A2, E3, A3, C4, E4
    'Bm': [123.47, 185.00, 246.94, 293.66, 369.99],        // B2, F#3, B3, D4, F#4

    // Simple fallback for others (just Major triad at octave 4)
    'Default': [261.63, 329.63, 392.00] // C Major
};

export const getChordFrequencies = (chordName: string): number[] => {
    // Allow lookup of "G Major" as "G" or "Am7" as "Am" (simplification)
    const normalized = chordName.replace(/Major|Min|min|7|sus\d|dim|aug/g, '').trim();
    return CHORD_FREQUENCIES[normalized] || CHORD_FREQUENCIES[normalized.replace('m', '')] || CHORD_FREQUENCIES['Default'];
};

export interface StrumPattern {
    name: string;
    genre: string;
    strums: {
        time: number; // 0 to 1 for a bar/pattern loop
        type: 'down' | 'up' | 'bass'; // Added 'bass' for alt-bass patterns
        accent?: boolean; // Default is false
    }[];
}

export const RHYTHM_PATTERNS: Record<string, StrumPattern> = {
    'D D D U': {
        name: 'D D D U',
        genre: 'Pop/Rock',
        strums: [
            { time: 0, type: 'down', accent: true },
            { time: 0.25, type: 'down' },
            { time: 0.5, type: 'down', accent: true },
            { time: 0.75, type: 'up' }
        ]
    },
    'D D U U D U': {
        name: 'D D U U D U',
        genre: 'Folk',
        strums: [
            { time: 0, type: 'down', accent: true },
            { time: 0.25, type: 'down' },
            { time: 0.375, type: 'up' },
            { time: 0.625, type: 'up' },
            { time: 0.75, type: 'down', accent: true },
            { time: 0.875, type: 'up' }
        ]
    },
    'Driving 8ths': {
        name: 'Driving 8ths',
        genre: 'Rock',
        strums: [
            { time: 0, type: 'down', accent: true },
            { time: 0.125, type: 'down' },
            { time: 0.25, type: 'down', accent: true },
            { time: 0.375, type: 'down' },
            { time: 0.5, type: 'down', accent: true },
            { time: 0.625, type: 'down' },
            { time: 0.75, type: 'down', accent: true },
            { time: 0.875, type: 'down' }
        ]
    },
    'Shuffle': {
        name: 'Shuffle',
        genre: 'Blues',
        strums: [
            { time: 0, type: 'down', accent: true },
            { time: 0.166, type: 'up' },
            { time: 0.25, type: 'down', accent: true },
            { time: 0.416, type: 'up' },
            { time: 0.5, type: 'down', accent: true },
            { time: 0.666, type: 'up' },
            { time: 0.75, type: 'down', accent: true },
            { time: 0.916, type: 'up' }
        ]
    },
    'Reggae Skank': {
        name: 'Reggae Skank',
        genre: 'Reggae',
        strums: [
            { time: 0.125, type: 'down', accent: true },
            { time: 0.375, type: 'down', accent: true },
            { time: 0.625, type: 'down', accent: true },
            { time: 0.875, type: 'down', accent: true }
        ]
    },
    'Waltz': {
        name: 'Waltz',
        genre: 'Country',
        strums: [
            { time: 0, type: 'bass', accent: true },
            { time: 0.333, type: 'down' },
            { time: 0.666, type: 'down' }
        ]
    },
    'Alt-Bass Folk': {
        name: 'Alt-Bass Folk',
        genre: 'Folk/Country',
        strums: [
            { time: 0, type: 'bass', accent: true },
            { time: 0.25, type: 'down' },
            { time: 0.5, type: 'bass', accent: true },
            { time: 0.75, type: 'down' },
            { time: 0.875, type: 'up' }
        ]
    }
};

export const DRUM_PATTERNS = {
    'Basic Rock': [
        { type: 'kick', time: 0 },
        { type: 'snare', time: 1 },
        { type: 'kick', time: 1.5 },
        { type: 'snare', time: 2 },
        { type: 'kick', time: 2.5 },
        { type: 'snare', time: 3 },
    ],
    'Jazz Swing': [
        { type: 'kick', time: 0 },
        { type: 'hihat', time: 0.66 },
        { type: 'hihat', time: 1 },
        { type: 'snare', time: 1.66 },
        { type: 'kick', time: 2 },
        { type: 'hihat', time: 2.66 },
        { type: 'hihat', time: 3 },
        { type: 'snare', time: 3.66 },
    ],
    'Reggae': [
        { type: 'kick', time: 1 },
        { type: 'snare', time: 1 },
        { type: 'kick', time: 3 },
        { type: 'snare', time: 3 },
        { type: 'hihat', time: 0 },
        { type: 'hihat', time: 0.5 },
        { type: 'hihat', time: 1.5 },
        { type: 'hihat', time: 2 },
        { type: 'hihat', time: 2.5 },
        { type: 'hihat', time: 3.5 },
    ]
};

