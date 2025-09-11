import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Dynamic Agent Pages E2E Tests
 * Phase 3: Agent home pages with comprehensive functionality testing
 */
export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    ['html', { 
      outputFolder: './reports/html',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: './reports/results.json' }],
    ['junit', { outputFile: './reports/results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  globalSetup: require.resolve('./config/global-setup.ts'),
  globalTeardown: require.resolve('./config/global-teardown.ts'),
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Performance tracking
    extraHTTPHeaders: {
      'Accept': 'application/json, text/plain, */*',
    },
  },

  projects: [
    // Setup project - runs before all tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project - runs after all tests
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
      },
      dependencies: ['setup'],
    },
    
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
      dependencies: ['setup'],
    },

    // Edge cases for dynamic agent pages
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
    },
    
    // Slow network simulation
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'Connection': 'close',
        },
      },
      dependencies: ['setup'],
    }
  ],

  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev:backend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore', 
      stderr: 'pipe',
    }
  ],

  // Test directory patterns
  testMatch: [
    '**/navigation/**/*.spec.ts',
    '**/content/**/*.spec.ts', 
    '**/customization/**/*.spec.ts',
    '**/responsive/**/*.spec.ts',
    '**/realtime/**/*.spec.ts',
    '**/performance/**/*.spec.ts',
    '**/accessibility/**/*.spec.ts',
  ],

  // Global test timeout
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
    toHaveScreenshot: { 
      threshold: 0.3,
      mode: 'diff-pixels'
    }
  },
});