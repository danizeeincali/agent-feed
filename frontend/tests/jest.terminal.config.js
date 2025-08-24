/**
 * Jest Configuration for Terminal Double Typing Tests
 * 
 * Optimized for testing terminal components with proper mocking
 * and London School TDD methodology support.
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/terminal-double-typing.test.js',
    '**/tests/**/terminal-*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup/terminal-test-setup.js'
  ],
  
  // Module resolution and mocks
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    'xterm': '<rootDir>/__mocks__/xterm.js',
    '@xterm/addon-fit': '<rootDir>/__mocks__/xterm-addon-fit.js',
    '@xterm/addon-search': '<rootDir>/__mocks__/xterm-addon-search.js',
    '@xterm/addon-web-links': '<rootDir>/__mocks__/xterm-addon-web-links.js',
    'socket.io-client': '<rootDir>/__mocks__/socket.io-client.js'
  },
  
  // Simple transform for JS files
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Coverage configuration  
  collectCoverage: true,
  coverageDirectory: 'coverage/terminal',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/components/Terminal*.{js,jsx,ts,tsx}',
    'src/hooks/useTerminal*.{js,jsx,ts,tsx}',
    'src/services/websocket*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts'
  ],
  
  // Thresholds for terminal-specific coverage
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/components/Terminal.tsx': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/hooks/useTerminal.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Verbose output for detailed test results
  verbose: true,
  
  
  // Global test timeout
  testTimeout: 10000,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'terminal-double-typing-results.xml',
      suiteName: 'Terminal Double Typing Prevention Tests'
    }]
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ]
};