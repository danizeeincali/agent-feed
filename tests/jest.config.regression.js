/**
 * Jest configuration for Claude AI Response System regression tests
 */

export default {
  displayName: 'Claude AI Response System - Regression Tests',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/regression/**/*.test.js',
    '<rootDir>/integration/**/*.test.js',
    '<rootDir>/api/**/*.test.js',
    '<rootDir>/performance/**/*.test.js',
    '<rootDir>/validation/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.js'
  ],
  
  // Transform configuration for ES modules
  preset: null,
  transform: {},
  
  // Timeout configuration
  testTimeout: 60000, // 60 seconds for Claude responses
  
  // Coverage configuration
  collectCoverageFrom: [
    'simple-backend.js',
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  coverageDirectory: 'tests/coverage/regression',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'tests/reports',
        outputName: 'regression-junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'tests/reports',
        filename: 'regression-test-report.html',
        openReport: false,
        pageTitle: 'Claude AI Response System - Regression Tests',
        logoImgPath: undefined,
        hideIcon: false
      }
    ]
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    'tests/utils'
  ],
  
  // Error handling
  bail: false, // Continue running tests even after failures
  errorOnDeprecated: true,
  
  // Performance
  maxWorkers: 4,
  
  // Environment variables for tests
  globals: {
    TEST_API_BASE_URL: 'http://localhost:3000',
    TEST_FRONTEND_URL: 'http://localhost:5173',
    TEST_TIMEOUT: 60000
  }
};