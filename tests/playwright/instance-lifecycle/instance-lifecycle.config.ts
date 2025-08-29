import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Claude Instance Lifecycle Testing
 * 
 * This configuration is specifically designed for comprehensive instance lifecycle validation:
 * - Instance listing without "Failed to fetch instances" error
 * - Instance creation with corrected endpoints  
 * - SSE connection establishment after instance creation
 * - Real-time terminal streaming functionality
 * - Multiple instance management and concurrent operations
 * - Error recovery and graceful degradation scenarios
 */
export default defineConfig({
  // Test directory for instance lifecycle tests
  testDir: '.',
  
  // Test patterns
  testMatch: [
    '**/*.lifecycle.spec.ts',
    '**/*.integration.spec.ts'
  ],
  
  // Output directory
  outputDir: 'test-results/',
  
  // Extended timeouts for complex instance operations
  timeout: 180000, // 3 minutes for complete lifecycle operations
  
  // Assertion timeouts
  expect: {
    timeout: 45000 // 45 seconds for SSE connections and process spawning
  },
  
  // Sequential execution for resource management
  fullyParallel: false,
  
  // Fail on test.only in CI
  forbidOnly: !!process.env.CI,
  
  // Enhanced retries for flaky SSE operations
  retries: process.env.CI ? 3 : 2,
  
  // Single worker to prevent resource conflicts
  workers: 1,
  
  // Comprehensive reporting
  reporter: [
    ['list', { printSteps: true }],
    ['json', { outputFile: 'test-results/instance-lifecycle-results.json' }],
    ['junit', { outputFile: 'test-results/instance-lifecycle-results.xml' }],
    ['html', { 
      open: 'never',
      outputFolder: 'playwright-report/instance-lifecycle'
    }]
  ],
  
  // Setup and teardown
  globalSetup: '../global-setup.ts',
  globalTeardown: '../global-teardown.ts',
  
  // Enhanced settings for instance lifecycle testing
  use: {
    // Base URL for frontend testing
    baseURL: 'http://localhost:5173',
    
    // Enhanced tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Extended timeouts for slow operations
    actionTimeout: 60000, // 1 minute for instance creation
    navigationTimeout: 90000, // 1.5 minutes for page loads
    
    // Browser context settings
    viewport: { width: 1920, height: 1080 }, // Larger viewport for complex UI
    
    // HTTP settings for API interactions
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true
  },
  
  // Browser projects for comprehensive testing
  projects: [
    {
      name: 'chrome-instance-lifecycle',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-dev-shm-usage', // Prevent memory issues
            '--disable-gpu', // Prevent GPU conflicts
            '--enable-logging',
            '--v=1'
          ],
          slowMo: 100 // Slight delay to prevent race conditions
        }
      },
    },
    
    // Firefox for cross-browser validation
    {
      name: 'firefox-instance-lifecycle',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'media.navigator.permission.disabled': true
          }
        }
      },
    }
  ],
  
  // Web server configuration
  webServer: [
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'cd /workspaces/agent-feed && npm run server:dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});