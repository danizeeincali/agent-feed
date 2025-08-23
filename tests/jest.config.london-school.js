/**
 * Jest Configuration for London School TDD Mock Patterns
 * Focus: Optimized configuration for mock-driven testing
 * Approach: Emphasize collaboration testing over state testing
 */

module.exports = {
  // Test environment setup
  testEnvironment: 'node',
  
  // Clear mocks between tests (crucial for London School isolation)
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Test file patterns - London School test organization
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/tests/**/*-test.js'
  ],

  // Setup files for London School patterns
  setupFilesAfterEnv: [
    '<rootDir>/../tests/setup/london-school-setup.js'
  ],

  // Module resolution for mock utilities
  moduleNameMapping: {
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/mocks/(.*)$': '<rootDir>/tests/utils/$1',
    '^@/contracts/(.*)$': '<rootDir>/tests/utils/contract-definitions.js'
  },

  // Coverage configuration optimized for interaction testing
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/london-school',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Focus coverage on collaboration points, not implementation details
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/utils/mock-utilities.js', // Don't measure mock utility coverage
    '/tests/utils/contract-definitions.js', // Contract definitions are not implementation
    '/tests/setup/',
    '/.cache/',
    '/dist/'
  ],

  // London School specific coverage thresholds
  // Focus on interaction coverage rather than line coverage
  coverageThreshold: {
    global: {
      // Lower line coverage threshold since we focus on behavior, not lines
      lines: 70,
      // Higher function coverage since we test all public interfaces
      functions: 85,
      // Branch coverage for collaboration paths
      branches: 75,
      // Statement coverage for critical interactions
      statements: 70
    }
  },

  // Transform configuration for modern JavaScript/TypeScript
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // Global test configuration for London School approach
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          // Enable modern JavaScript features for testing
          target: 'es2020',
          module: 'commonjs',
          // Strict mode helps catch collaboration contract violations
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      }
    }
  },

  // Test timeout for async collaboration testing
  testTimeout: 10000,

  // Verbose output for detailed collaboration testing results
  verbose: true,

  // Custom reporters for London School pattern insights
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results/london-school',
        outputName: 'junit.xml',
        suiteName: 'London School TDD Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Watch mode configuration for TDD workflow
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Mock-specific configuration - removed invalid option

  // London School specific test environment variables
  testEnvironmentOptions: {
    // Node.js environment options
    NODE_ENV: 'test',
    // Mock behavior validation
    MOCK_VALIDATION: 'strict',
    // Collaboration pattern enforcement
    COLLABORATION_PATTERNS: 'enabled'
  },

  // Error handling for mock-driven tests
  errorOnDeprecated: true,
  
  // Collect coverage from source files only
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    // Exclude test utilities and mocks from coverage
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    // Exclude configuration files
    '!src/**/jest.config.js',
    '!src/**/webpack.config.js',
    // Exclude entry points that mainly coordinate
    '!src/index.js',
    '!src/main.ts'
  ],

  // Custom matchers for London School testing
  setupFiles: [
    '<rootDir>/tests/setup/custom-matchers.js'
  ],

  // Cache configuration
  cacheDirectory: '<rootDir>/.cache/jest',

  // Snapshot testing configuration (minimal use in London School)
  snapshotSerializers: [
    'jest-serializer-path'
  ],

  // Test result processor for collaboration analysis
  testResultsProcessor: '<rootDir>/tests/utils/collaboration-analyzer.js',

  // Project-specific configurations for different test types
  projects: [
    {
      displayName: 'Unit Tests - Import Resolution',
      testMatch: ['<rootDir>/tests/import-resolution/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/import-resolution-setup.js']
    },
    {
      displayName: 'Unit Tests - React Compilation',
      testMatch: ['<rootDir>/tests/react-compilation/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/react-compilation-setup.js']
    },
    {
      displayName: 'Unit Tests - Component Registry',
      testMatch: ['<rootDir>/tests/component-registry/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/component-registry-setup.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.js']
    },
    {
      displayName: 'Behavior Verification',
      testMatch: ['<rootDir>/tests/utils/behavior-verification.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/behavior-verification-setup.js']
    }
  ],

  // Performance optimization for mock-heavy tests
  maxWorkers: '50%',
  
  // Bail on first test failure for fast feedback (TDD approach)
  bail: false, // Set to true for strict TDD red-green-refactor
  
  // Display individual test results
  verbose: true,
  
  // Detect open handles to prevent hanging tests with mocks
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: false,
  
  // London School specific Jest extensions
  // Enable advanced mock features
  automock: false, // We manually mock for better control
  
  // Test order randomization for mock isolation verification
  randomize: true,

  // Custom test environment for London School patterns
  // testEnvironment: '<rootDir>/tests/setup/london-school-environment.js'
};