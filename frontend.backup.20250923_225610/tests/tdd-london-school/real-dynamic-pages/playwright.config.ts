/**
 * Playwright Configuration for London School TDD - Real Dynamic Pages
 * 
 * CRITICAL: NO MOCKS POLICY
 * - All tests run against real browser with real services
 * - Focus on actual user interactions and behaviors
 * - Verify real system integration end-to-end
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './user-journey',
  
  // London School TDD: Real browser testing configuration
  fullyParallel: false, // Sequential for real integration testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Limited retries for real system testing
  workers: process.env.CI ? 2 : 1, // Conservative workers for real services
  
  // Real system integration reporter
  reporter: [
    ['html', { 
      outputFolder: './reports/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: './reports/test-results.json' 
    }],
    ['junit', { 
      outputFile: './reports/junit-results.xml' 
    }],
    ['list']
  ],
  
  use: {
    // Real browser configuration
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    // London School: Trace real user interactions
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Real interaction settings
    actionTimeout: 30000, // 30 seconds for real system responses
    navigationTimeout: 30000, // 30 seconds for real page loads
    
    // Real API integration
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'X-Test-Mode': 'london-school-tdd'
    }
  },

  // Real browser projects for cross-browser testing
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    
    {
      name: 'firefox-desktop', 
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Real mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Real tablet testing
    {
      name: 'tablet-chrome',
      use: { 
        ...devices['iPad Pro'],
      },
    }
  ],

  // Real service dependency setup
  webServer: [
    // Real backend service
    {
      command: 'npm run start:backend:test',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    },
    
    // Real frontend service
    {
      command: 'npm run build && npm run preview',
      cwd: '../../../',
      port: 5173,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        REACT_APP_API_URL: 'http://localhost:3000/api',
        REACT_APP_WS_URL: 'ws://localhost:3000/ws'
      }
    }
  ],

  // Global test setup for London School TDD
  globalSetup: require.resolve('./test-setup.ts'),
  
  // Test timeout for real system integration
  timeout: 60000, // 1 minute for real operations
  
  // Expect timeout for real assertions
  expect: {
    timeout: 10000 // 10 seconds for real element interactions
  },

  // Output directories
  outputDir: './reports/test-results',
  
  // London School TDD: Real system test metadata
  metadata: {
    testingApproach: 'London School TDD',
    mockPolicy: 'NO MOCKS - Real services only',
    integrationLevel: 'Full system integration',
    browserAutomation: 'Real user interactions',
    dataSource: 'Real backend with actual database'
  }
});