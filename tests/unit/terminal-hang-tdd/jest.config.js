/**
 * Jest Configuration for Terminal Hang TDD Tests
 * Optimized for London School TDD testing with proper timeouts and mocking
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/terminal-hang-tdd/**/*.test.{js,ts}'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test timeout (important for hang detection tests)
  testTimeout: 10000, // 10 seconds
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/jest.config.js',
    '!**/jest.setup.js'
  ],
  
  // Coverage thresholds (lenient for failing tests)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Mock configuration for London School TDD
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../src/$1'
  },
  
  // Global setup for terminal hang tests
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          target: 'es2019',
          module: 'commonjs'
        }
      }
    }
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // Watch mode configuration
  watchman: false,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test result processor
  testResultsProcessor: '<rootDir>/test-results-processor.js',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-report',
        filename: 'terminal-hang-tdd-report.html',
        expand: true,
        hideIcon: true,
        pageTitle: 'Terminal Hang TDD Test Report'
      }
    ]
  ]
};