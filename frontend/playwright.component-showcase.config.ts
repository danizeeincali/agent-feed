import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/component-showcase',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-showcase' }],
  ],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
