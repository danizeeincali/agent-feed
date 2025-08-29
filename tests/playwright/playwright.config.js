const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for GitHub Codespaces Environment
 * Optimized for headless browser automation in cloud development environment
 */
module.exports = defineConfig({
  // Test directory
  testDir: '.',
  
  // Global test timeout
  timeout: 120000, // 2 minutes per test
  
  // Expect timeout for assertions
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests for stability in Codespaces
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '/workspaces/agent-feed/tests/playwright/playwright-report' }],
    ['json', { outputFile: '/workspaces/agent-feed/tests/playwright/test-results.json' }],
    ['list']
  ],
  
  // Global test setup
  use: {
    // Base URL for tests
    baseURL: 'https://animated-guacamole-4jgqg976v49pcqwqv-5173.app.github.dev',
    
    // Browser context options
    headless: true, // Required for Codespaces
    viewport: { width: 1280, height: 720 },
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Navigation timeout
    navigationTimeout: 60000,
    
    // Action timeout
    actionTimeout: 30000,
    
    // Ignore HTTPS errors (common in dev environments)
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Codespaces-specific Chrome args
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
    
    // Uncomment for additional browser testing
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    */
  ],

  // Output directories
  outputDir: '/workspaces/agent-feed/tests/playwright/test-results/',
  
  // Web Server (if needed to start local server)
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:test',
    url: 'https://animated-guacamole-4jgqg976v49pcqwqv-5173.app.github.dev',
    reuseExistingServer: true,
    timeout: 120000,
    ignoreHTTPSErrors: true,
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
});