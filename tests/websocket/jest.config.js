/**
 * Jest Configuration for WebSocket Tests
 * Comprehensive testing configuration for all WebSocket stability tests
 */

module.exports = {
  displayName: 'WebSocket Stability Tests',
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.js',
    '<rootDir>/integration/**/*.test.js',
    '<rootDir>/load/**/*.test.js',
    '<rootDir>/regression/**/*.test.js',
    '<rootDir>/performance/**/*.test.js'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.js'],
  
  // Test timeout for WebSocket operations
  testTimeout: 120000, // 2 minutes for WebSocket tests
  
  // Coverage configuration
  collectCoverageFrom: [
    '../backend-terminal-server.js',
    '../frontend/src/hooks/useRobustWebSocket.ts',
    '../frontend/src/components/Terminal.tsx',
    '!**/node_modules/**'
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/results',
      outputName: 'websocket-test-results.xml',
      suiteName: 'WebSocket Stability Tests'
    }]
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Maximum worker processes
  maxWorkers: 4,
  
  // Global variables
  globals: {
    TERMINAL_PORT: 3002,
    TERMINAL_HOST: 'localhost'
  }
};