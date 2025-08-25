import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}', 
      'tests/mock-server/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'tests/e2e/**/*',
      'node_modules/**/*',
      'tests/docker/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'coverage/',
        '*.config.ts',
        '*.config.js'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Integration test specific configuration
    env: {
      NODE_ENV: 'test',
      TEST_ENV: process.env.TEST_ENV || 'test'
    },
    // Reporter configuration
    reporter: [
      'verbose',
      'junit',
      'json'
    ],
    outputFile: {
      junit: './test-results/unit-junit.xml',
      json: './test-results/unit-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  },
  // Define different test configurations
  environments: {
    unit: {
      test: {
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        environment: 'jsdom'
      }
    },
    integration: {
      test: {
        include: ['tests/integration/**/*.test.{ts,tsx}'],
        environment: 'node',
        testTimeout: 60000,
        hookTimeout: 60000
      }
    }
  }
});