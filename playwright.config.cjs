/**
 * Playwright Configuration for UI Validation
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',

  /* Configuration for UI validation */
  fullyParallel: false, // Run tests sequentially for validation consistency
  forbidOnly: !!process.env.CI, // Fail CI if test.only is left in
  retries: 1, // Retry once on failure
  workers: 1, // Single worker for validation consistency

  /* Reporter configuration */
  reporter: [
    ['html', { outputDir: 'tests/playwright/ui-validation/results/playwright-report' }],
    ['json', { outputFile: 'tests/playwright/ui-validation/results/validation-results.json' }],
    ['list']
  ],

  /* Global test settings */
  use: {
    /* Base URL for frontend testing */
    baseURL: 'http://localhost:3000',

    /* Browser settings for real validation */
    headless: true, // Use headless mode for CI environment
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
      name: 'chromium-ui-validation',
      use: {
        ...devices['Desktop Chrome'],
        // Use headless mode for CI
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
    }
  ],

  /* Output directories */
  outputDir: 'tests/playwright/ui-validation/results/artifacts'
});