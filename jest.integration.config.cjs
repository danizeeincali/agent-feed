/**
 * Jest Configuration for Phase 1 Integration Tests
 *
 * Tests use REAL PostgreSQL database - no mocks!
 */

module.exports = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Node environment for database tests
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/phase1/integration/**/*.test.ts',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/phase1/setup.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/database/**/*.ts',
    '!src/database/**/*.d.ts',
    '!**/node_modules/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Timeout for integration tests (longer than unit tests)
  testTimeout: 30000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Verbose output
  verbose: true,

  // Display individual test results
  displayName: {
    name: 'INTEGRATION',
    color: 'blue',
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
  ],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/phase1/global-setup.ts',
  globalTeardown: '<rootDir>/tests/phase1/global-teardown.ts',
};