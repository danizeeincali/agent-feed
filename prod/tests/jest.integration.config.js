/**
 * Jest Integration Test Configuration
 * TDD London School - Integration Testing with Contract Verification
 */

import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  
  // Integration test specific settings
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],

  // Setup for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/utils/test-setup.js',
    '<rootDir>/tests/utils/integration-setup.js'
  ],

  // Integration test timeout (longer for database/API calls)
  testTimeout: 60000,

  // Sequential execution for integration tests
  maxWorkers: 1,

  // Coverage for integration testing
  collectCoverageFrom: [
    '<rootDir>/agent_workspace/**/*.js',
    '<rootDir>/database/**/*.js',
    '<rootDir>/api/**/*.js',
    '!<rootDir>/**/node_modules/**',
    '!<rootDir>/**/*.test.js',
    '!<rootDir>/**/*.config.js'
  ],

  // Lower coverage threshold for integration (focuses on interaction verification)
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Mock behavior for integration tests
  clearMocks: false, // Preserve mocks between tests for contract verification
  restoreMocks: false,
  resetMocks: false,

  // Environment variables for integration tests
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/agent_feed_test',
    REDIS_URL: 'redis://localhost:6379/1',
    PORT: 3001
  },

  // Global setup and teardown for integration tests
  globalSetup: '<rootDir>/tests/utils/global-setup.js',
  globalTeardown: '<rootDir>/tests/utils/global-teardown.js',

  // Custom resolver for integration dependencies
  resolver: '<rootDir>/tests/utils/integration-resolver.js'
};