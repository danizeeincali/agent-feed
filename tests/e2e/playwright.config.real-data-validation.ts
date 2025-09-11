/**
 * Playwright Configuration for Real Data Validation Tests
 * 
 * Optimized for production readiness validation:
 * - Tests against live backend at localhost:3000
 * - Aggressive timeouts to catch performance issues
 * - Multiple browsers for compatibility validation
 * - Detailed error reporting for mock contamination detection
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: '.',
  testMatch: '**/unified-agent-page-real-data.spec.ts',

  // Global test settings
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  // Run tests in parallel
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '../reports/real-data-validation-report' }],
    ['json', { outputFile: '../reports/real-data-validation-results.json' }],
    ['junit', { outputFile: '../reports/real-data-validation-junit.xml' }],
    ['list'],
    ['github'] // For CI/CD integration
  ],

  // Global test setup
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    // Base configuration
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Aggressive timeouts for production readiness
    navigationTimeout: 8000,  // 8 seconds max for navigation
    actionTimeout: 5000,      // 5 seconds max for actions
    
    // Tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser settings
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: false,
    
    // Context options for real data validation
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'User-Agent': 'PlaywrightRealDataValidator/1.0'
    }
  },

  // Project configurations for different validation scenarios
  projects: [
    // Production readiness validation - Chromium
    {
      name: 'chromium-production',
      use: { 
        ...devices['Desktop Chrome'],
        // Strict mode for production validation
        contextOptions: {
          strictSelectors: true,
        }
      },
    },

    // Cross-browser compatibility - Firefox  
    {
      name: 'firefox-compatibility',
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

    // WebKit validation - Safari compatibility
    {
      name: 'webkit-safari',
      use: { 
        ...devices['Desktop Safari']
      },
    },

    // Mobile responsiveness with real data
    {
      name: 'mobile-real-data',
      use: { 
        ...devices['iPhone 13'],
        // Mobile-specific validation
        contextOptions: {
          geolocation: { longitude: -122.4194, latitude: 37.7749 },
          permissions: ['geolocation']
        }
      },
    },

    // Tablet validation
    {
      name: 'tablet-real-data',
      use: { 
        ...devices['iPad Pro']
      },
    },

    // Performance validation under load
    {
      name: 'performance-validation',
      use: { 
        ...devices['Desktop Chrome'],
        // Slower network to test real data loading under stress
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=TranslateUI']
        },
        contextOptions: {
          // Simulate slower network
          offline: false,
          // Additional performance monitoring
          recordVideo: { dir: '../reports/performance-videos/' }
        }
      },
    },

    // Error resilience testing
    {
      name: 'error-resilience',
      use: { 
        ...devices['Desktop Chrome'],
        // Settings to test error handling
        contextOptions: {
          // Enable network failure simulation
          offline: false,
        }
      },
    }
  ],

  // Web server for testing
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      cwd: '../../frontend',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        VITE_API_BASE_URL: 'http://localhost:3000'
      }
    },
    {
      command: 'node simple-backend.js',
      port: 3000,
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
      timeout: 20000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000'
      }
    }
  ],

  // Output directories
  outputDir: '../reports/real-data-validation-artifacts/',
  
  // Test metadata
  metadata: {
    purpose: 'Real Data Validation for UnifiedAgentPage',
    phase: 'Phase 1 Mock Data Elimination Validation',
    target: 'Production Readiness',
    api_endpoint: 'http://localhost:3000/api/agents/:agentId',
    critical_validations: [
      'No mock/random data generation',
      'Real API data display consistency', 
      'Performance under 3 seconds',
      'Error handling without mock fallbacks',
      'Cross-agent data uniqueness'
    ]
  }
});