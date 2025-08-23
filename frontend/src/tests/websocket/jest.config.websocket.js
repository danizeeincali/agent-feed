/**
 * TDD London School WebSocket Test Configuration
 * 
 * Specialized Jest configuration for WebSocket tests with proper mocking
 * and London School testing patterns support.
 */

module.exports = {
  displayName: 'WebSocket TDD London School Tests',
  testMatch: [
    '<rootDir>/src/tests/websocket/**/*.test.{ts,tsx}',
    '<rootDir>/src/tests/websocket/integration/**/*.test.{ts,tsx}'
  ],
  
  // Module resolution for TypeScript and React
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform TypeScript and JSX
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Test environment setup
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/websocket/setup/websocket-test-setup.ts'
  ],
  
  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/context/(.*)$': '<rootDir>/src/context/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Mock configurations
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  
  // London School TDD specific configurations
  collectCoverageFrom: [
    'src/hooks/useTerminalSocket.ts',
    'src/hooks/useWebSocketSingleton.ts',
    'src/context/WebSocketSingletonContext.tsx',
    'src/services/connection/connection-manager.ts',
    '!src/**/*.d.ts',
    '!src/**/*.config.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timing and performance
  testTimeout: 10000,
  
  // Clear mocks between tests (important for London School isolation)
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for interaction verification
  verbose: true,
  
  // Error handling
  bail: false,
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Globals for test environment
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  }
};