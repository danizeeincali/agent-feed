/**
 * Playwright Configuration for Phase 3D UI/UX Validation
 *
 * Real browser testing with:
 * - Chromium, Firefox, WebKit
 * - Screenshot capture
 * - Accessibility testing
 * - Performance metrics
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/phase3d-ui-validation.spec.ts',

  // Timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Run tests in parallel
  fullyParallel: false, // Run sequentially for stability
  workers: 1,

  // Retry on failure
  retries: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report-phase3d', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'playwright-report-phase3d/results.json' }],
  ],

  // Screenshot and video settings
  use: {
    // Base URL
    baseURL: 'http://localhost:4173',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on failure
    trace: 'retain-on-failure',

    // Browser settings
    headless: true,
    viewport: { width: 1280, height: 720 },

    // Network settings
    actionTimeout: 15000,
  },

  // Web server configuration
  webServer: [
    {
      command: 'cd .. && npm start',
      url: 'http://localhost:3001/health',
      timeout: 120000,
      reuseExistingServer: true,
    },
  ],

  // Projects for different browsers
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
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Output folder for screenshots
  outputDir: 'playwright-report-phase3d/test-results',
});
