/**
 * Playwright Configuration for API Connectivity Tests
 * Configured for testing against real servers - NO MOCKS
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api-connectivity',
  testMatch: '**/*.spec.js',

  // Global test timeout
  timeout: 30000,
  expect: {
    timeout: 10000
  },

  // Run tests in parallel
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './test-results/api-connectivity-report' }],
    ['json', { outputFile: './test-results/api-connectivity-results.json' }],
    ['junit', { outputFile: './test-results/api-connectivity-results.xml' }],
    ['list']
  ],

  // Global setup and teardown
  globalSetup: './tests/api-connectivity/global-setup.js',
  globalTeardown: './tests/api-connectivity/global-teardown.js',

  use: {
    // Base URL for API requests
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000',

    // Trace settings
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    // Request settings
    ignoreHTTPSErrors: true,
    acceptDownloads: false,

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 15000,

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'User-Agent': 'Playwright-API-Tests'
    }
  },

  // Test projects
  projects: [
    {
      name: 'api-connectivity-chrome',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          ignoreHTTPSErrors: true
        }
      }
    },
    {
      name: 'api-connectivity-firefox',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          ignoreHTTPSErrors: true
        }
      }
    },
    {
      name: 'api-connectivity-safari',
      use: {
        ...devices['Desktop Safari'],
        contextOptions: {
          ignoreHTTPSErrors: true
        }
      }
    },
    {
      name: 'api-only',
      testMatch: '**/playwright-api-connectivity.spec.js',
      use: {
        // For API-only tests, we don't need a browser
        headless: true
      }
    }
  ],

  // Web server configuration (optional - for starting servers)
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'node simple-backend.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    }
  ],

  // Output directory
  outputDir: './test-results/api-connectivity-output'
});