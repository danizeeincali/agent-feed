/**
 * Playwright Configuration for CLAUDE.md Protection Tests
 *
 * Dedicated configuration for running CLAUDE.md protection validation tests.
 * Optimized for testing protected agent functionality.
 *
 * Location: /workspaces/agent-feed/tests/e2e/playwright.config.claude-md.ts
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Test file patterns
  testMatch: [
    '**/claude-md-protection.spec.ts',
    '**/claude-md-functional.spec.ts',
  ],

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/reports/claude-md-protection' }],
    ['json', { outputFile: 'tests/reports/claude-md-protection/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for E2E tests
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.SKIP_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global timeout
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 5 * 1000,
  },

  // Output directory for test artifacts
  outputDir: 'tests/artifacts/claude-md-protection',
});
