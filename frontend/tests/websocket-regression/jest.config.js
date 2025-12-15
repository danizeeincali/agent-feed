module.exports = {
  displayName: 'WebSocket Regression Tests',
  preset: '@testing-library/jest-dom',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    '<rootDir>/**/*.(test|spec).(ts|tsx|js)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    '../../src/services/websocket*',
    '../../src/context/*WebSocket*',
    '../../src/components/*WebSocket*',
    '../../src/hooks/*WebSocket*',
    '../../src/utils/*websocket*',
    '!**/*.d.ts'
  ],
  testTimeout: 30000,
  maxWorkers: 1, // Sequential execution for WebSocket tests
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'websocket-regression-report.html',
      expand: true
    }]
  ]
};