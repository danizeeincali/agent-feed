import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/production-validation',
  
  // Run tests in files in parallel
  fullyParallel: false, // Sequential for production validation
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests for consistency
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'tests/production-validation/html-report' }],
    ['json', { outputFile: 'tests/production-validation/results.json' }],
    ['junit', { outputFile: 'tests/production-validation/results.xml' }]
  ],
  
  // Global timeout
  globalTimeout: 10 * 60 * 1000, // 10 minutes
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'retry-with-trace',
    
    // Capture screenshot only when test fails
    screenshot: 'only-on-failure',
    
    // Record video only when retrying a test for the first time
    video: 'retain-on-failure',
    
    // Maximum time each action such as `click()` can take
    actionTimeout: 30000,
    
    // Maximum time each navigation such as `goto()` can take
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000, // 60 seconds per test
  
  // Expect timeout
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Configure projects for major browsers and tool call testing
  projects: [
    // Desktop Browser Tests
    {
      name: 'production-validation-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use persistent context for real user simulation
        launchOptions: {
          args: ['--disable-web-security', '--disable-dev-shm-usage'],
        }
      },
      testMatch: [
        'comprehensive-e2e-suite.spec.ts',
        'tool-call-visualization-e2e.spec.ts',
        'websocket-stability-tool-calls.spec.ts'
      ]
    },
    
    {
      name: 'production-validation-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: [
        'comprehensive-e2e-suite.spec.ts',
        'tool-call-visualization-e2e.spec.ts'
      ]
    },
    
    {
      name: 'production-validation-webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: [
        'tool-call-visualization-e2e.spec.ts'
      ]
    },
    
    // Mobile Browser Tests
    {
      name: 'mobile-chrome-tool-calls',
      use: { ...devices['Pixel 5'] },
      testMatch: [
        'mobile-browser-tool-call.spec.ts'
      ]
    },
    
    {
      name: 'mobile-iphone-tool-calls', 
      use: { ...devices['iPhone 13'] },
      testMatch: [
        'mobile-browser-tool-call.spec.ts'
      ]
    },
    
    {
      name: 'tablet-tool-calls',
      use: { ...devices['iPad Air'] },
      testMatch: [
        'mobile-browser-tool-call.spec.ts'
      ]
    },
    
    // Load Testing
    {
      name: 'load-testing',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security', '--disable-dev-shm-usage'],
        }
      },
      testMatch: [
        'load-test-suite.spec.ts'
      ]
    },
  ],

  // Development server configuration
  webServer: [
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    }
  ],
});