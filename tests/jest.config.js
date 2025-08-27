module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'tests/test-helpers/**/*.js'
  ],
  verbose: true,
  testTimeout: 10000,
  rootDir: '..'
};