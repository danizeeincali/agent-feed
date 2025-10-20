import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Business Impact Removal Validation
 *
 * This config is optimized for comprehensive visual and functional testing
 * of the business impact indicator removal across multiple viewports and themes.
 */

export default defineConfig({
  testDir: '.',
  testMatch: '**/business-impact-removal-validation.spec.ts',

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for consistent screenshots
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for screenshot consistency

  // Timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/e2e/playwright-report/business-impact-validation',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/e2e/reports/business-impact-validation-results.json'
    }],
    ['junit', {
      outputFile: 'tests/e2e/reports/business-impact-validation-junit.xml'
    }],
    ['list', { printSteps: true }]
  ],

  // Global configuration
  use: {
    baseURL: 'http://localhost:5173',

    // Screenshot settings
    screenshot: 'on', // Always capture screenshots

    // Video settings
    video: 'on', // Capture video for all tests

    // Trace settings
    trace: 'on', // Always capture trace

    // Browser settings
    headless: true, // Headless mode for codespace

    // Action settings
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Viewport (will be overridden by test.use())
    viewport: { width: 1920, height: 1080 },

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Browser projects
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
      },
    }
  ],

  // Output directory
  outputDir: 'tests/e2e/test-results/business-impact-validation',
});
