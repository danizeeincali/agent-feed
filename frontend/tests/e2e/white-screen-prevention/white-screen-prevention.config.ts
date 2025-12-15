import { defineConfig, devices } from '@playwright/test';

/**
 * White Screen Prevention Test Configuration
 * Comprehensive configuration for testing white screen prevention measures
 */

export default defineConfig({
  testDir: './tests/e2e/white-screen-prevention',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 4,

  /* Maximum test timeout */
  timeout: 60000,

  /* Global test timeout */
  globalTimeout: 600000, // 10 minutes

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'test-results/white-screen-prevention-report' }],
    ['json', { outputFile: 'test-results/white-screen-prevention-results.json' }],
    ['junit', { outputFile: 'test-results/white-screen-prevention-junit.xml' }],
    ['list']
  ],

  /* Shared settings for all projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 15000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Chromium - Primary testing */
    {
      name: 'chromium-white-screen-prevention',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
        // Capture console logs and network
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    /* Firefox - Cross-browser validation */
    {
      name: 'firefox-white-screen-prevention',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    /* WebKit - Safari testing */
    {
      name: 'webkit-white-screen-prevention',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    /* Mobile Chrome - Responsive testing */
    {
      name: 'mobile-chrome-white-screen-prevention',
      use: {
        ...devices['Pixel 5'],
        hasTouch: true,
      },
    },

    /* Mobile Safari - iOS testing */
    {
      name: 'mobile-safari-white-screen-prevention',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
      },
    },

    /* Slow 3G - Performance under constraints */
    {
      name: 'slow-3g-white-screen-prevention',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  /* Output directory */
  outputDir: 'test-results/white-screen-prevention-artifacts',
});