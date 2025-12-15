/**
 * Jest Configuration for Agent Feed Enhancement System
 * TDD London School Approach - Mock-Driven Development
 */

export default {
  // Test environment settings
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Root directory for tests
  rootDir: '../',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/utils/test-setup.js'
  ],

  // Module resolution
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/agent_workspace/$1',
    '^@shared/(.*)$': '<rootDir>/agent_workspace/shared/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    '<rootDir>/agent_workspace/**/*.js',
    '!<rootDir>/agent_workspace/**/node_modules/**',
    '!<rootDir>/agent_workspace/**/*.test.js',
    '!<rootDir>/agent_workspace/**/*.config.js'
  ],

  // Coverage thresholds (enforcing high coverage)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './agent_workspace/shared/posting-intelligence/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './agent_workspace/shared/feed-intelligence/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test execution settings
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: '50%',

  // Mock settings (London School approach)
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Test timeout
  testTimeout: 30000,

  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/tests/coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Agent Feed Enhancement - Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/tests/coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Global test settings
  globals: {
    __TEST__: true,
    __VERSION__: '1.0.0'
  },

  // Test patterns to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/mocks/',
    '<rootDir>/tests/utils/'
  ]
};