import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Question Routing E2E Tests
 *
 * Tests the auto-question routing feature:
 * - Questions without @agent mentions route to Avi
 * - @mentions route to specific agents
 * - URLs route to link-logger
 */
export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'question-routing-e2e.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000, // 60 second timeout for LLM responses
  reporter: [
    ['html', { outputFolder: 'tests/playwright/playwright-report' }],
    ['json', { outputFile: 'tests/playwright/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Servers should already be running
  // webServer commented out - manually start servers
});
