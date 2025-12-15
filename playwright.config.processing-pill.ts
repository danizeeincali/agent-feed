import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Comment Processing Pill E2E tests
 *
 * This config is optimized for testing the visual processing states
 * during comment submission with screenshot capture.
 */
export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'comment-processing-pill-e2e.spec.ts',

  // Run tests sequentially to avoid race conditions
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker for consistent results
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'tests/playwright/playwright-report' }],
    ['list'],
    ['json', { outputFile: 'tests/playwright/test-results.json' }]
  ],

  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Video settings
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Browser context options
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Slow down execution for better screenshot capture
        launchOptions: {
          slowMo: 100,
        },
      },
    },

    // Uncomment to test in Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Uncomment to test in WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
