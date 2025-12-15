/**
 * Playwright Configuration for Video and Thumbnail Tests
 * 
 * Specialized configuration for comprehensive video and media testing
 * with optimized settings for cross-browser compatibility.
 */

import { defineConfig, devices, PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: '../',
  testMatch: [
    '**/video-thumbnail-validation.spec.ts',
    '**/video-player-functionality.spec.ts', 
    '**/cross-browser-media-compatibility.spec.ts'
  ],
  
  // Longer timeout for media-heavy tests
  timeout: 90000,
  
  // Run tests in parallel but limit workers for media tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2,
  workers: process.env.CI ? 2 : 3,
  
  // Enhanced reporting for media tests
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report/video-thumbnail',
      open: 'never'
    }],
    ['json', { outputFile: 'test-results/video-thumbnail-results.json' }],
    ['junit', { outputFile: 'test-results/video-thumbnail-junit.xml' }],
    ['line']
  ],
  
  // Global test settings optimized for media
  use: {
    baseURL: 'http://localhost:5173',
    
    // Media-specific settings
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    
    // Longer timeouts for media loading
    navigationTimeout: 60000,
    actionTimeout: 30000,
    
    // Test timeout per individual test
    testTimeout: 90000,
    
    // Expect timeout for assertions (media can be slow)
    expect: {
      timeout: 30000,
      toHaveScreenshot: {
        threshold: 0.3, // More lenient for video thumbnails
        mode: 'strict'
      },
      toMatchScreenshot: {
        threshold: 0.3,
        mode: 'strict'
      }
    },

    // Extra headers for media testing
    extraHTTPHeaders: {
      'X-Test-Type': 'video-thumbnail',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    },

    // Ignore HTTPS errors for external media
    ignoreHTTPSErrors: true,
    
    // Locale settings
    locale: 'en-US',
    timezoneId: 'America/New_York'
  },

  // Comprehensive browser and device testing
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },

    // Cleanup project  
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },

    // Desktop browsers
    {
      name: 'chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // Media-specific flags
            '--autoplay-policy=no-user-gesture-required',
            '--disable-background-media-suspend',
            '--disable-background-timer-throttling'
          ]
        }
      },
      dependencies: ['setup']
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'media.navigator.streams.fake': true,
            // Media-specific prefs
            'media.autoplay.default': 0, // Allow autoplay
            'media.autoplay.blocking_policy': 0,
            'media.block-autoplay-until-in-foreground': false
          }
        }
      },
      dependencies: ['setup']
    },

    {
      name: 'safari-desktop',
      use: { 
        ...devices['Desktop Safari'],
        launchOptions: {
          slowMo: 200 // Slower for WebKit stability with media
        }
      },
      dependencies: ['setup']
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        hasTouch: true,
        isMobile: true
      },
      dependencies: ['setup']
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
      },
      dependencies: ['setup']
    },

    // Tablet testing
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        hasTouch: true
      },
      dependencies: ['setup']
    },

    // High DPI testing for thumbnails
    {
      name: 'high-dpi-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      },
      dependencies: ['setup']
    },

    // Network condition simulation
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          // Simulate slow 3G
          connectionType: '3g',
          offline: false
        }
      },
      dependencies: ['setup']
    },

    // Specific media format testing
    {
      name: 'media-formats',
      testMatch: '**/cross-browser-media-compatibility.spec.ts',
      use: {
        ...devices['Desktop Chrome']
      },
      dependencies: ['setup']
    },

    // Performance testing
    {
      name: 'performance',
      testMatch: '**/video-thumbnail-validation.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-pressure-signal'
          ]
        }
      },
      dependencies: ['setup']
    }
  ],

  // Global setup for media testing (disabled for now)
  // globalSetup: './global-media-setup.ts',

  // Output directory
  outputDir: 'test-results/video-thumbnail/',
  
  // Global timeout
  globalTimeout: 1200000, // 20 minutes for comprehensive media tests
  
  // Snapshot settings
  updateSnapshots: 'missing',
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    // Wait for media-heavy page to be ready
    stdout: 'pipe',
    stderr: 'pipe'
  },

  // Test metadata
  metadata: {
    'test-suite': 'Video and Thumbnail Functionality Tests',
    'test-types': [
      'YouTube Embed Testing',
      'Thumbnail Display Validation', 
      'Cross-browser Media Compatibility',
      'Video Player Interactions',
      'Mobile Media Support',
      'Performance Under Load',
      'Network Failure Handling'
    ],
    'browsers': ['Chrome', 'Firefox', 'Safari'],
    'devices': ['Desktop', 'Mobile', 'Tablet'],
    'media-formats': ['JPEG', 'PNG', 'WebP', 'GIF', 'SVG'],
    'video-sources': ['YouTube', 'Direct Embed'],
    'environment': process.env.NODE_ENV || 'test'
  }
};

export default defineConfig(config);