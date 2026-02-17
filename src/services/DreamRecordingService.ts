import { AudioModule, setAudioModeAsync, AudioPlayer, AudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export interface RecordingResult {
  uri: string;
  duration: number; // in seconds
}

class DreamRecordingServiceClass {
  private recorder: AudioRecorder | null = null;
  private recordingTimer: NodeJS.Timeout | null = null;
  private maxDuration: number = 120; // 120 seconds max

  /**
   * Setup audio mode for recording
   */
  private async setupAudioMode(isRecording: boolean) {
    try {
      await setAudioModeAsync({
        allowsRecording: isRecording,
        playsInSilentMode: true,
      });
    } catch (error) {
      console.error('Failed to setup audio mode:', error);
    }
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await AudioModule.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await AudioModule.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start recording with optional duration limit
   */
  async startRecording(maxDurationSeconds: number = 120): Promise<void> {
    try {
      // Check permissions
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Microphone permission denied');
        }
      }

      // Cleanup any existing recording
      if (this.recorder && this.recorder.isRecording) {
        try {
          await this.recorder.stop();
        } catch (error) {
          console.warn('Failed to cleanup existing recording:', error);
        }
      }

      // Setup audio mode
      await this.setupAudioMode(true);

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create recording
      this.recorder = AudioModule.createAudioRecorder();
      if (this.recorder) {
        await this.recorder.record();
      }
      this.maxDuration = maxDurationSeconds;

      // Setup auto-stop timer
      this.recordingTimer = setTimeout(() => {
        this.stopRecording();
      }, maxDurationSeconds * 1000);

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      throw new Error(error.message || 'Failed to start recording');
    }
  }

  /**
   * Stop recording and return the result
   */
  async stopRecording(): Promise<RecordingResult | null> {
    try {
      // Clear timer
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }

      if (!this.recorder) {
        return null;
      }

      // Determine duration before stopping if possible
      const duration = this.recorder.currentTime;

      // Stop
      if (this.recorder.isRecording) {
        await this.recorder.stop();
      }

      const uri = this.recorder.uri;

      // Reset recording
      const result: RecordingResult = {
        uri: uri || '',
        duration,
      };

      this.recorder = null;

      return result;
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      throw new Error(error.message || 'Failed to stop recording');
    }
  }

  /**
   * Get current recording status
   */
  async getStatus(): Promise<{ isRecording: boolean; duration: number }> {
    if (!this.recorder) {
      return { isRecording: false, duration: 0 };
    }

    try {
      return {
        isRecording: this.recorder.isRecording || false,
        duration: this.recorder.currentTime || 0,
      };
    } catch (error) {
      return { isRecording: false, duration: 0 };
    }
  }

  /**
   * Play back a recorded audio file
   */
  async playRecording(uri: string): Promise<AudioPlayer> {
    try {
      await this.setupAudioMode(false);

      const player = AudioModule.createAudioPlayer(uri);
      player.play();

      return player;
    } catch (error: any) {
      console.error('Failed to play recording:', error);
      throw new Error(error.message || 'Failed to play recording');
    }
  }

  /**
   * Delete a recording file
   */
  async deleteRecording(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Save recording to permanent storage
   */
  async saveRecordingToStorage(sourceUri: string, filename: string): Promise<string> {
    try {
      // Create dream-catcher directory
      const dreamDir = `${FileSystem.documentDirectory}dream-catcher/`;
      await FileSystem.makeDirectoryAsync(dreamDir, { intermediates: true });

      const newPath = `${dreamDir}${filename}`;

      // Copy file to permanent location
      await FileSystem.copyAsync({
        from: sourceUri,
        to: newPath,
      });

      // Verify file was copied
      const fileInfo = await FileSystem.getInfoAsync(newPath);
      if (!fileInfo.exists) {
        throw new Error('Failed to save recording to permanent storage');
      }

      return newPath;
    } catch (error: any) {
      console.error('Failed to save recording:', error);
      throw new Error(error.message || 'Failed to save recording');
    }
  }
}

export const DreamRecordingService = new DreamRecordingServiceClass();

