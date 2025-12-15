/**
 * Jest Configuration for London School TDD Tests
 * Specialized configuration for mock-driven testing
 */

module.exports = {
  displayName: 'London School TDD',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.ts'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/unit/**/*.test.{ts,tsx}',
    '<rootDir>/integration/**/*.test.{ts,tsx}',
    '<rootDir>/e2e/**/*.test.{ts,tsx}',
    '<rootDir>/regression/**/*.test.{ts,tsx}',
    '<rootDir>/contracts/**/*.test.{ts,tsx}',
    '<rootDir>/coordination/**/*.test.{ts,tsx}'
  ],

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../src/$1',
    '^@tests/(.*)$': '<rootDir>/../../$1',
    '^@london-school/(.*)$': '<rootDir>/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': 'jest-transform-stub'
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
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

  // Coverage configuration for London School methodology
  collectCoverage: true,
  collectCoverageFrom: [
    '../../../src/components/ClaudeInstanceManager*.tsx',
    '../../../src/components/claude-instances/**/*.{ts,tsx}',
    '../../../src/components/claude-manager/**/*.{ts,tsx}',
    '../../../src/hooks/useClaudeInstances.ts',
    '../../../src/hooks/useHTTPSSE.ts',
    '../../../src/types/claude-instances.ts',
    '../../../src/utils/nld-ui-capture.ts'
  ],

  coverageDirectory: './coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'json',
    'html',
    'lcov',
    'clover'
  ],

  // Coverage thresholds specific to London School TDD
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical files require higher coverage
    '../../../src/components/ClaudeInstanceManager.tsx': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    '../../../src/hooks/useClaudeInstances.ts': {
      branches: 88,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },

  // Test execution settings
  testTimeout: 15000,
  
  // Clear mocks automatically
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for behavior verification
  verbose: true,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-error-boundary|@tanstack|@testing-library)/)'
  ],

  // Mock configuration
  resetMocks: true,
  resetModules: true,

  // Error handling
  bail: false, // Continue running tests even if some fail
  
  // Test result processors - removed jest-sonar-reporter dependency
  
  // Global setup for London School TDD
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  },

  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html',
      filename: 'london-school-report.html',
      pageTitle: 'London School TDD Test Results',
      logoImgPath: undefined,
      hideIcon: true
    }],
    ['jest-junit', {
      outputDirectory: '../../test-results',
      outputName: 'london-school-junit.xml',
      suiteName: 'London School TDD Tests',
      includeConsoleOutput: true
    }]
  ],

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '.jest-cache',

  // Mock settings for London School
  fakeTimers: {
    enableGlobally: true
  },
  
  // Error detection
  detectLeaks: true,
  forceExit: true,

  // Watch mode settings
  watchPathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/node_modules/'
  ]
};