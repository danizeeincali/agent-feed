/**
 * Jest Configuration for Escape Sequence Storm TDD Test Suite
 * 
 * This configuration is specifically designed to run tests that SHOULD FAIL initially,
 * demonstrating the current broken behavior before fixes are implemented.
 */

module.exports = {
  displayName: 'Escape Sequence Storm TDD',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/escape-sequence-storm/**/*.test.ts',
    '<rootDir>/tests/integration/escape-sequence-storm/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/escape-sequence-storm/jest.setup.js'
  ],
  
  // Module name mapping for proper imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Coverage configuration - track what needs to be fixed
  collectCoverageFrom: [
    'frontend/src/components/ClaudeInstanceManager.tsx',
    'frontend/src/hooks/useHTTPSSE.ts',
    'src/services/claude-instance-manager.ts',
    'src/services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/tests/escape-sequence-storm/coverage',
  
  // Test timeout - some tests simulate hanging conditions
  testTimeout: 15000,
  
  // Verbose output to see all failing tests clearly
  verbose: true,
  
  // Continue on errors to see all failures
  bail: false,
  
  // Reporter configuration for clear failure visibility
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/tests/escape-sequence-storm/reports',
      filename: 'escape-sequence-storm-test-report.html',
      pageTitle: 'Escape Sequence Storm TDD Test Report',
      logoImgPath: undefined,
      hideIcon: true,
      expand: true,
      openReport: false
    }]
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/escape-sequence-storm/global-setup.js',
  globalTeardown: '<rootDir>/tests/escape-sequence-storm/global-teardown.js',
  
  // Error handling
  errorOnDeprecated: false,
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Test result processor to analyze failures
  testResultsProcessor: '<rootDir>/tests/escape-sequence-storm/test-results-processor.js',
  
  // Custom test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Watch mode configuration for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Enable experimental features
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Increase max workers for faster execution
  maxWorkers: '50%',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/tests/escape-sequence-storm/.jest-cache'
};