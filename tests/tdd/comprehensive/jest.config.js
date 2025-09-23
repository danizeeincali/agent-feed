/**
 * Jest Configuration for TDD London School Comprehensive Tests
 * 
 * Optimized for real data testing and comprehensive coverage.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/tdd/comprehensive/**/*.test.{ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd/comprehensive/jest.setup.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@api/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx,js,jsx}',
    'src/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx,js,jsx}',
    '!**/*.spec.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/.next/**'
  ],
  
  coverageDirectory: '<rootDir>/coverage/tdd-comprehensive',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    },
    // Specific thresholds for critical components
    './frontend/src/App.tsx': {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    },
    './frontend/src/components/FallbackComponents.tsx': {
      statements: 85,
      branches: 75,
      functions: 85,
      lines: 85
    },
    './src/app.ts': {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Verbose output for detailed test information
  verbose: true,
  
  // Fail fast - stop on first failure for quick feedback
  bail: false,
  
  // Maximum worker threads
  maxWorkers: '50%',
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global test setup
  globalSetup: '<rootDir>/tests/tdd/comprehensive/global-setup.js',
  globalTeardown: '<rootDir>/tests/tdd/comprehensive/global-teardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '/coverage/'
  ],
  
  // Watch mode ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '/coverage/'
  ],
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify on test completion
  notify: true,
  notifyMode: 'failure-change',
  
  // Custom reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/tdd-comprehensive/html-report',
      filename: 'test-report.html',
      openReport: false,
      pageTitle: 'TDD London School Comprehensive Test Report'
    }]
  ],
  
  // Performance monitoring
  detectOpenHandles: true,
  forceExit: true,
  
  // Custom test sequencer for optimized test order
  testSequencer: '<rootDir>/tests/tdd/comprehensive/test-sequencer.js'
};