import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/settings-removal-validation',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  reporter: [
    ['html', { outputFolder: 'test-results/settings-removal-report' }],
    ['json', { outputFile: 'test-results/settings-removal-results.json' }],
    ['line'],
    ['allure-playwright']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true
  },

  projects: [
    {
      name: 'settings-removal-validation',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: false,
    timeout: 120000
  },
});