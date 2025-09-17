/**
 * Vitest Configuration for Avi DM Test Suite
 * SPARC Phase 5: Completion - Test Infrastructure
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup/vitest.setup.ts'],
    globals: true,
    css: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90
        },
        'src/components/posting-interface/': {
          branches: 85,
          functions: 90,
          lines: 92,
          statements: 92
        }
      }
    },

    // Performance settings
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,

    // File patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/tests/regression/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],

    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'src/tests/e2e/',
      'src/tests/performance/'
    ],

    // Reporters
    reporter: [
      'default',
      'json',
      'html',
      'junit'
    ],

    outputFile: {
      json: './test-results/vitest-results.json',
      junit: './test-results/vitest-junit.xml',
      html: './test-results/vitest-report.html'
    },

    // Watch mode settings
    watch: {
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'test-results/**'
      ]
    },

    // Pool settings for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@/components': path.resolve(__dirname, '../../components'),
      '@/services': path.resolve(__dirname, '../../services'),
      '@/utils': path.resolve(__dirname, '../../utils'),
      '@/tests': path.resolve(__dirname, '../')
    }
  },

  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.VITEST': 'true'
  }
});