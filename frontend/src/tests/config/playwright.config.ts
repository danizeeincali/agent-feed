/**
 * Playwright Configuration for Avi DM E2E Tests
 * SPARC Phase 5: Completion - E2E Test Infrastructure
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Timeout settings
  timeout: 60000,
  expect: {
    timeout: 10000
  },

  // Reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],

  // Global test settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Browser settings
    ignoreHTTPSErrors: true,
    acceptDownloads: true,

    // Context settings
    locale: 'en-US',
    timezoneId: 'America/New_York'
  },

  // Test projects for different browsers and devices
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        isMobile: true
      }
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        isMobile: true
      }
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      }
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: '**/accessibility/*.spec.ts'
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/performance/*.spec.ts'
    },

    // Visual regression testing
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: '**/visual/*.spec.ts'
    }
  ],

  // Web server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },

  // Global setup and teardown
  globalSetup: './src/tests/setup/global-setup.ts',
  globalTeardown: './src/tests/setup/global-teardown.ts',

  // Output directories
  outputDir: 'test-results/',

  // Test artifacts
  preserveOutput: 'failures-only',

  // Metadata
  metadata: {
    testSuite: 'Avi DM E2E Tests',
    framework: 'Playwright',
    version: '1.0.0'
  }
});