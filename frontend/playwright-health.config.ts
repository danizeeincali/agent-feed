import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Frontend Health Tests
 * 
 * Simplified configuration focused on health checks for the frontend application
 * running on localhost:3000
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in sequence for health checks
  fullyParallel: false,
  
  // No retries for health checks - we want to see actual status
  retries: 0,
  
  // Single worker for health checks
  workers: 1,
  
  // Reporter configuration - comprehensive reporting for health checks
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/frontend-health-results.json' }],
    ['junit', { outputFile: 'test-results/frontend-health-junit.xml' }],
    ['line']
  ],
  
  // Shared settings for health tests
  use: {
    // Base URL - using the running dev server
    baseURL: 'http://localhost:3000',
    
    // Always collect traces for debugging
    trace: 'on',
    
    // Capture screenshots on both success and failure for health checks
    screenshot: 'always',
    
    // Record video for all tests to see what's happening
    video: 'retain-on-failure',
    
    // Longer timeouts for health checks
    navigationTimeout: 30000,
    actionTimeout: 10000,
    testTimeout: 60000,
    
    // Expect timeout for assertions
    expect: {
      timeout: 15000
    },
    
    // Additional browser context options
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
  },

  // Test only Chromium for health checks to keep it simple
  projects: [
    {
      name: 'chromium-health',
      use: { 
        ...devices['Desktop Chrome'],
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
    }
  ],

  // Test pattern - only our health test
  testMatch: '**/frontend-health.spec.ts',

  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Maximum time for the entire test suite
  globalTimeout: 300000, // 5 minutes
  
  // Timeout per individual test
  timeout: 90000, // 90 seconds per test
  
  // Don't update snapshots automatically
  updateSnapshots: 'none',
  
  // Metadata for the health check run
  metadata: {
    'test-suite': 'Frontend Health Check',
    'target-url': 'http://localhost:3000',
    'environment': 'development',
    'purpose': 'Verify frontend is running and accessible'
  }
});