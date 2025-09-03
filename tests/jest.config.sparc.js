module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/*sparc*.spec.ts', '**/*sparc*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.sparc.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../frontend/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    '../frontend/src/components/claude-manager/**/*.{ts,tsx}',
    '../frontend/src/hooks/**/*.{ts,tsx}',
    '!**/*.d.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/sparc',
  coverageReporters: ['text', 'json', 'html'],
  testTimeout: 10000,
  verbose: true
};