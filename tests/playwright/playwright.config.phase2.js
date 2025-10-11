import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Phase 2C - PostgreSQL UI/UX Validation
 *
 * This configuration runs tests to validate the frontend UI integration with PostgreSQL backend.
 */

export default defineConfig({
  testDir: '.',
  testMatch: ['**/phase2-ui-validation.spec.js'],

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for better debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent test execution

  // Timeout settings
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000 // 5 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/playwright/screenshots/phase2/playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/playwright/screenshots/phase2/test-results.json'
    }],
    ['list'],
    ['junit', {
      outputFile: 'tests/playwright/screenshots/phase2/junit-results.xml'
    }]
  ],

  // Global test configuration
  use: {
    // Base URL for the frontend
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Trace settings
    trace: 'on-first-retry',

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Video settings
    video: 'retain-on-failure',

    // Browser settings
    headless: true,
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Set user agent
    userAgent: 'Playwright Phase 2C PostgreSQL Validation Tests',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 15000
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-dev-shm-usage']
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web server configuration
  webServer: [
    {
      command: 'echo "API Server should be running on port 3001 with PostgreSQL mode enabled"',
      port: 3001,
      reuseExistingServer: true,
      timeout: 5000,
    },
    {
      command: 'echo "Frontend should be running on port 5173 or 3000"',
      port: parseInt(process.env.FRONTEND_PORT || '5173'),
      reuseExistingServer: true,
      timeout: 5000,
    }
  ],
});
