/**
 * Jest Configuration for TDD London School Tests
 * 
 * Optimized for integration testing with real API calls
 * and component behavior verification.
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Root directory for tests
  rootDir: '../..',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/tdd-london-school/**/*.test.{js,ts,tsx}',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-london-school/test-setup.js'
  ],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  
  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx', 
    'js',
    'jsx',
    'json'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },
  
  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library))'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Disable for faster test runs during debugging
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  
  // Test timeout - increased for integration tests with API calls
  testTimeout: 30000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/reports',
      outputName: 'tdd-london-school-results.xml',
      classNameTemplate: 'TDD-London.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › '
    }]
  ],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/config/global-setup.ts',
  globalTeardown: '<rootDir>/tests/config/global-teardown.ts',
  
  // Verbose output for debugging
  verbose: true,
  
  // Don't clear mocks between tests (we're using real API calls)
  clearMocks: false,
  restoreMocks: false,
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Error handling
  errorOnDeprecated: false,
  
  // Performance
  maxWorkers: 1, // Run tests serially to avoid API conflicts
  
  // Custom test environment options
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost'
  }
};