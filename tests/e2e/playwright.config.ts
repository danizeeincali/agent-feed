import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '/workspaces/agent-feed/tests/e2e',
  fullyParallel: false, // Run tests sequentially for accurate monitoring
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want accurate results
  workers: 1, // Single worker for sequential execution
  reporter: [
    ['list'],
    ['html', { outputFolder: '/workspaces/agent-feed/tests/results/html-report' }],
    ['json', { outputFile: '/workspaces/agent-feed/tests/results/test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true, // Run in headless mode (no X server available)
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Servers are already running, just verify they're up
  // webServer config commented out - using existing servers
  timeout: 180000, // 3 minutes per test (enough for long-running tests)
});
