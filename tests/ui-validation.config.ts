import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/ui-validation-report' }],
    ['json', { outputFile: 'test-results/ui-validation-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: false // Enable to see the browser
  },

  projects: [
    {
      name: 'ui-validation',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/ui-validation-comprehensive.spec.ts'
    }
  ],

  // Don't use webServer - we'll start services manually
});