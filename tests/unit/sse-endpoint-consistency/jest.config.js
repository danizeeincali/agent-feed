/**
 * Jest Configuration for SSE Endpoint Consistency Tests
 * Configured to run comprehensive TDD tests that validate URL consistency
 */

module.exports = {
  displayName: 'SSE Endpoint Consistency Tests',
  testEnvironment: 'jsdom',
  
  // Test files
  roots: ['<rootDir>'],
  testMatch: [
    '**/*.test.ts',
    '**/*.test.js'
  ],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module name mapping (for absolute imports)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@frontend/(.*)$': '<rootDir>/../../../frontend/src/$1'
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'html', 'json-summary'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Test environment setup
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Timeout configuration
  testTimeout: 10000,
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        compilerOptions: {
          module: 'ESNext',
          target: 'ES2020',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true
        }
      }
    }
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/html-report',
      filename: 'sse-endpoint-consistency-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'SSE Endpoint Consistency Test Results'
    }]
  ]
};