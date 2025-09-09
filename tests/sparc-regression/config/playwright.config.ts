/**
 * SPARC Regression Playwright Configuration
 * Optimized for regression testing with comprehensive browser coverage
 */

import { defineConfig, devices } from '@playwright/test';
import { SPARC_CONFIG, isCI } from './sparc-regression-config';

export default defineConfig({
  // Test discovery
  testDir: '../e2e',
  testMatch: '**/*.spec.ts',
  
  // Timeout configuration
  timeout: SPARC_CONFIG.timeouts.e2e,
  expect: { timeout: 10000 },
  
  // Test execution
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 2 : undefined,
  
  // Reporting
  reporter: [
    ['html', { 
      outputFolder: '../reports/playwright-report',
      open: !isCI ? 'on-failure' : 'never'
    }],
    ['json', { 
      outputFile: '../reports/regression-reports/e2e-results.json'
    }],
    ['junit', { 
      outputFile: '../reports/regression-reports/e2e-junit.xml'
    }],
    ...(isCI ? [['github'] as const] : []),
  ],
  
  // Global test setup
  globalSetup: require.resolve('../utilities/global-setup.ts'),
  globalTeardown: require.resolve('../utilities/global-teardown.ts'),
  
  // Test configuration
  use: {
    // Base URL
    baseURL: SPARC_CONFIG.apiBaseUrl,
    
    // Tracing and debugging
    trace: isCI ? 'retain-on-failure' : 'on',
    video: isCI ? 'retain-on-failure' : 'on',
    screenshot: 'only-on-failure',
    
    // Browser behavior
    ignoreHTTPSErrors: true,
    
    // Test metadata
    extraHTTPHeaders: {
      'X-Test-Suite': 'sparc-regression',
      'X-Test-Priority': 'P1',
    },
  },

  // Project configurations for different test categories
  projects: [
    // Critical path tests (P1) - Run on all browsers
    {
      name: 'critical-chrome',
      testDir: '../e2e/critical-paths',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'critical-firefox',
      testDir: '../e2e/critical-paths',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'critical-safari',
      testDir: '../e2e/critical-paths',
      use: { ...devices['Desktop Safari'] },
    },

    // Regression scenarios (P1) - Chrome only for speed
    {
      name: 'regression-scenarios',
      testDir: '../e2e/regression-scenarios',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    // Cross-browser tests (P2) - Full browser matrix
    {
      name: 'cross-browser-chrome',
      testDir: '../e2e/cross-browser',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'cross-browser-firefox',
      testDir: '../e2e/cross-browser',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'cross-browser-safari',
      testDir: '../e2e/cross-browser',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'cross-browser-edge',
      testDir: '../e2e/cross-browser',
      use: { ...devices['Desktop Edge'] },
    },

    // Mobile tests (P2)
    {
      name: 'mobile-chrome',
      testDir: '../e2e/critical-paths',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testDir: '../e2e/critical-paths',
      use: { ...devices['iPhone 14'] },
    },

    // Performance tests (P2) - Chrome only with specific settings
    {
      name: 'performance',
      testDir: '../e2e/performance',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      timeout: SPARC_CONFIG.timeouts.performance,
    },

    // Visual regression tests (P3) - Only if enabled
    ...(process.env.VISUAL_TESTS === 'true' ? [{
      name: 'visual',
      testDir: '../e2e/visual',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    }] : []),
  ],

  // Web server configuration for local development
  webServer: !isCI ? {
    command: 'npm run dev',
    port: 5173,
    cwd: '../../frontend',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  } : undefined,

  // Output directories
  outputDir: '../reports/test-results',
  
  // Metadata
  metadata: {
    testSuite: 'SPARC Regression Tests',
    version: '1.0.0',
    features: Object.keys(SPARC_CONFIG.criticalFeatures).filter(
      key => SPARC_CONFIG.criticalFeatures[key as keyof typeof SPARC_CONFIG.criticalFeatures]
    ),
    browsers: [...SPARC_CONFIG.browsers.desktop, ...SPARC_CONFIG.browsers.mobile],
    environment: SPARC_CONFIG.environment,
  },
});

// Test environment validation
if (!process.env.CI) {
  console.log(`🧪 SPARC Regression Tests Configuration Loaded`);
  console.log(`📍 Environment: ${SPARC_CONFIG.environment}`);
  console.log(`🌐 Base URL: ${SPARC_CONFIG.apiBaseUrl}`);
  console.log(`⏱️  Test Timeout: ${SPARC_CONFIG.timeouts.e2e}ms`);
  console.log(`🎯 Critical Features: ${Object.keys(SPARC_CONFIG.criticalFeatures).length}`);
}