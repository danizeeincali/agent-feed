import { defineConfig, devices } from '@playwright/test';

/**
 * Real Server E2E Testing Configuration
 * 
 * This config is specifically designed for testing against real running servers
 * with no mocks, stubs, or simulated responses.
 * 
 * Target servers:
 * - Frontend: http://127.0.0.1:5173 (Vite dev server)
 * - Backend: http://localhost:3000 (Node.js API server)
 */

export default defineConfig({
  testDir: '../e2e',
  
  // Test files to run
  testMatch: ['**/real-agent-pages-infinite-loading.spec.ts'],
  
  // Parallel execution disabled for debugging real server issues
  fullyParallel: false,
  workers: 1,
  
  // Retry policy for real server testing
  retries: process.env.CI ? 2 : 1,
  
  // Timeout settings for real server responses
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // Test output configuration
  outputDir: '../e2e/test-results',
  
  // Reporter configuration for debugging
  reporter: [
    ['html', { outputFolder: '../e2e/playwright-report' }],
    ['json', { outputFile: '../e2e/test-results/results.json' }],
    ['junit', { outputFile: '../e2e/test-results/junit.xml' }],
    ['list', { printSteps: true }]
  ],
  
  use: {
    // Base URL for frontend testing
    baseURL: 'http://127.0.0.1:5173',
    
    // Browser context settings for real testing
    ignoreHTTPSErrors: true,
    
    // Video and screenshot capture for debugging
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Trace collection for debugging
    trace: 'retain-on-failure',
    
    // Real browser navigation settings
    navigationTimeout: 30000,
    actionTimeout: 15000,
    
    // Viewport for consistent testing
    viewport: { width: 1280, height: 720 },
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Device emulation (desktop)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  },
  
  // Test projects for different browsers
  projects: [
    {
      name: 'chromium-real-server',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable console API for error capture
        channel: 'chrome',
        // Real browser settings
        headless: true, // Use headless mode for CI environment
        slowMo: 100,    // Minimal slow down for debugging
        // Additional Chrome args for debugging
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging=stderr',
            '--v=1'
          ]
        }
      },
    },
    
    {
      name: 'firefox-real-server',
      use: { 
        ...devices['Desktop Firefox'],
        headless: true,
        slowMo: 100
      },
    }
  ],
  
  // Web server configuration (ensure servers are running)
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js',
      url: 'http://localhost:3000/api/health',
      timeout: 30000,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      url: 'http://127.0.0.1:5173',
      timeout: 60000,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});