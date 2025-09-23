/**
 * Jest configuration for SPARC Tailwind CSS validation tests
 */

module.exports = {
  displayName: 'SPARC Tailwind Validation',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/sparc-tailwind-validation/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'frontend/src/**/*.{js,ts,jsx,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**'
  ],
  coverageDirectory: '<rootDir>/tests/sparc-tailwind-validation/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/sparc-tailwind-validation/setup.js'
  ],
  testTimeout: 60000,
  verbose: true,
  bail: false,
  maxWorkers: 2
};