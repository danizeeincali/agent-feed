/**
 * Lighthouse CI Configuration for Performance Regression Testing
 *
 * This configuration sets up comprehensive performance monitoring with:
 * - Baseline metrics collection for all dynamic pages
 * - Performance budgets and thresholds
 * - Automated regression detection
 */

const PERFORMANCE_BUDGETS = {
  pageLoad: 2000,        // < 2 seconds
  bundleSize: 512000,    // < 500KB (512KB buffer)
  memoryUsage: 52428800, // < 50MB (52MB buffer)
  apiResponse: 500,      // < 500ms
  lighthouseScore: 90    // > 90
};

const DYNAMIC_PAGES = [
  '/',
  '/agents',
  '/feeds',
  '/settings',
  '/profile',
  '/dashboard',
  '/search',
  '/notifications'
];

module.exports = {
  ci: {
    collect: {
      url: DYNAMIC_PAGES,
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
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: PERFORMANCE_BUDGETS.lighthouseScore / 100 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: PERFORMANCE_BUDGETS.bundleSize }],
        'resource-summary:total:size': ['error', { maxNumericValue: PERFORMANCE_BUDGETS.bundleSize * 2 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 1048576 }], // 1MB

        // Network performance
        'unused-javascript': ['error', { maxNumericValue: 30000 }],
        'unused-css-rules': ['error', { maxNumericValue: 20000 }],
        'render-blocking-resources': ['error', { maxNumericValue: 500 }],

        // Memory and CPU
        'mainthread-work-breakdown': ['error', { maxNumericValue: 2000 }],
        'bootup-time': ['error', { maxNumericValue: 1000 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {},
    wizard: false
  },

  // Custom performance metrics collection
  customMetrics: {
    'page-load-time': {
      name: 'Page Load Time',
      description: 'Time from navigation start to load complete',
      threshold: PERFORMANCE_BUDGETS.pageLoad
    },
    'bundle-size': {
      name: 'JavaScript Bundle Size',
      description: 'Total size of JavaScript bundles',
      threshold: PERFORMANCE_BUDGETS.bundleSize
    },
    'memory-usage': {
      name: 'Memory Usage',
      description: 'Peak memory usage during page load',
      threshold: PERFORMANCE_BUDGETS.memoryUsage
    },
    'api-response-time': {
      name: 'API Response Time',
      description: 'Average API response time',
      threshold: PERFORMANCE_BUDGETS.apiResponse
    }
  },

  // Regression detection settings
  regression: {
    enabled: true,
    baselineBranch: 'main',
    thresholds: {
      performance: 5,      // 5% regression threshold
      accessibility: 2,    // 2% regression threshold
      'best-practices': 2, // 2% regression threshold
      seo: 2,             // 2% regression threshold
      'first-contentful-paint': 200,    // 200ms regression
      'largest-contentful-paint': 300,  // 300ms regression
      'cumulative-layout-shift': 0.02,  // 0.02 CLS regression
      'total-blocking-time': 100        // 100ms TBT regression
    }
  },

  // Performance monitoring configuration
  monitoring: {
    enabled: true,
    frequency: '0 */6 * * *', // Every 6 hours
    alerting: {
      email: process.env.PERFORMANCE_ALERT_EMAIL,
      slack: process.env.PERFORMANCE_ALERT_SLACK_WEBHOOK,
      threshold: 'error'
    }
  }
};

/**
 * Lighthouse performance audit configuration
 */
const performanceAuditConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    skipAudits: ['uses-http2'], // Skip if not applicable
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    },
    emulatedFormFactor: 'desktop'
  }
};

module.exports.performanceAuditConfig = performanceAuditConfig;
module.exports.PERFORMANCE_BUDGETS = PERFORMANCE_BUDGETS;
module.exports.DYNAMIC_PAGES = DYNAMIC_PAGES;