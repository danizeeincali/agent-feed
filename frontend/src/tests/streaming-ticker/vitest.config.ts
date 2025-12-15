/**
 * Vitest Configuration for Streaming Ticker Tests
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./config/test-setup.ts'],

    // Global test patterns
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage'
    ],

    // Global configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{js,ts,jsx,tsx}',
        '!src/**/*.spec.{js,ts,jsx,tsx}',
        '!src/**/index.{js,ts}',
      ],
      exclude: [
        'node_modules/',
        'src/tests/',
        'coverage/',
        'dist/',
        '**/*.config.{js,ts}',
        '**/*.setup.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        // Specific thresholds for critical components
        'src/hooks/useAdvancedSSEConnection.ts': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/services/SSEConnectionManager.ts': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/utils/claude-output-parser.ts': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Hook timeouts
    hookTimeout: 10000,

    // Retry configuration
    retry: {
      // Retry failed tests once in CI
      ci: 1,
      // Don't retry in development
      default: 0,
    },

    // Reporter configuration
    reporter: process.env.CI ? ['default', 'junit'] : ['default'],

    // Output file for CI
    outputFile: {
      junit: './test-results.xml',
    },

    // Watch configuration
    watch: {
      clearScreen: false,
    },

    // Benchmark configuration
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      reporter: ['default', 'json'],
      outputFile: './benchmark-results.json',
    },

    // Pool configuration for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Log level
    logLevel: 'info',

    // Fail fast - stop on first failure in CI
    bail: process.env.CI ? 1 : 0,

    // Isolate tests
    isolate: true,

    // Run tests in sequence for debugging
    sequence: {
      concurrent: !process.env.DEBUG,
      shuffle: false,
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
      '@tests': path.resolve(__dirname, '.'),
    },
  },

  // Define configuration
  define: {
    'import.meta.vitest': 'undefined',
  },

  // Environment variables for tests
  envPrefix: ['VITE_', 'VITEST_'],
});