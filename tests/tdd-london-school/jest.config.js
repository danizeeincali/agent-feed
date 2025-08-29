/**
 * Jest Configuration for TDD London School WebSocket Tests
 * Optimized for mock-driven development and behavior verification
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests
  roots: ['<rootDir>'],
  
  // Test file patterns
  testMatch: [
    '**/websocket/**/*.test.ts',
    '**/contracts/**/*.test.ts',
    '**/mocks/**/*.test.ts'
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds for London School TDD
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'websocket/**/*.ts',
    'contracts/**/*.ts',
    'mocks/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Mock settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@contracts/(.*)$': '<rootDir>/contracts/$1',
    '^@mocks/(.*)$': '<rootDir>/mocks/$1',
    '^@websocket/(.*)$': '<rootDir>/websocket/$1'
  },
  
  // Verbose output for behavior verification
  verbose: true,
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Reporters for detailed test feedback
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'tdd-london-junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: 'test-results',
      filename: 'tdd-london-report.html',
      expand: true
    }]
  ],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode settings
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/coverage/'],
  
  // Dependency mocking
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};