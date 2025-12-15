import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Processing Pills & Display Name E2E Tests
 *
 * This configuration is optimized for testing:
 * - Processing pill visibility during submissions
 * - Display name correctness ("John Connor" vs "user")
 * - Multi-post independence
 * - Screenshot capture at critical steps
 */

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/processing-pills-and-display-name-e2e.spec.ts',

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for consistent state
  timeout: 60000, // 60 seconds per test

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/playwright/reports/both-fixes' }],
    ['json', { outputFile: 'tests/playwright/reports/both-fixes/results.json' }],
    ['junit', { outputFile: 'tests/playwright/reports/both-fixes/junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL for the application
    baseURL: 'http://localhost:5173',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'retain-on-failure',

    // Trace on first retry
    trace: 'on-first-retry',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Slow down actions to capture processing states
        launchOptions: {
          slowMo: 100
        }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          slowMo: 100
        }
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          slowMo: 100
        }
      },
    },
  ],

  // Web server configuration (assumes dev server is running)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
