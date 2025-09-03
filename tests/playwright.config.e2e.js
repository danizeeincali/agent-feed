/**
 * Playwright configuration for Claude AI Response System E2E tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  
  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Global timeout
  timeout: 90000, // 90 seconds per test
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },
  
  // Test execution configuration
  fullyParallel: false, // Run tests sequentially to avoid resource conflicts
  forbidOnly: !!process.env.CI, // Fail if test.only in CI
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : 1, // Single worker to avoid conflicts
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/reports/e2e-html' }],
    ['junit', { outputFile: 'tests/reports/e2e-junit.xml' }],
    ['json', { outputFile: 'tests/reports/e2e-results.json' }],
    ['list']
  ],
  
  // Global test configuration
  use: {
    // Browser context options
    baseURL: 'http://localhost:5173',
    
    // Action timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser options
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    
    // Network options
    ignoreHTTPSErrors: true,
    
    // Test data attributes
    testIdAttribute: 'data-testid'
  },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Local development server setup
  webServer: [
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000, // 2 minutes to start
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'node simple-backend.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000, // 1 minute to start
      env: {
        NODE_ENV: 'test'
      }
    }
  ],
  
  // Test output directory
  outputDir: 'tests/reports/test-results',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/utils/global-setup.js'),
  globalTeardown: require.resolve('./tests/utils/global-teardown.js'),
});