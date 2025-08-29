import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for UI Modernization Tests
 * 
 * Professional interface validation with comprehensive testing across
 * browsers, devices, and performance scenarios.
 */

export default defineConfig({
  testDir: './specs',
  
  // Run tests in parallel for faster execution
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 3 : 1,
  
  // Worker configuration for parallel execution
  workers: process.env.CI ? 2 : undefined,
  
  // Enhanced reporter configuration for UI testing
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report-ui-modernization',
      open: 'never',
      attachmentsBaseURL: 'https://ui-modernization-test-results/'
    }],
    ['json', { outputFile: 'test-results/ui-modernization-results.json' }],
    ['junit', { outputFile: 'test-results/ui-modernization-junit.xml' }],
    ['list'],
    // Custom reporter for UI-specific metrics
    ['./utils/ui-test-reporter.ts']
  ],
  
  // Global test configuration
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:5173',
    
    // Enhanced tracing for UI tests
    trace: 'retain-on-failure',
    
    // Screenshot configuration for visual regression
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // Video recording for debugging
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },
    
    // Timeout configurations optimized for UI testing
    navigationTimeout: 30000,
    actionTimeout: 10000,
    testTimeout: 60000,
    
    // Expect configuration for visual regression
    expect: {
      timeout: 10000,
      toHaveScreenshot: {
        threshold: 0.2,
        mode: 'strict',
        animations: 'disabled'
      },
      toMatchScreenshot: {
        threshold: 0.2,
        mode: 'strict',
        animations: 'disabled'
      }
    },

    // Headers for API testing
    extraHTTPHeaders: {
      'X-Test-Environment': 'ui-modernization',
      'Accept': 'application/json'
    },

    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,

    // Locale and timezone for consistent testing
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Color scheme preference
    colorScheme: 'light'
  },

  // Browser and device configurations for comprehensive testing
  projects: [
    // Setup project for initialization
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

    // Desktop Chrome - Primary testing browser for professional UI
    {
      name: 'desktop-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--disable-dev-shm-usage',
            '--no-sandbox'
          ]
        }
      },
      dependencies: ['setup']
    },

    // Desktop Firefox - Cross-browser compatibility
    {
      name: 'desktop-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'media.navigator.streams.fake': true
          }
        }
      },
      dependencies: ['setup']
    },

    // Desktop Safari (WebKit) - Apple ecosystem compatibility
    {
      name: 'desktop-safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          slowMo: 50 // Slightly slower for WebKit stability
        }
      },
      dependencies: ['setup']
    },

    // Mobile Chrome - Touch interactions and responsive design
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2.75
      },
      dependencies: ['setup']
    },

    // Mobile Safari - iOS compatibility and touch interactions
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3
      },
      dependencies: ['setup']
    },

    // Tablet testing - Mid-size responsive design
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
        hasTouch: true,
        deviceScaleFactor: 2
      },
      dependencies: ['setup']
    },

    // High DPI desktop testing
    {
      name: 'desktop-high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      },
      dependencies: ['setup']
    },

    // Ultra-wide desktop testing
    {
      name: 'desktop-ultrawide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1
      },
      dependencies: ['setup']
    },

    // Performance testing configuration
    {
      name: 'performance-tests',
      testMatch: '**/performance-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info'
          ]
        }
      },
      dependencies: ['setup']
    },

    // Visual regression testing
    {
      name: 'visual-regression',
      testMatch: '**/visual-regression.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ['--disable-background-animations']
        }
      },
      dependencies: ['setup']
    },

    // Accessibility testing
    {
      name: 'accessibility',
      testMatch: '**/accessibility-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility features
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--enable-accessibility-logging'
          ]
        }
      },
      dependencies: ['setup']
    },

    // Dark mode testing
    {
      name: 'dark-mode',
      testMatch: '**/dark-mode-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark'
      },
      dependencies: ['setup']
    },

    // Reduced motion testing for accessibility
    {
      name: 'reduced-motion',
      testMatch: '**/reduced-motion-*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce'
      },
      dependencies: ['setup']
    }
  ],

  // Global setup and teardown
  globalSetup: './utils/global-setup.ts',
  globalTeardown: './utils/global-teardown.ts',

  // Test pattern matching
  testMatch: [
    '**/specs/**/*.spec.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Files to ignore
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.backup.*',
    '**/temp/**'
  ],

  // Web server configuration for testing
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  // Output directory for test artifacts
  outputDir: 'test-results/ui-modernization/',
  
  // Maximum time the whole test suite can run
  globalTimeout: 1800000, // 30 minutes
  
  // Timeout for individual tests
  timeout: 90000, // 90 seconds
  
  // Update snapshots mode
  updateSnapshots: 'missing',
  
  // Test metadata
  metadata: {
    'test-suite': 'UI Modernization Validation',
    'target-application': 'Claude Instance Manager',
    'test-categories': [
      'Professional Button Functionality',
      'Chat Interface Integration',
      'Visual Regression Validation',
      'Functional Preservation',
      'Cross-browser Compatibility',
      'Performance & Animation Testing'
    ],
    'browsers': ['Chrome', 'Firefox', 'Safari'],
    'devices': ['Desktop', 'Mobile', 'Tablet'],
    'viewport-ranges': ['320px - 2560px width'],
    'test-environment': process.env.NODE_ENV || 'test'
  }
});
