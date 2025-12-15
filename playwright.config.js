/**
 * Playwright Configuration for Activities Production Validation
 *
 * Configured for real browser testing with visual documentation
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',

  /* Configuration for production validation */
  fullyParallel: false, // Run tests sequentially for validation consistency
  forbidOnly: !!process.env.CI, // Fail CI if test.only is left in
  retries: process.env.CI ? 2 : 1, // Retry on CI
  workers: 1, // Single worker for validation consistency

  /* Reporter configuration */
  reporter: [
    ['html', { outputDir: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/validation-results.json' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit-results.xml' }]
  ],

  /* Global test settings */
  use: {
    /* Base URL for frontend testing */
    baseURL: 'http://localhost:3000',

    /* Browser settings for real validation */
    headless: false, // Use real browser for visual verification
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    /* Video and screenshot settings */
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* Trace settings for debugging */
    trace: 'retain-on-failure',

    /* Extended timeout for real system testing */
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  /* Test timeout settings */
  timeout: 120000, // 2 minutes for comprehensive validation
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  /* Browser projects for validation */
  projects: [
    {
      name: 'chromium-production-validation',
      use: {
        ...devices['Desktop Chrome'],
        // Use real browser for validation
        launchOptions: {
          headless: false,
          slowMo: 500 // Slow down for visual verification
        }
      },
    },

    /* Uncomment for multi-browser validation
    {
      name: 'firefox-validation',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit-validation',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  /* Development server setup */
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js --port 3000',
      port: 3000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    }
  ],

  /* Output directories */
  outputDir: 'test-results/playwright-artifacts',

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/playwright/global-setup.js'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown.js')
});