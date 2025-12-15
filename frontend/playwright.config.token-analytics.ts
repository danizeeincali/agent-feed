import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Token Analytics Validation Tests
 * Optimized for testing Avi DM conversations and token tracking
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/token-analytics-validation.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Single worker for sequential execution */
  workers: 1,

  /* Maximum test timeout - 3 minutes for full conversation flow */
  timeout: 180000,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report-token-analytics', open: 'never' }],
    ['json', { outputFile: 'test-results/token-analytics-results.json' }],
    ['junit', { outputFile: 'test-results/token-analytics-junit.xml' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace on failure */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action - extended for Avi DM */
    actionTimeout: 60000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,

    /* Viewport size */
    viewport: { width: 1920, height: 1080 },

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },

  /* Expect configuration */
  expect: {
    /* Timeout for expect assertions */
    timeout: 30000,
  },

  /* Output directory */
  outputDir: 'test-results/token-analytics',

  /* Metadata */
  metadata: {
    'test-type': 'token-analytics-validation',
    'project': 'agent-feed',
    'environment': process.env.NODE_ENV || 'development',
  },
});
