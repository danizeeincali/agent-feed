/**
 * Comprehensive Playwright Configuration for Real Application Testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',

  /* Test organization */
  testMatch: [
    'comprehensive-app-validation.e2e.test.ts',
    'real-functionality-validation.e2e.test.ts'
  ],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 3,

  /* Maximum test timeout - increased for comprehensive tests */
  timeout: 90000, // 90 seconds for comprehensive tests

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', {
      open: 'never',
      outputFolder: 'test-results/comprehensive-e2e-report'
    }],
    ['json', {
      outputFile: 'test-results/comprehensive-e2e-results.json'
    }],
    ['junit', {
      outputFile: 'test-results/comprehensive-e2e-junit.xml'
    }],
    ['line'],
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action - increased for real data loading */
    actionTimeout: 30000,

    /* Global timeout for navigation - increased for real app */
    navigationTimeout: 30000,

    /* Additional options for comprehensive testing */
    locale: 'en-US',
    timezoneId: 'America/New_York',

    /* Enable more detailed logging */
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100, // Slow down for debugging
    },
  },

  /* Configure projects for comprehensive testing */
  projects: [
    /* Primary comprehensive test - Chrome */
    {
      name: 'comprehensive-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 900 }
      },
      testMatch: [
        'comprehensive-app-validation.e2e.test.ts',
        'real-functionality-validation.e2e.test.ts'
      ]
    },

    /* Real functionality validation - Firefox */
    {
      name: 'real-functionality-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 }
      },
      testMatch: 'real-functionality-validation.e2e.test.ts'
    },

    /* Mobile validation */
    {
      name: 'mobile-validation',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
      },
      testMatch: 'real-functionality-validation.e2e.test.ts'
    },

    /* Performance focused tests */
    {
      name: 'performance-validation',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: 'comprehensive-app-validation.e2e.test.ts',
      grep: /Performance|performance/
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Global setup and teardown */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  /* Expect configuration */
  expect: {
    /* Timeout for expect assertions - increased for real data */
    timeout: 15000,

    /* Threshold for visual comparisons */
    threshold: 0.3,

    /* Animation handling */
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
      animations: 'disabled',
    },
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 100
    },
  },

  /* Output directory */
  outputDir: 'test-results/comprehensive-artifacts/',

  /* Metadata */
  metadata: {
    'test-type': 'comprehensive-e2e-validation',
    'project': 'agent-feed',
    'environment': process.env.NODE_ENV || 'development',
    'coverage': '100-percent-real-functionality',
  },
});