import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Multi-State Comment Pills E2E tests
 *
 * Optimized for capturing all four processing states with screenshots:
 * - Waiting (yellow)
 * - Analyzing (blue)
 * - Responding (purple)
 * - Complete (green)
 */
export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'multi-state-comment-pills-e2e.spec.ts',

  // Run tests sequentially for consistent screenshot capture
  fullyParallel: false,

  // Fail build on test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker for deterministic results
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/playwright/reports/multi-state-pills' }],
    ['list'],
    ['json', { outputFile: 'tests/playwright/reports/multi-state-pills-results.json' }]
  ],

  // Output folder for test artifacts
  outputDir: 'tests/playwright/test-results/multi-state-pills',

  use: {
    // Base URL
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport for consistent screenshots
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Slight slowdown for better screenshot capture during state transitions
        launchOptions: {
          slowMo: 50,
        },
      },
    },

    // Optional: Firefox testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Optional: WebKit/Safari testing
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Global test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
