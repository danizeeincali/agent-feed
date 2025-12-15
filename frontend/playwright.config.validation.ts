import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Quick Post Simplified validation tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'quick-post-simplified.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,

  reporter: [
    ['html', { outputFolder: 'playwright-report-validation' }],
    ['json', { outputFile: 'test-results/validation-results.json' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Don't start web server - assume it's already running
  webServer: undefined,
});
