/**
 * Simple E2E Configuration for Basic Application Validation
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  testMatch: 'simple-app-validation.e2e.test.ts',

  fullyParallel: false, // Run sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for simplicity

  timeout: 120000, // 2 minutes per test

  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'test-results/simple-e2e-report' }],
    ['json', { outputFile: 'test-results/simple-e2e-results.json' }]
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },

  expect: {
    timeout: 10000,
  },

  outputDir: 'test-results/simple-e2e-artifacts/',
});