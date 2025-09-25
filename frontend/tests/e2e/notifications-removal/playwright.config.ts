import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/notifications-removal',
  fullyParallel: false, // Sequential for consistent screenshots
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Single worker for consistent execution
  timeout: 120000,

  reporter: [
    ['html', { outputFolder: 'playwright-report-notifications' }],
    ['json', { outputFile: 'test-results/notifications-removal-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    {
      name: 'notifications-testing',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },

  expect: {
    timeout: 15000,
    threshold: 0.2,
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },

  outputDir: 'test-results/',
});