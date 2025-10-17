/**
 * Playwright Configuration for Meta-Agent Tests
 *
 * Dedicated configuration for meta-agent protected config validation tests.
 * Optimized for file system operations, checksum validation, and integration testing.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/meta-agent-creation-validation.spec.ts',
    '**/meta-update-agent-protected-updates.spec.ts',
    '**/meta-agents-integration.spec.ts',
    '**/meta-agents-performance.spec.ts',
  ],

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid file system conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry on failure
  workers: 1, // Single worker to prevent race conditions

  // Timeouts
  timeout: 60000, // 60s per test (file operations can be slow)
  expect: {
    timeout: 10000, // 10s for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/e2e/test-results/meta-agents-html-report' }],
    ['json', { outputFile: 'tests/e2e/test-results/meta-agents-results.json' }],
    ['list'],
    ['junit', { outputFile: 'tests/e2e/test-results/meta-agents-junit.xml' }],
  ],

  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  use: {
    // Base URL (not used for file system tests but included for completeness)
    baseURL: 'http://localhost:5173',

    // Tracing and debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Context options
    actionTimeout: 15000, // 15s for actions
  },

  // Projects for different test types
  projects: [
    {
      name: 'meta-agent-creation',
      testMatch: '**/meta-agent-creation-validation.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'meta-update-agent',
      testMatch: '**/meta-update-agent-protected-updates.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'integration',
      testMatch: '**/meta-agents-integration.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'performance',
      testMatch: '**/meta-agents-performance.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      timeout: 120000, // 2 minutes for performance tests
    },
  ],

  // Output directory
  outputDir: 'tests/e2e/test-results',

  // Preserve output on failure
  preserveOutput: 'failures-only',
});
