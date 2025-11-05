import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 4,
  /* Maximum test timeout */
  timeout: 60000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 30000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Core features - all browsers */
    {
      name: 'core-features-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testDir: './tests/e2e/core-features',
    },
    
    {
      name: 'core-features-firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/e2e/core-features',
    },

    {
      name: 'core-features-webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/e2e/core-features',
    },

    /* Regression tests - cross-browser */
    {
      name: 'regression-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testDir: './tests/e2e/regression',
    },
    
    {
      name: 'regression-firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/e2e/regression',
    },

    {
      name: 'regression-webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/e2e/regression',
    },

    /* Mobile testing */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        hasTouch: true,
      },
      testDir: './tests/e2e/core-features',
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
      },
      testDir: './tests/e2e/core-features',
    },

    /* Integration tests - Chrome only for speed */
    {
      name: 'integration',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testDir: './tests/e2e/integration',
    },

    /* Visual regression tests */
    {
      name: 'visual',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        channel: 'chrome',
        // Disable animations for consistent screenshots
        actionTimeout: 5000,
      },
      testDir: './tests/e2e/visual',
    },

    /* Performance tests */
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testDir: './tests/e2e/performance',
    },

    /* Accessibility tests */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testDir: './tests/e2e/accessibility',
    },

    /* Claude SDK Analytics tests */
    {
      name: 'claude-sdk',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        permissions: ['clipboard-read', 'clipboard-write'],
        ignoreHTTPSErrors: true,
        acceptDownloads: true,
      },
      testDir: './tests/e2e/claude-sdk',
    },

    /* Analytics tests - Chrome */
    {
      name: 'analytics-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      },
      testDir: './tests/e2e/analytics',
    },

    /* Analytics tests - Firefox */
    {
      name: 'analytics-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      },
      testDir: './tests/e2e/analytics',
    },

    /* Validation tests - Chrome only */
    {
      name: 'validation',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
      testDir: './tests/e2e/validation',
    },

    /* Page Verification tests - Chrome with screenshot capture */
    {
      name: 'page-verification',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
      testDir: './tests/e2e/page-verification',
    },

    /* Real-time Comments E2E Tests - Chrome with screenshots */
    {
      name: 'realtime-comments',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
      testDir: './src/tests/e2e',
    },

    /* User Feedback Validation E2E Tests - Chrome with screenshots */
    {
      name: 'user-feedback-validation',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on',
        trace: 'on',
        baseURL: 'http://localhost:3001',
      },
      testDir: './src/tests/e2e',
      testMatch: '**/user-feedback-validation.spec.ts',
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global setup and teardown */
  globalSetup: './src/tests/e2e/global-setup.ts',
  globalTeardown: './src/tests/e2e/global-teardown.ts',

  /* Expect configuration */
  expect: {
    /* Timeout for expect assertions */
    timeout: 10000,
    /* Threshold for visual comparisons */
    threshold: 0.3,
    /* Animation handling */
    toHaveScreenshot: { 
      threshold: 0.2, 
      maxDiffPixels: 100,
      animations: 'disabled',
    },
    toMatchSnapshot: { 
      threshold: 0.2, 
      maxDiffPixels: 100 
    },
  },

  /* Output directory */
  outputDir: 'test-results/',

  /* Metadata */
  metadata: {
    'test-type': 'e2e-regression-prevention',
    'project': 'agent-feed',
    'environment': process.env.NODE_ENV || 'development',
  },
});