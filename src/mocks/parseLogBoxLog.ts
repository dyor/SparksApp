/**
 * Mock parseLogBoxLog to bypass missing file in expo-metro-runtime
 */

export const parseLogBoxLog = (args: any[]) => {
    return {
        category: 'default',
        message: { content: args.map(arg => String(arg)).join(' ') },
        componentStack: '',
    };
};

export const parseInterpolation = (args: any[]) => {
    return {
        message: { content: args.map(arg => String(arg)).join(' ') },
    };
};

export default {
    parseLogBoxLog,
    parseInterpolation,
};
