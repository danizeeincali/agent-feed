import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Enable detailed reporting for TDD validation
    reporter: ['verbose', 'json'],
    outputFile: 'tests/results/test-results.json',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    }
  }
});