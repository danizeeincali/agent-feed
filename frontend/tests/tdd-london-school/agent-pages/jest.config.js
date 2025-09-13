/**
 * Jest Configuration for TDD London School Agent Pages Testing
 * Focus: Mock-driven development and behavior verification
 */

module.exports = {
  displayName: 'Agent Pages TDD London School',
  testMatch: [
    '<rootDir>/frontend/tests/tdd-london-school/agent-pages/**/*.test.js',
    '<rootDir>/frontend/tests/tdd-london-school/agent-pages/**/*.test.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/frontend/tests/tdd-london-school/agent-pages/helpers/test-setup.js'
  ],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@tests/(.*)$': '<rootDir>/frontend/tests/$1',
  },
  collectCoverageFrom: [
    'frontend/src/components/Agent*.{js,ts,jsx,tsx}',
    'frontend/src/pages/Agent*.{js,ts,jsx,tsx}',
    'frontend/src/hooks/useAgent*.{js,ts}',
    'frontend/src/services/Agent*.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  clearMocks: true,
  restoreMocks: true,
  // London School: Focus on interaction testing
  verbose: true,
  testTimeout: 10000,
  // Mock everything by default - London School approach
  automock: false,
  resetMocks: true,
};