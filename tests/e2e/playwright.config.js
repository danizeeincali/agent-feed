import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for E2E Page Registration Tests
 *
 * These tests use REAL functionality:
 * - Real API server
 * - Real database
 * - Real file system
 * - Real browser automation
 */
export default defineConfig({
  testDir: '.',

  // Test execution
  fullyParallel: false, // Run sequentially to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid conflicts

  // Timeouts
  timeout: 120000, // 2 minutes per test (some tests are slow)
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Reporting
  reporter: [
    ['list'],
    ['html', { outputFolder: 'results/html-report', open: 'never' }],
    ['json', { outputFile: 'results/test-results.json' }],
    ['junit', { outputFile: 'results/junit.xml' }],
  ],

  // Test configuration
  use: {
    // No baseURL - tests start their own servers
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // Output
  outputDir: 'results/test-artifacts',

  // Projects - all tests run in Node.js context
  projects: [
    {
      name: 'e2e-tests',
      testMatch: ['*.test.js', '*.spec.ts'],
    },
  ],

  // No web server needed - tests manage their own servers
  webServer: undefined,
});
