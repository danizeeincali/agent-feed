/**
 * Jest Configuration for TDD London School Tests
 * Optimized for behavior verification and extensive mocking
 */

import type { Config } from 'jest';

const config: Config = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '../',

  // Test file patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.ts',
    '<rootDir>/integration/**/*.test.ts',
    '<rootDir>/acceptance/**/*.test.ts'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/config/jest.setup.ts'
  ],

  // TypeScript transformation
  preset: 'ts-jest',

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@tests/(.*)$': '<rootDir>/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
    '^@contracts/(.*)$': '<rootDir>/contracts/$1'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  // Coverage thresholds (London School focuses on interaction coverage)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },

  // Files to include in coverage
  collectCoverageFrom: [
    '<rootDir>/../../../src/**/*.{ts,tsx}',
    '!<rootDir>/../../../src/**/*.d.ts',
    '!<rootDir>/../../../src/**/*.test.{ts,tsx}',
    '!<rootDir>/../../../src/**/index.ts'
  ],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          // Enable decorators for mocking frameworks
          experimentalDecorators: true,
          emitDecoratorMetadata: true,

          // Strict type checking for better test reliability
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,

          // Module resolution
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,

          // Target environment
          target: 'ES2020',
          lib: ['ES2020', 'DOM']
        }
      }
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

  // Test timeout (London School tests can be complex)
  testTimeout: 30000,

  // Verbose output for behavior verification
  verbose: true,

  // Clear mocks between tests (important for London School)
  clearMocks: true,
  restoreMocks: true,

  // Global test configuration
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Test result processor for better output
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: true,
        pageTitle: 'TDD London School Test Results',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › '
      }
    ]
  ],

  // Error handling
  errorOnDeprecated: true,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/.jest-cache/',
    '<rootDir>/node_modules/'
  ],

  // Test execution configuration
  maxWorkers: '50%',

  // Silent mode for cleaner output during development
  silent: false,

  // Detect open handles (important for cleanup verification)
  detectOpenHandles: true,
  forceExit: false,

  // London School specific configurations
  testRunner: 'jest-circus/runner',

  // Custom matchers for behavior verification
  setupFiles: [
    '<rootDir>/config/jest.globals.ts'
  ],

  // Snapshot configuration
  snapshotSerializers: [
    'jest-serializer-ansi-escapes',
    '<rootDir>/config/custom-serializers.ts'
  ]
};

export default config;