/**
 * Jest Configuration for TDD London School Tests
 * Specialized setup for outside-in TDD with mock-driven development
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Root directory for tests
  rootDir: '../..',
  
  // Test file patterns for London School TDD
  testMatch: [
    '<rootDir>/tests/tdd-london-school/**/*.test.{ts,tsx,js,jsx}',
    '<rootDir>/tests/tdd-london-school/**/*.spec.{ts,tsx,js,jsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/tdd-london-school/setup-tests.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/frontend/src/types/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/tdd-london-school/mocks/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/tdd-london-school/helpers/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ],
    '^.+\\.(js|jsx)$': ['babel-jest']
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration for London School TDD
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/tdd-london-school',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'frontend/src/components/UnifiedAgentPage.tsx',
    'frontend/src/utils/unified-agent-data-transformer.ts',
    'frontend/src/hooks/useAgentCustomization.ts',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/**/*.stories.{ts,tsx}',
    '!frontend/src/**/__tests__/**',
    '!frontend/src/**/node_modules/**'
  ],
  
  // Coverage thresholds for London School approach
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for core files
    'frontend/src/utils/unified-agent-data-transformer.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout for London School tests
  testTimeout: 10000,
  
  // Global setup and teardown (commented out until created)
  // globalSetup: '<rootDir>/tests/tdd-london-school/setup/global-setup.js',
  // globalTeardown: '<rootDir>/tests/tdd-london-school/setup/global-teardown.js',
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output for London School behavior verification
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Test result reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/tdd-london-school/html-report',
        filename: 'london-school-report.html',
        pageTitle: 'TDD London School Test Results',
        overwrite: true,
        expand: true,
        hideIcon: false
      }
    ]
  ],
  
  // Mock patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-router-dom|@testing-library)/)',
  ],
  
  // Global test variables for London School TDD
  globals: {
    TDD_APPROACH: 'london-school',
    MOCK_EXTERNAL_DEPENDENCIES: true,
    VERIFY_BEHAVIOR_NOT_STATE: true
  },
  
  // Setup for React Testing Library (commented out until created)
  // setupFiles: [
  //   '<rootDir>/tests/tdd-london-school/setup/react-testing-library.js'
  // ],
  
  // Test categories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  // Test retry configuration for flaky tests (not supported in this Jest version)
  // retry: 1,
  
  // Console output filtering
  silent: false,
  
  // Snapshot testing - removed problematic serializer
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};
