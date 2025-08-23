/**
 * Jest Configuration for TDD London School Tests
 * 
 * Optimized for mock-driven testing with comprehensive coverage
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.{js,jsx}',
    '<rootDir>/**/*.spec.{js,jsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.js'
  ],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^@frontend/(.*)$': '<rootDir>/../frontend/src/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    '../src/**/*.{js,ts}',
    '../frontend/src/**/*.{js,jsx,ts,tsx}',
    '!../src/**/*.d.ts',
    '!../src/**/*.config.{js,ts}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Coverage thresholds for quality gates
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output for London School behavior verification
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/../src', '<rootDir>/../frontend/src'],
  
  // File extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ]
};