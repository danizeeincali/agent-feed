import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Terminal E2E Tests
 * 
 * Comprehensive E2E testing configuration with multiple browsers,
 * devices, and test environments for terminal functionality.
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Action timeout
    actionTimeout: 10000,
    
    // Test timeout per test
    testTimeout: 60000,
    
    // Expect timeout for assertions
    expect: {
      timeout: 10000
    }
  },

  // Configure projects for major browsers
  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content'
          ]
        }
      },
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false
          }
        }
      },
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific viewport
        viewport: { width: 375, height: 667 }
      },
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        // Mobile Safari specific settings
        viewport: { width: 390, height: 844 }
      },
    },

    // Tablet
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },

    // High DPI display
    {
      name: 'High DPI',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      }
    }
  ],

  // Global setup and teardown
  // globalSetup: './src/tests/config/globalSetup.ts',
  // globalTeardown: './src/tests/config/globalTeardown.ts',

  // Test directory patterns
  testMatch: [
    '**/e2e/**/*.spec.ts'
  ],

  // Files to ignore
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  // Web server configuration - assuming server is already running on 5173
  // webServer: undefined,

  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Maximum time the whole test suite can run
  globalTimeout: 600000, // 10 minutes
  
  // Timeout for expect assertions
  timeout: 30000,
  
  // Whether to update snapshots
  updateSnapshots: 'missing',
  
  // Metadata
  metadata: {
    'test-suite': 'Terminal E2E Tests',
    'environment': process.env.NODE_ENV || 'test',
    'browser-versions': 'Latest stable versions'
  }
});

// Environment-specific configuration for CI
// if (process.env.NODE_ENV === 'ci') {
//   // CI-specific overrides
//   config.retries = 3;
//   config.workers = 2;
//   config.timeout = 45000;
//   
//   // Disable video recording on CI to save space
//   config.use.video = 'off';
//   config.use.screenshot = 'only-on-failure';
// }