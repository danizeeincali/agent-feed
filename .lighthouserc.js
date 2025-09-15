/**
 * Lighthouse CI Configuration
 *
 * This file is used by Lighthouse CI to run performance audits
 * and upload results to Lighthouse CI server or temporary storage.
 */

module.exports = {
  ci: {
    collect: {
      staticDistDir: './.next',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/agents',
        'http://localhost:3000/feeds',
        'http://localhost:3000/settings',
        'http://localhost:3000/profile'
      ],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: [
          '--no-sandbox',
          '--headless',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals thresholds
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 512000 }], // 512KB
        'resource-summary:total:size': ['error', { maxNumericValue: 1048576 }], // 1MB
        'unused-javascript': ['error', { maxNumericValue: 30000 }],
        'render-blocking-resources': ['error', { maxNumericValue: 500 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};