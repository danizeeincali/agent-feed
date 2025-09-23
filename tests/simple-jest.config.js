/**
 * Simplified Jest Configuration for SPARC Agent Validation
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  collectCoverage: false,
  // setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js']
};