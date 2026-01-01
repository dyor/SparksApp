import { RemoteConfigService } from './RemoteConfigService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_API_KEY_STORAGE_KEY = 'sparks_custom_gemini_api_key';

/**
 * Get the API key using the resolution hierarchy:
 * 1. User custom key (if configured)
 * 2. Firebase Remote Config key
 * 3. Environment variable (fallback)
 */
async function getApiKey(): Promise<string> {
    // 1. Check for user's custom key
    try {
        const customKey = await AsyncStorage.getItem(CUSTOM_API_KEY_STORAGE_KEY);
        if (customKey && customKey.trim()) {
            console.log('🔑 Using custom Gemini API key');
            return customKey.trim();
        }
    } catch (error) {
        console.warn('⚠️ Failed to check custom API key:', error);
    }

    // 2. Check Firebase Remote Config
    try {
        await RemoteConfigService.ensureInitialized();
        const remoteKey = RemoteConfigService.getGeminiApiKey();
        if (remoteKey && remoteKey.trim()) {
            console.log('🔑 Using Remote Config Gemini API key');
            return remoteKey.trim();
        }
    } catch (error) {
        console.warn('⚠️ Failed to get Remote Config key:', error);
    }

    // 3. Fallback to environment variable
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (envKey && envKey.trim()) {
        console.log('🔑 Using environment variable Gemini API key');
        return envKey.trim();
    }

    throw new Error('No Gemini API key available. Please configure one in Settings or contact support.');
}

export const GeminiService = {
    /**
     * Get the current API key (for display/testing purposes)
     */
    getApiKey: async (): Promise<string> => {
        return await getApiKey();
    },

    generateContent: async (prompt: string, images: string[] = []): Promise<string> => {
        const apiKey = await getApiKey();

        // Using configuration from RecAIpeSpark which is confirmed working
        // Model: gemini-2.5-flash (as seen in working code)
        // API Version: v1
        const contents: any[] = [{
            parts: [{ text: prompt }]
        }];

        // Add images if provided
        if (images && images.length > 0) {
            images.forEach(base64Image => {
                contents[0].parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Image
                    }
                });
            });
        }

        // Log request details for debugging (without exposing full API key)
        const apiKeyPrefix = apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING';
        console.log('🔍 Gemini API Request:', {
            url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKeyPrefix}`,
            apiKeyLength: apiKey?.length || 0,
            apiKeyPresent: !!apiKey,
            promptLength: prompt.length,
            hasImages: images.length > 0,
            contentsStructure: JSON.stringify(contents).substring(0, 200) + '...',
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || 'API request failed';
            const errorCode = data.error?.code;
            const errorStatus = data.error?.status;
            
            console.error('❌ Gemini API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                errorCode,
                errorStatus,
                errorMessage: errorMsg,
                fullError: JSON.stringify(data.error, null, 2),
                apiKeyPrefix,
                apiKeyLength: apiKey?.length,
            });
            
            // Generate curl command for debugging
            const curlCommand = `curl -X POST \\
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ contents }, null, 2)}'`;
            
            console.error('📋 Test with this curl command (replace YOUR_API_KEY):');
            console.error(curlCommand);
            
            throw new Error(errorMsg);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('No content generated');
        }

        return text;
    },

    generateJSON: async <T>(prompt: string, images: string[] = []): Promise<T> => {
        // Append JSON instruction
        const jsonPrompt = `${prompt}\n\nOutput strictly valid JSON.`;
        const text = await GeminiService.generateContent(jsonPrompt, images);

        try {
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText) as T;
        } catch (e) {
            console.error('JSON Parse Error', e);
            throw new Error('Failed to parse (JSON)');
        }
    },

    interpretDream: async (dreamText: string): Promise<string> => {
        const prompt = `You are a dream interpretation expert with knowledge of psychology, symbolism, and dream analysis. 

Analyze this dream recollection and provide a thoughtful, accessible interpretation:

"${dreamText}"

Please structure your response as follows:

**Dream Summary**
[Brief 2-3 sentence summary of the main themes]

**Symbolic Meanings**
[Identify key symbols and their potential meanings]

**Psychological Insights**
[What might this dream reveal about the dreamer's thoughts, feelings, or experiences?]

**Reflection Questions**
[2-3 questions to help the dreamer reflect on their dream]

Keep the tone warm, insightful, and encouraging. Avoid overly clinical or diagnostic language. Focus on helping the dreamer understand and reflect on their dream experience.`;

        return await GeminiService.generateContent(prompt);
    },


    /**
     * Transcribe audio using Gemini's audio understanding
     * Uses file-based API: upload file first, then generate content
     */
    transcribeAudio: async (fileUri: string, mimeType: string = 'audio/m4a'): Promise<string> => {
        const apiKey = await getApiKey();

        try {
            // For React Native, we'll use inline base64 approach instead of file upload
            // Read audio file as base64
            const FileSystem = require('expo-file-system');
            const audioBase64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Determine MIME type from file extension if not provided
            let actualMimeType = mimeType;
            if (!actualMimeType || actualMimeType === 'audio/m4a') {
                if (fileUri.endsWith('.m4a')) {
                    actualMimeType = 'audio/mp4'; // M4A is MP4 audio
                } else if (fileUri.endsWith('.mp3')) {
                    actualMimeType = 'audio/mpeg';
                } else if (fileUri.endsWith('.wav')) {
                    actualMimeType = 'audio/wav';
                } else {
                    actualMimeType = 'audio/mp4'; // Default
                }
            }

            // Use inline audio data approach
            // According to docs, we can send audio inline as base64
            const prompt = 'Generate a transcript of the speech in this audio recording. Provide only the transcription text, no timestamps or additional formatting.';

            const contents = [{
                parts: [
                    {
                        inline_data: {
                            mime_type: actualMimeType,
                            data: audioBase64,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            }];

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error?.message || 'API request failed';
                console.error('Gemini transcription error:', errorMsg);
                throw new Error(errorMsg);
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('No transcription generated');
            }

            return text.trim();
        } catch (error: any) {
            console.error('Audio transcription error:', error);
            throw new Error(error.message || 'Failed to transcribe audio');
        }
    },
};
