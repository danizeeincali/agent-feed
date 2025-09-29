import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/playwright-screenshot-evidence.spec.js'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for screenshot evidence
  workers: 1, // Single worker for consistent evidence
  reporter: [
    ['html', { outputFolder: 'tests/screenshots/api-fix/playwright-report' }],
    ['json', { outputFile: 'tests/screenshots/api-fix/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 60000 // Increased timeout for evidence collection
  },

  projects: [
    {
      name: 'chromium-evidence',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'echo "Server should be running on port 5173"',
    port: 5173,
    reuseExistingServer: true,
    timeout: 10000
  }
});