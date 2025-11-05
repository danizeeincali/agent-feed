import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for User Feedback Validation Tests
 *
 * This is a standalone configuration for running only the user feedback
 * validation tests without starting a new web server.
 *
 * Prerequisites:
 * - API server must be running on port 3001
 */

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/user-feedback-validation.spec.ts',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for screenshot consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent screenshots

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/user-feedback-results.json' }],
    ['junit', { outputFile: 'test-results/user-feedback-junit.xml' }],
    ['list']
  ],

  // Shared settings
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3001',

    // Screenshot settings - capture all
    screenshot: 'on',

    // Video settings
    video: 'on',

    // Trace settings for debugging
    trace: 'on',

    // Browser viewport
    viewport: { width: 1920, height: 1080 },

    // Action timeout
    actionTimeout: 30000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure single Chrome project
  projects: [
    {
      name: 'user-feedback-validation',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],

  // DO NOT start a web server - assume it's already running
  // This prevents the default behavior of starting npm run dev

  // Expect configuration
  expect: {
    timeout: 10000,
  },

  // Output directory
  outputDir: 'test-results/',

  // Metadata
  metadata: {
    'test-suite': 'user-feedback-validation',
    'project': 'agent-feed',
    'environment': 'development',
    'requires-server': 'http://localhost:3001',
  },
});
