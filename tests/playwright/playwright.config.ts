import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Claude Instance Frontend Validation
 * 
 * This configuration sets up comprehensive testing for:
 * - Button click validation for all 4 Claude instance types
 * - SSE terminal stream validation
 * - Instance status updates
 * - Error handling scenarios
 * - Real-time bidirectional I/O
 */
export default defineConfig({
  // Test directory
  testDir: '.',
  
  // Run tests in files that match this pattern
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.e2e.ts'
  ],
  
  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'test-results/',
  
  // Global test timeout
  timeout: 120000, // 2 minutes for complex Claude instance operations
  
  // Expect timeout for assertions
  expect: {
    timeout: 30000 // 30 seconds for SSE connections to establish
  },
  
  // Run tests in parallel
  fullyParallel: false, // Disable parallel for resource-intensive Claude processes
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Number of workers
  workers: 1, // Single worker to avoid resource conflicts with Claude instances
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['html', { 
      open: 'never',
      outputFolder: 'playwright-report'
    }]
  ],
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // Shared settings for all projects
  use: {
    // Base URL for frontend testing
    baseURL: 'http://localhost:3001',
    
    // Global test artifacts
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Increased timeouts for Claude process operations
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Browser context settings
    viewport: { width: 1280, height: 720 },
    
    // HTTP settings for API calls
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chromium-specific settings for Claude testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox'
          ]
        }
      },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing for responsive validation
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  // Configure local dev server
  webServer: [
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'pipe', 
      stderr: 'pipe'
    }
  ]
});