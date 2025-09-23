// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Regression Test Configuration for Claude Instance Management
 * Focused on running only the regression test suites
 */
export default defineConfig({
  testDir: './src/tests/e2e/regression',
  testMatch: '**/*.spec.ts',
  
  // Run tests in sequence for stability
  fullyParallel: false,
  workers: 1,
  
  // Retry settings for flaky tests
  retries: process.env.CI ? 2 : 1,
  
  // Timeouts
  timeout: 90000, // 90 seconds per test
  expect: { timeout: 10000 }, // 10 seconds for assertions
  
  // Reporters
  reporter: [
    ['html', { outputFolder: './src/tests/reports/playwright-report' }],
    ['json', { outputFile: './src/tests/reports/regression-results.json' }],
    ['list'],
    ['junit', { outputFile: './src/tests/reports/regression-junit.xml' }]
  ],
  
  // Global settings
  use: {
    baseURL: 'http://localhost:3000',
    
    // Browser settings
    headless: true,
    viewport: { width: 1280, height: 720 },
    
    // Screenshots and videos for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Network settings
    ignoreHTTPSErrors: true,
    
    // Timeouts
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  // Projects - test on chromium primarily
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Global setup/teardown
  globalSetup: './src/tests/e2e/global-setup.ts',
  globalTeardown: './src/tests/e2e/global-teardown.ts',
  
  // Web servers are already running, just verify they're available
  webServer: []
});