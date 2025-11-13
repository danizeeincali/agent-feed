/**
 * Playwright Configuration for UI/UX Validation
 * Separate config for manual validation tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '*.spec.js',

  /* Configuration for UI validation */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for manual validation
  workers: 1,

  /* Reporter configuration */
  reporter: [
    ['html', { outputDir: '../../docs/validation/playwright-report' }],
    ['json', { outputFile: '../../docs/validation/test-results.json' }],
    ['list']
  ],

  /* Global test settings */
  use: {
    /* Base URL for frontend testing */
    baseURL: 'http://localhost:5173',

    /* Browser settings for validation */
    headless: true, // Headless for CI/CD
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    /* Video and screenshot settings */
    video: 'off',
    screenshot: 'on', // Always take screenshots for validation

    /* Trace settings for debugging */
    trace: 'on',

    /* Timeout settings */
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  /* Test timeout settings */
  timeout: 60000,
  expect: {
    timeout: 10000
  },

  /* Browser projects for validation */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  /* Output directories */
  outputDir: '../../docs/validation/test-artifacts',
});
