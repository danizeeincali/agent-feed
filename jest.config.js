module.exports = {
  // Project configuration
  displayName: 'Agent Feed Test Suite',
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@config/(.*)$': '<rootDir>/config/$1'
  },
  
  // File patterns
  testMatch: [
    '<rootDir>/src/**/*.test.{js,ts}',
    '<rootDir>/tests/**/*.test.{js,ts}',
    '<rootDir>/tests/**/*.spec.{js,ts}'
  ],
  
  // Setup files - use simpler setup for unit tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/unitTestSetup.js'
  ],
  
  // TypeScript configuration for ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'es2020'
      }
    }],
    '^.+\\.js$': 'babel-jest'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.config.{js,ts}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test environment setup
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  
  // Test timeout
  testTimeout: 30000,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.git/'
  ],
  
  // Reporter configuration
  reporters: [
    'default'
  ],
  
  // Error handling
  errorOnDeprecated: true,
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};