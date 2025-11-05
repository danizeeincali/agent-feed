import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Onboarding Post Order Validation Tests
 *
 * This configuration is specifically for testing the correct ordering
 * of onboarding posts in the UI after database reset.
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/onboarding-post-order-validation.spec.ts',

  /* Run tests serially for consistency */
  fullyParallel: false,
  workers: 1,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on failure for flaky tests */
  retries: 2,

  /* Maximum test timeout */
  timeout: 60000,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report-post-order' }],
    ['json', { outputFile: 'test-results/onboarding-post-order-results.json' }],
    ['list'],
  ],

  /* Shared settings */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:5173',

    /* Collect trace on first retry */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'on',

    /* Record video */
    video: 'on',

    /* Global timeout for each action */
    actionTimeout: 30000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,

    /* Viewport for consistent screenshots */
    viewport: { width: 1280, height: 720 },

    /* Browser context options */
    contextOptions: {
      // Ignore HTTPS errors for local development
      ignoreHTTPSErrors: true,
    },
  },

  /* Configure projects for testing */
  projects: [
    {
      name: 'onboarding-post-order-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // Ensure consistent rendering
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
    },
  ],

  /* Optional: Run local dev server before tests */
  // Commented out - assume servers are already running
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },

  /* Expect configuration */
  expect: {
    /* Timeout for expect assertions */
    timeout: 10000,
  },

  /* Output directory */
  outputDir: 'test-results/onboarding-post-order',

  /* Metadata */
  metadata: {
    'test-type': 'onboarding-post-order-validation',
    'project': 'agent-feed',
    'feature': 'post-ordering',
    'environment': process.env.NODE_ENV || 'development',
  },
});
