/**
 * Jest Configuration for Architecture Simplification Test Suite
 *
 * TDD London School approach for testing dual -> single architecture migration
 */

module.exports = {
  displayName: 'Architecture Simplification',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/setup/test-setup.js'
  ],
  collectCoverageFrom: [
    '../../pages/**/*.{js,jsx,ts,tsx}',
    '../../frontend/src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};