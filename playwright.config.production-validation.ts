import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Production Validation
 *
 * Comprehensive E2E testing configuration for validating all 22 agents
 * in production with real browser testing and screenshot capture.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/complete-agent-production-validation.spec.ts'],

  // Run tests serially for consistent screenshots
  fullyParallel: false,
  workers: 1,

  // Retries for flaky network conditions
  retries: process.env.CI ? 2 : 1,

  // Timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/e2e/screenshots/all-agents-validation/playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/e2e/screenshots/all-agents-validation/test-results.json'
    }],
    ['list', { printSteps: true }],
  ],

  // Global test settings
  use: {
    // Base URL for testing
    baseURL: 'http://localhost:3001',

    // Trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'on',

    // Video on failure
    video: 'retain-on-failure',

    // Browser settings
    headless: true,
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,

    // Set user agent
    userAgent: 'Mozilla/5.0 (Production Validation Agent) Playwright/1.55',
  },

  // Test projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Uncomment for additional browser testing
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //   },
    // },

    // Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
  ],

  // Web server configuration
  webServer: {
    command: 'echo "Application should be running on port 3001"',
    port: 3001,
    reuseExistingServer: true,
    timeout: 5000,
  },
});
