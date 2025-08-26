module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  testMatch: ['**/tests/terminal-streaming-tdd.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true
        }
      }
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.terminal-tdd.js'],
  collectCoverageFrom: [
    'src/services/terminal-streaming-service.ts',
    'src/services/claude-instance-terminal-websocket.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000
};