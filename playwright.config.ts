import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 30000, // 30 second timeout for tests
  reporter: [
    ['html', { outputFolder: 'tests/e2e/playwright-report' }],
    ['json', { outputFile: 'tests/e2e/test-results.json' }],
    ['junit', { outputFile: 'tests/e2e/junit-results.xml' }],
    ['line']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true // Must be true in codespace environment
  },

  // Visual regression testing configuration
  expect: {
    toHaveScreenshot: {
      threshold: 0.2, // Allow 20% diff for anti-aliasing
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
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // }
  ],

  // webServer: [
  //   {
  //     command: 'cd frontend && npm run dev',
  //     port: 5173,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'node api-server/server.js',
  //     port: 3000,
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ],
});