import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Claude Instance Management E2E Tests
 * 
 * Advanced E2E testing framework with visual regression, performance monitoring,
 * NLD pattern detection, and comprehensive cross-browser testing.
 */

export default defineConfig({
  testDir: './tests',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 3 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration with enhanced reporting
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'retain-on-failure',
    
    // Capture screenshot on failure and success for visual regression
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 45000,
    
    // Action timeout
    actionTimeout: 15000,
    
    // Test timeout per test
    testTimeout: 120000,
    
    // Expect timeout for assertions
    expect: {
      timeout: 15000,
      toHaveScreenshot: {
        threshold: 0.2,
        mode: 'strict'
      },
      toMatchScreenshot: {
        threshold: 0.2,
        mode: 'strict'
      }
    },

    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright'
    },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York'
  },

  // Configure projects for comprehensive browser testing
  projects: [
    // Setup project for authentication and initial state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },

    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },

    // Desktop Chrome - Primary testing browser
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      },
      dependencies: ['setup']
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'media.navigator.streams.fake': true
          }
        }
      },
      dependencies: ['setup']
    },

    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        launchOptions: {
          slowMo: 100 // Slower for WebKit stability
        }
      },
      dependencies: ['setup']
    },

    // Mobile Chrome Testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        hasTouch: true,
        isMobile: true
      },
      dependencies: ['setup']
    },

    // Mobile Safari Testing
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      },
      dependencies: ['setup']
    },

    // Tablet Testing
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        hasTouch: true
      },
      dependencies: ['setup']
    },

    // High DPI Testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      },
      dependencies: ['setup']
    },

    // Performance Testing Project
    {
      name: 'performance',
      testDir: './tests/performance',
      use: {
        ...devices['Desktop Chrome']
      },
      dependencies: ['setup']
    },

    // Visual Regression Testing
    {
      name: 'visual-regression',
      testDir: './tests/visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ['setup']
    },

    // NLD Pattern Detection Tests
    {
      name: 'nld-patterns',
      testDir: './tests/nld-patterns',
      use: {
        ...devices['Desktop Chrome']
      },
      dependencies: ['setup']
    }
  ],

  // Global setup and teardown
  globalSetup: './tests/e2e/utils/global-setup.ts',

  // Test directory patterns
  testMatch: [
    '**/e2e/**/*.spec.ts',
    '**/performance/**/*.spec.ts',
    '**/visual-regression/**/*.spec.ts',
    '**/nld-patterns/**/*.spec.ts'
  ],

  // Files to ignore
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.backup.*'
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Maximum time the whole test suite can run
  globalTimeout: 900000, // 15 minutes
  
  // Timeout for expect assertions
  timeout: 60000,
  
  // Whether to update snapshots
  updateSnapshots: 'missing',
  
  // Metadata
  metadata: {
    'test-suite': 'Claude Instance Management E2E Tests',
    'environment': process.env.NODE_ENV || 'test',
    'browser-versions': 'Latest stable versions',
    'features': [
      'Visual Regression Testing',
      'Performance Monitoring', 
      'NLD Pattern Detection',
      'Cross-browser Compatibility',
      'Mobile Device Testing'
    ]
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