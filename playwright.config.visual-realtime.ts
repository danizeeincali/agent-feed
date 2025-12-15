import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration: Visual Pills & Real-Time Updates
 *
 * Optimized for testing visual UX elements and WebSocket real-time updates
 */

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/visual-pills-and-realtime-e2e.spec.ts',

  fullyParallel: false, // Run scenarios sequentially for WebSocket stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally, twice in CI
  workers: 1, // Single worker to avoid WebSocket conflicts

  reporter: [
    ['html', { outputFolder: 'playwright-report-visual-realtime' }],
    ['list'],
    ['json', { outputFile: 'test-results/visual-realtime-results.json' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    trace: 'on-first-retry',
    screenshot: 'on', // Always capture screenshots for visual tests
    video: 'retain-on-failure',

    // Extended timeouts for real-time operations
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  timeout: 90000, // 90 seconds per test (allows time for Avi replies)

  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enable console logs for WebSocket debugging
        contextOptions: {
          recordVideo: {
            dir: 'test-results/videos-visual-realtime',
          },
        },
      },
    },

    // Optional: Test in Firefox for cross-browser validation
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: [
    {
      command: 'cd api-server && npm start',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
