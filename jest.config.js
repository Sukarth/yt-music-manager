module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/types/**',
    '!src/screens/**', // Exclude screens from coverage - they require complex integration tests
    '!src/navigation/**', // Exclude navigation from coverage
    '!src/hooks/**', // Exclude hooks that depend on context
    '!src/store/AppContext.tsx', // Exclude context that has complex useEffect dependencies
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
