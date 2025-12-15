import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120000, // 120 second timeout for real Claude Code calls
  reporter: [
    ['html', { outputFolder: 'tests/e2e/playwright-report' }],
    ['json', { outputFile: 'tests/e2e/test-results.json' }],
    ['junit', { outputFile: 'tests/e2e/junit-results.xml' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    headless: true // Must be true in codespace environment
  },

  // Visual regression testing configuration
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide'
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});
