// Minimal Jest setup for utility function testing
// Custom matchers are built into @testing-library/react-native v12.4+

// Mock AsyncStorage (required for component tests)
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence console during tests to reduce noise
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
