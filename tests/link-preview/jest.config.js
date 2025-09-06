export default {
  displayName: 'Link Preview Tests',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testMatch: [
    '<rootDir>/unit/**/*.test.js',
    '<rootDir>/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/services/LinkPreviewService.js',
    'src/database/DatabaseService.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  clearMocks: true,
  restoreMocks: true
};