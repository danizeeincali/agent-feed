/**
 * Playwright Configuration for Onboarding E2E Tests
 *
 * This configuration is optimized for testing the onboarding flow
 * with screenshot capture and real browser interaction.
 *
 * NO MOCKS - Tests run against real backend and WebSocket connections
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/onboarding-user-flow.spec.ts',

  // RED PHASE: Tests WILL fail - longer timeouts
  timeout: 120000, // 2 minutes per test

  fullyParallel: false, // Run serially to avoid race conditions

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1, // Single worker to avoid conflicts

  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports' }],
    ['json', { outputFile: 'tests/e2e/reports/onboarding-results.json' }],
    ['junit', { outputFile: 'tests/e2e/reports/onboarding-junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL for the app
    baseURL: 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Enable JavaScript
    javaScriptEnabled: true,

    // Accept downloads
    acceptDownloads: true,

    // Timeout for actions
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable browser console logging
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
    },

    // Optional: Test in Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Optional: Test in WebKit (Safari)
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server configuration - start both frontend and backend
  webServer: [
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        VITE_API_URL: 'http://localhost:3001'
      }
    },
    {
      command: 'cd api-server && npm start',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  ],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Expect assertions configuration
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
});
