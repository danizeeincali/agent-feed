/**
 * London School TDD Configuration for Real Dynamic Pages Testing
 * 
 * CRITICAL: NO MOCKS ALLOWED
 * - All tests use real API endpoints
 * - Real component rendering with actual data
 * - Real user interactions and behaviors
 * - Focus on object collaboration and interactions
 */

module.exports = {
  displayName: 'TDD London School - Real Dynamic Pages',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Test file patterns - organized by London School categories
  testMatch: [
    '<rootDir>/**/*.test.{ts,tsx}',
    '<rootDir>/**/*.spec.{ts,tsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test-setup.ts'
  ],
  
  // Module mapping for React components
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': 'jest-transform-stub'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    '../../src/components/DynamicAgentPageRenderer.tsx',
    '../../src/services/api.ts',
    '../../src/hooks/**/*.ts',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // London School specific: Focus on interaction testing
  testTimeout: 30000, // Real API calls need more time
  
  // Real API testing environment variables
  setupFiles: [
    '<rootDir>/api-environment.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test reporters with detailed interaction logging
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reports',
      filename: 'london-school-dynamic-pages-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'London School TDD - Dynamic Pages Real API Tests'
    }]
  ],
  
  // Globals for real API testing
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};