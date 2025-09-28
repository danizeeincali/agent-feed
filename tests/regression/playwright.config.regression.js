/**
 * Playwright Configuration for CSS Architecture Regression Tests
 *
 * E2E testing configuration for comprehensive cross-browser validation
 * Optimized for testing React 18.2.0 + Tailwind CSS 4.x + Next.js 14.0.0
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: '/workspaces/agent-feed/tests/regression',

  // Test file patterns
  testMatch: [
    '**/multi-viewport-responsive.test.js'
  ],

  // Global test timeout
  timeout: 60000,

  // Global expect timeout
  expect: {
    timeout: 15000
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '/workspaces/agent-feed/tests/regression/reports/playwright' }],
    ['json', { outputFile: '/workspaces/agent-feed/tests/regression/reports/test-results.json' }],
    ['junit', { outputFile: '/workspaces/agent-feed/tests/regression/reports/regression-e2e-results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./playwright.global-setup.js'),
  globalTeardown: require.resolve('./playwright.global-teardown.js'),

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3003',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York'
  },

  // Output directory
  outputDir: '/workspaces/agent-feed/tests/regression/test-results',

  // Projects for different browsers and devices
  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Mobile Browsers
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5']
      }
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12']
      }
    },

    // Tablet Browsers
    {
      name: 'Tablet Chrome',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      }
    },

    // High DPI
    {
      name: 'High DPI',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Dark mode testing
    {
      name: 'Dark Mode',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Reduced motion testing
    {
      name: 'Reduced Motion',
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
        viewport: { width: 1920, height: 1080 }
      }
    },

    // Specific viewport sizes for responsive testing
    {
      name: 'Small Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'Large Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 }
      }
    },
    {
      name: 'Ultrawide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3440, height: 1440 }
      }
    }
  ],

  // Web server configuration (if needed)
  webServer: {
    command: 'npm run dev',
    port: 3003,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test'
    }
  }
});