/**
 * Playwright Configuration - Toast Backend Events E2E Validation
 *
 * Tests complete toast notification sequence with real backend events:
 * - Post creation → Queue → Processing → Response complete
 * - WebSocket event capture
 * - Screenshot verification at each stage
 * - Timing validation
 * - Multi-viewport responsive testing
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/toast-backend-events-e2e.spec.ts',

  // Test configuration
  timeout: 180000, // 3 minutes for long-running agent tests
  expect: {
    timeout: 10000,
  },

  // Fail on first error for critical toast validation
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution for WebSocket stability

  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/e2e/toast-backend-results.json' }],
    ['junit', { outputFile: 'tests/e2e/toast-backend-junit.xml' }],
    ['html', { outputFolder: 'tests/e2e/toast-backend-report', open: 'never' }]
  ],

  // Global setup
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',

    // Extended timeouts for real backend
    navigationTimeout: 30000,
    actionTimeout: 15000,

    // Viewport
    viewport: { width: 1920, height: 1080 },

    // Network settings
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },

    // Ignore HTTPS errors for local dev
    ignoreHTTPSErrors: true,
  },

  // Test projects for different scenarios
  projects: [
    {
      name: 'toast-sequence-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'toast-sequence-tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'toast-sequence-mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
