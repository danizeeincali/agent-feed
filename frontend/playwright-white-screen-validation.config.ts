/**
 * Playwright Configuration for White Screen Fix Validation
 * 
 * Specialized configuration for validating the SimpleLauncher component
 * after fixing duplicate import issues that caused white screen.
 * 
 * This configuration includes:
 * - Proper server setup for both frontend (3000) and backend (3001)
 * - Extended timeouts for thorough validation
 * - Comprehensive error reporting
 * - Screenshots and videos for debugging
 * - Multiple browser testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: '**/simple-launcher-white-screen-validation.spec.ts',
  
  /* Run tests in parallel for faster execution */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI for flaky tests */
  retries: process.env.CI ? 2 : 1,
  
  /* Reduce workers for stability during validation */
  workers: process.env.CI ? 2 : 4,
  
  /* Enhanced reporting for validation */
  reporter: [
    ['html', { outputFolder: 'playwright-report/white-screen-validation' }],
    ['junit', { outputFile: 'test-results/white-screen-validation.xml' }],
    ['list'],
  ],
  
  /* Global test configuration */
  use: {
    /* Base URL points to frontend */
    baseURL: 'http://localhost:3000',
    
    /* Enhanced debugging and error capture */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Extended timeout for thorough validation */
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    /* Capture network activity for API validation */
    recordVideo: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
  },
  
  /* Expect configuration */
  expect: {
    /* Extended timeout for DOM assertions */
    timeout: 10000,
  },
  
  /* Configure projects for comprehensive browser testing */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5']
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12']
      },
    },
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro']
      },
    },
  ],
  
  /* Start dev servers before running tests */
  webServer: [
    {
      // Frontend server on port 3000
      command: 'npm run dev -- --port 3000 --host 0.0.0.0',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      // Backend server on port 3001
      command: 'cd ../.. && npm run dev -- --port 3001',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'development'
      }
    }
  ],
  
  /* Output directory for test artifacts */
  outputDir: 'test-results/white-screen-validation',
  
  /* Global setup and teardown */
  // globalSetup: './tests/setup/global-setup.ts',
  // globalTeardown: './tests/setup/global-teardown.ts',
});