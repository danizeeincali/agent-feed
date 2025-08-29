import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Tripling Bug Reproduction
 * Optimized for capturing detailed evidence of the tripling behavior
 */
export default defineConfig({
  testDir: '/workspaces/agent-feed/tests/playwright',
  testMatch: '**/claude-tripling-bug-reproduction.spec.ts',
  
  /* Maximum time one test can run for */
  timeout: 60 * 1000, // 60 seconds for comprehensive analysis
  
  expect: {
    /* Maximum time expect() should wait for the condition to be met */
    timeout: 10000
  },
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for accurate mutation tracking
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI */
  workers: 1, // Single worker for consistent timing analysis
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'tests/playwright/tripling-bug-reports' }],
    ['json', { outputFile: 'tests/playwright/tripling-bug-results.json' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Capture console logs */
    ignoreHTTPSErrors: true,
    
    /* Extended viewport for better DOM observation */
    viewport: { width: 1920, height: 1080 },
    
    /* Slower actions for better observation */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-tripling-analysis',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable additional debugging features
        launchOptions: {
          args: [
            '--enable-logging',
            '--log-level=0',
            '--enable-automation',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        },
        // Slower typing for accurate character-by-character analysis
        slowMo: 100,
      },
    },
    
    {
      name: 'firefox-tripling-analysis',
      use: { 
        ...devices['Desktop Firefox'],
        slowMo: 100,
      },
    }
  ],

  /* Global setup for servers */
  globalSetup: require.resolve('./tripling-global-setup.ts'),
  globalTeardown: require.resolve('./tripling-global-teardown.ts'),

  /* Use existing dev servers */
  webServer: undefined, // Servers already running

  /* Configure reporting */
  reportSlowTests: {
    max: 5,
    threshold: 30000 // 30 seconds
  },

  /* Output settings for evidence collection */
  outputDir: 'tests/playwright/tripling-test-results/',
  
  /* Preserve outputs for analysis */
  preserveOutput: 'always'
});