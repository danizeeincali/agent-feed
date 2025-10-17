import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/playwright-report' }],
    ['json', { outputFile: 'tests/e2e/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true // Must be true in codespace environment
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  // webServer: [
  //   {
  //     command: 'cd frontend && npm run dev',
  //     port: 3001,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'node simple-backend.js',
  //     port: 3000,
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ],
});