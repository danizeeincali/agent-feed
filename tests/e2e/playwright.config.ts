import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Dynamic Pages E2E Tests
 *
 * This configuration is optimized for testing dynamic pages functionality
 * against running servers on localhost:3000 (backend) and localhost:5173 (frontend)
 */

export default defineConfig({
  // Test directory
  testDir: './',

  // Test files pattern
  testMatch: ['**/*.spec.ts'],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 4 : 6,

  // Reporter to use
  reporter: [
    ['html', {
      outputFolder: './reports/html',
      open: 'never'
    }],
    ['json', {
      outputFile: './reports/results.json'
    }],
    ['junit', {
      outputFile: './reports/junit.xml'
    }],
    ['list']
  ],

  // Global test configuration
  use: {
    // Base URL for frontend
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot only on failure
    screenshot: 'only-on-failure',

    // Record video only on failure
    video: 'retain-on-failure',

    // Timeout for each action (e.g., click, fill, etc.)
    actionTimeout: 10000,

    // Timeout for navigation (e.g., page.goto())
    navigationTimeout: 30000,

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,
  },

  // Global timeout for each test
  timeout: 120000,

  // Global timeout for each expect() assertion
  expect: {
    timeout: 15000,
  },

  // Max failures before stopping test run
  maxFailures: process.env.CI ? 10 : undefined,

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Increase viewport for better dashboard rendering
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
    },

    // Tablet testing
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enable screen reader simulation
        contextOptions: {
          forcedColors: 'active',
          reducedMotion: 'reduce'
        }
      },
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Throttle network for realistic conditions
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--disable-extensions', '--no-sandbox']
        }
      },
    },
  ],

  // Web servers to start before running tests
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && npm run dev:backend',
      port: 3000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd /workspaces/agent-feed && npm run dev:frontend',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],

  // Test output directory
  outputDir: './test-results/',

  // Global setup and teardown
  globalSetup: './setup/global-setup.ts',
  globalTeardown: './setup/global-teardown.ts',
});