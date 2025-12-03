module.exports = {
    preset: 'react-native',
    transform: {
        '^.+\\.(js|ts|tsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|@unimodules|unimodules|react-navigation|@react-navigation)/)',
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.{ts,tsx}',
    ],
    testMatch: [
        '**/__tests__/**/*.test.{ts,tsx}',
        '**/?(*.)+(spec|test).{ts,tsx}'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'node',
};
