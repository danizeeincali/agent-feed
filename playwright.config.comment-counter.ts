import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/comment-counter-production-validation.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for validation
  workers: 1, // Sequential execution
  timeout: 60000, // 60 second timeout per test

  reporter: [
    ['html', { outputFolder: 'tests/e2e/screenshots/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/e2e/screenshots/test-results.json' }],
    ['junit', { outputFile: 'tests/e2e/screenshots/junit-results.xml' }],
    ['list']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,

    // Capture console logs
    launchOptions: {
      args: ['--disable-dev-shm-usage']
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Expect servers to be running
  webServer: undefined
});
