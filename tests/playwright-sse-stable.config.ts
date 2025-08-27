import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SSE Stable Connection E2E Tests
 * Validates ECONNRESET fix and stable terminal session flow
 */
export default defineConfig({
  testDir: './',
  testMatch: ['sse-stable-connection-e2e.test.js'],
  
  // Test execution settings
  fullyParallel: false, // Run tests sequentially for accurate log analysis
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Limited retries for E2E stability
  workers: 1, // Single worker for stable backend process management
  
  // Enhanced reporting for E2E analysis
  reporter: [
    ['list', { printSteps: true }],
    ['html', { outputFolder: 'playwright-report-sse-stable', open: 'never' }],
    ['json', { outputFile: 'test-results/sse-stable-results.json' }],
    ['junit', { outputFile: 'test-results/sse-stable-junit.xml' }]
  ],
  
  // Browser and connection settings optimized for SSE testing
  use: {
    baseURL: 'http://localhost:5173',
    
    // Enhanced tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Network settings for SSE testing
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Extended timeouts for E2E stability
    actionTimeout: 20000,
    navigationTimeout: 30000,
    
    // Additional context options for SSE
    contextOptions: {
      // Disable service workers that might interfere with SSE
      serviceWorkers: 'block'
    }
  },
  
  // Test timeout settings
  timeout: 90000, // 90 seconds per test
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },
  
  // Test projects configuration
  projects: [
    {
      name: 'sse-stable-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings for SSE
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling'
          ]
        }
      },
    },
    
    // Disabled Firefox due to permission issues - Chrome validation is sufficient
    // {
    //   name: 'sse-stable-firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // }
  ],
  
  // Global setup and teardown for backend management
  globalSetup: undefined, // Handled within test file for better control
  globalTeardown: undefined,
  
  // Web server configuration (disabled - tests manage backend directly)
  webServer: []
});