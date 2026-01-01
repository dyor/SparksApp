import * as FileSystem from 'expo-file-system';
import { GeminiService } from './GeminiService';

export interface TranscriptionProvider {
  transcribe(audioUri: string): Promise<string>;
  isAvailable(): boolean | Promise<boolean>;
  getName(): string;
}

/**
 * Placeholder transcription provider that returns a message
 * This can be replaced with actual transcription service implementations
 */
class PlaceholderTranscriptionProvider implements TranscriptionProvider {
  getName(): string {
    return 'Placeholder';
  }

  isAvailable(): boolean {
    return true;
  }

  async transcribe(audioUri: string): Promise<string> {
    // Return a placeholder message
    // In production, this would call an actual transcription service
    throw new Error('Transcription service not configured. Please set up a transcription provider in settings.');
  }
}

/**
 * Gemini-based transcription provider
 * Uses Gemini API's file-based audio understanding to transcribe audio
 * Reference: https://ai.google.dev/gemini-api/docs/audio
 */
class GeminiTranscriptionProvider implements TranscriptionProvider {
  getName(): string {
    return 'Gemini';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await GeminiService.getApiKey();
      return true;
    } catch {
      return false;
    }
  }

  async transcribe(audioUri: string): Promise<string> {
    try {
      // Determine MIME type from file extension
      let mimeType = 'audio/mp4'; // Default for M4A files
      if (audioUri.endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (audioUri.endsWith('.wav')) {
        mimeType = 'audio/wav';
      } else if (audioUri.endsWith('.aiff')) {
        mimeType = 'audio/aiff';
      } else if (audioUri.endsWith('.aac')) {
        mimeType = 'audio/aac';
      } else if (audioUri.endsWith('.ogg')) {
        mimeType = 'audio/ogg';
      } else if (audioUri.endsWith('.flac')) {
        mimeType = 'audio/flac';
      }

      // Use Gemini's audio transcription
      return await GeminiService.transcribeAudio(audioUri, mimeType);
    } catch (error: any) {
      console.error('Gemini transcription error:', error);
      throw new Error(error.message || 'Failed to transcribe audio with Gemini');
    }
  }
}

/**
 * Manual transcription provider (user types it themselves)
 */
class ManualTranscriptionProvider implements TranscriptionProvider {
  getName(): string {
    return 'Manual';
  }

  isAvailable(): boolean {
    return true;
  }

  async transcribe(audioUri: string): Promise<string> {
    // This provider doesn't actually transcribe
    // It's used as a fallback when transcription fails
    throw new Error('Manual transcription - user must enter text themselves');
  }
}

class AudioTranscriptionServiceClass {
  private provider: TranscriptionProvider = new PlaceholderTranscriptionProvider();

  /**
   * Set the transcription provider
   */
  setProvider(provider: TranscriptionProvider): void {
    this.provider = provider;
  }

  /**
   * Get available providers
   */
  async getAvailableProviders(): Promise<TranscriptionProvider[]> {
    const providers: TranscriptionProvider[] = [
      new GeminiTranscriptionProvider(),
      new ManualTranscriptionProvider(),
    ];

    const available: TranscriptionProvider[] = [];
    for (const provider of providers) {
      if (provider instanceof GeminiTranscriptionProvider) {
        if (await provider.isAvailable()) {
          available.push(provider);
        }
      } else {
        if (provider.isAvailable()) {
          available.push(provider);
        }
      }
    }
    return available;
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioUri: string): Promise<string> {
    const isAvailable = this.provider instanceof GeminiTranscriptionProvider
      ? await this.provider.isAvailable()
      : this.provider.isAvailable();
    
    if (!isAvailable) {
      throw new Error(`Transcription provider "${this.provider.getName()}" is not available`);
    }

    try {
      return await this.provider.transcribe(audioUri);
    } catch (error: any) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Get current provider name
   */
  getCurrentProviderName(): string {
    return this.provider.getName();
  }
}

export const AudioTranscriptionService = new AudioTranscriptionServiceClass();

// Initialize with Gemini if available, otherwise placeholder
const geminiProvider = new GeminiTranscriptionProvider();
geminiProvider.isAvailable().then((available) => {
  if (available) {
    AudioTranscriptionService.setProvider(geminiProvider);
  } else {
    AudioTranscriptionService.setProvider(new PlaceholderTranscriptionProvider());
  }
}).catch(() => {
  AudioTranscriptionService.setProvider(new PlaceholderTranscriptionProvider());
});

