/**
 * Jest Configuration for TDD London School Claude Process Spawning Tests
 * 
 * Optimized for:
 * - Mock-driven testing approach
 * - Contract verification
 * - Process spawning isolation
 * - Node.js child_process testing
 */

module.exports = {
  // === TEST ENVIRONMENT ===
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: [
    '**/tests/tdd-london-school/**/claude-process-spawning-contracts.test.js',
    '**/tests/tdd-london-school/**/interactive-mode-validation.test.js'
  ],
  
  // === MOCK CONFIGURATION ===
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // === MODULE RESOLUTION ===
  moduleFileExtensions: ['js', 'json', 'node'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // === COVERAGE CONFIGURATION ===
  collectCoverage: true,
  coverageDirectory: 'tests/tdd-london-school/coverage/claude-spawning',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'simple-backend.js',
    'integrated-real-claude-backend.js',
    'src/process-lifecycle-manager.js',
    'src/terminal-integration.js',
    'src/services/**/*.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/dist/',
    '/mock/'
  ],
  
  // === SETUP AND TEARDOWN ===
  setupFilesAfterEnv: ['<rootDir>/tests/tdd-london-school/jest.setup.claude-spawning.js'],
  
  // === TIMEOUT CONFIGURATION ===
  testTimeout: 10000, // 10 seconds for process spawning tests
  
  // === VERBOSE OUTPUT FOR CONTRACT VERIFICATION ===
  verbose: true,
  
  // === MODULE MAPPING ===
  moduleNameMapper: {
    '^child_process$': '<rootDir>/tests/tdd-london-school/mocks/child_process.js',
    '^node-pty$': '<rootDir>/tests/tdd-london-school/mocks/node-pty.js'
  },
  
  // === TRANSFORM CONFIGURATION ===
  transform: {},
  
  // === TEST RESULT PROCESSOR ===
  testResultsProcessor: '<rootDir>/tests/tdd-london-school/processors/london-school-results.js',
  
  // === REPORTERS ===
  reporters: [
    'default',
    ['<rootDir>/tests/tdd-london-school/reporters/contract-reporter.js', {
      outputFile: 'tests/tdd-london-school/reports/contract-verification-report.json'
    }]
  ],
  
  // === GLOBALS FOR PROCESS TESTING ===
  globals: {
    'CLAUDE_TEST_MODE': true,
    'MOCK_CHILD_PROCESS': true,
    'TEST_WORKING_DIR': '/workspaces/agent-feed/prod'
  },
  
  // === ERROR HANDLING ===
  errorOnDeprecated: true,
  
  // === WATCH MODE (FOR DEVELOPMENT) ===
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Note: Custom matchers are defined in the main setup file
};