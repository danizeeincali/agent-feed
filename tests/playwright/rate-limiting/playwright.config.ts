import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Button Rate Limiting Tests
 * 
 * This configuration sets up comprehensive testing for:
 * - Button rate limiting behavior validation
 * - Debouncing mechanisms
 * - Component re-render stability
 * - Cross-browser interaction patterns
 * - Visual regression for button states
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
  
  // Folder for test artifacts
  outputDir: 'test-results/',
  
  // Global test timeout - increased for timing-based tests
  timeout: 180000, // 3 minutes for rate limiting timing tests
  
  // Expect timeout for assertions
  expect: {
    timeout: 45000 // 45 seconds for button state changes
  },
  
  // Run tests in sequence for timing accuracy
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Number of workers - single worker for timing accuracy
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/rate-limiting-results.json' }],
    ['junit', { outputFile: 'test-results/rate-limiting-junit.xml' }],
    ['html', { 
      open: 'never',
      outputFolder: 'playwright-report'
    }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for frontend testing
    baseURL: 'http://localhost:5173',
    
    // Global test artifacts
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Increased timeouts for rate limiting tests
    actionTimeout: 45000,
    navigationTimeout: 60000,
    
    // Browser context settings optimized for button interactions
    viewport: { width: 1280, height: 720 },
    
    // HTTP settings
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
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
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
    
    // Mobile testing for responsive rate limiting
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ]
});