/**
 * Playwright Configuration for Agent Page E2E Tests
 * London School TDD - End-to-End Testing Configuration
 */

const { defineConfig, devices } = require('@playwright/test');

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration.
 */
module.exports = defineConfig({
  testDir: './e2e',
  
  // Timeout settings
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5 * 1000, // 5 seconds for expect assertions
  },
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting
  reporter: [
    ['html', { 
      outputFolder: '../coverage/playwright-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: '../coverage/playwright-results.json' 
    }],
    ['junit', { 
      outputFile: '../coverage/playwright-results.xml' 
    }],
    ['list'],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  // Global test settings
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser settings
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Performance and accessibility
    colorScheme: 'light',
    reducedMotion: 'reduce',
    
    // Test isolation
    contextOptions: {
      permissions: ['clipboard-read', 'clipboard-write'],
      geolocation: { longitude: -122.4194, latitude: 37.7749 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles'
    }
  },

  // Browser projects for cross-browser testing
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.e2e\.test\.js$/,
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.e2e\.test\.js$/,
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.e2e\.test\.js$/,
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /.*\.mobile\.e2e\.test\.js$/,
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testMatch: /.*\.mobile\.e2e\.test\.js$/,
    },
    
    // Accessibility testing
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Force high contrast mode for accessibility testing
        colorScheme: 'dark',
      },
      testMatch: /.*\.accessibility\.e2e\.test\.js$/,
    },
    
    // Performance testing
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Throttle for performance testing
        launchOptions: {
          args: [
            '--enable-features=NetworkServiceLogging',
            '--enable-logging=stderr',
            '--log-level=0',
          ]
        }
      },
      testMatch: /.*\.performance\.e2e\.test\.js$/,
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./utils/global-setup.js'),
  globalTeardown: require.resolve('./utils/global-teardown.js'),
  
  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      NODE_ENV: 'test'
    }
  },
  
  // Output directory
  outputDir: '../coverage/playwright-test-results/',
  
  // Test metadata
  metadata: {
    testType: 'e2e',
    framework: 'playwright',
    tddApproach: 'london-school',
    wcagLevel: 'AA',
    browserCompatibility: ['chrome', 'firefox', 'safari', 'mobile']
  }
});