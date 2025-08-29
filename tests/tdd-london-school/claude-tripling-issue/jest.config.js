/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx'
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/jest.config.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../frontend/src/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        lib: ['dom', 'dom.iterable', 'es6'],
        types: ['jest', 'node', '@testing-library/jest-dom']
      }
    }]
  },
  testTimeout: 10000,
  verbose: true,
  displayName: 'Claude Tripling Issue - TDD London School Tests'
};

module.exports = config;