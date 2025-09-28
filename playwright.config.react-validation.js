import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/react-useeffect-fix-validation.spec.js'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'tests/screenshots/playwright-report' }],
    ['json', { outputFile: 'tests/screenshots/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'echo "Server already running"',
    port: 3001,
    reuseExistingServer: true,
  }
});