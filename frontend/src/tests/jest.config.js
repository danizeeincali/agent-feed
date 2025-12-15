/**
 * Jest Configuration for Avi DM TDD Test Suite
 * Optimized for London School TDD with comprehensive coverage reporting
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/jest-setup.ts'
  ],
  
  // Module name mapping for path aliases and mocks
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/tests/mocks/fileMock.js'
  },
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', {
          runtime: 'automatic'
        }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        ['@babel/plugin-proposal-private-methods', { loose: true }]
      ]
    }]
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/**/*.test.{ts,tsx,js,jsx}',
    '<rootDir>/src/tests/**/*.spec.{ts,tsx,js,jsx}'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '\\.d\\.ts$'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/components/posting-interface/AviDMSection.tsx',
    'src/services/AviDMService.ts',
    'src/services/AviPersonalityService.ts',
    'src/services/WebSocketManager.ts',
    'src/services/HttpClient.ts',
    'src/services/ContextManager.ts',
    'src/services/SessionManager.ts',
    'src/services/ErrorHandler.ts',
    'src/services/SecurityManager.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/tests/**/*'
  ],
  
  // Coverage thresholds (London School TDD targets)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/posting-interface/AviDMSection.tsx': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/AviDMService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/src/tests/setup/global-teardown.js',
  
  // Verbose output for development
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Report configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'jest-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Avi DM Test Results'
    }]
  ],
  
  // Max workers for parallel testing
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Mock configuration
  mockMatch: ['<rootDir>/src/tests/mocks/**/*.mock.{ts,js}'],
  
  // Test sequences and priorities
  testSequencer: '<rootDir>/src/tests/setup/test-sequencer.js'
};
