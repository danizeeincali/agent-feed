/**
 * Jest configuration for TDD London School Activities Tests
 * Focuses on behavior verification and real database operations
 * Isolated from other test configurations to avoid conflicts
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/tdd-london-activities/**/*.test.js'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/../frontend.backup.20250923_225610/',
    '<rootDir>/../frontend/tests/',
    '<rootDir>/../tests/unit/',
    '<rootDir>/../tests/integration/',
    '<rootDir>/../prod/tests/'
  ],
  collectCoverageFrom: [
    '<rootDir>/../src/database/activities/**/*.js',
    '<rootDir>/../pages/api/activities/**/*.js',
    '<rootDir>/../src/websockets/activities/**/*.js'
  ],
  coverageDirectory: '<rootDir>/tdd-london-activities/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [
    '<rootDir>/tdd-london-activities/jest.setup.js'
  ],
  testTimeout: 15000,
  verbose: true,
  // London School TDD: Focus on interaction testing
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Ignore conflicting mock directories
  modulePathIgnorePatterns: [
    '<rootDir>/../frontend/',
    '<rootDir>/../prod/',
    '<rootDir>/../frontend.backup.20250923_225610/'
  ],
  // Use only our test directory
  testPathIgnorePatterns: [
    '<rootDir>/unit/',
    '<rootDir>/integration/',
    '<rootDir>/e2e/',
    '<rootDir>/performance/',
    '<rootDir>/tdd-london-school/',
    '<rootDir>/browser-automation/',
    '<rootDir>/regression/',
    '<rootDir>/token-analytics/'
  ]
};