module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/tdd-claude-interaction.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'tests/**/*.js',
    '!tests/node_modules/**',
    '!tests/**/node_modules/**'
  ],
  verbose: true,
  testTimeout: 15000,
  rootDir: '..',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.claude-interaction.js'],
  // Mock node modules that we want to control (corrected property name)
  moduleNameMapper: {
    '^child_process$': '<rootDir>/tests/__mocks__/child_process.js',
    '^node-pty$': '<rootDir>/tests/__mocks__/node-pty.js',
    '^fs$': '<rootDir>/tests/__mocks__/fs.js'
  },
  // Ignore problematic directories
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.claude/',
    '<rootDir>/prod/'
  ]
};