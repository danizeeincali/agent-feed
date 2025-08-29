import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for TDD London School Testing
 * 
 * FOCUS: Mock-driven testing with behavior verification
 * APPROACH: Outside-in TDD with contract testing
 * PURPOSE: Reproduce and fix Claude instance duplication bug
 */

export default defineConfig({
  testDir: './',
  
  // Test execution configuration
  fullyParallel: false, // Sequential execution for behavior verification
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for consistent mock behavior
  
  // Test timeouts
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  
  // Reporting configuration
  reporter: [
    ['html', { 
      outputFolder: './test-results/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: './test-results/results.json' 
    }],
    ['junit', { 
      outputFile: './test-results/junit.xml' 
    }],
    ['list', { printSteps: true }] // Detailed step output for TDD
  ],
  
  // Global test configuration
  use: {
    // Application URL
    baseURL: 'http://localhost:5173',
    
    // Browser configuration
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Test artifacts
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // TDD-specific settings
    ignoreHTTPSErrors: true,
    acceptDownloads: false,
    
    // Enhanced debugging for mock verification
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
    }
  },
  
  // Test projects (browsers and scenarios)
  projects: [
    {
      name: 'chromium-duplication-tests',
      use: { 
        ...devices['Desktop Chrome'],
        // TDD London School: Enhanced debugging
        contextOptions: {
          recordVideo: { dir: './test-results/videos/' }
        }
      },
      testMatch: ['london-school-duplication-test.spec.ts', 'claude-duplication-regression.spec.ts']
    },
    {
      name: 'firefox-duplication-tests',
      use: { 
        ...devices['Desktop Firefox'] 
      },
      testMatch: ['london-school-duplication-test.spec.ts']
    },
    {
      name: 'webkit-duplication-tests',
      use: { 
        ...devices['Desktop Safari'] 
      },
      testMatch: ['london-school-duplication-test.spec.ts']
    }
  ],
  
  // Test dependencies and setup
  dependencies: [
    // Ensure backend is running
    {
      name: 'backend-setup',
      testDir: './setup',
      testMatch: 'backend-health.setup.ts'
    }
  ],
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
  // Web servers to start before testing
  webServer: [
    {
      command: 'cd /workspaces/agent-feed && node simple-backend.js',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    },
    {
      command: 'cd /workspaces/agent-feed/frontend && npm run dev -- --port 5173',
      port: 5173,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: 'http://localhost:3000'
      }
    }
  ],
  
  // Output directories
  outputDir: './test-results/artifacts'
});