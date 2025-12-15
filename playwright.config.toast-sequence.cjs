// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration - Toast Notification Sequence E2E
 *
 * Specialized configuration for testing the complete toast notification
 * flow from post creation through agent processing.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/toast-notification-sequence.spec.ts',

  // Maximum time for entire test suite
  timeout: 120000, // 2 minutes per test

  // Test execution settings
  fullyParallel: false, // Run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for toast testing

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-toast-sequence' }],
    ['json', { outputFile: 'tests/e2e/toast-sequence-results.json' }],
    ['junit', { outputFile: 'tests/e2e/toast-sequence-junit.xml' }]
  ],

  // Shared settings for all tests
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Debugging options
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'echo "Using existing server at http://localhost:3000"',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 5000,
  },

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});
