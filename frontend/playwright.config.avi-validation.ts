import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Config for Avi Typing Animation Validation
 * Simplified config for production validation tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/avi-typing-animation-production-validation.spec.ts',

  fullyParallel: false, // Run sequentially for accurate timing
  retries: 0, // No retries - we want clean validation
  workers: 1, // Single worker for consistent results
  timeout: 60000, // 60 second timeout

  reporter: [
    ['list'], // Console output
    ['json', { outputFile: '/workspaces/agent-feed/avi-validation-results.json' }],
    ['html', { outputFolder: '/workspaces/agent-feed/avi-validation-report' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on', // Always capture trace
    screenshot: 'on', // Always capture screenshots
    video: 'on', // Always capture video
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'avi-validation',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  expect: {
    timeout: 10000,
  },

  outputDir: '/workspaces/agent-feed/avi-test-results/',
});
