const path = require('path');

module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  roots: [
    '<rootDir>',
    '<rootDir>/../../frontend/src'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/../../frontend/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      isolatedModules: true,
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        jsx: 'react-jsx'
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1',
    '^components/(.*)$': '<rootDir>/../../frontend/src/components/$1',
    '^hooks/(.*)$': '<rootDir>/../../frontend/src/hooks/$1',
    '^utils/(.*)$': '<rootDir>/../../frontend/src/utils/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    '../../frontend/src/components/**/*.{ts,tsx,js,jsx}',
    '../../frontend/src/hooks/**/*.{ts,tsx,js,jsx}',
    '../../frontend/src/utils/**/*.{ts,tsx,js,jsx}',
    '!../../frontend/src/**/*.d.ts',
    '!../../frontend/src/**/*.mock.{ts,tsx,js,jsx}'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  testTimeout: 10000,
  maxWorkers: 1,
  verbose: true
};