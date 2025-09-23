import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'test-results/style-validation-report' }],
    ['json', { outputFile: 'test-results/style-validation-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },

  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad'],
        viewport: { width: 768, height: 1024 }
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'mobile-landscape',
      use: {
        ...devices['iPhone 12 landscape'],
        viewport: { width: 844, height: 390 }
      },
    }
  ],

  webServer: [
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'node simple-backend.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    }
  ],

  expect: {
    threshold: 0.2, // Allow 20% pixel difference for visual comparisons
    toHaveScreenshot: {
      mode: 'css',
      animations: 'disabled'
    }
  }
});