import { defineConfig, devices } from '@playwright/test';

/**
 * PLAYWRIGHT THREADING TEST CONFIGURATION
 * 
 * Specialized configuration for comment threading validation tests
 */

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/playwright-comment-threading-validation.spec.ts',
    '**/navigation-validation.spec.ts'
  ],
  
  // Test execution settings
  fullyParallel: false, // Run threading tests sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once on failure
  workers: 1, // Single worker for threading tests
  timeout: 60000, // 60 second timeout per test
  
  // Test output and reporting
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-html', open: 'never' }],
    ['json', { outputFile: 'tests/reports/threading-results.json' }],
    ['junit', { outputFile: 'tests/reports/threading-junit.xml' }],
    ['line']
  ],
  
  // Global test settings
  use: {
    baseURL: 'http://localhost:5173',
    
    // Browser settings for threading tests
    headless: true, // Must be true in codespace environment
    viewport: { width: 1280, height: 720 },
    
    // Navigation and timing
    navigationTimeout: 30000,
    actionTimeout: 10000,
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Additional context options for threading tests
    ignoreHTTPSErrors: true,
    colorScheme: 'light',
    
    // Custom options for threading validation
    contextOptions: {
      recordVideo: {
        dir: 'tests/videos/',
        size: { width: 1280, height: 720 }
      }
    }
  },

  // Browser projects for threading tests
  projects: [
    {
      name: 'chromium-threading',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable additional chrome features for better threading testing
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
      name: 'chromium-mobile',
      use: { 
        ...devices['Pixel 5'],
        // Test threading on mobile viewports
      },
    }
  ],

  // Web servers for testing
  webServer: [
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'ignore',
      stderr: 'pipe'
    },
    {
      command: 'node simple-backend.js',
      url: 'http://localhost:3000/api/health',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  ],

  // Global setup and teardown for threading tests
  globalSetup: require.resolve('./tests/global-threading-setup.js'),
  globalTeardown: require.resolve('./tests/global-threading-teardown.js'),

  // Test metadata
  metadata: {
    testType: 'threading-validation',
    version: '1.0.0',
    description: 'Comment threading and navigation validation tests',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString()
  }
});