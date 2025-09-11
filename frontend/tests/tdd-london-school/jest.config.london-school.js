export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  displayName: 'TDD London School',
  testMatch: [
    '<rootDir>/tests/tdd-london-school/**/*.test.{ts,tsx}',
    '<rootDir>/tests/tdd-london-school/**/*.spec.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-london-school/setup-tests.ts'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1'
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageDirectory: '<rootDir>/tests/tdd-london-school/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testResultsProcessor: '<rootDir>/tests/tdd-london-school/jest-html-reporters-attach/london-school-report',
  
  // London School specific settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Mock contamination detection
  testNamePattern: '^(?!.*mock contamination).*$',
  
  // Interaction verification
  testTimeout: 10000,
  
  // Behavior-driven test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ]
};