/**
 * Jest Configuration for TDD London School Test Suite
 * 
 * Configured for comprehensive testing with zero white screen validation
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/testSetup.ts',
  ],
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/setup/__mocks__/fileMock.js',
    '^socket\\.io-client$': '<rootDir>/src/tests/websocket/__mocks__/socket-io-client.ts',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // File extensions to process
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.test.(ts|tsx|js|jsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts',
  ],
  
  // Coverage thresholds for TDD compliance
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical components
    './src/components/ErrorBoundary.tsx': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/components/FallbackComponents.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/App.tsx': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Test timeout for integration tests
  testTimeout: 10000,
  
  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Verbose output for TDD feedback
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Watch plugins for development (disabled for now)
  watchPlugins: [],
  
  // TypeScript configuration
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  
  // Test environment options for jsdom
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Custom test results processor for zero white screen validation
  testResultsProcessor: undefined,
  
  // Reporters for detailed test output
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        suiteName: 'TDD London School Test Suite',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
      },
    ],
  ],
  
  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/tests/setup/polyfills.js',
  ],
  
  // Maximum worker configuration for parallel testing
  maxWorkers: '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Bail configuration for CI/CD
  bail: process.env.CI ? 1 : 0,
  
  // Collect coverage only in CI or when explicitly requested
  collectCoverage: process.env.CI || process.env.COVERAGE,
  
  // Notification configuration (disabled)
  notify: false,
  
  // Snapshot configuration
  updateSnapshot: process.env.UPDATE_SNAPSHOTS ? true : false,
  
  // Custom resolver for complex module resolution
  resolver: undefined,
  
  // Test sequencer for deterministic test ordering
  testSequencer: '@jest/test-sequencer',
  
  // Transform ignore patterns - more comprehensive ESM support
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library/.*|react-router.*|@tanstack/.*|react-error-boundary|lucide-react|@xterm/.*|socket\\.io-client))',
  ],
  
  // Handle import.meta.env in tests
  globals: {
    'import.meta': {
      env: {
        VITE_WEBSOCKET_HUB_URL: 'http://localhost:3002'
      }
    }
  },
  
  // Extensibility for project-specific configurations
  projects: undefined,
  
  // Runner configuration
  runner: 'jest-runner',
  
  // Display name for multi-project setups
  displayName: 'TDD London School Test Suite',
  
  // Force exit for CI environments
  forceExit: process.env.CI ? true : false,
  
  // Detect open handles for debugging
  detectOpenHandles: process.env.NODE_ENV === 'development',
  
  // Detect leaked async operations
  detectLeaks: process.env.NODE_ENV === 'development',
};