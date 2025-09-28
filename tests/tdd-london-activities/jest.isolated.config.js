/**
 * Isolated Jest configuration for TDD London School Activities Tests
 * Completely isolated from other test configurations
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: [
    '<rootDir>/*.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Completely ignore all other directories that might have conflicting configs
  testPathIgnorePatterns: [
    '<rootDir>/../../frontend/',
    '<rootDir>/../../frontend.backup.20250923_225610/',
    '<rootDir>/../../prod/',
    '<rootDir>/../../tests/',
    '<rootDir>/../../src/tests/',
    'node_modules'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/../../frontend/',
    '<rootDir>/../../frontend.backup.20250923_225610/',
    '<rootDir>/../../prod/',
    '<rootDir>/../../tests/unit/',
    '<rootDir>/../../tests/integration/',
    '<rootDir>/../../src/tests/'
  ],
  // No transform, just plain Node.js
  transform: {},
  // Ignore all __mocks__ directories from other test suites
  moduleNameMapper: {},
  // Don't collect coverage from other test directories
  collectCoverageFrom: [
    '<rootDir>/../../src/database/activities/**/*.js',
    '<rootDir>/../../pages/api/activities/**/*.js',
    '<rootDir>/../../src/websockets/activities/**/*.js'
  ]
};