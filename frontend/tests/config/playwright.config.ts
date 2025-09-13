/**
 * Playwright Configuration for Agent Dynamic Pages E2E Testing
 * Comprehensive configuration for cross-browser testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  outputDir: '../reports/playwright-results',
  
  // Test configuration
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting
  reporter: [
    ['html', { 
      outputFolder: '../reports/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../reports/playwright-results.json'
    }],
    ['junit', { 
      outputFile: '../reports/playwright-junit.xml'
    }],
    process.env.CI ? ['github'] : ['list'],
    ['allure-playwright', {
      outputFolder: '../reports/allure-results'
    }]
  ],
  
  // Global test settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Projects for different browsers and scenarios
  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility testing
        contextOptions: {
          reducedMotion: 'reduce',
          colorScheme: 'light',
        }
      },
      testMatch: '**/accessibility/**/*.spec.ts',
    },

    // Performance Testing
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing configuration
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      testMatch: '**/performance/**/*.spec.ts',
    },

    // Visual Regression Testing
    {
      name: 'visual',
      use: { 
        ...devices['Desktop Chrome'],
        // Visual testing configuration
        screenshot: 'only-on-failure',
      },
      testMatch: '**/visual/**/*.spec.ts',
    },

    // High DPI Testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
        viewport: { width: 1280, height: 720 },
      },
    },

    // Dark Mode Testing
    {
      name: 'dark-mode',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },

    // Slow Network Testing
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow 3G
        contextOptions: {
          offline: false,
        },
        launchOptions: {
          args: ['--force-device-scale-factor=1']
        }
      },
    }
  ],

  // Development server
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});