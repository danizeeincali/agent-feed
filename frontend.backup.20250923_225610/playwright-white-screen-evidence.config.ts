import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for white screen evidence collection
 * This config enables verbose logging, screenshots, and multi-browser testing
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/white-screen-evidence.spec.ts',
  
  // Run tests in parallel but limit workers to avoid overwhelming the dev server
  fullyParallel: false,
  workers: 1,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter config - output detailed results
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/white-screen-evidence-results.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],

  // Global test settings
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace on failure for debugging
    trace: 'retain-on-failure',
    
    // Take screenshots on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Increase timeouts for evidence collection
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // Configure test output directory
  outputDir: 'test-results/',

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable additional Chrome features for debugging
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging',
            '--log-level=0'
          ]
        }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },
    // Uncomment for WebKit testing (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run the dev server before starting tests
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});