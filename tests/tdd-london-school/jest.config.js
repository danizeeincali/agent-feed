/**
 * Jest Configuration for London School TDD Tests
 * 
 * Optimized for mock-driven testing and behavior verification
 */

module.exports = {
  displayName: 'TDD London School - Port Configuration',
  testMatch: [
    '<rootDir>/port-configuration/**/*.test.js',
    '<rootDir>/port-configuration/scenarios/**/*.test.js'
  ],
  
  // London School specific settings
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Mock and spy configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Coverage settings focused on interaction testing
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Focus coverage on service interactions
  collectCoverageFrom: [
    'port-configuration/services/**/*.js',
    '!port-configuration/fixtures/**',
    '!port-configuration/mocks/**'
  ],
  
  // Mock module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/port-configuration/services/$1',
    '^@fixtures/(.*)$': '<rootDir>/port-configuration/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/port-configuration/mocks/$1'
  },
  
  // Test environment
  testEnvironment: 'node',
  
  // Timeout for async operations
  testTimeout: 10000,
  
  // London School reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'london-school-results.xml'
    }],
    ['<rootDir>/custom-reporters/interaction-reporter.js', {
      outputFile: '<rootDir>/reports/interaction-report.json'
    }]
  ],
  
  // Global test configuration
  globals: {
    'LONDON_SCHOOL_MODE': true,
    'MOCK_VERIFICATION_ENABLED': true
  }
};