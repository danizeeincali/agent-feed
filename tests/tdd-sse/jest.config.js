module.exports = {
  displayName: 'TDD SSE Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1'
  },
  testTimeout: 10000,
  verbose: true,
  collectCoverageFrom: [
    'mocks/**/*.{js,jsx,ts,tsx}',
    '*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/*.config.js'
  ]
};