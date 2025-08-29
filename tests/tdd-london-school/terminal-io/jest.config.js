module.exports = {
  displayName: 'TDD London School - Terminal I/O',
  testMatch: ['**/terminal-io/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage/terminal-io',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.terminal-io.js'
  ],
  testEnvironment: 'node',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  
  // London School specific settings
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Mock configuration
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Custom reporters for interaction tracking
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/terminal-io',
      filename: 'terminal-io-test-report.html',
      expand: true,
      hideIcon: true,
      pageTitle: 'TDD London School - Terminal I/O Test Report'
    }]
  ],
  
  // Test timeout for complex mock interactions
  testTimeout: 10000
};