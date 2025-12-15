/**
 * Playwright Configuration for Avi DM OAuth Validation Tests
 *
 * This configuration is optimized for real E2E testing of Avi DM functionality
 * with OAuth authentication, including screenshot capture and network monitoring.
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright/ui-validation',
  testMatch: '**/avi-dm-oauth-validation.spec.js',

  /* Configuration for real API testing */
  fullyParallel: false, // Run tests sequentially for consistent screenshots
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry on failure
  workers: 1, // Single worker for sequential execution

  /* Reporter configuration */
  reporter: [
    ['html', {
      outputDir: 'tests/playwright/ui-validation/results/avi-oauth-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/playwright/ui-validation/results/avi-oauth-results.json'
    }],
    ['list'],
    ['junit', {
      outputFile: 'tests/playwright/ui-validation/results/avi-oauth-junit.xml'
    }]
  ],

  /* Global test settings */
  use: {
    /* Base URL for frontend */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',

    /* Browser settings for real validation */
    headless: process.env.HEADLESS !== 'false', // Set HEADLESS=false to see browser
    viewport: { width: 1920, height: 1080 }, // Full HD for clear screenshots
    ignoreHTTPSErrors: true,

    /* Video and screenshot settings */
    video: 'retain-on-failure',
    screenshot: 'on', // Always capture screenshots (in addition to manual captures)

    /* Trace settings for debugging */
    trace: 'retain-on-failure',

    /* Extended timeout for real Claude Code SDK calls */
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 30000, // 30 seconds for page loads
  },

  /* Test timeout settings */
  timeout: 120000, // 2 minutes per test (Claude Code SDK can be slow)
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium-avi-oauth',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: process.env.HEADLESS !== 'false',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
          ]
        }
      },
    }
  ],

  /* Output directories */
  outputDir: 'tests/playwright/ui-validation/results/avi-oauth-artifacts',

  /* Web server configuration (optional - only if you want Playwright to start servers) */
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     url: 'http://localhost:5173',
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'npm run server',
  //     url: 'http://localhost:3001/health',
  //     timeout: 120000,
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ],
});
