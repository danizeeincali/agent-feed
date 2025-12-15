/**
 * Jest Configuration for Architectural Migration Tests
 *
 * PURPOSE: Specialized configuration for TDD architectural migration validation
 * SCOPE: React context, Next.js routing, component integration, and API testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '<rootDir>/react-context-validation.js',
    '<rootDir>/nextjs-routing-tests.js',
    '<rootDir>/component-integration-tests.js',
    '<rootDir>/api-integration-tests.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.js'
  ],

  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../frontend/src/$1',
    '^@/components/(.*)$': '<rootDir>/../../../frontend/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/../../../frontend/src/contexts/$1',
    '^@/hooks/(.*)$': '<rootDir>/../../../frontend/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/../../../frontend/src/utils/$1',
    '^@/services/(.*)$': '<rootDir>/../../../frontend/src/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        ['@babel/plugin-proposal-private-methods', { loose: true }],
        ['@babel/plugin-proposal-private-property-in-object', { loose: true }]
      ]
    }]
  },

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../../../frontend/src/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/../../../pages/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/../../../frontend/src/**/*.d.ts',
    '!<rootDir>/../../../frontend/src/**/*.stories.{js,jsx,ts,tsx}',
    '!<rootDir>/../../../frontend/src/**/*.test.{js,jsx,ts,tsx}',
    '!<rootDir>/../../../**/node_modules/**'
  ],

  coverageDirectory: '<rootDir>/coverage',

  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Coverage thresholds for architectural migration
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout for architectural tests
  testTimeout: 30000,

  // Globals for test environment
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error on deprecated features
  errorOnDeprecated: true,

  // Detect open handles (useful for debugging async operations)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      suiteName: 'Architectural Migration Tests'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/html-report',
      filename: 'report.html',
      pageTitle: 'Architectural Migration Test Report'
    }]
  ],

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/build/',
    '<rootDir>/.next/'
  ],

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/../../../node_modules',
    '<rootDir>/../../../frontend/node_modules'
  ],

  // Resolver configuration for Next.js compatibility
  resolver: undefined,

  // Runtime configuration
  runtime: undefined,

  // Snapshot configuration
  snapshotSerializers: [],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library))'
  ],

  // Test result processor
  testResultsProcessor: undefined,

  // Additional test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],

  // Preset (none - custom configuration)
  preset: undefined,

  // Projects (for multi-project setups)
  projects: undefined,

  // Root directory
  rootDir: __dirname,

  // Roots (test discovery roots)
  roots: [
    '<rootDir>'
  ],

  // Runner (default Jest runner)
  runner: 'jest-runner',

  // Test regex patterns
  testRegex: undefined,

  // Test sequences
  testSequencer: undefined,

  // Unmocked module patterns
  unmockedModulePathPatterns: [],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Additional Jest configuration for React Testing Library
  setupFiles: ['<rootDir>/polyfills.js']
};