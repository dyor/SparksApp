import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecordedSwing } from '../components/RecordSwing';

const STORAGE_KEY = 'record-swing-spark-data';

export interface RecordSwingSettings {
    countdownSeconds: number;
    durationSeconds: number;
    autoPlay: boolean;
    voiceAssistantDurationSeconds: number;
    voiceControlDuringRecording: boolean;
}

export interface RecordSwingData {
    recordings: RecordedSwing[];
    settings: RecordSwingSettings;
}

export const RecordSwingStorageService = {
    async getData(): Promise<RecordSwingData> {
        const defaults: RecordSwingData = {
            recordings: [],
            settings: {
                countdownSeconds: 5,
                durationSeconds: 15,
                autoPlay: false,
                voiceAssistantDurationSeconds: 20,
                voiceControlDuringRecording: false
            }
        };
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                const parsed = JSON.parse(json);
                return {
                    recordings: parsed.recordings || [],
                    settings: { ...defaults.settings, ...parsed.settings }
                };
            }
        } catch (error) {
            console.error('Error loading Record Swing data:', error);
        }
        return defaults;
    },

    async saveData(data: RecordSwingData): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving Record Swing data:', error);
        }
    },

    async addRecording(recording: RecordedSwing): Promise<RecordSwingData> {
        const data = await this.getData();
        data.recordings = [recording, ...data.recordings];
        await this.saveData(data);
        return data;
    },

    async deleteRecording(timestamp: number): Promise<RecordSwingData> {
        const data = await this.getData();
        data.recordings = data.recordings.filter(r => r.timestamp !== timestamp);
        await this.saveData(data);
        return data;
    },

    async updateSettings(settings: Partial<RecordSwingSettings>): Promise<RecordSwingData> {
        const data = await this.getData();
        data.settings = { ...data.settings, ...settings };
        await this.saveData(data);
        return data;
    }
};
