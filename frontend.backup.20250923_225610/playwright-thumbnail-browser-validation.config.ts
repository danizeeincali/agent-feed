import { defineConfig, devices } from '@playwright/test';

/**
 * Specialized Playwright Configuration for Thumbnail-Summary Browser Validation
 * 
 * This configuration is optimized for testing the thumbnail-summary preview functionality
 * with real URLs across multiple browsers and devices.
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Only run the thumbnail-summary validation tests
  testMatch: [
    '**/thumbnail-summary-browser-validation.spec.ts',
    '**/real-url-test-data-setup.spec.ts',
    '**/thumbnail-summary-performance.spec.ts'
  ],
  
  // Run tests in files in parallel
  fullyParallel: false, // Sequential to ensure setup runs first
  
  // Fail the build on CI if accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 2,
  
  // Extended timeout for real URL loading
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report-thumbnail-validation' }],
    ['json', { outputFile: 'test-results/thumbnail-validation-results.json' }],
    ['junit', { outputFile: 'test-results/thumbnail-validation-junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL of the local application
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot only on failure
    screenshot: 'only-on-failure',
    
    // Capture video on failure
    video: 'retain-on-failure',
    
    // Global test timeout
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Viewport settings - will be overridden per device
    viewport: { width: 1280, height: 720 }
  },

  // Configure projects for major browsers and devices
  projects: [
    // Setup project - runs first to create test data
    {
      name: 'setup',
      testMatch: '**/real-url-test-data-setup.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    // Tablet testing
    {
      name: 'ipad',
      use: { 
        ...devices['iPad Pro'],
      },
      dependencies: ['setup']
    },
    
    {
      name: 'ipad-landscape',
      use: { 
        ...devices['iPad Pro landscape']
      },
      dependencies: ['setup']
    },
    
    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5']
      },
      dependencies: ['setup']
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12']
      },
      dependencies: ['setup']
    },
    
    {
      name: 'mobile-safari-landscape',
      use: { 
        ...devices['iPhone 12 landscape']
      },
      dependencies: ['setup']
    },
    
    // Accessibility testing
    {
      name: 'accessibility-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Use high contrast mode for accessibility testing
        colorScheme: 'dark',
        reducedMotion: 'reduce'
      },
      dependencies: ['setup']
    },
    
    // Performance testing
    {
      name: 'performance-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable performance metrics
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: '**/thumbnail-summary-performance.spec.ts',
      dependencies: ['setup']
    }
  ],

  // Run local dev server before starting the tests
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js',
      port: 3000,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    }
  ]
});