import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false, // Sequential execution for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for consistent results
  timeout: 60000, // 60 second timeout per test
  expect: {
    timeout: 30000 // 30 second timeout for assertions
  },
  reporter: [
    ['html', { 
      outputFolder: '../../test-results/web-preview-validation/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../../test-results/web-preview-validation/results.json' 
    }],
    ['line'],
    ['./reporters/validation-reporter.ts']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true // Required for codespace environment
  },

  projects: [
    {
      name: 'validation-suite',
      testMatch: [
        'component-integration.spec.ts',
        'real-world-url.spec.ts', 
        'performance-validation.spec.ts',
        'accessibility.spec.ts',
        'visual-regression.spec.ts',
        'validation-runner.ts'
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cross-browser-validation',
      testMatch: ['cross-browser.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-validation',
      testMatch: [
        'component-integration.spec.ts',
        'accessibility.spec.ts'
      ],
      use: { ...devices['Pixel 5'] },
    }
  ],

  webServer: [
    {
      command: 'cd ../../frontend && npm run dev -- --host 0.0.0.0 --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'cd ../.. && node simple-backend.js',
      port: 3000,
      reuseExistingServer: true,
      timeout: 60000
    }
  ],
});