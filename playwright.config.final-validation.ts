import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/final-both-fixes-validation.spec.ts',
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid conflicts
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  reporter: [
    ['html', { outputFolder: 'tests/playwright/reports/final-validation' }],
    ['json', { outputFile: 'tests/playwright/reports/final-validation-results.json' }],
    ['list'],
    ['junit', { outputFile: 'tests/playwright/reports/final-validation-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
