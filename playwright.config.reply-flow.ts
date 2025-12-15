import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Comment Reply Flow E2E tests
 * Tests both processing pill visibility and agent response routing
 */
export default defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/comment-reply-full-flow.spec.ts',

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential execution

  // Reporter configuration
  reporter: [
    ['html', {
      outputFolder: 'tests/playwright/reports/reply-flow-html',
      open: 'never'
    }],
    ['json', {
      outputFile: 'tests/playwright/reports/reply-flow-results.json'
    }],
    ['junit', {
      outputFile: 'tests/playwright/reports/reply-flow-junit.xml'
    }],
    ['list']
  ],

  // Test configuration
  timeout: 90000, // 90 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  use: {
    // Base URL for the application
    baseURL: 'http://localhost:5173',

    // Browser settings
    headless: false, // Visual debugging enabled
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Screenshot settings
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Trace settings
    trace: 'retain-on-failure',

    // Action settings
    actionTimeout: 15000,
    navigationTimeout: 30000
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      }
    }
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
