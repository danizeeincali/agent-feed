/**
 * Jest Configuration for TDD Tests
 * Configured for London School TDD approach
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Module format
  preset: null,
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Test patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/tdd',
  coverageReporters: ['text', 'html', 'lcov'],
  collectCoverageFrom: [
    'api-server/**/*.js',
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.tdd.js'],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@api/(.*)$': '<rootDir>/api-server/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Test suites organization
  projects: [
    {
      displayName: 'API Server Tests',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration Tests', 
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Contract Tests',
      testMatch: ['<rootDir>/tests/contracts/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Error Scenario Tests',
      testMatch: ['<rootDir>/tests/error-scenarios/**/*.test.js'], 
      testEnvironment: 'node'
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 60000
    }
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/tdd/html-report',
      filename: 'report.html',
      expand: true
    }]
  ],
  
  // Mock configuration  
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ]
};
