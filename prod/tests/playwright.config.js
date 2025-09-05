/**
 * Playwright Configuration for E2E Tests
 * Cross-browser testing with comprehensive coverage
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Test file patterns
  testMatch: '**/*.spec.js',
  
  // Global timeout for each test
  timeout: 60000,
  
  // Global timeout for expect assertions
  expect: {
    timeout: 10000
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    // Console reporter for local development
    ['line'],
    
    // HTML reporter for detailed results
    ['html', { 
      outputFolder: 'coverage/playwright-report',
      open: 'never'
    }],
    
    // JUnit reporter for CI integration
    ['junit', { 
      outputFile: 'coverage/playwright-results.xml'
    }],
    
    // JSON reporter for programmatic access
    ['json', {
      outputFile: 'coverage/playwright-results.json'
    }]
  ],
  
  // Global setup and teardown
  globalSetup: './utils/global-setup.js',
  globalTeardown: './utils/global-teardown.js',
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Global timeout for actions
    actionTimeout: 15000,
    
    // Global timeout for navigation
    navigationTimeout: 30000,
    
    // Collect trace on test failure
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on retry
    video: 'retain-on-failure',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Default viewport
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'Playwright E2E Tests',
    
    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York',
    
    // Color scheme
    colorScheme: 'light'
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      }
    },
    
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true
          }
        }
      }
    },
    
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKit-specific settings
      }
    },
    
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5']
      }
    },
    
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12']
      }
    },
    
    // Tablet testing
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro']
      }
    },
    
    // High DPI testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome HiDPI']
      }
    },
    
    // Edge browser (if available)
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge'
      }
    }
  ],
  
  // Web server configuration for development
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      PORT: '3000'
    }
  },
  
  // Test output directory
  outputDir: 'coverage/playwright-artifacts',
  
  // Maximum failures before stopping
  maxFailures: process.env.CI ? 10 : undefined,
  
  // Test metadata
  metadata: {
    testType: 'e2e',
    framework: 'playwright',
    approach: 'tdd-london-school'
  }
});