/**
 * Vitest Configuration for Integration Tests
 * Optimized for real database testing and TDD workflow
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    globals: true,
    environment: 'node',

    // Test match patterns
    include: ['tests/**/*.test.js'],

    // Increased timeouts for integration tests (90s for real Claude SDK calls)
    testTimeout: 90000,
    hookTimeout: 90000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      reportsDirectory: './coverage',

      // Coverage thresholds (TDD best practices)
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,

      // Files to collect coverage from
      include: [
        'server.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        'services/**/*.js'
      ],

      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        '**/*.config.js',
        'dist/'
      ]
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Pool options for database tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Use single fork for database consistency
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});