/**
 * Jest Configuration for Instance Endpoint Consistency Tests
 * 
 * Specialized configuration for testing endpoint consistency issues
 * with detailed reporting and proper mocking setup
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/unit/instance-endpoint-consistency/**/*.test.{js,ts}'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../$1',
    '^../../../frontend/src/(.*)$': '<rootDir>/../../frontend/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.js'
  ],
  
  // Mock modules
  modulePathIgnorePatterns: [
    '<rootDir>/../../node_modules/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'backend-endpoint-mock.ts',
    '**/*.test.ts'
  ],
  
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Verbose output for detailed analysis
  verbose: true,
  
  // Test timeout for async operations
  testTimeout: 10000,
  
  // Error reporting
  bail: false, // Continue running tests even if some fail
  
  // Custom reporters for detailed output
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'endpoint-consistency-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Endpoint Consistency Test Results'
      }
    ]
  ],
  
  // Global test setup
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          skipLibCheck: true
        }
      }
    }
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Test result formatting
  testResultsProcessor: '<rootDir>/test-results-processor.js'
};