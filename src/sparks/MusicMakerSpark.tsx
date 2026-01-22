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
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSparkStore } from '../store/sparkStore';
import { HapticFeedback } from '../utils/haptics';
import { MusicMakerService, MusicAnalysisResult } from '../services/MusicMakerService';
import { getChordFrequencies, RHYTHM_PATTERNS, DRUM_PATTERNS } from '../utils/MusicTheory';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsFeedbackSection
} from '../components/SettingsComponents';

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

const MusicMakerSpark: React.FC<{
    showSettings?: boolean;
    onCloseSettings?: () => void;
}> = ({ showSettings = false, onCloseSettings }) => {
    const { colors } = useTheme();
    const { getSparkData, setSparkData } = useSparkStore();
    const [activeTab, setActiveTab] = useState<'tuner' | 'songs'>('tuner');

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

    // AI Generator State
    const [isGeneratorVisible, setIsGeneratorVisible] = useState(false);
    const [generatorPrompt, setGeneratorPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSpeechVoice, setSelectedSpeechVoice] = useState<string | null>(null);
    const [speechVoices, setSpeechVoices] = useState<Speech.Voice[]>([]);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [speechRate, setSpeechRate] = useState(0.9);
    const speechTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

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
    const [patternRepeats, setPatternRepeats] = useState(1); // 1-4 times per bar
    const [isMixerExpanded, setIsMixerExpanded] = useState(false);


    // State for advanced rhythm
    const [swing, setSwing] = useState(0); // 0 to 0.5
    const [humanize, setHumanize] = useState(0.02); // 0 to 0.1
    const [accentAmount, setAccentAmount] = useState(1.2); // 0.8 to 1.5

    // Volume Levels (0.0 - 1.0)
    const [voiceVolume, setVoiceVolume] = useState(1.0);
    const [chordVolume, setChordVolume] = useState(0.6);
    const [drumVolume, setDrumVolume] = useState(0.6);

    // Playback Context for Chords (Web)
    const playbackContextRef = useRef<AudioContext | null>(null);
    const progressFrameRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        const data = getSparkData('music-maker');
        if (data?.songs) setSongs(data.songs);
    }, []);

    useEffect(() => {
        setSparkData('music-maker', { songs });
    }, [songs]);

    useEffect(() => {
        const loadVoices = async () => {
            const voices = await Speech.getAvailableVoicesAsync();
            console.log(`[AI Song] Loaded ${voices.length} available voices.`);
            setSpeechVoices(voices);
            if (voices.length > 0) {
                // Find a nice default if possible
                const preferred = voices.find(v => v.language.includes('en') && v.quality === Speech.VoiceQuality.Enhanced);
                setSelectedSpeechVoice(preferred?.identifier || voices[0].identifier);
                console.log(`[AI Song] Default voice selected: ${preferred?.identifier || voices[0].identifier}`);
            }
        };
        loadVoices();
    }, []);

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
            Alert.alert('Recording Error', `Could not start: ${error.message}`);
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
                // Actually MusicMakerService handles fetch.
                // We'll trust the extension/mime inference or basic blob fetch.
                console.log('Recording stopped, URI:', uri);
                const result = await MusicMakerService.analyzeVocalRecording(uri, `Song ${songs.length + 1}`);
                setSongs([...songs, result]);
                setSelectedSong(result);
            } else {
                throw new Error('No recording URI generated');
            }
        } catch (error) {
            console.error('Stop and Analyze Error:', error);
            Alert.alert('Analysis Failed', 'Could not process the recording.');
        } finally {
            setIsAnalyzing(false);
            // Switch back to playback mode
            await setupAudioMode(false);
        }
    };

    const handleGenerateAISong = async () => {
        if (!generatorPrompt.trim()) return;

        setIsGenerating(true);
        setIsGeneratorVisible(false);
        setIsAnalyzing(true);
        HapticFeedback.medium();

        try {
            const songData = await MusicMakerService.generateAISong(generatorPrompt);

            // For AI songs, we use a special URI scheme: ai://voiceId?p=pitch&r=rate
            const aiResult: MusicAnalysisResult = {
                ...songData,
                vocalUri: `ai://${selectedSpeechVoice || 'default'}?p=${speechPitch}&r=${speechRate}`
            };

            setSongs([...songs, aiResult]);
            setSelectedSong(aiResult);

            Alert.alert('Song Created!', `"${aiResult.songName}" has been generated. Tap Play to hear the AI sing it!`);
        } catch (error) {
            console.error('AI Generation Error:', error);
            Alert.alert('Generation Failed', 'Could not create the AI song. Please try again.');
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

                            for (let repeat = 0; repeat < patternRepeats; repeat++) {
                                const repeatOffset = (barDuration / patternRepeats) * repeat;

                                rhythm.strums.forEach((strum, strumIdx) => {
                                    const strumTimeFactor = barDuration / patternRepeats;

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
        if (!selectedSong) return;

        if (isPlaying) {
            await soundRef.current?.stopAsync();
            setIsPlaying(false);
            isPlayingRef.current = false;
            Speech.stop();
            speechTimeoutsRef.current.forEach(clearTimeout);
            speechTimeoutsRef.current = [];
            setPlaybackPosition(0);

            if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
            }
            if (progressFrameRef.current) {
                cancelAnimationFrame(progressFrameRef.current);
                progressFrameRef.current = null;
            }
            return;
        }

        try {
            await setupAudioMode(false);

            let introDelay = 0;
            if (playIntro) {
                const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;
                introDelay = beatDuration * 2 * 3; // Approx 3 chords
            }

            const isAISong = selectedSong.vocalUri.startsWith('ai://');

            if (isAISong) {
                // Parse URI manually: ai://voiceId?p=pitch&r=rate
                // URL constructor might fail on non-standard schemes in some environments
                const uri = selectedSong.vocalUri;
                const voiceIdPart = uri.replace('ai://', '').split('?')[0];
                const searchParams = new URLSearchParams(uri.includes('?') ? uri.split('?')[1] : '');

                const voiceId = voiceIdPart === 'default' ? undefined : voiceIdPart;
                const p = parseFloat(searchParams.get('p') || '1.0');
                const r = parseFloat(searchParams.get('r') || '0.9');

                console.log(`[AI Song] Playing with voice: ${voiceId || 'system default'}, pitch: ${p}, rate: ${r}`);

                selectedSong.lyrics.forEach(line => {
                    const delay = (introDelay + line.startTime) * 1000;
                    const tid = setTimeout(() => {
                        if (!isPlayingRef.current) return;
                        console.log(`[AI Song] Speaking line: ${line.text}`);
                        Speech.speak(line.text, {
                            voice: voiceId,
                            rate: r,
                            pitch: p,
                            onError: (err: any) => console.error('[AI Song] Speech Error:', err)
                        });
                    }, delay);
                    speechTimeoutsRef.current.push(tid);
                });
            } else {
                // WEB & NATIVE UNIFIED: Use expo-av for vocals
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

                if (playIntro) {
                    const chordCounts: Record<string, number> = {};
                    selectedSong.lyrics.forEach(line => {
                        const chords = line.chords.split(' ');
                        chords.forEach(c => { if (c) chordCounts[c] = (chordCounts[c] || 0) + 1; });
                    });
                    const topChords = Object.entries(chordCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

                    const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;

                    topChords.forEach((chord, idx) => {
                        const freqs = getChordFrequencies(chord);
                        const rhythm = RHYTHM_PATTERNS[selectedRhythm] || RHYTHM_PATTERNS['D D D U'];
                        freqs.forEach((freq, i) => {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'triangle'; osc.frequency.value = freq;
                            const strum = rhythm.strums[i % rhythm.strums.length];
                            const strumTime = strum.time * beatDuration * 4;
                            const t = startTime + (idx * beatDuration * 2) + strumTime;

                            gain.gain.setValueAtTime(0, t);
                            gain.gain.linearRampToValueAtTime(0.1 * chordVolume, t + 0.02);
                            gain.gain.exponentialRampToValueAtTime(0.001, t + (beatDuration * 2));
                            osc.connect(gain); gain.connect(ctx.destination);
                            osc.start(t); osc.stop(t + (beatDuration * 2) + 1);
                        });
                    });
                }

                if (playWithChords) {
                    const rhythm = RHYTHM_PATTERNS[selectedRhythm] || RHYTHM_PATTERNS['D D D U'];
                    const beatDuration = selectedSong.bpm ? (60 / selectedSong.bpm) : 0.5;
                    const barDuration = beatDuration * 4;
                    selectedSong.lyrics.forEach(line => {
                        const chords = line.chords.split(' ');
                        const firstChord = chords[0];
                        if (firstChord) {
                            const freqs = getChordFrequencies(firstChord);
                            for (let repeat = 0; repeat < patternRepeats; repeat++) {
                                const repeatOffset = (barDuration / patternRepeats) * repeat;
                                rhythm.strums.forEach((strum) => {
                                    const strumTimeFactor = barDuration / patternRepeats;
                                    let adjustedStrumTime = strum.time * strumTimeFactor;
                                    if ((strum.time * 8) % 2 !== 0) adjustedStrumTime += swing * (strumTimeFactor / 8);

                                    const jitter = (Math.random() - 0.5) * humanize * beatDuration;
                                    const t = startTime + introDelay + line.startTime + repeatOffset + adjustedStrumTime + jitter;
                                    const volumeMult = strum.accent ? accentAmount : (1 / (accentAmount || 1));

                                    freqs.forEach((freq, i) => {
                                        const osc = ctx.createOscillator();
                                        const gain = ctx.createGain();
                                        osc.type = strum.type === 'bass' ? 'sine' : 'triangle';
                                        osc.frequency.value = strum.type === 'bass' ? freq / 2 : freq;
                                        const stringDelay = strum.type === 'up' ? (freqs.length - i) * 0.01 : i * 0.01;
                                        const finalT = t + stringDelay;

                                        gain.gain.setValueAtTime(0, finalT);
                                        gain.gain.linearRampToValueAtTime(0.1 * chordVolume * volumeMult, finalT + 0.02);
                                        gain.gain.exponentialRampToValueAtTime(0.001, finalT + 1.5);
                                        osc.connect(gain); gain.connect(ctx.destination);
                                        osc.start(finalT); osc.stop(finalT + 2);
                                    });
                                });
                            }
                        }
                    });
                }

                if (playWithDrums && selectedSong.bpm) {
                    const beatDuration = 60 / selectedSong.bpm;
                    const totalDuration = selectedSong.lyrics[selectedSong.lyrics.length - 1].startTime + 5;
                    const pattern = (DRUM_PATTERNS as any)[selectedDrumPattern] || DRUM_PATTERNS['Basic Rock'];
                    for (let t = 0; t < totalDuration; t += (beatDuration * 4)) {
                        pattern.forEach((note: any) => {
                            const noteStart = startTime + introDelay + t + note.time * beatDuration;
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            if (note.type === 'kick') {
                                osc.frequency.setValueAtTime(150, noteStart);
                                osc.frequency.exponentialRampToValueAtTime(0.01, noteStart + 0.5);
                                gain.gain.setValueAtTime(1 * drumVolume, noteStart);
                                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.5);
                            } else if (note.type === 'snare') {
                                osc.type = 'triangle'; osc.frequency.setValueAtTime(100, noteStart);
                                gain.gain.setValueAtTime(0.5 * drumVolume, noteStart);
                                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.2);
                            } else {
                                osc.type = 'square'; osc.frequency.setValueAtTime(800, noteStart);
                                gain.gain.setValueAtTime(0.3 * drumVolume, noteStart);
                                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.05);
                            }
                            osc.connect(gain); gain.connect(ctx.destination);
                            osc.start(noteStart); osc.stop(noteStart + 0.5);
                        });
                    }
                }
            }

            setIsPlaying(true);
            isPlayingRef.current = true;
            HapticFeedback.light();

            if (soundRef.current) {
                soundRef.current.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(status.positionMillis / 1000);
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            isPlayingRef.current = false;
                            setPlaybackPosition(0);
                        }
                    }
                });

                if (introDelay > 0) {
                    setTimeout(async () => {
                        try { await soundRef.current?.playAsync(); } catch (e) { console.log('Play failed', e); }
                    }, introDelay * 1000);
                } else {
                    await soundRef.current.playAsync();
                }
            } else if (isAISong) {
                // For AI songs, manually track progress
                const startT = Date.now();
                const updateProgress = () => {
                    if (!isPlayingRef.current) return;
                    const elapsed = (Date.now() - startT) / 1000;
                    setPlaybackPosition(elapsed);
                    const maxT = selectedSong.lyrics[selectedSong.lyrics.length - 1].startTime + 5;
                    if (elapsed < maxT) {
                        progressFrameRef.current = requestAnimationFrame(updateProgress);
                    } else {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                    }
                };
                updateProgress();
            }

        } catch (error) {
            console.error('Playback Error:', error);
            Alert.alert('Playback Error', 'Could not play the recording.');
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        return () => {
            soundRef.current?.unloadAsync();
            if (playbackContextRef.current) {
                playbackContextRef.current.close();
            }
            if (progressFrameRef.current) {
                cancelAnimationFrame(progressFrameRef.current);
            }
        };
    }, []);

    if (showSettings) {
        return (
            <SettingsContainer>
                <SettingsScrollView>
                    <SettingsHeader title="Music Maker" subtitle="Guitar tools" icon="🎸" sparkId="music-maker" />

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
                                • <Text style={{ fontWeight: 'bold' }}>Swing:</Text> Adds a groovy, off-beat feel. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Humanize:</Text> Adds natural timing variations. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Accent:</Text> Modulates the volume of emphasized beats. {"\n"}
                                • <Text style={{ fontWeight: 'bold' }}>Volumes:</Text> Mix the levels of Voice, Guitar, and Drums.
                            </Text>
                        </View>
                    </View>

                    <SettingsFeedbackSection sparkId="music-maker" sparkName="Music Maker" />
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
                    onPress={() => setActiveTab('tuner')}
                    style={[styles.tab, activeTab === 'tuner' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'tuner' ? colors.primary : colors.textSecondary }]}>Tuner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('songs')}
                    style={[styles.tab, activeTab === 'songs' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'songs' ? colors.primary : colors.textSecondary }]}>Songs</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'tuner' ? (
                <View style={styles.tunerContainer}>
                    <View style={styles.meter}>
                        <Text style={[styles.pitchText, { color: colors.text }]}>
                            {currentPitch ? `${currentPitch.toFixed(2)} Hz` : '---'}
                        </Text>
                        <Text style={[styles.noteText, { color: colors.primary }]}>
                            {closestString?.note || '?'}
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
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => setSelectedSong(null)}>
                                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.songTitle, { color: colors.text }]}>{selectedSong.songName}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
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
                                    <Text style={[styles.mixerTitleMain, { color: colors.text }]}>🎚️ Mixer & Options</Text>
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
                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{patternRepeats}x/bar</Text>
                                                <TouchableOpacity onPress={() => {
                                                    setPatternRepeats((prev) => (prev % 4) + 1); // Cycle 1-4
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
                                    const isActive = isPlaying && playbackPosition >= l.startTime && (i === selectedSong.lyrics.length - 1 || playbackPosition < selectedSong.lyrics[i + 1].startTime);
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
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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

                            {isAnalyzing && <ActivityIndicator size="large" color={colors.primary} />}

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
                                    <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#fff" />
                                )}
                                <Text style={{ color: '#fff', marginTop: 5 }}>
                                    {isAnalyzing ? 'Processing...' : (isRecording ? 'Stop' : 'Record Song')}
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
                                <Text style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>AI Song</Text>
                            </TouchableOpacity>

                            {/* Generator Modal */}
                            <Modal
                                visible={isGeneratorVisible}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setIsGeneratorVisible(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                                        <Text style={[styles.modalTitle, { color: colors.text }]}>AI Song Generator</Text>

                                        <TextInput
                                            style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                                            placeholder="e.g. Write an 8 line blues song about dead alligators sung by a raspy woman"
                                            placeholderTextColor={colors.textSecondary}
                                            multiline
                                            value={generatorPrompt}
                                            onChangeText={setGeneratorPrompt}
                                        />

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

                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Select Voice</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.voicePicker}>
                                            {speechVoices.filter(v => v.language.includes('en')).map((voice) => (
                                                <TouchableOpacity
                                                    key={voice.identifier}
                                                    onPress={() => setSelectedSpeechVoice(voice.identifier)}
                                                    style={[
                                                        styles.voiceItem,
                                                        selectedSpeechVoice === voice.identifier && { backgroundColor: colors.primary }
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.voiceName,
                                                        { color: selectedSpeechVoice === voice.identifier ? '#fff' : colors.text }
                                                    ]}>
                                                        {voice.name.replace('en-us-', '')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

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
                                    </View>
                                </View>
                            </Modal>
                        </View>
                    )}
                </View>
            )}
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
    recordBtn: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 40 },
    songItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%'
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
        width: 80,
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
});

export default MusicMakerSpark;
