import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: '/workspaces/agent-feed/tests/playwright/mcp-validation/reports/html' }],
    ['json', { outputFile: '/workspaces/agent-feed/tests/playwright/mcp-validation/reports/results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  projects: [
    {
      name: 'comprehensive-validation',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
});