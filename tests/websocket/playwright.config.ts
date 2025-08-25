/**
 * Playwright Configuration for WebSocket E2E Tests
 * E2E testing configuration for terminal connection status verification
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Test timeout
  timeout: 60000,
  expect: { timeout: 10000 },
  
  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'results/websocket-e2e-results.xml' }],
    ['json', { outputFile: 'results/websocket-e2e-results.json' }]
  ],
  
  // Global test settings
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Network settings for WebSocket testing
    ignoreHTTPSErrors: true,
    
    // Viewport
    viewport: { width: 1280, height: 720 }
  },

  // Test projects for different browsers
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

  // Web server configuration
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && npm run dev:terminal',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        TERMINAL_PORT: '3002'
      }
    },
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    }
  ],
  
  // Output directories
  outputDir: 'test-results/',
  
  // Global setup/teardown
  globalSetup: require.resolve('./setup/global-setup.ts'),
  globalTeardown: require.resolve('./setup/global-teardown.ts'),
});