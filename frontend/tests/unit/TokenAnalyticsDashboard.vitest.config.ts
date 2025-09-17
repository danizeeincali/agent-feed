/**
 * Vitest Configuration for TokenAnalyticsDashboard Tests
 *
 * Specialized configuration to ensure proper testing of Chart.js components
 * and dynamic imports. This configuration will help tests FAIL if there are
 * import or dependency issues.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment configuration
    environment: 'jsdom',
    globals: true,

    // Setup files
    setupFiles: [
      path.resolve(__dirname, 'TokenAnalyticsDashboard.test.setup.ts'),
    ],

    // Coverage configuration for TokenAnalyticsDashboard
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/TokenAnalyticsDashboard.tsx',
        'src/components/TokenAnalyticsDashboard/**/*',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test timeout configuration
    testTimeout: 10000, // 10 seconds for chart rendering tests
    hookTimeout: 10000,

    // Test file patterns
    include: [
      '**/TokenAnalyticsDashboard*.test.{ts,tsx}',
      '**/TokenAnalyticsDashboard*.spec.{ts,tsx}',
    ],

    // Module resolution for chart dependencies
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      // Ensure proper resolution of chart dependencies
      'chart.js': path.resolve(__dirname, '../../node_modules/chart.js'),
      'react-chartjs-2': path.resolve(__dirname, '../../node_modules/react-chartjs-2'),
      'chartjs-adapter-date-fns': path.resolve(__dirname, '../../node_modules/chartjs-adapter-date-fns'),
      'date-fns': path.resolve(__dirname, '../../node_modules/date-fns'),
    },

    // Pool options for better test isolation
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      ['html', { outputFile: 'test-results/TokenAnalyticsDashboard-report.html' }],
    ],

    // Output directory for test results
    outputFile: {
      json: 'test-results/TokenAnalyticsDashboard-results.json',
    },

    // Retry configuration for flaky chart tests
    retry: 2,

    // Custom test environment variables
    env: {
      NODE_ENV: 'test',
      VITE_TEST_MODE: 'true',
      VITEST_CHART_TESTING: 'true',
    },

    // Dependencies to include/exclude from optimization
    deps: {
      // Include chart.js in transformation for better test compatibility
      include: [
        'chart.js',
        'react-chartjs-2',
        'chartjs-adapter-date-fns',
        'date-fns',
        '@testing-library/react',
        '@testing-library/jest-dom',
      ],
      // Exclude heavy dependencies that don't need transformation
      exclude: [
        'node_modules',
      ],
    },

    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Snapshot configuration
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: false,
    },

    // Custom matchers and utilities
    expect: {
      // Add custom matchers for chart testing
      poll: {
        timeout: 5000,
        interval: 100,
      },
    },
  },

  // Vite-specific configuration for testing
  define: {
    global: 'globalThis',
    'process.env': {},
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },

  // Optimizations for test performance
  optimizeDeps: {
    include: [
      'chart.js',
      'react-chartjs-2',
      'chartjs-adapter-date-fns',
      'date-fns',
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ],
  },

  // Build configuration for test environment
  build: {
    // Enable source maps for debugging test failures
    sourcemap: true,

    // Target configuration for test environment
    target: 'node18',

    // Rollup options for test builds
    rollupOptions: {
      external: [
        // Don't bundle these in tests
        'chart.js/auto',
      ],
    },
  },
});