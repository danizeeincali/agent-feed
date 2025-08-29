import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SSE Connection Testing
 * 
 * Comprehensive testing configuration for:
 * - SSE connection establishment and reliability
 * - Real-time message streaming validation
 * - Connection retry and error recovery
 * - Multiple concurrent connections
 * - Resource cleanup and management
 */
export default defineConfig({
  testDir: '.',
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  
  outputDir: 'test-results/',
  
  // Extended timeouts for SSE operations
  timeout: 180000, // 3 minutes for complex SSE scenarios
  
  expect: {
    timeout: 45000 // 45 seconds for SSE connection establishment
  },
  
  // Run tests sequentially to avoid resource conflicts
  fullyParallel: false,
  
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2,
  workers: 1, // Single worker for resource management
  
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/sse-connections-results.json' }],
    ['junit', { outputFile: 'test-results/sse-connections-results.xml' }],
    ['html', { 
      open: 'never',
      outputFolder: 'sse-connection-report'
    }]
  ],
  
  globalSetup: './utils/global-setup.ts',
  globalTeardown: './utils/global-teardown.ts',
  
  use: {
    baseURL: 'http://localhost:5173',
    
    // Extended timeouts for SSE operations
    actionTimeout: 45000,
    navigationTimeout: 90000,
    
    // Comprehensive artifacts for debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    viewport: { width: 1280, height: 720 },
    
    // Enable console logs for SSE debugging
    ignoreHTTPSErrors: true,
    
    extraHTTPHeaders: {
      'Accept': 'text/event-stream, application/json',
      'Cache-Control': 'no-cache'
    }
  },
  
  projects: [
    {
      name: 'chromium-sse',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--enable-logging',
            '--log-level=0'
          ]
        }
      },
    },
    
    {
      name: 'firefox-sse',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit-sse',
      use: { ...devices['Desktop Safari'] },
    }
  ]
});