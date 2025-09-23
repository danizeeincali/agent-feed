/**
 * Jest configuration for CSS compilation tests
 */

module.exports = {
  displayName: 'CSS Compilation TDD Tests',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/css-compilation-tdd.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/setup-css-tests.js'
  ],
  testTimeout: 120000, // 2 minutes for build tests
  verbose: true,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/../coverage/css-compilation',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../postcss.config.cjs',
    '../tailwind.config.cjs',
    '../src/styles/**/*.css'
  ],
  moduleFileExtensions: ['js', 'json', 'css'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(tailwindcss|autoprefixer)/)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/../node_modules/',
    '<rootDir>/../.next/'
  ]
};