import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for UI/UX Validation Tests
 *
 * This configuration is designed specifically for validating the simplified
 * architecture after removal of Next.js and API route duplication.
 *
 * ARCHITECTURE:
 * - Standalone API Server: http://localhost:3001 (Express with UUID-based data)
 * - Vite React Frontend: http://localhost:5173 (Updated to use API server)
 *
 * VALIDATION FOCUS:
 * - Real functionality validation (no mocks)
 * - UUID string operations validation
 * - API integration validation
 * - Error prevention screenshot evidence
 * - User workflow validation
 */
export default defineConfig({
  testDir: './tests/playwright/ui-ux-validation',
  timeout: 60000, // 60 seconds for comprehensive tests
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  fullyParallel: false, // Sequential for better screenshot organization
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for consistent screenshots
  reporter: [
    ['html', {
      outputFolder: 'tests/playwright/ui-ux-validation/reports/html',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/playwright/ui-ux-validation/reports/results.json'
    }],
    ['junit', {
      outputFile: 'tests/playwright/ui-ux-validation/reports/junit.xml'
    }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on', // Always capture screenshots for validation
        video: 'on' // Always capture video for validation
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        screenshot: 'on',
        video: 'on'
      },
    },
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
        screenshot: 'on',
        video: 'on'
      },
    }
  ],
  webServer: [
    {
      command: 'cd api-server && npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    }
  ],
  outputDir: 'tests/playwright/ui-ux-validation/test-results',
});