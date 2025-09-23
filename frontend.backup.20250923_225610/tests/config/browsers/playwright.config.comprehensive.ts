import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Playwright configuration for Agent Profile Dynamic Pages Testing
 * Supports cross-browser testing, mobile viewports, network conditions, and performance metrics
 */
export default defineConfig({
  testDir: '../e2e/agent-profiles',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['html', { outputFolder: '../reports/comprehensive/html-report' }],
    ['json', { outputFile: '../reports/comprehensive/test-results.json' }],
    ['junit', { outputFile: '../reports/comprehensive/junit-results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.CI ? true : false,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        },
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile Devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    
    // Network Conditions
    {
      name: 'slow-3g',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
    {
      name: 'fast-3g',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
    
    // Performance Testing
    {
      name: 'performance-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-web-security', '--enable-precise-memory-info'],
        },
      },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});