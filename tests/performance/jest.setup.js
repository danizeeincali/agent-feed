/**
 * Jest setup for performance tests
 */

// Increase timeout for performance tests
jest.setTimeout(120000);

// Global test utilities
global.performanceTestUtils = {
  /**
   * Format bytes for display
   */
  formatBytes: (bytes) => {
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(2)}MB` : `${kb.toFixed(2)}KB`;
  },

  /**
   * Calculate percentage change
   */
  calculateChange: (baseline, current) => {
    if (!baseline || baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
  },

  /**
   * Check if value is within threshold
   */
  isWithinThreshold: (value, threshold, tolerance = 0.05) => {
    const toleranceValue = threshold * tolerance;
    return value <= threshold + toleranceValue;
  },

  /**
   * Wait for condition with timeout
   */
  waitFor: async (condition, timeout = 10000, interval = 100) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Retry function with exponential backoff
   */
  retry: async (fn, maxAttempts = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Performance thresholds for tests
global.PERFORMANCE_THRESHOLDS = {
  lighthouse: {
    performance: 90,
    accessibility: 90,
    bestPractices: 90,
    seo: 90
  },

  webVitals: {
    fcp: 1800,  // First Contentful Paint
    lcp: 2500,  // Largest Contentful Paint
    fid: 100,   // First Input Delay
    cls: 0.1,   // Cumulative Layout Shift
    ttfb: 600   // Time to First Byte
  },

  bundle: {
    totalSize: 512 * 1024,     // 512KB
    mainChunk: 300 * 1024,     // 300KB
    vendorChunk: 200 * 1024,   // 200KB
    chunkCount: 10             // Max chunks
  },

  memory: {
    maxHeapSize: 50 * 1024 * 1024,  // 50MB
    maxGrowthRate: 0.1,             // 10%
    maxLeakThreshold: 5 * 1024 * 1024 // 5MB
  },

  api: {
    maxResponseTime: 500,      // 500ms
    maxErrorRate: 0.01,        // 1%
    minThroughput: 100         // 100 req/s
  }
};

// Console override for cleaner test output
const originalConsole = global.console;

global.console = {
  ...originalConsole,
  log: (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
      originalConsole.log(...args);
    }
  },
  debug: (...args) => {
    if (process.env.DEBUG_TESTS === 'true') {
      originalConsole.debug(...args);
    }
  },
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: originalConsole.info
};