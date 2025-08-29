module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testMatch: ['**/*.test.js', '**/*test.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/jest.config.js',
    '!**/test-setup.js'
  ],
  verbose: true,
  testTimeout: 10000
};