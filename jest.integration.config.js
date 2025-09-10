module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: [
    '**/integration/**/*.test.{js,ts}',
    '**/integration/**/*.spec.{js,ts}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/helpers/test-setup.ts'
  ],
  testTimeout: 60000,
  maxWorkers: 1, // Integration tests should run serially
  verbose: true
};