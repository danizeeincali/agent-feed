/**
 * Jest Configuration for WebSocket TDD London School Tests
 * Optimized for mock-driven testing and interaction verification
 */

module.exports = {
  displayName: 'WebSocket TDD London School Tests',
  testMatch: [
    '<rootDir>/tests/websocket/**/*.test.{js,ts,tsx}'
  ],
  
  // Test environment configuration
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/tests/websocket/setup/test-setup.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/hooks/useWebSocketSingleton.ts',
    'src/hooks/useConnectionManager.ts',
    'src/context/WebSocketSingletonContext.tsx',
    'src/components/ConnectionStatus.tsx',
    'src/services/connection/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}'
  ],
  
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Test timeout (increased for async operations)
  testTimeout: 10000,
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Mock modules that cause issues in test environment
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^socket\\.io-client$': '<rootDir>/tests/websocket/mocks/socket-io-mock.ts'
  },
  
  // Globals for test environment
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  
  // Test execution
  maxWorkers: '50%',
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Reporter configuration for TDD workflow
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/websocket/reports',
      outputName: 'websocket-tdd-results.xml',
      classNameTemplate: 'WebSocket.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › '
    }]
  ],
  
  // Test result processor for London School TDD reporting
  testResultsProcessor: '<rootDir>/tests/websocket/utils/tdd-results-processor.js'
};