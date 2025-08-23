/**
 * Jest Configuration for Terminal Tests
 * 
 * Specialized Jest configuration for terminal functionality testing
 * with appropriate coverage settings, test environment setup,
 * and mock configurations.
 */

const path = require('path');
const baseConfig = require('../../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  
  // Test identification patterns
  displayName: {
    name: 'Terminal Tests',
    color: 'cyan'
  },
  
  // Test file patterns specific to terminal functionality
  testMatch: [
    '<rootDir>/src/tests/unit/terminal/**/*.test.{ts,tsx}',
    '<rootDir>/src/tests/integration/terminal/**/*.test.{ts,tsx}',
    '<rootDir>/src/tests/e2e/terminal/**/*.test.{ts,tsx}'
  ],
  
  // Coverage configuration focused on terminal modules
  collectCoverageFrom: [
    'src/components/TerminalView.tsx',
    'src/hooks/useTerminalSocket.ts',
    'src/services/WebSocketTerminal.ts',
    'src/services/ProcessIOStreaming.ts',
    'src/services/ClaudeProcessManager.ts',
    'src/services/TerminalErrorHandler.ts',
    'src/services/TerminalConnectionManager.ts',
    'src/services/TerminalMessageHandler.ts',
    'src/services/TerminalRetryManager.ts',
    'src/types/terminal.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/tests/**/*'
  ],
  
  // Coverage thresholds for terminal functionality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/components/TerminalView.tsx': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/hooks/useTerminalSocket.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/WebSocketTerminal.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test environment setup
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3001'
  },
  
  // Setup files for terminal-specific testing
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/config/terminalTestSetup.ts',
    '<rootDir>/src/tests/setup/testSetup.ts'
  ],
  
  // Module name mapping for terminal tests
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/tests/utils/terminal/(.*)$': '<rootDir>/src/tests/utils/terminal/$1',
    '^@/tests/mocks/terminal/(.*)$': '<rootDir>/src/tests/mocks/terminal/$1'
  },
  
  // Transformations
  transform: {
    ...baseConfig.transform,
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        }
      }
    }]
  },
  
  // Mock patterns specific to terminal testing
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Test timeout configuration
  testTimeout: 10000,
  
  // Performance and memory settings for terminal tests
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/terminal',
  
  // Reporter configuration for terminal tests
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/terminal',
      outputName: 'terminal-junit.xml',
      suiteName: 'Terminal Tests'
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results/terminal',
      filename: 'terminal-test-report.html',
      pageTitle: 'Terminal Test Results'
    }]
  ],
  
  // Global configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [1343]
      },
      astTransformers: {
        before: [
          {
            path: 'node_modules/ts-jest/dist/transformers/path-mapping',
            options: {}
          }
        ]
      }
    },
    // Terminal-specific globals for testing
    TERMINAL_TEST_MODE: true,
    MOCK_WEBSOCKET_URL: 'ws://localhost:3000/test',
    MOCK_CLAUDE_INSTANCE: 'test-claude-instance'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Verbose output for debugging
  verbose: process.env.NODE_ENV === 'development',
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom test sequencer for terminal tests (ensures proper ordering)
  testSequencer: '<rootDir>/src/tests/config/terminalTestSequencer.js'
};

// Custom test sequencer to ensure proper test execution order
class TerminalTestSequencer {
  sort(tests) {
    // Define test execution order priority
    const testOrder = [
      'unit', // Unit tests first
      'integration', // Integration tests second
      'e2e' // E2E tests last
    ];
    
    return tests.sort((a, b) => {
      const aType = this.getTestType(a.path);
      const bType = this.getTestType(b.path);
      
      const aPriority = testOrder.indexOf(aType);
      const bPriority = testOrder.indexOf(bType);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same type, sort alphabetically
      return a.path.localeCompare(b.path);
    });
  }
  
  getTestType(testPath) {
    if (testPath.includes('/unit/')) return 'unit';
    if (testPath.includes('/integration/')) return 'integration';
    if (testPath.includes('/e2e/')) return 'e2e';
    return 'unknown';
  }
}

// Export the sequencer for Jest to use
const sequencerPath = path.join(__dirname, 'terminalTestSequencer.js');
require('fs').writeFileSync(sequencerPath, `
const { Sequencer } = require('@jest/test-sequencer');

class TerminalTestSequencer extends Sequencer {
  sort(tests) {
    const testOrder = ['unit', 'integration', 'e2e'];
    
    return tests.sort((a, b) => {
      const aType = this.getTestType(a.path);
      const bType = this.getTestType(b.path);
      
      const aPriority = testOrder.indexOf(aType);
      const bPriority = testOrder.indexOf(bType);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.path.localeCompare(b.path);
    });
  }
  
  getTestType(testPath) {
    if (testPath.includes('/unit/')) return 'unit';
    if (testPath.includes('/integration/')) return 'integration';
    if (testPath.includes('/e2e/')) return 'e2e';
    return 'unknown';
  }
}

module.exports = TerminalTestSequencer;
`);