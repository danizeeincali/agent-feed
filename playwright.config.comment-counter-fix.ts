import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/comment-counter-display.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,

  reporter: [
    ['html', { outputFolder: 'tests/playwright/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/playwright/comment-counter-results.json' }],
    ['junit', { outputFile: 'tests/playwright/comment-counter-junit.xml' }],
    ['list']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,

    launchOptions: {
      args: ['--disable-dev-shm-usage']
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: undefined
});
