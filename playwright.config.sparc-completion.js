/**
 * Playwright Configuration for SPARC Completion Phase Validation
 *
 * Validates that all "failed to fetch" errors have been eliminated
 * with comprehensive screenshot evidence and cross-browser testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: ['**/sparc-completion-validation.spec.ts', '**/sparc-visual-validation.spec.ts'],

  /* Configuration for SPARC completion validation */
  fullyParallel: false, // Sequential for clear validation flow
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for validation consistency

  /* Reporter configuration */
  reporter: [
    ['html', { outputDir: 'tests/e2e/reports/sparc-completion' }],
    ['json', { outputFile: 'tests/e2e/reports/sparc-completion-results.json' }],
    ['line'],
    ['junit', { outputFile: 'tests/e2e/reports/sparc-completion-junit.xml' }]
  ],

  /* Global test settings */
  use: {
    /* Base URL for frontend testing - correct port */
    baseURL: 'http://localhost:5173',

    /* Browser settings for validation */
    headless: true, // Headless for CI environment
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    /* Capture evidence */
    video: 'retain-on-failure',
    screenshot: 'on', // Capture all screenshots for evidence
    trace: 'retain-on-failure',

    /* Extended timeouts for real system testing */
    actionTimeout: 15000,
    navigationTimeout: 15000
  },

  /* Test timeout settings */
  timeout: 90000, // 90 seconds for comprehensive validation
  expect: {
    timeout: 10000
  },

  /* Browser projects for cross-browser validation */
  projects: [
    {
      name: 'chromium-sparc-validation',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: true,
          slowMo: 100 // Slow down for screenshot capture
        }
      },
    },

    {
      name: 'firefox-sparc-validation',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          headless: true,
          slowMo: 100
        }
      },
    }
  ],

  /* Output directories */
  outputDir: 'tests/e2e/test-results/sparc-completion-artifacts',

  /* No webServer - use existing running servers */
  // Expects API on port 3001 and Frontend on port 5173
});