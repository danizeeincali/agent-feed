import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/avi-dm-debug-validation.spec.ts',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 120000, // 2 minutes for the entire test
  expect: {
    timeout: 10000
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'validation-screenshots/playwright-report' }],
    ['json', { outputFile: 'validation-screenshots/test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 30000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
    launchOptions: {
      slowMo: 500, // Slow down operations for better observation
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
