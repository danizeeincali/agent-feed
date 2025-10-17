import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/comment-counter-quick-validation.spec.ts'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/screenshots/playwright-report', open: 'never' }]
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    headless: true
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No web server - assume it's already running
});
