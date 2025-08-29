import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Escape Sequence Storm Prevention Tests
 * 
 * This configuration is optimized for testing terminal escape sequence storm
 * prevention across multiple browsers and devices with comprehensive reporting.
 */
export default defineConfig({
  // Test directory
  testDir: './tests/playwright/escape-sequence-storm',
  
  // Global test timeout
  timeout: 60000, // 60 seconds per test
  
  // Global setup/teardown timeout
  globalTimeout: 1800000, // 30 minutes for entire test suite
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000 // 10 seconds for expect assertions
  },
  
  // Test execution settings
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Forbid test.only in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests
  workers: process.env.CI ? 4 : 6, // Number of parallel workers
  
  // Reporter configuration
  reporter: [
    // HTML reporter for detailed visual reports
    ['html', { 
      outputFolder: './test-results/escape-sequence-storm/playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    
    // JSON reporter for CI/CD integration
    ['json', { 
      outputFile: './test-results/escape-sequence-storm/results.json' 
    }],
    
    // JUnit reporter for CI systems
    ['junit', { 
      outputFile: './test-results/escape-sequence-storm/results.xml' 
    }],
    
    // Line reporter for console output
    ['line'],
    
    // GitHub Actions reporter if running in GitHub
    ...(process.env.GITHUB_ACTIONS ? [['github']] : [])
  ],
  
  // Global test settings
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Browser settings
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Trace collection for debugging
    trace: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 15000, // 15 seconds for actions
    
    // Navigation timeout
    navigationTimeout: 30000, // 30 seconds for navigation
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Permissions (for notifications, clipboard, etc.)
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Suite': 'escape-sequence-storm-prevention'
    }
  },

  // Project configurations for different browsers and scenarios
  projects: [
    // --- Desktop Browsers ---
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Override viewport for consistent testing
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // --- Edge Browser ---
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // --- Mobile Devices ---
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // --- Tablets ---
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    
    {
      name: 'tablet-safari',
      use: { ...devices['iPad Pro'] },
    },

    // --- High DPI Displays ---
    {
      name: 'high-dpi-chrome',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // --- Slow Network Conditions ---
    {
      name: 'slow-network-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Simulate slow 3G network
        offline: false,
        // Note: Playwright doesn't have built-in network throttling
        // This would need to be implemented via CDP or other means
      },
    },

    // --- Memory Constrained Environment ---
    {
      name: 'low-memory-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }, // Smaller viewport
        // Additional memory constraints would be simulated in tests
      },
    }
  ],

  // Global setup file
  globalSetup: './tests/playwright/escape-sequence-storm/fixtures/global-setup.ts',
  
  // Global teardown file
  globalTeardown: './tests/playwright/escape-sequence-storm/fixtures/global-teardown.ts',
  
  // Output directory for test artifacts
  outputDir: './test-results/escape-sequence-storm/artifacts',
  
  // Web server configuration (if needed)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000, // 2 minutes to start server
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  // Test metadata
  metadata: {
    testSuite: 'Escape Sequence Storm Prevention',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    runId: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    branch: process.env.GITHUB_REF_NAME || 'local',
    commit: process.env.GITHUB_SHA || 'local'
  }
});

// Environment-specific overrides
if (process.env.CI) {
  // CI-specific settings
  console.log('🔧 Running in CI mode - applying CI-specific configurations');
  
  // Override settings for CI
  exports.default.use.headless = true;
  exports.default.use.video = 'retain-on-failure';
  exports.default.use.trace = 'retain-on-failure';
  exports.default.workers = Math.min(4, require('os').cpus().length);
  exports.default.retries = 2;
}

if (process.env.DEBUG) {
  // Debug mode settings
  console.log('🐛 Running in debug mode');
  
  exports.default.use.headless = false;
  exports.default.use.video = 'on';
  exports.default.use.trace = 'on';
  exports.default.timeout = 0; // No timeout in debug mode
  exports.default.workers = 1; // Single worker for easier debugging
  exports.default.retries = 0; // No retries in debug mode
}

if (process.env.PERFORMANCE_TEST) {
  // Performance testing mode
  console.log('⚡ Running in performance test mode');
  
  // Extend timeouts for performance tests
  exports.default.timeout = 300000; // 5 minutes per test
  exports.default.use.actionTimeout = 60000; // 1 minute for actions
  exports.default.use.navigationTimeout = 120000; // 2 minutes for navigation
}

// Stress test mode
if (process.env.STRESS_TEST) {
  console.log('🔥 Running in stress test mode');
  
  // Stress test specific settings
  exports.default.timeout = 600000; // 10 minutes per test
  exports.default.workers = 8; // More workers for stress testing
  exports.default.retries = 0; // No retries in stress mode
  exports.default.use.trace = 'off'; // Disable trace to save resources
}

// Quick smoke test mode
if (process.env.SMOKE_TEST) {
  console.log('💨 Running in smoke test mode - quick validation only');
  
  // Limit to essential browsers only
  exports.default.projects = [
    exports.default.projects.find(p => p.name === 'chromium-desktop')
  ].filter(Boolean);
  
  exports.default.timeout = 30000; // 30 seconds per test
  exports.default.retries = 0; // No retries for smoke tests
}