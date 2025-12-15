/**
 * Advanced Browser Simulation Testing Configuration
 * Comprehensive E2E testing with real user behavior simulation
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory configuration
  testDir: './specs',
  testMatch: '**/*.simulation.js',
  
  // Global test settings
  timeout: 120 * 1000, // 2 minutes per test for complex simulations
  expect: {
    timeout: 30 * 1000, // 30 seconds for assertions
  },
  
  // Test execution configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : 4, // More workers for simulation tests
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'reports/browser-simulation',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'reports/simulation-results.json'
    }],
    ['junit', { 
      outputFile: 'reports/simulation-junit.xml'
    }],
    ['line'],
    // Custom simulation reporter
    [path.resolve('./utils/simulation-reporter.js')]
  ],

  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    
    // Browser configuration for realistic simulation
    headless: process.env.CI ? true : false,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    
    // Screenshot and video configuration
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Realistic user behavior settings
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 100, // Slow down for realistic simulation
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    },
    
    // User agent for realistic simulation
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Performance and network settings
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  // Output directories
  outputDir: './test-results/browser-simulation',
  
  // Global setup and teardown
  globalSetup: './config/simulation-setup.js',
  globalTeardown: './config/simulation-teardown.js',

  // Projects for different simulation scenarios
  projects: [
    // Desktop simulation with realistic user behavior
    {
      name: 'desktop-simulation',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
      testMatch: '**/desktop/*.simulation.js',
    },

    // Mobile simulation
    {
      name: 'mobile-simulation',
      use: { 
        ...devices['iPhone 13 Pro'],
        isMobile: true,
        hasTouch: true,
      },
      testMatch: '**/mobile/*.simulation.js',
    },

    // Tablet simulation
    {
      name: 'tablet-simulation',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true,
      },
      testMatch: '**/tablet/*.simulation.js',
    },

    // Performance simulation under load
    {
      name: 'performance-simulation',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--enable-precise-memory-info',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            // Simulate slower CPU
            '--enable-begin-frame-control',
            '--run-all-compositor-stages-before-draw'
          ]
        }
      },
      testMatch: '**/performance/*.simulation.js',
      timeout: 300 * 1000, // 5 minutes for performance tests
    },

    // Network condition simulation
    {
      name: 'network-simulation',
      use: {
        ...devices['Desktop Chrome'],
        // Will be configured per test for different network conditions
      },
      testMatch: '**/network/*.simulation.js',
    },

    // Accessibility simulation
    {
      name: 'accessibility-simulation',
      use: {
        ...devices['Desktop Chrome'],
        // Screen reader and keyboard navigation simulation
        reducedMotion: 'reduce',
        forcedColors: 'active',
      },
      testMatch: '**/accessibility/*.simulation.js',
    },

    // Cross-browser simulation
    {
      name: 'firefox-simulation',
      use: { 
        ...devices['Desktop Firefox'] 
      },
      testMatch: '**/cross-browser/*.simulation.js',
    },
    {
      name: 'safari-simulation',
      use: { 
        ...devices['Desktop Safari'] 
      },
      testMatch: '**/cross-browser/*.simulation.js',
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3001,
    timeout: 120 * 1000,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'test'
    }
  }
});
