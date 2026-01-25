import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Switch,
    FlatList,
    Platform,
    Share,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store/sparkStore';
import { useAppStore } from '../store/appStore';
import { HapticFeedback } from '../utils/haptics';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection
} from '../components/SettingsComponents';
import { AISettingsNote } from '../components/AISettingsNote';
import { GeminiService } from '../services/GeminiService';
import { CommonModal } from '../components/CommonModal';

// --- MUSIC THEORY CORE ---
// Basic guitar chord voicings (approximate frequencies in Hz)
// We emulate a strum by providing the notes of the chord.

const CHORD_FREQUENCIES: Record<string, number[]> = {
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

const getChordFrequencies = (chordName: string): number[] => {
    // Allow lookup of "G Major" as "G" or "Am7" as "Am" (simplification)
    const normalized = chordName.replace(/Major|Min|min|7|sus\d|dim|aug/g, '').trim();
    return CHORD_FREQUENCIES[normalized] || CHORD_FREQUENCIES[normalized.replace('m', '')] || CHORD_FREQUENCIES['Default'];
};

interface StrumPattern {
    name: string;
    genre: string;
    strums: {
        time: number; // 0 to 1 for a bar/pattern loop
        type: 'down' | 'up' | 'bass'; // Added 'bass' for alt-bass patterns
        accent?: boolean; // Default is false
    }[];
}

const RHYTHM_PATTERNS: Record<string, StrumPattern> = {
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

const DRUM_PATTERNS = {
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



export interface MusicAnalysisResult {
    songName: string;
    lyrics: {
        text: string;
        chords: string;
        notes: string;
        startTime: number;
    }[];
    vocalUri: string;
    key: string;
    bpm: number;
}
const ACCENT_INSTRUCTIONS: Record<string, string> = {
    'canadian': 'Write with a thick Canadian accent. Use slang like "eh", "out and about", and references to cold weather or hockey where it fits.',
    'texan': 'Write with a heavy Southern Texan drawl. Use slang like "y\'all", "fixin\' to", "reckon", and phonetic spellings for a slow, rhythmic drawl.',
    'british': 'Write with a distinct British/RP accent. Use UK slang like "brilliant", "mate", "proper", and British spellings (e.g., "colour", "favour").',
    'east-indian': 'Write with an East Indian rhythmic pattern and phrasing. Use local metaphors or polite/formal East Indian English structures where appropriate.',
    'australian': 'Write with a strong Australian "Aussie" accent. Use slang like "crikey", "G\'day", "no worries", and references to the outback.',
    'scottish': 'Write with a thick Scottish brogue. Use words like "wee", "bonnie", "lass", and phonetic spellings to capture the rolling R\'s and unique rhythm.',
    'new-york': 'Write with a fast-paced, gritty New York accent. Use slang like "fuhgeddaboudit", "deadass", and specific local references.',
    'southern-blues-male': 'Write as an old-fashioned male Southern blues singer. Use gritty, soulful language, references to the Delta, hardships, and deep Southern slang. Phrasing should be rhythmic and emotive.',
    'southern-blues-female': 'Write as an old-fashioned female Southern blues singer (think Bessie Smith or Ma Rainey). Use powerful, soulful language, emotive phrasing, and deep Southern blues slang.',
    'chipmunk': 'Write fun, high-energy lyrics suitable for a high-pitched, squeaky chipmunk character. Use playful language and short, bouncy phrases.',
    'crooner': 'Write in the smooth, sophisticated style of a mid-century crooner (like Dean Martin or Bing Crosby). Use romantic, effortless phrasing, elegant language, and a relaxed, rhythmic swing.',
    'neil-young': 'Write in the style of Neil Young. Use high-tenor, emotive phrasing, themes of nature, solitude, and social commentary. Lyrics should feel raw and authentic.',
    'stevie-nicks': 'Write in the mystical, raspy style of Stevie Nicks. Use poetic, symbolic language (birds, lace, dreams, visions), and a velvety, rhythmic flow typical of Fleetwood Mac.',
    'bob-dylan': 'Write in the iconic nasal, folk-poetic style of a young Bob Dylan. Use conversational "talk-singing" phrasing, complex metaphors, and a gritty rhythmic structure.',
    'patsy-cline': 'Write in the moving, soulful style of Patsy Cline. Use rich, emotive language, themes of heartbreak and longing, and a smooth, classic Nashville rhythmic flow.',
    'hank-williams': 'Write in the foundational honky-tonk style of Hank Williams Sr. Use simple but profound "lonesome" language, references to the road and late nights, and a rhythmic, soulful folk cadence.',
};

const SongMakerService = {
    analyzeVocalRecording: async (uri: string, songName: string, mimeType: string = 'audio/mp4'): Promise<MusicAnalysisResult | null> => {
        try {
            const prompt = `
                Analyze this vocal recording for a song named "${songName}".
                Extract the lyrics and determine the melody (notes) and harmonic structure (chords) that would accompany it on a guitar.
                
                For each line or phrase, provide:
                1. The text of the lyrics.
                2. The guitar chords that fit that phrase.
                3. The melodic notes being sung.
                4. The approximate start time in seconds.

                Return the result strictly as a JSON object with the following structure:
                {
                    "key": "e.g., G Major",
                    "bpm": 120,
                    "lyrics": [
                        {
                            "text": "Lyric text here",
                            "chords": "G C D",
                            "notes": "G A B",
                            "startTime": 0.5
                        }
                    ]
                }
            `;

            let audioBase64 = '';

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                audioBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                audioBase64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }

            const contents = [{
                parts: [
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: audioBase64,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            }];

            const apiKey = await GeminiService.getApiKey();
            const fetchResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents }),
                }
            );

            const data = await fetchResponse.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('No analysis generated');

            const cleanText = text.replace(/\`\`\`json\n?|\n?\`\`\`/g, '').trim();
            const parsed = JSON.parse(cleanText);

            return {
                songName,
                vocalUri: uri,
                ...parsed
            };
        } catch (error) {
            console.error('Music analysis failed:', error);
            throw error;
        }
    },

    detectPitch: async (uri: string): Promise<number> => {
        return 440 + (Math.random() * 10 - 5);
    },

    generateAISong: async (userPrompt: string, accent: string = 'default'): Promise<Omit<MusicAnalysisResult, 'vocalUri'>> => {
        const accentPrompt = accent !== 'default' && ACCENT_INSTRUCTIONS[accent]
            ? `\nSTYLE/ACCENT: ${ACCENT_INSTRUCTIONS[accent]}\n`
            : '';

        const prompt = `
            ${userPrompt}
            ${accentPrompt}

            Write a song based on the user's request. Provide:
            1. A creative song title.
            2. The key and BPM.
            3. Lyrics with chords and melodic notes for each line.
            4. A startTime in seconds for each line. 
            
            CRITICAL TIMING RULES:
            - EACH LYRIC LINE MUST START AT THE BEGINNING OF A MUSICAL BAR.
            - YOU MUST PROVIDE EXACTLY 1 LYRIC LINE PER BAR (OR EVERY 2 BARS FOR VERY SLOW SONGS).
            - DO NOT SKIP BARS WITHOUT LYRICS IF POSSIBLE. 
            - TIME CALCULATION: startTime = (barIndex * 4 * 60 / BPM). 
            - EXAMPLE (120 BPM): Bar 0 = 0s, Bar 1 = 2s, Bar 2 = 4s, Bar 3 = 6s.
            - KEEP TIMINGS TIGHT. NO EMPTY BARS.
            - DIRECTIVES: Any musical instructions (like [Intro], [Harmonica Solo], [Chorus]) MUST be on their own line and ALWAYS enclosed in square brackets.
            - CLEAN LYRICS: The "text" field should contain ONLY actual lyrics or the section name in brackets. DO NOT put vocal instructions (like "talk-singing") or chord letters (like "G") in the "text" field.
            - CHORDS FIELD: ALWAYS put chord letters in the "chords" field for every line, even if it's the same chord as the previous line.
            
            Return strictly JSON:
            {
                "songName": "String",
                "key": "String",
                "bpm": Number,
                "lyrics": [
                    { "text": "String", "chords": "String", "notes": "String", "startTime": Number }
                ]
            }
        `;

        try {
            const result = await GeminiService.generateJSON<any>(prompt);
            return result;
        } catch (error) {
            console.error('AI Song Generation Failed:', error);
            throw error;
        }
    }
};

const GUITAR_STRINGS = [
    { note: 'E', freq: 82.41, id: 'E2' },
    { note: 'A', freq: 110.00, id: 'A2' },
    { note: 'D', freq: 146.83, id: 'D3' },
    { note: 'G', freq: 196.00, id: 'G3' },
    { note: 'B', freq: 246.94, id: 'B3' },
    { note: 'e', freq: 329.63, id: 'E4' },
];

const VolumeControl: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
    color: string;
}> = ({ label, value, onChange, color }) => (
    <View style={styles.volumeControl}>
        <Text style={[styles.volumeLabel, { color }]}>{label}</Text>
        <View style={styles.volumeBar}>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((level) => (
                <TouchableOpacity
                    key={level}
                    onPress={() => onChange(level)}
                    style={[
                        styles.volumeSegment,
                        {
                            backgroundColor: value >= level ? color : '#E0E0E0',
                            height: 10 + (level * 10)
                        }
                    ]}
                />
            ))}
        </View>
    </View>
);


const RhythmParamControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (val: number) => void;
    color: string;
    format?: (v: number) => string;
}> = ({ label, value, min, max, step, onChange, color, format }) => (
    <View style={styles.paramControl}>
        <Text style={styles.paramLabel}>{label}</Text>
        <View style={styles.paramRow}>
            <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))}>
                <Ionicons name="remove-circle-outline" size={20} color={color} />
            </TouchableOpacity>
            <Text style={[styles.paramValue, { color }]}>
                {format ? format(value) : value.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))}>
                <Ionicons name="add-circle-outline" size={20} color={color} />
            </TouchableOpacity>
        </View>
    </View>
);

const SongMakerSpark: React.FC<{
    showSettings?: boolean;
    onCloseSettings?: () => void;
}> = ({ showSettings = false, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();
    const [activeTab, setActiveTab] = useState<'tuner' | 'songs'>('songs');
    const [dataLoaded, setDataLoaded] = useState(false);

    // Tuner State
    const [isTuning, setIsTuning] = useState(false);
    const [currentPitch, setCurrentPitch] = useState<number | null>(null);
    const [closestString, setClosestString] = useState<typeof GUITAR_STRINGS[0] | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const isTuningRef = useRef(false);

    // Web Recording Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Songs State
    const [songs, setSongs] = useState<MusicAnalysisResult[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedSong, setSelectedSong] = useState<MusicAnalysisResult | null>(null);

    // Notation Toggles
    const [showFlats, setShowFlats] = useState(false);
    const [showSharps, setShowSharps] = useState(true);
    const [showWhole, setShowWhole] = useState(true);

    // Playback Options
    const [playWithChords, setPlayWithChords] = useState(Platform.OS === 'web');
    const [selectedRhythm, setSelectedRhythm] = useState('D D D U');
    const [selectedDrumPattern, setSelectedDrumPattern] = useState('Basic Rock');
    const [playWithDrums, setPlayWithDrums] = useState(false);
    const [playIntro, setPlayIntro] = useState(false);
    const [strumDensity, setStrumDensity] = useState(1); // 1-16 times per bar
    const [isMixerExpanded, setIsMixerExpanded] = useState(false);
    const [showMixerHelp, setShowMixerHelp] = useState(false);
    const [singingMode, setSingingMode] = useState(false);

    // State for advanced rhythm
    const [swing, setSwing] = useState(0); // 0 to 0.5
    const [humanize, setHumanize] = useState(0.02); // 0 to 0.1
    const [accentAmount, setAccentAmount] = useState(1.2); // 0.8 to 1.5

    // Volume Levels (0.0 - 1.0)
    const [voiceVolume, setVoiceVolume] = useState(1.0);
    const [chordVolume, setChordVolume] = useState(0.6);
    const [drumVolume, setDrumVolume] = useState(0.6);

    const isHydrated = useSparkStore(state => state.isHydrated);

    useEffect(() => {
        if (!isHydrated) return;
        if (dataLoaded) return;

        console.log('[SongMaker] Hydrated, loading data...');
        const data = getSparkData('song-maker');
        if (data) {
            if (data.songs) setSongs(data.songs);
            if (data.swing !== undefined) setSwing(data.swing);
            if (data.humanize !== undefined) setHumanize(data.humanize);
            if (data.accentAmount !== undefined) setAccentAmount(data.accentAmount);
            if (data.voiceVolume !== undefined) setVoiceVolume(data.voiceVolume);
            if (data.chordVolume !== undefined) setChordVolume(data.chordVolume);
            if (data.drumVolume !== undefined) setDrumVolume(data.drumVolume);
            if (data.showFlats !== undefined) setShowFlats(data.showFlats);
            if (data.showSharps !== undefined) setShowSharps(data.showSharps);
            if (data.showWhole !== undefined) setShowWhole(data.showWhole);
            if (data.strumDensity !== undefined) setStrumDensity(data.strumDensity);
            if (data.selectedRhythm) setSelectedRhythm(data.selectedRhythm);
            if (data.selectedDrumPattern) setSelectedDrumPattern(data.selectedDrumPattern);
            if (data.playIntro !== undefined) setPlayIntro(data.playIntro);
            if (data.playWithDrums !== undefined) setPlayWithDrums(data.playWithDrums);
            if (data.playWithChords !== undefined) setPlayWithChords(data.playWithChords);
            if (data.singingMode !== undefined) setSingingMode(data.singingMode);
        }
        setDataLoaded(true);
    }, [isHydrated, getSparkData, dataLoaded]);

    useEffect(() => {
        if (!isHydrated || !dataLoaded) return;

        console.log('[SongMaker] Saving data...');
        setSparkData('song-maker', {
            songs,
            swing,
            humanize,
            accentAmount,
            voiceVolume,
            chordVolume,
            drumVolume,
            showFlats,
            showSharps,
            showWhole,
            strumDensity,
            selectedRhythm,
            selectedDrumPattern,
            playIntro,
            playWithDrums,
            playWithChords,
            singingMode
        });
    }, [
        songs, swing, humanize, accentAmount,
        voiceVolume, chordVolume, drumVolume,
        showFlats, showSharps, showWhole,
        strumDensity, selectedRhythm, selectedDrumPattern,
        playIntro, playWithDrums, playWithChords,
        isHydrated, dataLoaded
    ]);

    // AI Generator State
    const [isGeneratorVisible, setIsGeneratorVisible] = useState(false);
    const [generatorPrompt, setGeneratorPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSpeechVoice, setSelectedSpeechVoice] = useState<string | null>(null);
    const [speechVoices, setSpeechVoices] = useState<Speech.Voice[]>([]);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [speechRate, setSpeechRate] = useState(0.9);
    const speechTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
    const [showVoiceSelector, setShowVoiceSelector] = useState(false);
    const [showAccentSelector, setShowAccentSelector] = useState(false);
    const { preferences, setPreferences } = useAppStore();

    // Playback Context for Chords (Web)
    const playbackContextRef = useRef<AudioContext | null>(null);
    const progressFrameRef = useRef<number | null>(null);
    const audioStartTimeRef = useRef<number>(0);
    const aiSpeechRef = useRef<{
        voiceId?: string;
        pitch: number;
        rate: number;
        nextIndex: number;
    } | null>(null);
    const activeIntroDelayRef = useRef<number>(0);
    const isPlayingRef = useRef(false);
    const lastScheduledBarTimeRef = useRef<number>(-1);
    const schedulingContextRef = useRef<{
        lyricIndex: number;
        lastActiveChord: string;
    }>({ lyricIndex: 0, lastActiveChord: '' });

    const stopAllPlayback = async () => {
        // 1. Stop and Unload Native Vocals (expo-av)
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            } catch (e) { }
        }

        // Ensure soundRef is always cleared if something failed
        soundRef.current = null;

        // 2. Stop Web Accompaniment (Web Audio API)
        if (playbackContextRef.current) {
            try {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
            } catch (e) { }
        }

        // 3. Stop AI Vocals (expo-speech)
        Speech.stop();
        speechTimeoutsRef.current.forEach(clearTimeout);
        speechTimeoutsRef.current = [];

        // 4. Cleanup Animation Frames & State
        if (progressFrameRef.current) {
            cancelAnimationFrame(progressFrameRef.current);
            progressFrameRef.current = null;
        }
        aiSpeechRef.current = null;
        audioStartTimeRef.current = 0;
        activeIntroDelayRef.current = 0;

        setIsPlaying(false);
        isPlayingRef.current = false;
        setPlaybackPosition(0);
    };

    const updateSongName = (newName: string) => {
        if (!selectedSong) return;
        const updatedSong = { ...selectedSong, songName: newName };
        setSelectedSong(updatedSong);
        // Sync with the master songs list
        setSongs(prev => prev.map(s => s.vocalUri === selectedSong.vocalUri ? updatedSong : s));
    };


    useEffect(() => {
        const loadVoices = async () => {
            const voices = await Speech.getAvailableVoicesAsync();

            // Filter and Sort: Premium/Enhanced voices first, then standard. 
            // Focus on English but allow common variants.
            const filtered = voices
                .filter(v => ['en', 'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-CA'].some(lang => v.language.startsWith(lang)))
                .sort((a, b) => {
                    // Enhanced quality first
                    if (a.quality === Speech.VoiceQuality.Enhanced && b.quality !== Speech.VoiceQuality.Enhanced) return -1;
                    if (a.quality !== Speech.VoiceQuality.Enhanced && b.quality === Speech.VoiceQuality.Enhanced) return 1;
                    return a.name.localeCompare(b.name);
                });

            console.log(`[AI Song]Found ${filtered.length
                } interesting voices.`);
            setSpeechVoices(filtered);

            // Auto-select voice based on accent if not manually set
            const accent = preferences.aiVoiceAccent;
            const accentToLang: Record<string, string> = {
                'british': 'en-GB',
                'australian': 'en-AU',
                'east-indian': 'en-IN',
                'canadian': 'en-CA',
                'scottish': 'en-GB',
                'southern-blues-male': 'en-US',
                'southern-blues-female': 'en-US',
                'chipmunk': 'en-US',
                'crooner': 'en-US',
                'neil-young': 'en-US',
                'stevie-nicks': 'en-US',
                'bob-dylan': 'en-US',
                'patsy-cline': 'en-US',
                'hank-williams': 'en-US',
            };

            const targetLang = accentToLang[accent];
            let bestVoice;

            if (targetLang) {
                bestVoice = filtered.find(v => v.language.startsWith(targetLang) && v.quality === Speech.VoiceQuality.Enhanced)
                    || filtered.find(v => v.language.startsWith(targetLang));
            }

            if (!bestVoice) {
                bestVoice = filtered.find(v => v.quality === Speech.VoiceQuality.Enhanced) || filtered[0];
            }

            if (bestVoice) {
                setSelectedSpeechVoice(bestVoice.identifier);
            }

            // Adjust pitch/rate for specific styles
            if (accent === 'southern-blues-male') {
                setSpeechPitch(0.8);
                setSpeechRate(0.8);
            } else if (accent === 'southern-blues-female') {
                setSpeechPitch(0.9);
                setSpeechRate(0.85);
            } else if (accent === 'chipmunk') {
                setSpeechPitch(1.8);
                setSpeechRate(1.2);
            } else if (accent === 'crooner') {
                setSpeechPitch(0.85);
                setSpeechRate(0.85);
            } else if (accent === 'neil-young') {
                setSpeechPitch(1.2); // Nasal high tenor
                setSpeechRate(0.85); // Slightly slower/wavering
            } else if (accent === 'stevie-nicks') {
                setSpeechPitch(0.9); // Raspy/mystical vibe
                setSpeechRate(0.8); // Smooth, velvety flow
            } else if (accent === 'bob-dylan') {
                setSpeechPitch(1.1); // Nasal talk-singing
                setSpeechRate(0.9); // Rhythmic folk style
            } else if (accent === 'patsy-cline') {
                setSpeechPitch(1.0); // Natural but emotive
                setSpeechRate(0.85); // Smooth, steady flow
            } else if (accent === 'hank-williams') {
                setSpeechPitch(1.1); // Slightly nasal honky-tonk
                setSpeechRate(0.9); // Lonesome folk tempo
            } else {
                setSpeechPitch(1.0);
                setSpeechRate(0.9);
            }
        };
        loadVoices();
    }, [preferences.aiVoiceAccent]);

    // --- Tuner Logic ---
    const startTuning = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;

            setIsTuning(true);
            isTuningRef.current = true;
            HapticFeedback.light();

            if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
                // Web implementation using Web Audio API
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    audioContextRef.current = new AudioContextClass();
                    analyserRef.current = audioContextRef.current.createAnalyser();
                    analyserRef.current.fftSize = 2048;

                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaStreamRef.current = stream;
                    microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
                    microphoneRef.current.connect(analyserRef.current);

                    const bufferLength = analyserRef.current.fftSize;
                    const dataArray = new Float32Array(bufferLength);

                    const updatePitch = () => {
                        if (!isTuningRef.current || !analyserRef.current) return;

                        analyserRef.current.getFloatTimeDomainData(dataArray);
                        const pitch = autoCorrelate(dataArray, audioContextRef.current!.sampleRate);

                        if (pitch !== -1) {
                            setCurrentPitch(pitch);
                            const closest = GUITAR_STRINGS.reduce((prev, curr) =>
                                Math.abs(curr.freq - pitch) < Math.abs(prev.freq - pitch) ? curr : prev
                            );
                            setClosestString(closest);
                        }
                        requestAnimationFrame(updatePitch);
                    };

                    updatePitch();
                } catch (err) {
                    console.error('Web Audio Tuner Error:', err);
                    // Fallback to simulation if web audio fails
                    startSimulatedTuner();
                }
            } else {
                // Native or fallback simulation
                startSimulatedTuner();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const startSimulatedTuner = () => {
        const interval = setInterval(() => {
            if (!isTuningRef.current) {
                clearInterval(interval);
                return;
            }
            const pitch = 110 + (Math.random() * 4 - 2);
            setCurrentPitch(pitch);
            const closest = GUITAR_STRINGS.reduce((prev, curr) =>
                Math.abs(curr.freq - pitch) < Math.abs(prev.freq - pitch) ? curr : prev
            );
            setClosestString(closest);
        }, 500);
    };

    const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
        // Simple autocorrelation algorithm for pitch detection
        let SIZE = buffer.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1; // Too quiet

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        }

        let buf = buffer.slice(r1, r2);
        SIZE = buf.length;

        let c = new Float32Array(SIZE);
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE - i; j++) {
                c[i] = c[i] + buf[j] * buf[j + i];
            }
        }

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        // Interpolation
        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    };

    const stopTuning = async () => {
        setIsTuning(false);
        isTuningRef.current = false;
        setCurrentPitch(null);
        setClosestString(null);
        HapticFeedback.medium();

        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (microphoneRef.current) {
            microphoneRef.current.disconnect();
            microphoneRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    };

    const setupAudioMode = async (forRecording = false) => {
        try {
            if (Platform.OS === 'web') return true; // Web handles permissions via browser prompts usually

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Microphone access is needed for recording.');
                return false;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: forRecording,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            return true;
        } catch (error) {
            console.error('Audio Setup Error:', error);
            return false;
        }
    };

    const startRecordingSong = async () => {
        try {
            // 1. Force stop tuner if it's running
            if (isTuningRef.current) {
                await stopTuning();
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // 2. Setup Audio Mode
            const hasPermission = await setupAudioMode(true);
            if (!hasPermission) return;

            // 3. Cleanup previous recording
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch (e) { }
                recordingRef.current = null;
            }

            setIsRecording(true);
            HapticFeedback.success();

            // 4. Start Recording (Unified for Web & Native via expo-av)
            const recordingOptions: any = {
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    audioQuality: Audio.IOSAudioQuality.MAX,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/webm',
                    bitsPerSecond: 128000,
                },
            };

            const { recording } = await Audio.Recording.createAsync(recordingOptions);
            recordingRef.current = recording;
            console.log('Recording started successfully');

        } catch (error: any) {
            console.error('Start Recording Error:', error);
            setIsRecording(false);
            Alert.alert('Recording Error', `Could not start: ${error.message} `);
            recordingRef.current = null;
        }
    };

    const stopAndAnalyze = async () => {
        if (!recordingRef.current) return;

        setIsRecording(false);
        setIsAnalyzing(true);
        HapticFeedback.medium();

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            if (uri) {
                // For Web, uri is a blob URL.
                // Pass mimeType arg if possible, but expo-av doesn't expose it easily on the Recording object?
                // Actually SongMakerService handles fetch.
                // We'll trust the extension/mime inference or basic blob fetch.
                console.log('Recording stopped, URI:', uri);
                const result = await SongMakerService.analyzeVocalRecording(uri, `Song ${songs.length + 1} `);
                setSongs(prev => [...prev, result]);
                setSelectedSong(result);
            } else {
                throw new Error('No recording URI generated');
            }
        } catch (error) {
            console.error('Stop and Analyze Error:', error);
            if (GeminiService.isApiKeyError(error)) {
                GeminiService.handleApiKeyError(error);
            } else {
                Alert.alert('Analysis Failed', 'Could not process the recording.');
            }
        } finally {
            setIsAnalyzing(false);
            // Switch back to playback mode
            await setupAudioMode(false);
        }
    };

    const handleGenerateAISong = async () => {
        if (!generatorPrompt.trim()) return;

        await stopAllPlayback();
        setIsGenerating(true);
        setIsGeneratorVisible(false);
        setIsAnalyzing(true);
        HapticFeedback.medium();

        try {
            const songData = await SongMakerService.generateAISong(generatorPrompt, preferences.aiVoiceAccent);

            // For AI songs, we use a special URI scheme: ai://voiceId?p=pitch&r=rate
            const aiResult: MusicAnalysisResult = {
                ...songData,
                vocalUri: `ai://${selectedSpeechVoice || 'default'}?p=${speechPitch}&r=${speechRate}`
            };

            setSongs(prev => [...prev, aiResult]);
            setSelectedSong(aiResult);

            Alert.alert('Song Created!', `"${aiResult.songName}" has been generated. Tap Play to hear the AI sing it!`);
        } catch (error) {
            console.error('AI Generation Error:', error);
            if (GeminiService.isApiKeyError(error)) {
                GeminiService.handleApiKeyError(error);
            } else {
                Alert.alert('Generation Failed', 'Could not create the AI song. Please try again.');
            }
        } finally {
            setIsGenerating(false);
            setIsAnalyzing(false);
        }
    };

    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);

    const audioBufferToWav = (buffer: AudioBuffer) => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const data = buffer.getChannelData(0);
        const dataLength = data.length * bytesPerSample;
        const bufferLength = 44 + dataLength;

        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }

        return arrayBuffer;
    };

    const exportSong = async () => {
        if (!selectedSong) return;

        // On Web, implement Audio Export
        if (Platform.OS === 'web') {
            try {
                setIsAnalyzing(true);

                // 1. Fetch and Decode Vocal Audio
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const tempCtx = new AudioContextClass();
                const response = await fetch(selectedSong.vocalUri);
                const arrayBuffer = await response.arrayBuffer();
                const vocalBuffer = await tempCtx.decodeAudioData(arrayBuffer);

                // 2. Calculate intro delay and total duration
                let introDuration = 0;
                let topChords: string[] = [];

                if (playIntro) {
                    const chordCounts: Record<string, number> = {};
                    selectedSong.lyrics.forEach(line => {
                        const chords = line.chords.split(' ');
                        chords.forEach(c => {
                            if (c) chordCounts[c] = (chordCounts[c] || 0) + 1;
                        });
                    });
                    topChords = Object.entries(chordCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([chord]) => chord);

                    const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;
                    introDuration = beatDuration * 2 * topChords.length;
                }

                // Extra buffer for reverb tail etc
                const totalDuration = introDuration + vocalBuffer.duration + 2;
                const sampleRate = 44100;

                // 3. Create Offline Context
                const offlineCtx = new OfflineAudioContext(1, sampleRate * totalDuration, sampleRate);

                // 4. Schedule Vocals
                const vocalSource = offlineCtx.createBufferSource();
                vocalSource.buffer = vocalBuffer;
                const vocalGain = offlineCtx.createGain();
                vocalGain.gain.value = voiceVolume;
                vocalSource.connect(vocalGain);
                vocalGain.connect(offlineCtx.destination);
                vocalSource.start(introDuration);

                // 5. Synthesize Chords & Drums (Copy logic from playSong)
                const ctx = offlineCtx; // Alias for reuse

                // --- INTRO ---
                if (playIntro) {
                    const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;

                    topChords.forEach((chord, idx) => {
                        const freqs = getChordFrequencies(chord);
                        const rhythm = RHYTHM_PATTERNS[selectedRhythm] || RHYTHM_PATTERNS['Downstrum'];

                        freqs.forEach((freq, i) => {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();

                            osc.type = 'triangle';
                            osc.frequency.value = freq;

                            // Corrected .time access
                            const strum = rhythm.strums[i % rhythm.strums.length];
                            const strumTime = strum.time * (beatDuration * 4); // Full bar duration
                            const startTime = (idx * beatDuration * 2) + strumTime;
                            const duration = beatDuration * 2;

                            gain.gain.setValueAtTime(0, 0); // Safe start
                            gain.gain.linearRampToValueAtTime(0.1 * chordVolume, startTime + 0.02);
                            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                            osc.connect(gain);
                            gain.connect(ctx.destination);

                            osc.start(startTime);
                            osc.stop(startTime + duration);
                        });
                    });
                }

                // --- DRUMS ---
                if (playWithDrums && selectedSong.bpm) {
                    const beatDuration = 60 / selectedSong.bpm;
                    const finalTime = introDuration + selectedSong.lyrics[selectedSong.lyrics.length - 1].startTime + 5;
                    const pattern = (DRUM_PATTERNS as any)[selectedDrumPattern] || DRUM_PATTERNS['Basic Rock'];

                    for (let t = introDuration; t < finalTime; t += (beatDuration * 4)) {
                        pattern.forEach((note: any) => {
                            const time = t + note.time * beatDuration;

                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();

                            if (note.type === 'kick') {
                                osc.frequency.setValueAtTime(150, time);
                                osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
                                gain.gain.setValueAtTime(1 * drumVolume, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
                            } else if (note.type === 'snare') {
                                osc.type = 'triangle';
                                osc.frequency.setValueAtTime(100, time);
                                gain.gain.setValueAtTime(0.5 * drumVolume, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                            } else {
                                // hihat
                                osc.type = 'square';
                                osc.frequency.setValueAtTime(800, time);
                                gain.gain.setValueAtTime(0.3 * drumVolume, time);
                                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
                            }

                            osc.connect(gain);
                            gain.connect(ctx.destination);

                            osc.start(time);
                            osc.stop(time + 0.5);
                        });
                    }
                }

                // --- CHORDS ---
                if (playWithChords) {
                    const rhythm = RHYTHM_PATTERNS[selectedRhythm] || RHYTHM_PATTERNS['D D D U'];
                    const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;
                    const barDuration = beatDuration * 4;

                    selectedSong.lyrics.forEach(line => {
                        const chords = line.chords.split(' ');
                        const firstChord = chords[0];
                        if (firstChord) {
                            const freqs = getChordFrequencies(firstChord);

                            for (let repeat = 0; repeat < strumDensity; repeat++) {
                                const repeatOffset = (barDuration / strumDensity) * repeat;

                                rhythm.strums.forEach((strum, strumIdx) => {
                                    const strumTimeFactor = barDuration / strumDensity;

                                    // Apply Swing
                                    let adjustedStrumTime = strum.time * strumTimeFactor;
                                    const isOffBeat = (strum.time * 8) % 2 !== 0; // Simple off-beat check for 8ths
                                    if (isOffBeat) {
                                        adjustedStrumTime += swing * (strumTimeFactor / 8);
                                    }

                                    // Apply Humanize
                                    const jitter = (Math.random() - 0.5) * humanize * beatDuration;
                                    const startTime = introDuration + line.startTime + repeatOffset + adjustedStrumTime + jitter;
                                    const duration = 1.5;

                                    // Apply Accent
                                    const volumeMult = strum.accent ? accentAmount : (1 / (accentAmount || 1));

                                    freqs.forEach((freq, i) => {
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();

                                        osc.type = strum.type === 'bass' ? 'sine' : 'triangle';
                                        osc.frequency.value = strum.type === 'bass' ? freq / 2 : freq;

                                        gain.gain.setValueAtTime(0, 0);

                                        // Strumming effect: delay higher strings slightly
                                        const stringDelay = strum.type === 'up' ? (freqs.length - i) * 0.01 : i * 0.01;
                                        const finalStart = startTime + stringDelay;

                                        gain.gain.linearRampToValueAtTime(0.1 * chordVolume * volumeMult, finalStart + 0.02);
                                        gain.gain.exponentialRampToValueAtTime(0.001, finalStart + duration);

                                        osc.connect(gain);
                                        gain.connect(ctx.destination);

                                        osc.start(finalStart);
                                        osc.stop(finalStart + duration);
                                    });
                                });
                            }
                        }
                    });
                }

                // 6. Render
                const renderedBuffer = await offlineCtx.startRendering();

                // 7. Convert to Wav
                const wavBuffer = audioBufferToWav(renderedBuffer);
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);

                // 8. Download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${selectedSong.songName}.wav`;
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);

                tempCtx.close();

            } catch (err) {
                console.error('Export Failed', err);
                Alert.alert('Export Failed', 'Could not generate audio file.');
            } finally {
                setIsAnalyzing(false);
            }
            return;
        }

        try {
            const lines = selectedSong.lyrics.map(l =>
                `[${l.chords}] ${l.text}`
            ).join('\\n');

            const content = `
${selectedSong.songName}
Key: ${selectedSong.key} | BPM: ${selectedSong.bpm}

${lines}

Generated by Sparks App
            `.trim();

            await Share.share({
                message: content,
                title: selectedSong.songName
            });
        } catch (error) {
            Alert.alert('Export Error', 'Could not share song.');
        }
    };

    const playHarmonicaNote = (ctx: BaseAudioContext, freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();

        // Waveform: Sawtooth for that "reed" bite
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        // Pitch Scoop: Start slightly flat and bend up
        osc.frequency.setTargetAtTime(freq, startTime, 0.05);
        osc.frequency.setValueAtTime(freq * 0.98, startTime);

        // Filter: Mellow out the sawtooth
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, startTime);
        filter.Q.setValueAtTime(5, startTime);

        // Vibrato (LFO)
        vibrato.frequency.setValueAtTime(6, startTime); // 6Hz pulse
        vibratoGain.gain.setValueAtTime(freq * 0.005, startTime);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        // Volume Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3 * volume, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.2 * volume, startTime + duration - 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        vibrato.start(startTime);
        osc.start(startTime);

        vibrato.stop(startTime + duration + 0.1);
        osc.stop(startTime + duration + 0.1);
    };

    const createDrumSound = (ctx: BaseAudioContext, type: 'kick' | 'snare' | 'hihat', time: number) => {
        // Helper if used, but largely inlined
    };

    const formatNote = (note: string) => {
        if (!showWhole && !note.includes('#') && !note.includes('b')) return '';
        if (!showSharps && note.includes('#')) return '';
        if (!showFlats && note.includes('b')) return '';
        return note;
    };


    const playSong = async () => {
        if (!selectedSong || isLoadingPlayback) return;

        if (isPlaying) {
            await stopAllPlayback();
            return;
        }

        setIsLoadingPlayback(true);
        try {
            await setupAudioMode(false);
            await stopAllPlayback();

            const isAISong = selectedSong.vocalUri.startsWith('ai://');
            const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;

            // 1. Determine if we need a harmonica intro
            const hasHarmonicaInstruction = selectedSong.lyrics.some(l => {
                const text = l.text.toLowerCase();
                return text.includes('harmonica') || (text.includes('intro') && text.includes('solo'));
            });
            const introDelay = playIntro ? (beatDuration * 4) : 0; // 1 bar (4 beats) intro
            activeIntroDelayRef.current = introDelay;

            if (isAISong) {
                const uri = selectedSong.vocalUri;
                const voiceIdPart = uri.replace('ai://', '').split('?')[0];
                const searchParams = new URLSearchParams(uri.includes('?') ? uri.split('?')[1] : '');
                const voiceId = voiceIdPart === 'default' ? undefined : voiceIdPart;
                const p = parseFloat(searchParams.get('p') || '1.0');
                const r = parseFloat(searchParams.get('r') || '0.9');

                console.log(`[AI Song] Sync start initialized. Voice: ${voiceId || 'default'}, Pitch: ${p}, Rate: ${r}, Intro: ${introDelay}s`);

                aiSpeechRef.current = {
                    voiceId,
                    pitch: p,
                    rate: r,
                    nextIndex: 0
                };
            } else {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: selectedSong.vocalUri },
                    { shouldPlay: false, volume: voiceVolume }
                );
                soundRef.current = sound;
            }

            // Start accompaniment (if any)
            if ((playWithChords || playWithDrums || playIntro) && Platform.OS === 'web') {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContextClass();
                playbackContextRef.current = ctx;
                if (ctx.state === 'suspended') await ctx.resume();

                const startTime = ctx.currentTime + 0.1;
                audioStartTimeRef.current = startTime;

                // --- Intro Logic ---
                if (playIntro) {
                    const chordCounts: Record<string, number> = {};
                    selectedSong.lyrics.forEach(line => {
                        const chords = line.chords.split(' ');
                        chords.forEach(c => { if (c) chordCounts[c] = (chordCounts[c] || 0) + 1; });
                    });
                    const topChords = Object.entries(chordCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
                    const introChord1 = topChords[0] || 'G';
                    const introChord2 = topChords[1] || topChords[0] || 'C';

                    [0, 1, 2, 3].forEach((beat) => {
                        const t = startTime + (beat * beatDuration);
                        const chord = beat < 4 ? introChord1 : introChord2;

                        if (hasHarmonicaInstruction) {
                            if (beat % 2 === 0) {
                                const freqs = getChordFrequencies(chord);
                                const noteFreq = freqs[freqs.length - 1] * (beat % 4 === 0 ? 1 : 1.25);
                                playHarmonicaNote(ctx, noteFreq, t, beatDuration * 1.5, chordVolume);
                            }
                        } else {
                            const freqs = getChordFrequencies(chord);
                            freqs.forEach((f, i) => {
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                osc.type = 'triangle'; osc.frequency.value = f;
                                gain.gain.setValueAtTime(0, t + (i * 0.01));
                                gain.gain.linearRampToValueAtTime(0.08 * chordVolume, t + (i * 0.01) + 0.02);
                                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
                                osc.connect(gain); gain.connect(ctx.destination);
                                osc.start(t + (i * 0.01)); osc.stop(t + 2);
                            });
                        }
                    });
                }

                // --- Reset Scheduling Context for real-time Lookahead ---
                lastScheduledBarTimeRef.current = -1; // Force immediate schedule
                schedulingContextRef.current = { lyricIndex: 0, lastActiveChord: '' };
            }

            setIsPlaying(true);
            isPlayingRef.current = true;
            HapticFeedback.light();

            const startT = Date.now();
            const updateProgress = () => {
                if (!isPlayingRef.current) return;

                let elapsed = (Date.now() - startT) / 1000;

                if (playbackContextRef.current) {
                    elapsed = playbackContextRef.current.currentTime - audioStartTimeRef.current;
                }

                if (!soundRef.current) {
                    setPlaybackPosition(elapsed);
                }

                // --- Chunky Lookahead Scheduler ---
                if (playbackContextRef.current && (playWithChords || playWithDrums)) {
                    const ctx = playbackContextRef.current;
                    const barDuration = beatDuration * 4;
                    const scheduleLookahead = 1.5;
                    const internalRelativeTime = ctx.currentTime - audioStartTimeRef.current - introDelay;

                    if (internalRelativeTime + scheduleLookahead > lastScheduledBarTimeRef.current + barDuration) {
                        const barToSchedule = lastScheduledBarTimeRef.current === -1
                            ? 0
                            : Math.floor((lastScheduledBarTimeRef.current + barDuration + 0.05) / barDuration) * barDuration;

                        const scheduleT = audioStartTimeRef.current + introDelay + barToSchedule;
                        const sc = schedulingContextRef.current;

                        while (sc.lyricIndex < selectedSong.lyrics.length && selectedSong.lyrics[sc.lyricIndex].startTime <= barToSchedule + 0.05) {
                            const lineChords = selectedSong.lyrics[sc.lyricIndex].chords?.trim().split(/\s+/).filter(c => c);
                            if (lineChords && lineChords.length > 0) sc.lastActiveChord = lineChords[0];
                            sc.lyricIndex++;
                        }

                        if (playWithChords && sc.lastActiveChord) {
                            const rhythm = RHYTHM_PATTERNS[selectedRhythm] || RHYTHM_PATTERNS['D D D U'];
                            const freqs = getChordFrequencies(sc.lastActiveChord);
                            for (let repeat = 0; repeat < strumDensity; repeat++) {
                                const barPartDuration = barDuration / strumDensity;
                                const repeatOffset = barPartDuration * repeat;
                                rhythm.strums.forEach((strum) => {
                                    let adjTime = strum.time * barPartDuration;
                                    if ((strum.time * 8) % 2 !== 0) adjTime += swing * (barPartDuration / 8);
                                    const finalT = scheduleT + repeatOffset + adjTime;
                                    const vol = (strum.accent ? accentAmount : 1 / (accentAmount || 1)) * chordVolume;
                                    freqs.forEach((freq, i) => {
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();
                                        osc.type = strum.type === 'bass' ? 'sine' : 'triangle';
                                        osc.frequency.value = strum.type === 'bass' ? freq / 2 : freq;
                                        const stringDelay = strum.type === 'up' ? (freqs.length - i) * 0.01 : i * 0.01;
                                        gain.gain.setValueAtTime(0, finalT + stringDelay);
                                        gain.gain.linearRampToValueAtTime(0.1 * vol, finalT + stringDelay + 0.01);
                                        gain.gain.exponentialRampToValueAtTime(0.001, finalT + stringDelay + 1.2);
                                        osc.connect(gain); gain.connect(ctx.destination);
                                        osc.start(finalT + stringDelay); osc.stop(finalT + stringDelay + 2);
                                    });
                                });
                            }
                        }

                        if (playWithDrums) {
                            const pattern = (DRUM_PATTERNS as any)[selectedDrumPattern] || DRUM_PATTERNS['Basic Rock'];
                            pattern.forEach((note: any) => {
                                const noteStart = scheduleT + note.time * beatDuration;
                                const osc = ctx.createOscillator();
                                const gain = ctx.createGain();
                                if (note.type === 'kick') {
                                    osc.frequency.setValueAtTime(150, noteStart);
                                    osc.frequency.exponentialRampToValueAtTime(0.01, noteStart + 0.5);
                                    gain.gain.setValueAtTime(1 * drumVolume, noteStart);
                                } else if (note.type === 'snare') {
                                    osc.type = 'triangle'; osc.frequency.setValueAtTime(100, noteStart);
                                    gain.gain.setValueAtTime(0.5 * drumVolume, noteStart);
                                } else {
                                    osc.type = 'square'; osc.frequency.setValueAtTime(800, noteStart);
                                    gain.gain.setValueAtTime(0.3 * drumVolume, noteStart);
                                }
                                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.1);
                                osc.connect(gain); gain.connect(ctx.destination);
                                osc.start(noteStart); osc.stop(noteStart + 0.5);
                            });
                        }
                        lastScheduledBarTimeRef.current = barToSchedule;
                    }
                }

                // --- Sync Speech Logic ---
                const ai = aiSpeechRef.current;
                if (ai && ai.nextIndex < selectedSong.lyrics.length) {
                    const nextLine = selectedSong.lyrics[ai.nextIndex];
                    if (elapsed >= (introDelay + nextLine.startTime - 0.05)) {
                        let cleanText = nextLine.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\*+/g, '').trim();
                        const lower = cleanText.toLowerCase();
                        const isInstructionOnly = ['intro', 'chorus', 'verse', 'bridge', 'outro'].some(k => lower.includes(k)) || lower.includes('harmonica') || lower.includes('solo');

                        if (cleanText && !isInstructionOnly) {
                            let finalPitch = ai.pitch;
                            if (singingMode) finalPitch += Math.sin(elapsed * Math.PI * 2 * (selectedSong.bpm / 60) * 2) * 0.1;

                            Speech.speak(cleanText, { voice: ai.voiceId, pitch: finalPitch, rate: ai.rate });
                        }
                        ai.nextIndex++;
                    }
                }

                const maxT = selectedSong.lyrics[selectedSong.lyrics.length - 1].startTime + introDelay + (beatDuration * 16);
                if (elapsed < maxT) {
                    progressFrameRef.current = requestAnimationFrame(updateProgress);
                } else {
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                }
            };

            if (soundRef.current) {
                soundRef.current.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(activeIntroDelayRef.current + (status.positionMillis / 1000));
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            isPlayingRef.current = false;
                        }
                    }
                });
                if (introDelay > 0) {
                    setTimeout(() => soundRef.current?.playAsync(), introDelay * 1000);
                } else {
                    await soundRef.current.playAsync();
                }
            }

            updateProgress();

        } catch (error) {
            console.error('Playback Error:', error);
            Alert.alert('Playback Error', 'Check console for details.');
            setIsPlaying(false);
        } finally {
            setIsLoadingPlayback(false);
        }
    };


    useEffect(() => {
        return () => {
            stopAllPlayback();
            soundRef.current?.unloadAsync();
        };
    }, []);

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader title="Music Maker" subtitle="Guitar tools" icon="🎸" sparkId="song-maker" />

                    <View style={{ paddingVertical: 20 }}>
                        <AISettingsNote sparkName="Music Maker" />
                    </View>

                    <View style={[styles.helpSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.helpTitle, { color: colors.primary }]}>How it Works</Text>

                        <View style={styles.helpItem}>
                            <Text style={[styles.helpSubitle, { color: colors.text }]}>🎸 Tuning Your Guitar</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Start the tuner and pluck a string. The meter shows if you're sharp or flat.
                                Aim for the center green needle!
                            </Text>
                        </View>

                        <View style={styles.helpItem}>
                            <Text style={[styles.helpSubitle, { color: colors.text }]}>🎙️ Recording a Song</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Go to the "Songs" tab and tap the microphone. Sing your song clearly.
                                When finished, tap stop to let Gemini analyze the melody and chords.
                            </Text>
                        </View>

                        <View style={styles.helpItem}>
                            <Text style={[styles.helpSubitle, { color: colors.text }]}>🪄 AI Song Generator</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Tap the sparkles icon to have AI write a song for you! Enter a theme, choose a voice,
                                and adjust the Pitch and Rate to customize the AI singer's character.
                            </Text>
                        </View>

                        <View style={styles.helpItem}>
                            <Text style={[styles.helpSubitle, { color: colors.text }]}>📂 Managing Songs</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Tap a song to view lyrics and play it with guitar accompaniment. Use the trash icon
                                to delete songs. On the web, you can even export your songs as WAV files!
                            </Text>
                        </View>

                        <View style={styles.helpItem}>
                            <Text style={[styles.helpSubitle, { color: colors.text }]}>🎛️ Mixer & Rhythm Controls</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Expand the Mixer to fine-tune your sound: {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Swing:</Text> Adds a groovy, off-beat feel to the rhythm. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Humanize:</Text> Adds subtle timing variations for a more natural feel. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Accent:</Text> Controls the volume difference of emphasized beats. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Volumes:</Text> Mix the levels of Voice, Guitar, and Drums. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Strum Density:</Text> Controls how many times the rhythm pattern repeats per bar (1-16). {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Singing Mode:</Text> Adds a melodic vibrato effect to AI vocals. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Accents & Styles:</Text> Choose a specific character style (Texan, British, Blues) for any AI-generated song.
                            </Text>
                        </View>
                    </View>

                    <SettingsFeedbackSection sparkId="song-maker" sparkName="Music Maker" />
                    <TouchableOpacity onPress={onCloseSettings} style={styles.closeBtn}>
                        <Text style={{ color: colors.text }}>Close</Text>
                    </TouchableOpacity>
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    onPress={() => setActiveTab('songs')}
                    style={[styles.tab, activeTab === 'songs' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'songs' ? colors.primary : colors.textSecondary }]}>Songs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('tuner')}
                    style={[styles.tab, activeTab === 'tuner' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'tuner' ? colors.primary : colors.textSecondary }]}>Tuner</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'tuner' ? (
                <View style={styles.tunerContainer}>
                    <View style={styles.meter}>
                        <Text style={[styles.pitchText, { color: colors.text }]}>
                            {currentPitch ? `${currentPitch.toFixed(2)} Hz` : '---'}
                        </Text>
                        <Text style={[styles.noteText, { color: colors.primary }]}>
                            {closestString?.note || '---'}
                        </Text>

                        <View style={styles.visualMeter}>
                            <View style={[styles.meterLine, { backgroundColor: colors.textSecondary + '40' }]} />
                            <View style={[styles.meterCenter, { backgroundColor: colors.primary }]} />
                            {currentPitch && closestString ? (() => {
                                const cents = 1200 * Math.log2(currentPitch / closestString.freq);
                                const clampedCents = Math.max(-50, Math.min(50, cents));
                                const leftPosition = 50 + clampedCents; // 0-100%
                                return (
                                    <>
                                        <View style={[styles.needle, { left: `${leftPosition}%`, backgroundColor: Math.abs(cents) < 5 ? '#4CAF50' : colors.error }]} />
                                        <Text style={[styles.centsText, { color: Math.abs(cents) < 5 ? '#4CAF50' : colors.textSecondary }]}>
                                            {cents > 0 ? '+' : ''}{cents.toFixed(0)} cents
                                        </Text>
                                    </>
                                );
                            })() : (
                                <Text style={[styles.centsText, { color: colors.textSecondary, opacity: 0.5 }]}>Ready</Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.stringGrid}>
                        {GUITAR_STRINGS.map(s => (
                            <View key={s.id} style={[styles.stringTag, closestString?.id === s.id && { backgroundColor: colors.primary }]}>
                                <Text style={{ color: closestString?.id === s.id ? '#fff' : colors.textSecondary }}>{s.note}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity
                        onPress={isTuning ? () => stopTuning() : startTuning}
                        style={[styles.actionBtn, { backgroundColor: isTuning ? colors.error : colors.primary }]}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isTuning ? 'Stop' : 'Start Tuning'}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.songsContainer}>
                    {selectedSong ? (
                        <View style={{ flex: 1 }}>
                            <View style={[styles.songHeader, { justifyContent: 'space-between' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <TouchableOpacity onPress={async () => {
                                        await stopAllPlayback();
                                        setSelectedSong(null);
                                    }}>
                                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <TextInput
                                                style={[styles.songTitleInput, { color: colors.text }]}
                                                value={selectedSong.songName}
                                                onChangeText={updateSongName}
                                                placeholder="Enter song name..."
                                                placeholderTextColor={colors.textSecondary}
                                            />
                                        </View>
                                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Auto-saved to your collection</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            await stopAllPlayback();
                                            setSelectedSong(null);
                                        }}
                                        style={[styles.doneBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>Done</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={exportSong} style={[styles.playBtn, { backgroundColor: colors.textSecondary }]}>
                                        <Ionicons name="share-outline" size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={playSong} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
                                        <Ionicons name={isPlaying ? "stop" : "play"} size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.mixerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                <TouchableOpacity
                                    style={styles.mixerHeader}
                                    onPress={() => setIsMixerExpanded(!isMixerExpanded)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[styles.mixerTitleMain, { color: colors.text }]}>🎚️ Mixer & Options</Text>
                                        <TouchableOpacity onPress={() => setShowMixerHelp(true)}>
                                            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                    <Ionicons name={isMixerExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {isMixerExpanded && (
                                    <View style={styles.mixerContent}>
                                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RHYTHM CONTROLS</Text>
                                        <View style={styles.rhythmParamsRow}>
                                            <RhythmParamControl
                                                label="Swing"
                                                value={swing}
                                                min={0} max={0.5} step={0.05}
                                                onChange={setSwing}
                                                color={colors.primary}
                                                format={(v) => `${(v * 100).toFixed(0)}%`}
                                            />
                                            <RhythmParamControl
                                                label="Humanize"
                                                value={humanize}
                                                min={0} max={0.1} step={0.01}
                                                onChange={setHumanize}
                                                color={colors.primary}
                                                format={(v) => `${(v * 100).toFixed(0)}%`}
                                            />
                                            <RhythmParamControl
                                                label="Accent"
                                                value={accentAmount}
                                                min={0.8} max={1.5} step={0.1}
                                                onChange={setAccentAmount}
                                                color={colors.primary}
                                            />
                                        </View>

                                        <View style={styles.divider} />
                                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>OPTIONS</Text>
                                        <View style={styles.toggleRow}>
                                            <View style={styles.toggleItem}>
                                                <Switch value={playIntro} onValueChange={setPlayIntro} />
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Intro</Text>
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Switch value={playWithDrums} onValueChange={setPlayWithDrums} />
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Drums</Text>
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Drum Beat</Text>
                                                <TouchableOpacity style={styles.patternNameBox} onPress={() => {
                                                    const types = Object.keys(DRUM_PATTERNS);
                                                    const idx = types.indexOf(selectedDrumPattern);
                                                    setSelectedDrumPattern(types[(idx + 1) % types.length]);
                                                }}>
                                                    <Text style={[styles.patternName, { color: colors.primary }]}>{selectedDrumPattern}</Text>
                                                    <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{RHYTHM_PATTERNS[selectedRhythm]?.genre || 'Rhythm'}</Text>
                                                <TouchableOpacity style={styles.patternNameBox} onPress={() => {
                                                    const types = Object.keys(RHYTHM_PATTERNS);
                                                    const idx = types.indexOf(selectedRhythm);
                                                    setSelectedRhythm(types[(idx + 1) % types.length]);
                                                }}>
                                                    <Text style={[styles.patternName, { color: colors.primary }]}>{selectedRhythm}</Text>
                                                    <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Strum {strumDensity}x</Text>
                                                <TouchableOpacity onPress={() => {
                                                    setStrumDensity((prev) => (prev % 16) + 1); // Cycle 1-16
                                                }}>
                                                    <Ionicons name="repeat" size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Flats</Text>
                                                <Switch value={showFlats} onValueChange={setShowFlats} />
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Sharps</Text>
                                                <Switch value={showSharps} onValueChange={setShowSharps} />
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Whole</Text>
                                                <Switch value={showWhole} onValueChange={setShowWhole} />
                                            </View>
                                            <View style={styles.toggleItem}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>🎤 Singing</Text>
                                                <Switch value={singingMode} onValueChange={setSingingMode} />
                                            </View>
                                            {Platform.OS === 'web' && (
                                                <View style={styles.toggleItem}>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Chords</Text>
                                                    <Switch value={playWithChords} onValueChange={setPlayWithChords} />
                                                </View>
                                            )}
                                        </View>

                                        {Platform.OS === 'web' && (
                                            <>
                                                <View style={styles.divider} />
                                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>VOLUMES</Text>
                                                <View style={styles.mixerRow}>
                                                    <VolumeControl label="Voice" value={voiceVolume} onChange={setVoiceVolume} color={colors.primary} />
                                                    <VolumeControl label="Guitar" value={chordVolume} onChange={setChordVolume} color="#FF6B6B" />
                                                    <VolumeControl label="Drums" value={drumVolume} onChange={setDrumVolume} color="#4ECDC4" />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                )}
                            </View>

                            <ScrollView style={styles.lyricsScroll}>
                                {selectedSong.lyrics.map((l, i) => {
                                    // Calculate position relative to lyrics start (subtracting intro)
                                    const displayPos = playbackPosition - activeIntroDelayRef.current;
                                    const isActive = isPlaying && displayPos >= l.startTime && (i === selectedSong.lyrics.length - 1 || displayPos < selectedSong.lyrics[i + 1].startTime);
                                    return (
                                        <View key={i} style={[styles.lyricLine, isActive && { opacity: 1, transform: [{ scale: 1.02 }] }, !isActive && isPlaying && { opacity: 0.5 }]}>
                                            <View style={styles.notationRow}>
                                                <Text style={[styles.chordText, { color: colors.primary }]}>{l.chords}</Text>
                                                <Text style={[styles.noteTextSmall, { color: colors.textSecondary }]}>
                                                    {l.notes.split(' ').map(formatNote).join(' ')}
                                                </Text>
                                            </View>
                                            <Text style={[styles.lyricText, { color: colors.text, fontWeight: isActive ? 'bold' : 'normal' }]}>{l.text}</Text>
                                            {isActive && (
                                                <View style={{ height: 2, backgroundColor: colors.primary, width: 20, marginTop: 5 }} />
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                                <AISettingsNote sparkName="Music Maker" />
                                <Text style={[styles.songsHeading, { color: colors.text }]}>Your Songs</Text>
                            </View>
                            <FlatList
                                data={songs}
                                keyExtractor={(item: MusicAnalysisResult, index: number) => index.toString()}
                                renderItem={({ item }: { item: MusicAnalysisResult }) => (
                                    <View style={styles.songItem}>
                                        <TouchableOpacity onPress={() => setSelectedSong(item)} style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text }}>{item.songName}</Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.key} • {item.bpm} BPM {item.vocalUri.startsWith('ai://') ? '🤖' : ''}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => {
                                            const newSongs = songs.filter(s => s !== item);
                                            setSongs(newSongs);
                                        }}>
                                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                style={{ width: '100%', flex: 1 }}
                            />

                            <View style={{ paddingVertical: 20, paddingHorizontal: 20 }}>
                                {isAnalyzing && (
                                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                        <ActivityIndicator size="large" color={colors.primary} />
                                        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Processing Song...</Text>
                                    </View>
                                )}

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity
                                        onPress={isRecording ? stopAndAnalyze : startRecordingSong}
                                        disabled={isAnalyzing}
                                        style={[
                                            styles.recordBtn,
                                            { backgroundColor: isAnalyzing ? colors.textSecondary : (isRecording ? colors.error : colors.primary) }
                                        ]}
                                    >
                                        {isAnalyzing ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="#fff" />
                                        )}
                                        <Text style={{ color: '#fff', fontSize: 13, marginTop: 2 }}>
                                            {isAnalyzing ? '...' : (isRecording ? 'Stop' : 'Record Song')}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setIsGeneratorVisible(true)}
                                        disabled={isAnalyzing || isRecording}
                                        style={[
                                            styles.aiBtn,
                                            { backgroundColor: colors.secondary }
                                        ]}
                                    >
                                        <Ionicons name="sparkles" size={24} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 13, marginTop: 2 }}>AI Song Generator</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* AI Generator Modal */}
            <CommonModal
                visible={isGeneratorVisible}
                title="AI Song Generator"
                onClose={() => setIsGeneratorVisible(false)}
                footer={
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: colors.textSecondary }]}
                            onPress={() => setIsGeneratorVisible(false)}
                        >
                            <Text style={{ color: '#fff' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                            onPress={handleGenerateAISong}
                        >
                            <Text style={{ color: '#fff' }}>Generate</Text>
                        </TouchableOpacity>
                    </View>
                }
            >
                <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Write an 8 line blues song about dead alligators sung by a raspy woman"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={generatorPrompt}
                    onChangeText={setGeneratorPrompt}
                />

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Accent / Style</Text>
                <TouchableOpacity
                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setShowAccentSelector(true)}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {preferences.aiVoiceAccent.replace(/-/g, ' ')}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </TouchableOpacity>

                {/* Accent Selection Modal */}
                <Modal
                    visible={showAccentSelector}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowAccentSelector(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowAccentSelector(false)}
                    >
                        <View style={[styles.dropdownContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Choose an Accent / Style</Text>
                            <FlatList
                                data={Object.keys(ACCENT_INSTRUCTIONS)}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.voiceListItem,
                                            preferences.aiVoiceAccent === item && { backgroundColor: colors.primary + '20' }
                                        ]}
                                        onPress={() => {
                                            setPreferences({ aiVoiceAccent: item });
                                            setShowAccentSelector(false);
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.voiceNameText, { color: preferences.aiVoiceAccent === item ? colors.primary : colors.text, textTransform: 'capitalize' }]}>
                                                {item.replace(/-/g, ' ')}
                                            </Text>
                                        </View>
                                        {preferences.aiVoiceAccent === item && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 400 }}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>

                <View style={styles.rhythmParamsRow}>
                    <RhythmParamControl
                        label="Pitch" value={speechPitch}
                        min={0.5} max={2.0} step={0.1}
                        onChange={setSpeechPitch}
                        color={colors.primary}
                    />
                    <RhythmParamControl
                        label="Rate" value={speechRate}
                        min={0.5} max={2.0} step={0.1}
                        onChange={setSpeechRate}
                        color={colors.primary}
                    />
                </View>

                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Select Voice</Text>
                <TouchableOpacity
                    style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setShowVoiceSelector(true)}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                            {speechVoices.find(v => v.identifier === selectedSpeechVoice)?.name.replace('en-us-', '') || 'Select Voice'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                            {speechVoices.find(v => v.identifier === selectedSpeechVoice)?.quality === Speech.VoiceQuality.Enhanced ? '✨ High Quality' : 'Standard'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </TouchableOpacity>

                {/* Nested Voice Selection Modal */}
                <Modal
                    visible={showVoiceSelector}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowVoiceSelector(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowVoiceSelector(false)}
                    >
                        <View style={[styles.dropdownContent, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Choose an AI Voice</Text>
                            <FlatList
                                data={speechVoices}
                                keyExtractor={(item) => item.identifier}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.voiceListItem,
                                            selectedSpeechVoice === item.identifier && { backgroundColor: colors.primary + '20' }
                                        ]}
                                        onPress={() => {
                                            setSelectedSpeechVoice(item.identifier);
                                            setShowVoiceSelector(false);
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.voiceNameText, { color: selectedSpeechVoice === item.identifier ? colors.primary : colors.text }]}>
                                                {item.name.replace('en-us-', '').replace('en-gb-', 'GB ')}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                {item.language} • {item.quality === Speech.VoiceQuality.Enhanced ? 'Premium' : 'System'}
                                            </Text>
                                        </View>
                                        {selectedSpeechVoice === item.identifier && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                style={{ maxHeight: 400 }}
                            />
                        </View>
                    </TouchableOpacity>
                </Modal>
            </CommonModal>

            {/* Mixer Help Modal */}
            <CommonModal
                visible={showMixerHelp}
                title="Mixer & Rhythm Help"
                onClose={() => setShowMixerHelp(false)}
            >
                <ScrollView style={{ maxHeight: 500 }}>
                    <View style={{ gap: 20, paddingBottom: 20 }}>
                        <View>
                            <Text style={[styles.helpSubitle, { color: colors.text, marginBottom: 5 }]}>🎸 Tuning Your Guitar</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Start the tuner and pluck a string. The meter shows if you're sharp or flat.
                                Aim for the center green needle!
                            </Text>
                        </View>

                        <View>
                            <Text style={[styles.helpSubitle, { color: colors.text, marginBottom: 5 }]}>🎙️ Recording a Song</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Tap the microphone and sing your song. When finished, tap stop to let Gemini analyze the melody and chords.
                            </Text>
                        </View>

                        <View>
                            <Text style={[styles.helpSubitle, { color: colors.text, marginBottom: 5 }]}>🪄 AI Song Generator</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                Tap the sparkles icon to have AI write a song! Choose a theme and an Accent / Style to customize the performance.
                            </Text>
                        </View>

                        <View>
                            <Text style={[styles.helpSubitle, { color: colors.text, marginBottom: 5 }]}>🎛️ Mixer & Rhythm Controls</Text>
                            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                                • <Text style={{ fontWeight: 'bold' }}>Swing:</Text> Adds a groovy, off-beat feel. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Humanize:</Text> Adds subtle timing variations for a natural feel. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Accent:</Text> Controls volume difference of emphasized beats. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Singing Mode:</Text> Adds a melodic vibrato effect to AI vocals. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Accents & Styles:</Text> Choose a character theme (Texan, British, Blues, etc).
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
                            onPress={() => setShowMixerHelp(false)}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close Help</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </CommonModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabs: { flexDirection: 'row', padding: 10 },
    tab: { flex: 1, padding: 10, alignItems: 'center' },
    tabText: { fontWeight: 'bold' },
    tunerContainer: { flex: 1, padding: 20, alignItems: 'center' },
    meter: { width: '100%', alignItems: 'center', marginBottom: 40 },
    pitchText: { fontSize: 24, fontWeight: 'bold' },
    noteText: { fontSize: 84, fontWeight: 'bold' },
    visualMeter: { width: '80%', height: 40, marginTop: 20, justifyContent: 'center' },
    meterLine: { height: 2, width: '100%', position: 'absolute' },
    meterCenter: { height: 10, width: 2, position: 'absolute', left: '50%', marginTop: -4 },
    needle: { height: 20, width: 2, position: 'absolute', marginTop: -9 },
    centsText: { position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontSize: 12 },
    stringGrid: { flexDirection: 'row', gap: 10, marginBottom: 40 },
    stringTag: { padding: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', width: 40, alignItems: 'center' },
    actionBtn: { padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
    songsContainer: { flex: 1, padding: 20 },
    recordBtn: { flex: 1, height: 70, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    songItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%'
    },
    songTitleInput: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingVertical: 0,
        marginVertical: 0,
        flexShrink: 1,
    },
    songHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    songTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    toggleRow: { flexDirection: 'row', gap: 15, marginBottom: 5, flexWrap: 'wrap', alignItems: 'flex-start' },
    toggleItem: { alignItems: 'center' },
    lyricsScroll: { flex: 1 },
    lyricLine: { marginBottom: 20 },
    notationRow: { flexDirection: 'row', gap: 20, marginBottom: 5 },
    chordText: { fontWeight: 'bold', fontSize: 16 },
    noteTextSmall: { fontStyle: 'italic' },
    lyricText: { fontSize: 18 },
    closeBtn: { padding: 15, alignItems: 'center', marginTop: 20 },
    playBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    helpSection: {
        margin: 20,
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
    },
    helpTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    helpItem: {
        marginBottom: 15,
    },
    helpSubitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    helpText: {
        fontSize: 13,
        lineHeight: 18,
    },
    mixerContainer: {
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
        overflow: 'hidden',
    },
    mixerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
    },
    mixerTitleMain: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    doneBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    mixerContent: {
        padding: 10,
        paddingTop: 0,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 10,
    },
    mixerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 10,
    },
    volumeControl: {
        alignItems: 'center',
        flex: 1,
    },
    volumeLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    volumeBar: {
        flexDirection: 'row',
        gap: 3,
        alignItems: 'flex-end',
    },
    volumeSegment: {
        width: 8,
        borderRadius: 2,
    },
    rhythmParamsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 5,
    },
    paramControl: {
        flex: 1,
        alignItems: 'center',
    },
    paramLabel: {
        fontSize: 10,
        color: '#888',
        marginBottom: 2,
    },
    paramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    paramValue: {
        fontSize: 12,
        fontWeight: 'bold',
        minWidth: 35,
        textAlign: 'center',
    },
    patternNameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 5,
        marginTop: 2,
    },
    patternName: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    aiBtn: {
        flex: 1,
        height: 70,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    modalContent: {
        width: '90%',
        padding: 20,
        borderRadius: 20,
        gap: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    textInput: {
        height: 100,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    voicePicker: {
        flexDirection: 'row',
        maxHeight: 40,
    },
    voiceItem: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    voiceName: {
        fontSize: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
    },
    dropdownContent: {
        width: '85%',
        maxHeight: '70%',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    voiceListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    voiceNameText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    songsHeading: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    mixerHelpText: {
        fontSize: 14,
        lineHeight: 20,
    },
    accentScroll: {
        maxHeight: 50,
        marginTop: 10,
    },
    accentChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        justifyContent: 'center',
        height: 34,
    },
});

export default SongMakerSpark;
