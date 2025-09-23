import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Interactive Control Removal Validation
 * Comprehensive UI/UX testing for before and after removal scenarios
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './reports/html' }],
    ['json', { outputFile: './reports/results.json' }],
    ['junit', { outputFile: './reports/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  // Test timeout
  timeout: 60000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      mode: 'strict',
      threshold: 0.2,
      maxDiffPixels: 100
    }
  },

  // Projects for cross-browser and responsive testing
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    },
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] }
    },
    {
      name: 'large-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },

  // Output directories
  outputDir: './test-results',
  snapshotDir: './screenshots'
});