import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for UI Bug Fixes E2E Tests
 */
export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'ui-bug-fixes-e2e.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: 'tests/playwright/ui-bug-fixes-report' }],
    ['json', { outputFile: 'tests/playwright/ui-bug-fixes-results.json' }],
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
});
