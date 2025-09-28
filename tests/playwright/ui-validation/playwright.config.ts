/**
 * Playwright Configuration for UI Validation
 * Optimized for comprehensive visual testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',

  /* Configuration for UI validation */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,

  /* Reporter configuration */
  reporter: [
    ['html', { outputDir: 'test-results/ui-validation-report' }],
    ['json', { outputFile: 'test-results/ui-validation-results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/ui-validation-junit.xml' }]
  ],

  /* Global test settings */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:3001',

    /* Browser settings */
    headless: false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    /* Capture settings */
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',

    /* Timeout settings */
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  /* Test timeout */
  timeout: 120000,
  expect: {
    timeout: 15000
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium-ui-validation',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: false,
          slowMo: 100
        }
      },
    },
    {
      name: 'firefox-ui-validation',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-ui-validation',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome-ui-validation',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari-ui-validation',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Output directory */
  outputDir: 'test-results/ui-validation-artifacts',
});