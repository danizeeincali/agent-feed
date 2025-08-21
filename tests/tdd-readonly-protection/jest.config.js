/**
 * Jest Configuration for TDD Read-Only Protection Tests
 * Optimized for London School testing with mock verification
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.js'
  ],
  
  // Coverage settings for behavior verification
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/jest.config.js',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds - 100% for TDD
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // Mock settings for London School
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  
  // Module mapping for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1'
  },
  
  // Verbose output for TDD feedback
  verbose: true,
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html',
      expand: true
    }]
  ],
  
  // Global test setup
  globals: {
    __DEV__: true,
    __TEST__: true
  },
  
  // Mock module patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Force exit for clean test runs
  forceExit: true,
  
  // Detect open handles for debugging
  detectOpenHandles: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/'
  ]
};