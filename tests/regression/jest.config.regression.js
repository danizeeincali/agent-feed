/**
 * Jest Configuration for CSS Architecture Regression Tests
 *
 * Specialized configuration for running comprehensive CSS and integration tests
 * Optimized for testing React 18.2.0 + Tailwind CSS 4.x + Next.js 14.0.0
 */

module.exports = {
  // Test Environment
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3003',
    pretendToBeVisual: true,
    resources: 'usable'
  },

  // Root directory
  rootDir: '/workspaces/agent-feed',

  // Test paths
  testMatch: [
    '<rootDir>/tests/regression/**/*.test.js',
    '<rootDir>/tests/regression/**/*.test.ts'
  ],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@styles/(.*)$': '<rootDir>/styles/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/regression/jest.setup.regression.js'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', {
          runtime: 'automatic'
        }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties'
      ]
    }],
    '^.+\\.css$': 'jest-transform-stub',
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$': 'jest-transform-stub'
  },

  // File extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'css'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/performance/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@anthropic-ai|@tanstack))'
  ],

  // Coverage configuration
  collectCoverage: false, // Enable when needed
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/*.config.js',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageDirectory: '<rootDir>/tests/regression/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Test timeout
  testTimeout: 30000,

  // Globals
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Error handling
  errorOnDeprecated: true,
  detectOpenHandles: true,
  detectLeaks: false,

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/regression/reports',
      outputName: 'regression-test-results.xml',
      suiteName: 'CSS Architecture Regression Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Custom matchers and utilities
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/dist/'
  ],

  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-regression',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,

  // Mock configuration
  mockPathIgnorePatterns: [
    '<rootDir>/node_modules/'
  ],

  // Environment variables
  setupFiles: [
    '<rootDir>/tests/regression/jest.env.js'
  ],

  // Test sequencer for deterministic test order
  testSequencer: '<rootDir>/tests/regression/jest.sequencer.js',

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Bail configuration
  bail: false,

  // Silent mode
  silent: false,

  // Watch plugins (for development)
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};