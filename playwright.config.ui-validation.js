/**
 * Playwright Configuration for Agents UI Validation
 * Specialized config for comprehensive UI/UX testing with screenshot evidence
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/agents-ui-validation.spec.ts',

  /* Configuration optimized for UI validation */
  fullyParallel: false, // Sequential execution for consistent screenshots
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // No retries in dev for faster feedback
  workers: 1, // Single worker for stable validation

  /* Reporter configuration for validation evidence */
  reporter: [
    ['html', { outputDir: 'tests/screenshots/agents-fix/playwright-report' }],
    ['json', { outputFile: 'tests/screenshots/agents-fix/test-results.json' }],
    ['list'],
    ['junit', { outputFile: 'tests/screenshots/agents-fix/junit.xml' }]
  ],

  /* Global test settings optimized for UI validation */
  use: {
    /* Target the frontend dev server */
    baseURL: 'http://localhost:5173',

    /* Browser settings for accurate screenshot capture */
    headless: true, // Headless for speed as requested
    viewport: { width: 1920, height: 1080 }, // Standard desktop viewport
    ignoreHTTPSErrors: true,

    /* Enhanced capture settings for evidence collection */
    video: 'retain-on-failure',
    screenshot: 'only-on-failure', // Test handles its own screenshots

    /* Trace settings for debugging validation failures */
    trace: 'retain-on-failure',

    /* Extended timeouts for comprehensive validation */
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 30000 // 30 seconds for navigation
  },

  /* Test timeout settings for comprehensive validation */
  timeout: 180000, // 3 minutes per test (comprehensive validation takes time)
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },

  /* Browser projects for validation */
  projects: [
    {
      name: 'chromium-ui-validation',
      use: {
        ...devices['Desktop Chrome'],
        // Optimize for consistent screenshots
        launchOptions: {
          headless: true, // Headless mode for speed
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-web-security', // For cross-origin requests during testing
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    }
  ],

  /* Development server setup - Frontend only for UI testing */
  webServer: {
    command: 'cd /workspaces/agent-feed/frontend && npm run dev',
    port: 5173,
    timeout: 60000, // Extended timeout for frontend startup
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  /* Output directories for validation artifacts */
  outputDir: 'tests/screenshots/agents-fix/playwright-artifacts',

  /* Global setup specific to UI validation */
  globalSetup: require.resolve('./tests/playwright/ui-validation-setup.js'),

  /* Metadata for validation reporting */
  metadata: {
    testType: 'UI/UX Validation',
    target: 'Agents Page (/agents)',
    purpose: 'Before/After Screenshot Evidence Collection',
    evidence: [
      'BEFORE fix screenshot',
      'AFTER fix screenshot',
      'Mobile view screenshot',
      'Console clean screenshot',
      'Responsive design validation',
      'API connectivity validation',
      'Loading states validation'
    ]
  }
});