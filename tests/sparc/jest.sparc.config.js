/**
 * SPARC Test Configuration
 * Jest configuration for SPARC TDD validation tests
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Enable ES modules
  preset: 'es-modules',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {},

  // Test file patterns
  testMatch: [
    '**/tests/sparc/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'tests/sparc/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/services/AgentFileService.js',
    'src/api/agents.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],

  // Coverage thresholds for SPARC validation
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/tests/sparc/setup.js'],

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output for SPARC validation
  verbose: true,

  // Display individual test results
  displayIndividualTest: true,

  // Error handling
  errorOnDeprecated: true,

  // Custom reporters for SPARC validation
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './tests/sparc/coverage/html-report',
        filename: 'sparc-validation-report.html',
        pageTitle: 'SPARC Agent Loading Validation Report',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true
};