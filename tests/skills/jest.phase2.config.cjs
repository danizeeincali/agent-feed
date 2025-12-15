/**
 * Jest Configuration for Phase 2 Skills Tests
 *
 * Runs unit, integration, and agent config tests for Phase 2 implementation
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/phase2-skills.test.ts',
    '**/phase2-integration.test.ts',
    '**/phase2-agent-configs.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
        target: 'ES2020',
        module: 'commonjs'
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../$1'
  },
  collectCoverage: true,
  coverageDirectory: '<rootDir>/../../coverage/phase2-skills',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/reports',
        filename: 'phase2-skills-test-report.html',
        pageTitle: 'Phase 2 Skills Test Report',
        expand: true,
        openReport: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'phase2-skills-junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ]
};
