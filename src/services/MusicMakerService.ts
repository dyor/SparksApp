import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { GeminiService } from './GeminiService';

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

export const MusicMakerService = {
    /**
     * Sends a vocal recording to Gemini to extract lyrics, chords, and notes.
     * Uses the inline audio data approach for complex musical analysis.
     */
    analyzeVocalRecording: async (uri: string, songName: string, mimeType: string = 'audio/mp4'): Promise<MusicAnalysisResult> => {
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

            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
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

    /**
     * Placeholder for pitch detection.
     */
    detectPitch: async (uri: string): Promise<number> => {
        // Mocking pitch detection for the UI demonstration
        return 440 + (Math.random() * 10 - 5);
    }
};
