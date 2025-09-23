import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Playwright MCP Configuration for UI/UX Validation
 *
 * This configuration provides:
 * - Multi-browser testing (Chrome, Firefox, Safari)
 * - Responsive design validation
 * - Visual regression testing
 * - Accessibility compliance testing
 * - Performance metrics collection
 * - Screenshot and video capture
 */

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
    toHaveScreenshot: {
      threshold: 0.3, // Allow 30% visual difference for regression tests
      mode: 'rgb'
    },
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/ui-validation-results.json' }],
    ['junit', { outputFile: 'test-results/ui-validation-junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Trace collection for debugging
    trace: 'on-first-retry',

    // Screenshot capture
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },

    // Video recording
    video: {
      mode: 'retain-on-failure',
      size: { width: 1920, height: 1080 }
    },

    // Run headless in CI/Codespace environment
    headless: true,

    // Browser viewport
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Tablet testing
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },
    {
      name: 'tablet-android',
      use: {
        ...devices['Galaxy Tab S4'],
        viewport: { width: 1138, height: 712 }
      },
    },

    // Mobile testing
    {
      name: 'mobile-iphone',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'mobile-android',
      use: {
        ...devices['Galaxy S21'],
        viewport: { width: 384, height: 812 }
      },
    },

    // High contrast accessibility testing
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Performance testing project
    {
      name: 'performance-testing',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/performance/*.spec.ts'
    }
  ],

  // Web servers configuration
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes timeout for server start
      env: {
        NODE_ENV: 'test'
      }
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
});