/**
 * Jest Configuration for Avi DM Component Tests
 * Optimized for TDD London School approach with comprehensive mocking
 */

module.exports = {
  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/components/posting-interface/__tests__/test-setup.ts',
    '@testing-library/jest-dom'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/components/posting-interface/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/__tests__/EnhancedPostingInterface.test.tsx'
  ],

  // Transform TypeScript and JSX
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module name mapping for path aliases and assets
  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',

    // Style files
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',

    // Static assets
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg|mp4|webm)$': '<rootDir>/src/components/posting-interface/__tests__/__mocks__/fileMock.js',

    // External modules that need mocking
    '^framer-motion$': '<rootDir>/src/components/posting-interface/__tests__/__mocks__/framerMotionMock.js',
    '^lucide-react$': '<rootDir>/src/components/posting-interface/__tests__/__mocks__/lucideReactMock.js'
  },

  // File extensions Jest should process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/posting-interface/**/*.{ts,tsx}',
    'src/components/EnhancedPostingInterface.tsx',
    'src/components/StreamingTicker.tsx',
    '!src/components/**/*.d.ts',
    '!src/components/**/*.stories.{ts,tsx}',
    '!src/components/**/__tests__/**',
    '!src/components/**/__mocks__/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Specific thresholds for critical components
    'src/components/posting-interface/AviDirectChatSDK.tsx': {
      branches: 95,
      functions: 100,
      lines: 98,
      statements: 98
    },
    'src/components/EnhancedPostingInterface.tsx': {
      branches: 92,
      functions: 100,
      lines: 96,
      statements: 96
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage/avi-dm-components',

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false
    }
  },

  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '\\.d\\.ts$'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(react-error-boundary|@tanstack|framer-motion|lucide-react)/)'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporters for different output formats
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/avi-dm-components/html-report',
      filename: 'test-report.html',
      pageTitle: 'Avi DM Components Test Report',
      logoImgPath: undefined,
      hideIcon: true,
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    ['jest-junit', {
      outputDirectory: './coverage/avi-dm-components/',
      outputName: 'junit.xml',
      suiteName: 'Avi DM Components Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Error handling
  errorOnDeprecated: true,
  verbose: true,

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Snapshot configuration
  snapshotSerializers: [
    '@testing-library/jest-dom/serializers'
  ],

  // Mock configuration
  automock: false,
  resetMocks: true,
  resetModules: false,

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Performance timing
  slowTestThreshold: 5,

  // Custom test results processor
  testResultsProcessor: undefined,

  // Bail configuration for CI/CD
  bail: process.env.CI ? 1 : 0,

  // Force exit for CI/CD
  forceExit: process.env.CI ? true : false,

  // Detect open handles in CI
  detectOpenHandles: process.env.CI ? true : false,

  // Projects for different test types (if needed)
  projects: undefined,

  // Run tests serially in CI for stability
  runInBand: process.env.CI ? true : false,

  // Additional setup for specific test types
  setupFiles: [
    '<rootDir>/src/components/posting-interface/__tests__/__mocks__/globalMocks.js'
  ]
};