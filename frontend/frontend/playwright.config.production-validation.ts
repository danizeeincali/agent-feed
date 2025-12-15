import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Production Validation Testing
 * NO MOCKS - Real backend integration testing only
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/production-validation.spec.ts',

  // Timeout configuration for real API calls
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Run tests sequentially to avoid race conditions
  fullyParallel: false,
  workers: 1,

  // Retry failed tests once to account for network flakiness
  retries: 1,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'validation-results/playwright-report' }],
    ['json', { outputFile: 'validation-results/test-results.json' }],
    ['list'],
    ['junit', { outputFile: 'validation-results/junit.xml' }]
  ],

  // Global setup
  use: {
    // Base URL
    baseURL: 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'on',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1920, height: 1080 },

    // Enable JavaScript
    javaScriptEnabled: true,

    // Accept downloads
    acceptDownloads: true,

    // Increased timeout for navigation
    navigationTimeout: 30000,

    // Increased timeout for actions
    actionTimeout: 15000
  },

  // Test projects
  projects: [
    {
      name: 'production-validation-chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium'
      }
    }
  ],

  // Web server configuration (verify it's running, don't start it)
  webServer: undefined // We expect servers to already be running
});
