module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.js'],
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};