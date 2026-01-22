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
    Modal,
    TextInput,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store/sparkStore';
import { HapticFeedback } from '../utils/haptics';
import { GeminiService } from '../services/GeminiService';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection
} from '../components/SettingsComponents';

// --- CONSTANTS & THEORY ---

const GUITAR_STRINGS = [
    { note: 'E', freq: 82.41, id: 'E2' },
    { note: 'A', freq: 110.00, id: 'A2' },
    { note: 'D', freq: 146.83, id: 'D3' },
    { note: 'G', freq: 196.00, id: 'G3' },
    { note: 'B', freq: 246.94, id: 'B3' },
    { note: 'e', freq: 329.63, id: 'E4' },
];

const CHORD_FREQUENCIES: Record<string, number[]> = {
    'C': [130.81, 164.81, 196.00, 261.63, 329.63],
    'D': [146.83, 220.00, 293.66, 369.99],
    'E': [82.41, 123.47, 164.81, 207.65, 246.94, 329.63],
    'F': [87.31, 130.81, 174.61, 220.00, 261.63, 349.23],
    'G': [98.00, 123.47, 146.83, 196.00, 246.94, 392.00],
    'A': [110.00, 164.81, 220.00, 277.18, 329.63],
    'B': [123.47, 185.00, 246.94, 311.13, 369.99],
    'Cm': [130.81, 196.00, 261.63, 311.13],
    'Dm': [146.83, 220.00, 293.66, 349.23],
    'Em': [82.41, 123.47, 164.81, 196.00, 246.94, 329.63],
    'Fm': [87.31, 130.81, 174.61, 207.65, 261.63],
    'Gm': [98.00, 146.83, 196.00, 233.08, 293.66],
    'Am': [110.00, 164.81, 220.00, 261.63, 329.63],
    'Bm': [123.47, 185.00, 246.94, 293.66, 369.99],
    'Default': [261.63, 329.63, 392.00]
};

const RHYTHM_PATTERNS: any = {
    'D D D U': { name: 'D D D U', strums: [{ time: 0, type: 'down', accent: true }, { time: 0.25, type: 'down' }, { time: 0.5, type: 'down', accent: true }, { time: 0.75, type: 'up' }] },
    'D D U U D U': { name: 'D D U U D U', strums: [{ time: 0, type: 'down', accent: true }, { time: 0.25, type: 'down' }, { time: 0.375, type: 'up' }, { time: 0.625, type: 'up' }, { time: 0.75, type: 'down', accent: true }, { time: 0.875, type: 'up' }] },
    'Shuffle': { name: 'Shuffle', strums: [{ time: 0, type: 'down', accent: true }, { time: 0.166, type: 'up' }, { time: 0.25, type: 'down', accent: true }, { time: 0.416, type: 'up' }, { time: 0.5, type: 'down', accent: true }, { time: 0.666, type: 'up' }, { time: 0.75, type: 'down', accent: true }, { time: 0.916, type: 'up' }] }
};

const DRUM_PATTERNS: any = {
    'Basic Rock': [{ type: 'kick', time: 0 }, { type: 'snare', time: 1 }, { type: 'kick', time: 1.5 }, { type: 'snare', time: 2 }, { type: 'kick', time: 2.5 }, { type: 'snare', time: 3 }],
    'Jazz Swing': [{ type: 'kick', time: 0 }, { type: 'hihat', time: 0.66 }, { type: 'hihat', time: 1 }, { type: 'snare', time: 1.66 }, { type: 'kick', time: 2 }, { type: 'hihat', time: 2.66 }, { type: 'hihat', time: 3 }, { type: 'snare', time: 3.66 }]
};

// --- SERVICES ---

const SongAnalysisService = {
    analyzeVocalRecording: async (uri: string, songName: string): Promise<any> => {
        const prompt = `
            Analyze this vocal recording for a song named "${songName}".
            Extract lyrics, approximate BPM, Key, and guitar chords.
            Return strictly JSON:
            { "key": "G Major", "bpm": 120, "lyrics": [ { "text": "...", "chords": "G", "notes": "G", "startTime": 0.5 } ] }
        `;
        let audioBase64 = '';
        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            audioBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
            });
        } else {
            audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        }
        const apiKey = await GeminiService.getApiKey();
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'audio/mp4', data: audioBase64 } }, { text: prompt }] }] })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        return { songName, vocalUri: uri, ...parsed };
    },
    generateAISong: async (p: string): Promise<any> => {
        const prompt = `${p}\nWrite a song with key/BPM and timestamps. Return strictly JSON: { "songName": "...", "key": "...", "bpm": 120, "lyrics": [{ "text": "...", "chords": "...", "notes": "...", "startTime": 0 }] }`;
        return await GeminiService.generateJSON<any>(prompt);
    }
};

// --- COMPONENTS ---

const VolumeControl = ({ label, value, onChange, color, colors }: any) => (
    <View style={styles.volumeControl}>
        <Text style={[styles.volumeLabel, { color }]}>{label}</Text>
        <View style={styles.volumeBar}>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((level) => (
                <TouchableOpacity
                    key={level}
                    onPress={() => onChange(level)}
                    style={[styles.volumeSegment, { backgroundColor: value >= level ? color : colors.border, height: 10 + (level * 10) }]}
                />
            ))}
        </View>
    </View>
);

const RhythmParamControl = ({ label, value, min, max, step, onChange, color, format }: any) => (
    <View style={styles.paramControl}>
        <Text style={styles.paramLabel}>{label}</Text>
        <View style={styles.paramRow}>
            <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))}><Ionicons name="remove-circle-outline" size={20} color={color} /></TouchableOpacity>
            <Text style={[styles.paramValue, { color }]}>{format ? format(value) : value.toFixed(2)}</Text>
            <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))}><Ionicons name="add-circle-outline" size={20} color={color} /></TouchableOpacity>
        </View>
    </View>
);

const SongMakerSpark: React.FC<{ showSettings?: boolean; onCloseSettings?: () => void; }> = ({ showSettings = false, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();

    // State
    const [activeTab, setActiveTab] = useState<'tuner' | 'songs'>('tuner');
    const [dataLoaded, setDataLoaded] = useState(false);
    const [songs, setSongs] = useState<any[]>([]);
    const [selectedSong, setSelectedSong] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratorVisible, setIsGeneratorVisible] = useState(false);
    const [generatorPrompt, setGeneratorPrompt] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);

    // Tuner
    const [isTuning, setIsTuning] = useState(false);
    const [currentPitch, setCurrentPitch] = useState<number | null>(null);
    const [closestString, setClosestString] = useState<any>(null);

    // Mixer & Options
    const [voiceVolume, setVoiceVolume] = useState(1.0);
    const [chordVolume, setChordVolume] = useState(0.6);
    const [drumVolume, setDrumVolume] = useState(0.6);
    const [playWithChords, setPlayWithChords] = useState(Platform.OS === 'web');
    const [playWithDrums, setPlayWithDrums] = useState(false);
    const [playIntro, setPlayIntro] = useState(false);
    const [selectedRhythm, setSelectedRhythm] = useState('D D D U');
    const [selectedDrumPattern, setSelectedDrumPattern] = useState('Basic Rock');
    const [patternRepeats, setPatternRepeats] = useState(1);
    const [isMixerExpanded, setIsMixerExpanded] = useState(false);
    const [swing, setSwing] = useState(0);
    const [humanize, setHumanize] = useState(0.02);
    const [accentAmount, setAccentAmount] = useState(1.2);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [speechRate, setSpeechRate] = useState(0.9);
    const [selectedSpeechVoice, setSelectedSpeechVoice] = useState<string | null>(null);
    const [speechVoices, setSpeechVoices] = useState<any[]>([]);

    // Refs
    const recordingRef = useRef<Audio.Recording | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const progressFrameRef = useRef<number | null>(null);
    const speechTimeoutsRef = useRef<any[]>([]);
    const isPlayingRef = useRef(false);

    // Persistence
    useEffect(() => {
        const data = getSparkData('song-maker');
        if (data?.songs) setSongs(data.songs);
        setDataLoaded(true);
    }, []);

    useEffect(() => {
        if (dataLoaded) setSparkData('song-maker', { songs });
    }, [songs, dataLoaded]);

    useEffect(() => {
        Speech.getAvailableVoicesAsync().then(v => {
            setSpeechVoices(v);
            const pref = v.find(i => i.language.includes('en') && i.quality === 'Enhanced');
            setSelectedSpeechVoice(pref?.identifier || v[0]?.identifier);
        });
    }, []);

    // Logic
    const startTuning = async () => {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') return;
        setIsTuning(true);
        if (Platform.OS === 'web') {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const src = ctx.createMediaStreamSource(stream);
            src.connect(analyser);
            const data = new Float32Array(analyser.fftSize);
            const update = () => {
                if (!setIsTuning) return;
                analyser.getFloatTimeDomainData(data);
                const p = autoCorrelate(data, ctx.sampleRate);
                if (p !== -1) {
                    setCurrentPitch(p);
                    setClosestString(GUITAR_STRINGS.reduce((a, b) => Math.abs(b.freq - p) < Math.abs(a.freq - p) ? b : a));
                }
                requestAnimationFrame(update);
            };
            update();
        } else {
            setInterval(() => {
                const p = 110 + (Math.random() * 4 - 2);
                setCurrentPitch(p);
                setClosestString(GUITAR_STRINGS.reduce((a, b) => Math.abs(b.freq - p) < Math.abs(a.freq - p) ? b : a));
            }, 500);
        }
    };

    const autoCorrelate = (buf: Float32Array, sr: number) => {
        let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        if (Math.sqrt(rms / buf.length) < 0.01) return -1;
        let c = new Float32Array(buf.length);
        for (let i = 0; i < buf.length; i++) { for (let j = 0; j < buf.length - i; j++) c[i] = c[i] + buf[j] * buf[j + i]; }
        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxv = -1, maxp = -1;
        for (let i = d; i < buf.length; i++) if (c[i] > maxv) { maxv = c[i]; maxp = i; }
        return sr / maxp;
    };

    const startRecording = async () => {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        setIsRecording(true);
        const { recording } = await Audio.Recording.createAsync({
            android: { extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
            ios: { extension: '.m4a', outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.MAX, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
            web: { mimeType: 'audio/webm', bitsPerSecond: 128000 }
        });
        recordingRef.current = recording;
    };

    const stopAndProcess = async () => {
        setIsRecording(false); setIsAnalyzing(true);
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        if (uri) {
            const res = await SongAnalysisService.analyzeVocalRecording(uri, `Song ${songs.length + 1}`);
            setSongs([...songs, res]); setSelectedSong(res);
        }
        setIsAnalyzing(false);
    };

    const handleCreateAI = async () => {
        setIsGenerating(true); setIsGeneratorVisible(false); setIsAnalyzing(true);
        const data = await SongAnalysisService.generateAISong(generatorPrompt);
        const res = { ...data, vocalUri: `ai://${selectedSpeechVoice || 'default'}?p=${speechPitch}&r=${speechRate}` };
        setSongs([...songs, res]); setSelectedSong(res);
        setIsGenerating(false); setIsAnalyzing(false);
    };

    const playSong = async () => {
        if (isPlaying) {
            setIsPlaying(false); isPlayingRef.current = false;
            soundRef.current?.stopAsync(); Speech.stop();
            speechTimeoutsRef.current.forEach(clearTimeout);
            if (playbackContextRef.current) playbackContextRef.current.close();
            return;
        }
        setIsPlaying(true); isPlayingRef.current = true;
        let introLen = playIntro ? (60 / selectedSong.bpm) * 6 : 0;
        const startT = Date.now();
        const update = () => { if (isPlayingRef.current) { setPlaybackPosition((Date.now() - startT) / 1000); progressFrameRef.current = requestAnimationFrame(update); } };
        update();

        if (selectedSong.vocalUri.startsWith('ai://')) {
            selectedSong.lyrics.forEach((l: any) => {
                const tid = setTimeout(() => { if (isPlayingRef.current) Speech.speak(l.text, { voice: selectedSpeechVoice as string, pitch: speechPitch, rate: speechRate }); }, (introLen + l.startTime) * 1000);
                speechTimeoutsRef.current.push(tid);
            });
        } else {
            const { sound } = await Audio.Sound.createAsync({ uri: selectedSong.vocalUri }, { volume: voiceVolume });
            soundRef.current = sound;
            setTimeout(() => sound.playAsync(), introLen * 1000);
        }

        if (Platform.OS === 'web' && (playWithChords || playWithDrums || playIntro)) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            playbackContextRef.current = ctx;
            const now = ctx.currentTime + 0.1;
            const beat = 60 / selectedSong.bpm;

            // Accompaniment implementation...
            if (playWithChords) {
                selectedSong.lyrics.forEach((l: any) => {
                    const freqs = CHORD_FREQUENCIES[l.chords.split(' ')[0]] || CHORD_FREQUENCIES['Default'];
                    freqs.forEach((f, i) => {
                        const osc = ctx.createOscillator(); const gain = ctx.createGain();
                        osc.frequency.value = f; osc.type = 'triangle';
                        const t = now + introLen + l.startTime + (i * 0.01);
                        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.05 * chordVolume, t + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(t); osc.stop(t + 2.5);
                    });
                });
            }
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: { padding: 20, paddingTop: 60, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
        tabs: { flexDirection: 'row', backgroundColor: colors.surface, padding: 5 },
        tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10 },
        activeTab: { backgroundColor: colors.primary },
        tabText: { fontWeight: 'bold' },
        content: { flex: 1, padding: 20 },

        tunerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        pitchText: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
        meter: { width: '100%', height: 40, backgroundColor: colors.border, borderRadius: 20, justifyContent: 'center' },
        needle: { width: 4, height: 30, backgroundColor: colors.primary, borderRadius: 2, position: 'absolute' },
        stringRow: { flexDirection: 'row', gap: 10, marginTop: 40 },
        stringBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
        activeString: { backgroundColor: colors.primary },

        songItem: { padding: 15, borderRadius: 15, backgroundColor: colors.surface, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        songMeta: { fontSize: 12, color: colors.textSecondary },

        playerBox: { flex: 1 },
        lyricScroll: { flex: 1, marginBottom: 20 },
        lyricLine: { marginBottom: 15, padding: 10, borderRadius: 10 },
        chordText: { fontWeight: 'bold', color: colors.primary },

        actionRow: { flexDirection: 'row', gap: 15, padding: 20 },
        btn: { flex: 1, padding: 15, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
        btnText: { color: '#fff', fontWeight: 'bold' },

        modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
        modalBox: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, gap: 15 },
        input: { height: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text },

        mixerBox: { backgroundColor: colors.surface, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
        mixerHeader: { padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
        mixerRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 10 },
        volumeControl: { alignItems: 'center' },
        volumeLabel: { fontSize: 10, marginBottom: 5 },
        volumeBar: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
        volumeSegment: { width: 6, borderRadius: 2 },
        paramControl: { alignItems: 'center' },
        paramLabel: { fontSize: 10 },
        paramRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
        paramValue: { fontSize: 12, fontWeight: 'bold' },
        optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, padding: 10 }
    });

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader title="SongMaker" subtitle="Single-file Guitar & AI Studio" icon="🎵" sparkId="song-maker" />
                    <SettingsFeedbackSection sparkName="SongMaker" sparkId="song-maker" />
                    <TouchableOpacity style={styles.btn} onPress={onCloseSettings}><Text style={styles.btnText}>Close</Text></TouchableOpacity>
                </SettingsScrollView>
            </SettingsContainer>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🎵 SongMaker</Text>
                <TouchableOpacity onPress={() => setSelectedSong(null)}><Ionicons name="home" size={24} color={colors.primary} /></TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === 'tuner' && styles.activeTab]} onPress={() => setActiveTab('tuner')}><Text style={[styles.tabText, { color: activeTab === 'tuner' ? '#fff' : colors.text }]}>Tuner</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'songs' && styles.activeTab]} onPress={() => setActiveTab('songs')}><Text style={[styles.tabText, { color: activeTab === 'songs' ? '#fff' : colors.text }]}>Studio</Text></TouchableOpacity>
            </View>

            <View style={styles.content}>
                {activeTab === 'tuner' && (
                    <View style={styles.tunerBox}>
                        <Text style={[styles.pitchText, { color: colors.text }]}>{currentPitch ? `${currentPitch.toFixed(1)} Hz` : '--'}</Text>
                        <View style={styles.meter}>
                            {currentPitch && closestString && (
                                <View style={[styles.needle, { left: `${50 + (currentPitch - closestString.freq) * 5}%` }]} />
                            )}
                        </View>
                        <View style={styles.stringRow}>
                            {GUITAR_STRINGS.map(s => (
                                <View key={s.id} style={[styles.stringBadge, closestString?.id === s.id && styles.activeString]}>
                                    <Text style={{ color: closestString?.id === s.id ? '#fff' : colors.text }}>{s.note}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity style={[styles.btn, { marginTop: 40, backgroundColor: isTuning ? colors.error : colors.primary }]} onPress={isTuning ? () => setIsTuning(false) : startTuning}>
                            <Text style={styles.btnText}>{isTuning ? 'Stop' : 'Start Tuner'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'songs' && (
                    <View style={{ flex: 1 }}>
                        {selectedSong ? (
                            <View style={styles.playerBox}>
                                <Text style={[styles.title, { marginBottom: 5 }]}>{selectedSong.songName}</Text>
                                <Text style={styles.songMeta}>{selectedSong.key} | {selectedSong.bpm} BPM</Text>

                                <View style={styles.mixerBox}>
                                    <TouchableOpacity style={styles.mixerHeader} onPress={() => setIsMixerExpanded(!isMixerExpanded)}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>🎚️ MIXER & OPTIONS</Text>
                                        <Ionicons name={isMixerExpanded ? "chevron-up" : "chevron-down"} size={16} />
                                    </TouchableOpacity>
                                    {isMixerExpanded && (
                                        <View>
                                            <View style={styles.mixerRow}>
                                                <VolumeControl label="Voice" value={voiceVolume} onChange={setVoiceVolume} color={colors.primary} colors={colors} />
                                                <VolumeControl label="Guitar" value={chordVolume} onChange={setChordVolume} color="#FF6B6B" colors={colors} />
                                                <VolumeControl label="Drums" value={drumVolume} onChange={setDrumVolume} color="#4ECDC4" colors={colors} />
                                            </View>
                                            <View style={styles.optionRow}>
                                                <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 10 }}>Intro</Text><Switch value={playIntro} onValueChange={setPlayIntro} /></View>
                                                <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 10 }}>Drums</Text><Switch value={playWithDrums} onValueChange={setPlayWithDrums} /></View>
                                                {Platform.OS === 'web' && <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 10 }}>Chords</Text><Switch value={playWithChords} onValueChange={setPlayWithChords} /></View>}
                                            </View>
                                        </View>
                                    )}
                                </View>

                                <ScrollView style={styles.lyricScroll}>
                                    {selectedSong.lyrics.map((l: any, i: number) => (
                                        <View key={i} style={[styles.lyricLine, playbackPosition >= l.startTime && { backgroundColor: colors.primary + '15' }]}>
                                            <Text style={styles.chordText}>{l.chords}</Text>
                                            <Text style={{ color: colors.text }}>{l.text}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity style={[styles.btn, isPlaying && { backgroundColor: colors.error }]} onPress={playSong}>
                                    <Ionicons name={isPlaying ? "stop" : "play"} size={20} color="#fff" />
                                    <Text style={styles.btnText}>{isPlaying ? 'Stop' : 'Play'}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <FlatList
                                    data={songs}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity style={styles.songItem} onPress={() => setSelectedSong(item)}>
                                            <View>
                                                <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.songName}</Text>
                                                <Text style={styles.songMeta}>{item.key} • {item.bpm} BPM</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setSongs(songs.filter((_, i) => i !== index))}><Ionicons name="trash" size={20} color={colors.error} /></TouchableOpacity>
                                        </TouchableOpacity>
                                    )}
                                />
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={[styles.btn, isRecording && { backgroundColor: colors.error }]} onPress={isRecording ? stopAndProcess : startRecording}>
                                        <Ionicons name={isRecording ? "stop" : "mic"} size={20} color="#fff" />
                                        <Text style={styles.btnText}>{isRecording ? 'Stop' : 'Record'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: colors.secondary }]} onPress={() => setIsGeneratorVisible(true)}>
                                        <Ionicons name="sparkles" size={20} color="#fff" />
                                        <Text style={styles.btnText}>AI</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <Modal visible={isGeneratorVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalBox}>
                        <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>AI Song Creator</Text>
                        <TextInput style={styles.input} placeholder="Describe your song..." value={generatorPrompt} onChangeText={setGeneratorPrompt} multiline />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <RhythmParamControl label="Pitch" value={speechPitch} min={0.5} max={2.0} step={0.1} onChange={setSpeechPitch} color={colors.primary} />
                            <RhythmParamControl label="Rate" value={speechRate} min={0.5} max={2.0} step={0.1} onChange={setSpeechRate} color={colors.primary} />
                        </View>
                        <TouchableOpacity style={styles.btn} onPress={handleCreateAI}><Text style={styles.btnText}>Create</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsGeneratorVisible(false)}><Text style={{ textAlign: 'center', color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {isAnalyzing && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: '#fff', marginTop: 10 }}>SongMaker is working...</Text>
                </View>
            )}
        </View>
    );
};

export default SongMakerSpark;
