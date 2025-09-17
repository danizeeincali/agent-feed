/**
 * Jest Configuration for CI Environment
 * Optimized for continuous integration pipelines
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,

  // CI-specific settings
  ci: true,
  silent: true, // Reduce console output in CI
  verbose: false, // Disable verbose output
  passWithNoTests: false, // Fail if no tests are found
  bail: 1, // Stop on first test failure
  forceExit: true, // Force Jest to exit after tests complete
  detectOpenHandles: true, // Detect handles preventing Jest from exiting

  // Performance optimizations for CI
  maxWorkers: '50%', // Use half of available CPU cores
  cache: false, // Disable cache in CI for clean runs
  clearMocks: true, // Clear mocks between tests
  resetMocks: true, // Reset mocks between tests
  restoreMocks: true, // Restore mocks after tests

  // Enhanced coverage for CI
  collectCoverage: true,
  coverageReporters: [
    'text-summary',
    'lcov',
    'json',
    'cobertura',
    'clover'
  ],

  // Stricter coverage thresholds for CI
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 92,
      statements: 92
    },
    'src/services/cost-tracking/': {
      branches: 92,
      functions: 96,
      lines: 96,
      statements: 96
    },
    'src/components/posting-interface/': {
      branches: 88,
      functions: 92,
      lines: 94,
      statements: 94
    }
  },

  // Test result outputs for CI
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
      addFileAttribute: true
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Claude SDK Analytics Test Report'
    }]
  ],

  // Timeout settings for CI
  testTimeout: 15000, // 15 seconds for individual tests
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/jest.ci.setup.js'
  ],

  // Environment variables for CI
  setupFiles: [
    '<rootDir>/src/tests/setup/env.ci.js'
  ]
};