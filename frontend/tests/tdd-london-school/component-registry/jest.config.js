/**
 * Jest Configuration for Component Registry Testing
 * Optimized for TDD London School methodology with comprehensive validation
 */

module.exports = {
  displayName: 'Component Registry Tests',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.{ts,tsx}',
    '<rootDir>/**/*.spec.{ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.ts'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@components/(.*)$': '<rootDir>/../../../src/components/$1',
    '^@services/(.*)$': '<rootDir>/../../../src/services/$1',
    '^@types/(.*)$': '<rootDir>/../../../src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub'
  },
  
  // Transform settings
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '../../../tsconfig.json'
    }]
  },
  
  // Coverage settings
  collectCoverageFrom: [
    '../../../src/services/ComponentRegistry.ts',
    '../../../src/services/AgentComponentRegistry.ts',
    '../../../src/components/ui/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/node_modules/**'
  ],
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './unit/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './security/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout for complex validation scenarios
  testTimeout: 10000,
  
  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'component-registry-test-results.xml',
      suiteName: 'Component Registry Validation'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/reports',
      filename: 'component-registry-test-report.html',
      pageTitle: 'Component Registry Test Results',
      logoImgPath: undefined,
      hideIcon: true,
      expand: true,
      openReport: false
    }]
  ],
  
  // Global test environment variables
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Verbose output for detailed test information
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Handle unhandled promise rejections
  unhandledPromiseRejectionHandling: 'strict'
};