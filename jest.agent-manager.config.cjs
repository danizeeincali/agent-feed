/**
 * Jest Configuration for Agent Manager Tabs Restructure Tests
 */

module.exports = {
  displayName: 'Agent Manager Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
  testMatch: [
    '**/loadAgentTools.test.js',
    '**/agent-api-tools.test.js'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/agent-manager',
  collectCoverageFrom: [
    'api-server/server.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  verbose: true,
  testTimeout: 10000,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './tests/reports',
        filename: 'agent-manager-backend-tests.html',
        pageTitle: 'Agent Manager Backend Tests',
        expand: true
      }
    ]
  ]
};
