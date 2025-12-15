import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './frontend/tests/e2e',
  testMatch: ['**/production-validation.spec.ts'],
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 120000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'validation-screenshots/playwright-report' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: false
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'cd api-server && node server.js',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000
  }
});
