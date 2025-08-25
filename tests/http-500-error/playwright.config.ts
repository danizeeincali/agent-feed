/**
 * Playwright Configuration for E2E HTTP 500 Error Tests
 * Configured for comprehensive button click and error handling testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/http-500-error',
  
  // Test file patterns
  testMatch: [
    '**/e2e-*.spec.ts',
    '**/e2e-*.spec.js'
  ],

  // Global timeout for each test
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },

  // Fail fast on first failure in CI
  fullyParallel: !process.env.CI,
  
  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,
  
  // Number of retries
  retries: process.env.CI ? 2 : 1,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report/http-500-errors' }],
    ['json', { outputFile: 'test-results/http-500-error-results.json' }],
    ['junit', { outputFile: 'test-results/http-500-error-junit.xml' }],
    ['line']
  ],

  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Browser settings
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Action timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Context options
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Suite': 'HTTP-500-Errors'
    }
  },

  // Test projects for different browsers and scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium-http-500',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/e2e-*.spec.ts'
    },

    {
      name: 'firefox-http-500',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/e2e-*.spec.ts'
    },

    {
      name: 'webkit-http-500',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/e2e-*.spec.ts'
    },

    // Mobile browsers
    {
      name: 'mobile-chrome-http-500',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/e2e-*.spec.ts'
    },

    {
      name: 'mobile-safari-http-500',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/e2e-*.spec.ts'
    },

    // Error-specific test configurations
    {
      name: 'network-errors',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow network
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
      testMatch: '**/network-*.spec.ts'
    },

    {
      name: 'timeout-errors',
      use: {
        ...devices['Desktop Chrome'],
        // Short timeouts for testing timeout scenarios
        actionTimeout: 2000,
        navigationTimeout: 5000
      },
      testMatch: '**/timeout-*.spec.ts'
    },

    // High-load testing
    {
      name: 'stress-testing',
      use: {
        ...devices['Desktop Chrome'],
        // Multiple concurrent connections
        launchOptions: {
          args: ['--max-connections-per-host=50']
        }
      },
      testMatch: '**/stress-*.spec.ts'
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup-playwright.ts'),
  globalTeardown: require.resolve('./global-teardown-playwright.ts'),

  // Web server configuration for testing
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'node simple-server.js',
      port: 3001,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'node backend-terminal-server.js',
      port: 3002,
      timeout: 30000,
      reuseExistingServer: !process.env.CI
    }
  ],

  // Output directory
  outputDir: 'test-results/http-500-error-artifacts',

  // Test metadata
  metadata: {
    testSuite: 'HTTP 500 Error Handling Tests',
    description: 'Comprehensive testing of button clicks and server error responses',
    coverage: [
      'API endpoint error handling',
      'UI error state management', 
      'Network failure recovery',
      'Process spawn failures',
      'Timeout handling',
      'Error boundary testing'
    ]
  }
});