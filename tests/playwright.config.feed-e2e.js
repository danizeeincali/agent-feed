/**
 * Simplified Playwright configuration for Feed E2E tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    '**/persistent-feed-system.test.js',
    '**/performance-validation.test.js',
    '**/accessibility-compliance.test.js'
  ],
  
  timeout: 90000,
  expect: { timeout: 10000 },
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  
  reporter: [
    ['html', { outputFolder: 'tests/reports/feed-e2e-html' }],
    ['json', { outputFile: 'tests/reports/feed-e2e-results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    testIdAttribute: 'data-testid'
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
  
  outputDir: 'tests/reports/test-results'
});