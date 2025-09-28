module.exports = {
  displayName: 'Agents Context Validation Tests',
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.js',
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.js'
  ],

  // Module name mapping for Next.js and React
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../$1',
    '^@components/(.*)$': '<rootDir>/../../frontend/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/../../pages/$1'
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!test-setup.js'
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: true,

  // Watch mode configuration
  watchman: false,

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};