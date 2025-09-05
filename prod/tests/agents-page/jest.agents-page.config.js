/**
 * Jest Configuration for Agents Page Test Suite
 * London School TDD - Comprehensive Testing Configuration
 */

const baseConfig = require('../jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test directory specific to agents page
  testMatch: [
    '<rootDir>/tests/agents-page/unit/**/*.test.js',
    '<rootDir>/tests/agents-page/integration/**/*.test.js',
    '<rootDir>/tests/agents-page/performance/**/*.test.js',
    '<rootDir>/tests/agents-page/accessibility/**/*.test.js'
  ],
  
  // Display name for this test suite
  displayName: 'Agents Page Test Suite',
  
  // Setup files specific to agents page testing
  setupFilesAfterEnv: [
    '<rootDir>/tests/agents-page/utils/test-setup.js'
  ],
  
  // Module name mapping for agents page components
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/agents/(.*)$': '<rootDir>/src/agents/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/mocks/(.*)$': '<rootDir>/tests/agents-page/mocks/$1',
    '^@/factories/(.*)$': '<rootDir>/tests/agents-page/utils/test-factories.js'
  },
  
  // Coverage configuration specific to agents page
  collectCoverageFrom: [
    '<rootDir>/src/agents/**/*.js',
    '<rootDir>/src/components/agents/**/*.js',
    '<rootDir>/src/services/agent-discovery/**/*.js',
    '<rootDir>/src/hooks/use-agent*/**/*.js',
    '!<rootDir>/src/**/*.test.js',
    '!<rootDir>/src/**/*.config.js',
    '!<rootDir>/src/**/*.mock.js'
  ],
  
  // Coverage thresholds for agents page (high standards for TDD)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/agents/': {
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './src/services/agent-discovery/': {
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  
  // Test environment options for DOM testing
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    ...baseConfig.testEnvironmentOptions,
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  },
  
  // Transform configuration for modern JavaScript and React
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties'
      ]
    }],
    '^.+\\.css$': 'jest-transform-css',
    '\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-file'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'css'
  ],
  
  // Test timeout for async operations
  testTimeout: 15000,
  
  // Mock configuration for external dependencies
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // Mock CSS modules
    '\\.module\\.(css|scss)$': 'identity-obj-proxy',
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/agents-page/mocks/file-mock.js'
  },
  
  // London School TDD specific configurations
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Mock modules that don't work well in test environment
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Global test configuration
  globals: {
    __TEST__: true,
    __AGENTS_PAGE_TEST__: true,
    __TDD_LONDON_SCHOOL__: true
  },
  
  // Snapshot serializers for consistent testing
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Test result processing
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/tests/coverage/agents-page',
        filename: 'agents-page-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Agents Page - TDD Test Results',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/tests/coverage/agents-page',
        outputName: 'agents-page-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        usePathForSuiteName: 'true'
      }
    ]
  ],
  
  // Coverage reporting
  coverageDirectory: '<rootDir>/tests/coverage/agents-page',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Watch mode configuration
  watchman: true,
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Test patterns to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/performance/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Force exit after test completion
  forceExit: true,
  
  // Detect open handles to prevent hanging tests
  detectOpenHandles: true,
  
  // Performance optimization
  maxWorkers: '50%',
  
  // Test result caching
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/agents-page'
};