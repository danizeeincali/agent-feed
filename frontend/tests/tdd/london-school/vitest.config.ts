/**
 * Vitest Configuration for London School TDD Tests
 * Optimized for mock-driven testing with comprehensive coverage
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    name: 'london-school-tdd',
    
    // Test environment setup
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    
    // Test file patterns for London School tests
    include: [
      './unit/**/*.test.{ts,tsx}',
      './integration/**/*.test.{ts,tsx}',
      './e2e/**/*.test.{ts,tsx}',
      './regression/**/*.test.{ts,tsx}',
      './contracts/**/*.test.{ts,tsx}',
      './coordination/**/*.test.{ts,tsx}'
    ],
    
    // Exclude node_modules and build artifacts
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ],

    // Coverage configuration for London School methodology
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/london-school',
      
      // Include all source files for comprehensive coverage
      include: [
        'src/components/ClaudeInstanceManager*.tsx',
        'src/components/claude-instances/**/*.tsx',
        'src/components/claude-manager/**/*.tsx',
        'src/hooks/useClaudeInstances.ts',
        'src/hooks/useHTTPSSE.ts',
        'src/types/claude-instances.ts',
        'src/utils/nld-ui-capture.ts'
      ],
      
      // Exclude test files and utilities
      exclude: [
        '**/tests/**',
        '**/test-utils/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/node_modules/**'
      ],

      // Coverage thresholds for London School TDD
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Higher thresholds for critical files
        'src/components/ClaudeInstanceManager.tsx': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/hooks/useClaudeInstances.ts': {
          branches: 88,
          functions: 92,
          lines: 92,
          statements: 92
        }
      }
    },

    // Test execution configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Performance settings
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['default', 'json', 'html'],
    
    // Watch mode settings
    watch: {
      exclude: ['**/node_modules/**', '**/dist/**']
    },

    // Mock configuration  
    deps: {
      optimizer: {
        web: {
          include: [
            '@testing-library/jest-dom',
            '@testing-library/react', 
            '@testing-library/user-event'
          ]
        }
      }
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../../src'),
      '@tests': resolve(__dirname, '../../'),
      '@london-school': resolve(__dirname, './')
    }
  },

  // Define configuration for different test environments
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.VITEST': 'true',
    'process.env.TDD_METHODOLOGY': '"london-school"'
  }
});