/**
 * Playwright Configuration for WebSocket Hub E2E Tests
 * Specialized configuration for comprehensive WebSocket testing
 */

import { defineConfig, devices } from '@playwright/test';
import { globalSetup, globalTeardown } from './src/tests/e2e/websocket-hub-setup';

export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/websocket-hub-*.spec.ts',
  
  /* Global setup and teardown */
  globalSetup: './src/tests/e2e/websocket-hub-setup.ts',
  globalTeardown: './src/tests/e2e/websocket-hub-setup.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for WebSocket tests to avoid port conflicts
  
  /* Retry configuration */
  retries: process.env.CI ? 3 : 1,
  
  /* Test timeout - increased for WebSocket operations */
  timeout: 120 * 1000, // 2 minutes per test
  
  /* Expect timeout - increased for WebSocket responses */
  expect: {
    timeout: 15 * 1000, // 15 seconds for assertions
  },
  
  /* Bail after first failure in CI */
  forbidOnly: !!process.env.CI,
  
  /* Workers - limit for WebSocket tests */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter configuration */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/websocket-hub-e2e/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/websocket-hub-e2e/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/websocket-hub-e2e/results.xml' 
    }],
    ['line'],
    // Custom reporter for WebSocket metrics
    ['./src/tests/e2e/reporters/websocket-reporter.ts']
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URLs */
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    
    /* Trace configuration */
    trace: 'retain-on-failure',
    
    /* Screenshot configuration */
    screenshot: 'only-on-failure',
    
    /* Video configuration */
    video: 'retain-on-failure',
    
    /* Action and navigation timeouts */
    actionTimeout: 30 * 1000, // 30 seconds
    navigationTimeout: 60 * 1000, // 1 minute
    
    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,
    
    /* Accept downloads for test artifacts */
    acceptDownloads: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Suite': 'WebSocket-Hub-E2E',
      'X-Test-Timestamp': new Date().toISOString()
    },
    
    /* Permissions for WebSocket testing */
    permissions: ['websocket'],
    
    /* Viewport settings */
    viewport: { width: 1920, height: 1080 },
    
    /* Color scheme */
    colorScheme: 'light',
    
    /* Locale */
    locale: 'en-US',
    timezoneId: 'America/New_York'
  },
  
  /* Configure test projects for different scenarios */
  projects: [
    /* Core WebSocket functionality tests */
    {
      name: 'websocket-core',
      testMatch: '**/websocket-hub-e2e.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      fullyParallel: false
    },
    
    /* Performance and load testing */
    {
      name: 'websocket-performance',
      testMatch: '**/websocket-performance-*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      fullyParallel: false,
      timeout: 300 * 1000, // 5 minutes for performance tests
    },
    
    /* Security testing */
    {
      name: 'websocket-security',
      testMatch: '**/websocket-security-*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      fullyParallel: false
    },
    
    /* Cross-browser compatibility */
    {
      name: 'websocket-firefox',
      testMatch: '**/websocket-hub-e2e.spec.ts',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      }
    },
    
    {
      name: 'websocket-webkit',
      testMatch: '**/websocket-hub-e2e.spec.ts',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      }
    },
    
    /* Mobile testing */
    {
      name: 'websocket-mobile-chrome',
      testMatch: '**/websocket-mobile-*.spec.ts',
      use: { 
        ...devices['Pixel 5'],
      }
    },
    
    {
      name: 'websocket-mobile-safari',
      testMatch: '**/websocket-mobile-*.spec.ts',
      use: { 
        ...devices['iPhone 12'],
      }
    },
    
    /* Edge cases and error conditions */
    {
      name: 'websocket-edge-cases',
      testMatch: '**/websocket-edge-*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      fullyParallel: false,
      retries: 0 // No retries for edge case tests
    }
  ],
  
  /* Web server configuration - conditional startup */
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
        WEBSOCKET_ENABLED: 'true',
        VITE_WS_URL: 'ws://localhost:3000'
      }
    }
  ],
  
  /* Output directory */
  outputDir: 'test-results/websocket-hub-e2e/artifacts',
  
  /* Metadata */
  metadata: {
    testSuite: 'WebSocket Hub E2E',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString()
  }
});