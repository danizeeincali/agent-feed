/**
 * Jest Configuration for TDD Workflow Removal Test Suite
 *
 * This configuration is optimized for the SPARC Refinement phase testing
 */

module.exports = {
  displayName: 'TDD Workflow Removal Tests',
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/tdd-removal/**/*.test.{ts,tsx}',
    '<rootDir>/tests/tdd-removal/**/*.spec.{ts,tsx}'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-removal/setup.ts'
  ],

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@contexts/(.*)$': '<rootDir>/frontend/src/contexts/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1'
  },

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
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
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/**/index.ts',
    '!frontend/src/**/*.stories.{ts,tsx}',
    '!frontend/src/**/*.test.{ts,tsx}',
    '!frontend/src/**/*.spec.{ts,tsx}'
  ],

  coverageReporters: [
    'text',
    'html',
    'lcov',
    'clover'
  ],

  coverageDirectory: '<rootDir>/tests/tdd-removal/coverage',

  // Thresholds for TDD quality gates
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/frontend/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/frontend/.next/'
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/frontend/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/frontend/.next/'
  ],

  // Test timeout (increased for TDD workflow tests)
  testTimeout: 30000,

  // Verbose output for TDD feedback
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Report configuration for TDD tracking
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/tests/tdd-removal/reports',
        outputName: 'junit.xml',
        suiteName: 'TDD Workflow Removal Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ],
    [
      'jest-html-reporter',
      {
        outputPath: '<rootDir>/tests/tdd-removal/reports/test-report.html',
        pageTitle: 'TDD Workflow Removal Test Results',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ]
};