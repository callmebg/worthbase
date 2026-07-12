module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-renderer$': 'react-test-renderer',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@testing-library/react-native|react-native-chart-kit|react-native-svg|react-native-paper|react-native-reanimated|react-native-gesture-handler|@gorhom|react-native-safe-area-context|react-native-screens|lucide-react-native|@react-native-community)',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        target: 'es2020',
        module: 'commonjs',
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
        types: ['jest'],
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
