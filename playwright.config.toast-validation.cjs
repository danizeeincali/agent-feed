/**
 * Playwright Configuration for Toast UI Feedback Validation
 *
 * Specialized configuration for testing toast notifications and UI badges
 * with appropriate timeouts for WebSocket delays.
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './tests/playwright',

  // Test match pattern - only run toast validation tests
  testMatch: '**/toast-ui-feedback-validation.spec.ts',

  // Timeout configuration
  timeout: 60000, // 60 seconds per test (WebSocket delays)
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Test execution
  fullyParallel: false, // Run sequentially for WebSocket tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid WebSocket conflicts

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'docs/validation/toast-validation-results.json' }],
    ['junit', { outputFile: 'docs/validation/toast-validation-junit.xml' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: 'http://localhost:5173',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Screenshot configuration
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Trace collection
    trace: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,
  },

  // Output directory for test artifacts
  outputDir: 'docs/validation/screenshots/toast-ui-validation',

  // Web server configuration (optional - if tests should start servers)
  // webServer: {
  //   command: 'npm run dev',
  //   port: 5173,
  //   timeout: 120000,
  //   reuseExistingServer: !process.env.CI,
  // },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable console logging
        launchOptions: {
          args: ['--disable-dev-shm-usage']
        }
      },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
