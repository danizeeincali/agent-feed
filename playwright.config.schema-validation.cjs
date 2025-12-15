/**
 * Playwright Configuration for Schema Fix Validation
 * Dedicated config for testing ClaudeAuthManager schema fix
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright/ui-validation',
  testMatch: ['**/*.spec.cjs', 'schema-fix-verification.spec.cjs'],

  /* Configuration for schema validation */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry twice for flaky network conditions
  workers: 1, // Sequential execution for consistent state

  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'docs/validation/test-artifacts/playwright-report' }],
    ['json', { outputFile: 'docs/validation/test-artifacts/validation-results.json' }],
    ['junit', { outputFile: 'docs/validation/test-artifacts/junit-results.xml' }],
    ['list']
  ],

  /* Global test settings */
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    /* Capture screenshots for documentation */
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    /* Extended timeouts for real backend */
    actionTimeout: 30000,
    navigationTimeout: 30000,

    /* Additional context options */
    contextOptions: {
      recordVideo: {
        dir: 'docs/validation/test-artifacts/videos/'
      }
    }
  },

  /* Test timeout settings */
  timeout: 120000,
  expect: {
    timeout: 15000
  },

  /* Browser project */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
      }
    }
  ],

  /* Output directories */
  outputDir: 'docs/validation/test-artifacts/test-output',

  /* Web server (optional - assumes servers already running) */
  webServer: process.env.AUTO_START_SERVERS === 'true' ? [
    {
      command: 'npm run server',
      port: 3001,
      timeout: 120000,
      reuseExistingServer: true
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      timeout: 120000,
      reuseExistingServer: true
    }
  ] : undefined
});
