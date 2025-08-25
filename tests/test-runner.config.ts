/**
 * Test Runner Configuration
 * @description Configuration for running comprehensive terminal echo tests
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/echo-test-results.json' }],
    ['junit', { outputFile: 'test-results/echo-junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'echo-duplication-prevention',
      testMatch: 'regression/echo-duplication-prevention.test.ts',
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'websocket-message-flow',
      testMatch: 'integration/websocket-message-flow.test.ts',
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'terminal-interaction-e2e',
      testMatch: 'e2e/terminal-interaction.spec.ts',
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'claude-cli-regression',
      testMatch: 'regression/claude-cli-interaction.test.ts',
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'performance-tests',
      testMatch: 'performance/terminal-performance.test.ts',
      use: {
        browserName: 'chromium',
      },
    },
    // Cross-browser testing
    {
      name: 'firefox-echo-tests',
      testMatch: ['regression/echo-duplication-prevention.test.ts', 'e2e/terminal-interaction.spec.ts'],
      use: {
        browserName: 'firefox',
      },
    },
    {
      name: 'webkit-echo-tests',
      testMatch: ['regression/echo-duplication-prevention.test.ts', 'e2e/terminal-interaction.spec.ts'],
      use: {
        browserName: 'webkit',
      },
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});