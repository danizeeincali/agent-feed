import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '**/metadata-spacing-validation.spec.ts',

  fullyParallel: false, // Run sequentially for screenshot consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent screenshots

  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/metadata-spacing' }],
    ['json', { outputFile: 'tests/e2e/reports/metadata-spacing-results.json' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },
  ],

  webServer: {
    command: 'echo "Servers should be running"',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 5000,
  },
});
