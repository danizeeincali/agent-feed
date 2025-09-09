/**
 * Jest Configuration for London School TDD Draft Modal Workflow Tests
 * Optimized for mock-driven behavior verification and interaction testing
 */

module.exports = {
  displayName: 'London School TDD - Draft Modal Workflow',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/frontend/tests/tdd-london-school/draft-modal-workflow/**/*.test.{ts,tsx}'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/frontend/tests/tdd-london-school/draft-modal-workflow/setup.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/frontend/tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration (focused on interaction patterns)
  collectCoverageFrom: [
    'frontend/src/components/DraftManager.tsx',
    'frontend/src/components/PostCreatorModal.tsx', 
    'frontend/src/hooks/useDraftManager.ts',
    'frontend/src/services/DraftService.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds for London School TDD
  coverageThreshold: {
    global: {
      // London School focuses on behavior over coverage percentages
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    }
  },
  
  // Mock configuration for London School approach
  clearMocks: true,
  restoreMocks: true,
  
  // Timeout for async interactions
  testTimeout: 10000,
  
  // Reporters for interaction analysis
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/frontend/test-results',
      outputName: 'london-school-draft-modal-junit.xml',
      suiteName: 'London School TDD - Draft Modal Workflow'
    }]
  ],
  
  // Verbose output for interaction debugging
  verbose: true,
  
  // Mock warnings configuration
  silent: false,
  
  // Error handling for async tests
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Custom matcher configurations
  testMatch: [
    '<rootDir>/frontend/tests/tdd-london-school/draft-modal-workflow/**/*.test.{ts,tsx}'
  ],
  
  // Global configuration for London School TDD
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/frontend/tsconfig.json'
    }
  }
};