/**
 * Playwright Configuration for Meta-Agents Protected Config E2E Tests
 *
 * Production-grade configuration with:
 * - Real browser automation
 * - Screenshot capture at critical steps
 * - Detailed HTML reporting
 * - Video recording on failure
 * - Retry logic for flaky tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/meta-agents-protected-config.spec.ts',

  // Timeout configuration
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Test execution
  fullyParallel: false, // Run tests serially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry flaky tests
  workers: 1, // Single worker to avoid race conditions

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/e2e/playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/e2e/meta-agents-test-results.json'
    }],
    ['junit', {
      outputFile: 'tests/e2e/meta-agents-junit.xml'
    }],
    ['list']
  ],

  // Global setup
  use: {
    baseURL: 'http://localhost:5173',

    // Screenshot and video on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'], // For local testing
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server configuration - disabled since server is already running
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   timeout: 120000,
  //   reuseExistingServer: true,
  // },
});
