// Playwright Configuration for Comment-Agent Response Validation
// TDD Test Suite Configuration

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/comment-agent-response-validation.spec.ts',

  // Test timeout
  timeout: 60000, // 60 seconds per test

  // Global setup timeout
  globalTimeout: 600000, // 10 minutes for entire suite

  // Expect timeout
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Run tests in parallel
  fullyParallel: false, // Sequential for agent response tests

  // Retry failed tests in TDD mode
  retries: 0, // No retries in TDD - we want to see failures

  // Number of workers
  workers: 1, // Single worker to avoid race conditions

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'tests/playwright/comment-validation-results.json' }],
    ['junit', { outputFile: 'tests/playwright/comment-validation-junit.xml' }]
  ],

  // Output directory for screenshots and videos
  outputDir: './docs/validation/screenshots/comment-agent-validation',

  // Shared settings for all projects
  use: {
    // Base URL for frontend
    baseURL: 'http://localhost:5173',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Trace on failure
    trace: 'retain-on-failure',

    // Slow down actions for debugging
    // launchOptions: {
    //   slowMo: 100
    // }
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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

  // Web server configuration
  webServer: [
    // Note: We expect backend and frontend to be running already
    // This is just documentation of expected services
  ],
});
