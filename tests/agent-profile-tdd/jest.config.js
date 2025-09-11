/**
 * Jest Configuration for Agent Profile TDD Tests
 * London School TDD Approach with Mock-Driven Development
 */

module.exports = {
  displayName: 'Agent Profile TDD Suite',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/?(*.)(test|spec).(js|jsx|ts|tsx)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1',
    '^@test/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: [
    '<rootDir>/helpers/test-setup.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  maxWorkers: 4,
  verbose: true,
  
  // London School TDD specific settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Mock patterns for external dependencies
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1',
    '^@test/(.*)$': '<rootDir>/$1',
    '^axios$': '<rootDir>/mocks/axios.mock.ts',
    '^socket.io-client$': '<rootDir>/mocks/socketio.mock.ts'
  },
  
  // Test execution order for London School approach
  testSequencer: '<rootDir>/helpers/london-school-sequencer.js'
};