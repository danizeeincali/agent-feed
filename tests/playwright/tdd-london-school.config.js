/**
 * TDD London School Playwright Configuration
 * 
 * Specialized configuration for mock-driven testing with focus on
 * component interactions and behavior verification
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  
  // London School focuses on fast, isolated tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration for TDD workflow
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/tdd-london-results.json' }],
    ['junit', { outputFile: 'test-results/tdd-london-junit.xml' }],
    ['list', { printSteps: true }] // Show detailed test steps for TDD feedback
  ],
  
  // Global test configuration
  use: {
    // Mock-driven testing settings
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // London School specific settings
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    // Enable console logs for mock verification
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  },

  // Test file patterns for London School TDD
  testMatch: [
    'tdd-london-sse-*.test.js',
    'tdd-london-*.test.js',
    'london-school-*.test.js'
  ],

  // Ignore non-London School tests in this config
  testIgnore: [
    '**/*integration*.test.js',
    '**/*e2e*.test.js'
  ],

  projects: [
    {
      name: 'london-school-unit-mocks',
      testMatch: [
        'tdd-london-sse-incremental-validation.test.js',
        'tdd-london-sse-contract-validation.test.js'
      ],
      use: { 
        ...devices['Desktop Chrome'],
        // Mock-focused settings
        contextOptions: {
          strictSelectors: true
        }
      },
    },

    {
      name: 'london-school-integration-live',
      testMatch: [
        'tdd-london-sse-live-integration.test.js'
      ],
      use: { 
        ...devices['Desktop Chrome'],
        // Live integration settings
        contextOptions: {
          strictSelectors: false
        }
      },
      dependencies: ['london-school-unit-mocks'], // Run unit tests first
    },

    {
      name: 'london-school-cross-browser',
      testMatch: [
        'tdd-london-sse-contract-validation.test.js'
      ],
      use: { 
        ...devices['Desktop Firefox'],
      },
      dependencies: ['london-school-integration-live'],
    }
  ],

  // Development server for live tests
  webServer: {
    command: 'node simple-backend.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      TDD_MODE: 'london-school'
    }
  },

  // Global setup and teardown
  globalSetup: require.resolve('./tdd-london-global-setup.js'),
  globalTeardown: require.resolve('./tdd-london-global-teardown.js'),

  // Test timeout for TDD workflow
  timeout: 60000,
  expect: {
    timeout: 10000,
    
    // Custom matchers for London School testing
    toHaveSSEIncremental: expect.extend({
      toHaveSSEIncremental(received) {
        const pass = received.every(msg => 
          msg.isIncremental === true && 
          msg.type === 'output' &&
          typeof msg.data === 'string' &&
          msg.data.length > 0
        );
        
        return {
          message: () => pass ? 
            'Expected messages to not be incremental SSE format' :
            'Expected all messages to have incremental SSE format with valid data',
          pass
        };
      }
    })
  }
});