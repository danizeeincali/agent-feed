import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Comment Reply Processing E2E Tests
 *
 * Focused configuration for testing the comment reply flow with:
 * - Screenshot capture at key interaction points
 * - Video recording on failure for debugging
 * - Single worker to avoid test interference
 * - HTML reporter for visual test results
 */

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'comment-reply-processing-e2e.spec.ts',

  // Run tests sequentially to avoid interference
  fullyParallel: false,
  workers: 1,

  // Timeout configuration
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/playwright/reports/reply-processing' }],
    ['json', { outputFile: 'tests/playwright/reports/reply-processing-results.json' }],
    ['list'] // Console output
  ],

  // Global test configuration
  use: {
    baseURL: 'http://localhost:5173',

    // Screenshot configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },

    // Video recording for debugging
    video: 'retain-on-failure',

    // Trace recording
    trace: 'on-first-retry',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Browser context options
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 15000
  },

  // Test projects
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable developer tools
        devtools: false
      }
    }
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe'
  },

  // Output directory for test artifacts
  outputDir: 'tests/playwright/test-results'
});
