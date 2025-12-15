const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'claude-config-isolation',
      testDir: './e2e/isolation',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'claude-config-functionality',
      testDir: './e2e/functionality',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'claude-config-security',
      testDir: './e2e/security',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node ../../../simple-backend.js',
    port: 3001,
    reuseExistingServer: !process.env.CI
  }
});