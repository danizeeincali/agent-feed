import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/definitive-multiselect-validation.spec.ts',
  fullyParallel: false, // Run tests sequentially for better evidence collection
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want to see exactly what happens
  workers: 1, // Single worker for consistent results
  reporter: [
    ['html', { 
      outputFolder: 'test-results/validation-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/validation-results.json' 
    }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'multiselect-validation',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1024 },
        locale: 'en-US',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    }
  ],
  timeout: 60000, // 1 minute per test
});