import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Comprehensive Playwright E2E Testing Configuration
 * Agent Feed Posting System - Complete Testing Suite
 */
export default defineConfig({
  // Test directory configuration
  testDir: './specs',
  testMatch: '**/*.spec.ts',
  
  // Global test settings
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 15 * 1000, // 15 seconds for assertions
  },
  
  // Test execution configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'reports/html',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'reports/json/results.json'
    }],
    ['junit', { 
      outputFile: 'reports/junit/results.xml'
    }],
    ['line'],
    ...(process.env.CI ? [['github']] : [])
  ],

  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    
    // Browser configuration
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Screenshot and video configuration
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Network configuration
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },
    
    // Paths for artifacts
    screenshot: 'only-on-failure',
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
  },

  // Output directories
  outputDir: './test-results',
  
  // Global setup and teardown
  globalSetup: './config/global-setup.ts',
  globalTeardown: './config/global-teardown.ts',

  // Projects for different testing scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'] 
      },
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'] 
      },
      testMatch: '**/*.spec.ts',
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'] 
      },
      testMatch: '**/mobile/*.spec.ts',
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'] 
      },
      testMatch: '**/mobile/*.spec.ts',
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--enable-precise-memory-info',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
      testMatch: '**/performance/*.spec.ts',
      timeout: 120 * 1000, // Extended timeout for performance tests
    },

    // Visual regression testing
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: '**/visual/*.spec.ts',
    },

    // API testing
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
      },
      testMatch: '**/api/*.spec.ts',
    },

    // Load testing
    {
      name: 'load-test',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/load/*.spec.ts',
      timeout: 300 * 1000, // 5 minutes for load tests
      workers: 1, // Sequential execution for load tests
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3001,
    timeout: 60 * 1000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'test'
    }
  }
});