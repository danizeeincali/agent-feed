/**
 * Mobile-Specific Playwright Configuration
 * Optimized configuration for mobile device testing
 * 
 * Features:
 * - Mobile device emulation
 * - Touch simulation
 * - Performance testing
 * - Visual regression testing
 * - Accessibility testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  outputDir: '../reports/mobile-playwright-results',
  
  // Test configuration
  timeout: 45000, // Longer timeout for mobile testing
  expect: {
    timeout: 15000, // Mobile devices may be slower
  },
  
  // Global setup and teardown
  globalSetup: './mobile-global-setup.ts',
  globalTeardown: './mobile-global-teardown.ts',
  
  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries for mobile testing
  workers: process.env.CI ? 2 : 4,
  
  // Reporting
  reporter: [
    ['html', { 
      outputFolder: '../reports/mobile-playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../reports/mobile-results.json'
    }],
    ['junit', { 
      outputFile: '../reports/mobile-junit.xml'
    }],
    process.env.CI ? ['github'] : ['list'],
    ['allure-playwright', {
      outputFolder: '../reports/mobile-allure-results'
    }]
  ],
  
  // Global test settings optimized for mobile
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 45000,
    
    // Mobile-specific settings
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Accessibility and performance
    contextOptions: {
      reducedMotion: 'reduce', // Better for testing
      forcedColors: 'none',
    }
  },

  // Projects for different mobile scenarios
  projects: [
    // === Core Mobile Devices ===
    {
      name: 'iPhone 12',
      use: { 
        ...devices['iPhone 12'],
        deviceScaleFactor: 3,
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts',
        '**/agent-pages-mobile-responsiveness.spec.ts',
        '**/touch-interactions.spec.ts'
      ]
    },
    {
      name: 'iPhone 12 Landscape',
      use: { 
        ...devices['iPhone 12 landscape'],
        deviceScaleFactor: 3,
      },
      testMatch: [
        '**/agent-pages-mobile-responsiveness.spec.ts'
      ]
    },
    {
      name: 'Galaxy S21',
      use: { 
        ...devices['Galaxy S20'],
        viewport: { width: 384, height: 854 },
        deviceScaleFactor: 2.75,
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts',
        '**/touch-interactions.spec.ts'
      ]
    },
    {
      name: 'iPad Mini',
      use: { 
        ...devices['iPad Mini'],
        deviceScaleFactor: 2,
      },
      testMatch: [
        '**/agent-pages-mobile-responsiveness.spec.ts',
        '**/mobile-component-registry.spec.ts'
      ]
    },

    // === Small Screen Testing ===
    {
      name: 'iPhone SE',
      use: { 
        ...devices['iPhone SE'],
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts',
        '**/touch-interactions.spec.ts'
      ]
    },
    {
      name: 'Small Mobile 320px',
      use: {
        viewport: { width: 320, height: 568 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts'
      ]
    },

    // === Touch-Specific Testing ===
    {
      name: 'Touch Interactions',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        // Enable more touch simulation features
        contextOptions: {
          ...devices['iPhone 12'].contextOptions,
          viewport: { width: 390, height: 844 }
        }
      },
      testMatch: [
        '**/touch-interactions.spec.ts'
      ]
    },

    // === Performance Testing on Mobile ===
    {
      name: 'Mobile Performance',
      use: {
        ...devices['iPhone 12'],
        // Simulate slower mobile CPU
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--memory-pressure-off',
            '--max_old_space_size=512'
          ]
        }
      },
      testMatch: [
        '**/agent-pages-mobile-responsiveness.spec.ts'
      ]
    },

    // === Slow Connection Testing ===
    {
      name: 'Slow 3G',
      use: {
        ...devices['iPhone 12'],
        // Simulate slow network
        contextOptions: {
          offline: false,
        },
        launchOptions: {
          args: ['--force-device-scale-factor=3']
        }
      },
      testMatch: [
        '**/agent-pages-mobile-responsiveness.spec.ts'
      ]
    },

    // === Accessibility Testing ===
    {
      name: 'Mobile Accessibility',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          reducedMotion: 'reduce',
          colorScheme: 'light',
          // Simulate large text
          viewport: { width: 390, height: 844 }
        }
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts',
        '**/touch-interactions.spec.ts'
      ]
    },

    // === Dark Mode Testing ===
    {
      name: 'Mobile Dark Mode',
      use: {
        ...devices['iPhone 12'],
        colorScheme: 'dark',
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts'
      ]
    },

    // === High DPI Testing ===
    {
      name: 'High DPI Mobile',
      use: {
        ...devices['iPhone 12'],
        deviceScaleFactor: 4, // Very high DPI
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts'
      ]
    },

    // === Cross-Browser Mobile Testing ===
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        // Safari-specific settings
        contextOptions: {
          ...devices['iPhone 12'].contextOptions,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        }
      },
      testMatch: [
        '**/touch-interactions.spec.ts'
      ]
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Chrome-specific mobile settings
        contextOptions: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36'
        }
      },
      testMatch: [
        '**/touch-interactions.spec.ts'
      ]
    },

    // === Visual Regression Testing ===
    {
      name: 'Mobile Visual Regression',
      use: {
        ...devices['iPhone 12'],
        screenshot: 'only-on-failure',
        // Consistent screenshot settings
        contextOptions: {
          reducedMotion: 'reduce',
          colorScheme: 'light',
        }
      },
      testMatch: [
        '**/mobile-component-registry.spec.ts',
        '**/agent-pages-mobile-responsiveness.spec.ts'
      ]
    }
  ],

  // Development server (if needed)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Mobile-specific test metadata
  metadata: {
    testType: 'mobile',
    deviceTesting: true,
    touchInteractions: true,
    responsiveDesign: true,
    accessibility: true,
    performance: true
  }
});