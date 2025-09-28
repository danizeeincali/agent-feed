import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui-analysis',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Run sequentially for consistent analysis
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: 'tests/ui-analysis/playwright-report' }],
    ['json', { outputFile: 'tests/ui-analysis/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true // Must be true in codespace environment
  },

  projects: [
    {
      name: 'ui-analysis',
      use: {
        ...devices['Desktop Chrome'],
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    }
  ],

  // Don't start web servers - assume they're already running
  // This allows the test to run against the existing development setup
});