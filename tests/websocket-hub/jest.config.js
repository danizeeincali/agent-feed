/**
 * Jest Configuration for WebSocket Hub Tests
 * Optimized for London School TDD with mock-heavy testing
 */

module.exports = {
  // Use Node.js environment for WebSocket testing
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/websocket-hub/**/*.test.ts',
    '**/tests/websocket-hub/**/*.spec.ts'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Setup files for test environment
  setupFilesAfterEnv: [
    '<rootDir>/tests/websocket-hub/setup/test-setup.ts'
  ],
  
  // Mock configuration for London School testing
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/websocket-hub/**/*.ts',
    '!src/websocket-hub/**/*.d.ts',
    '!src/websocket-hub/**/*.test.ts',
    '!src/websocket-hub/**/*.spec.ts'
  ],
  
  coverageDirectory: 'coverage/websocket-hub',
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds for TDD quality
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Display individual test results
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/websocket-hub',
      outputName: 'junit.xml'
    }]
  ],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/websocket-hub/tsconfig.json'
    }
  },
  
  // Mock WebSocket for testing
  moduleNameMapping: {
    '^ws$': '<rootDir>/tests/websocket-hub/mocks/__mocks__/ws.ts'
  }
};