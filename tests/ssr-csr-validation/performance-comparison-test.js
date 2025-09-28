/**
 * SSR/CSR Performance Comparison Test
 * Measures and compares performance between server-side and client-side rendering
 */

const { chromium } = require('playwright');

class PerformanceComparisonTest {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.results = {
      ssr: {},
      csr: {},
      comparison: {}
    };
  }

  /**
   * Measure SSR Performance (Fresh Page Load)
   */
  async measureSSRPerformance(page) {
    console.log('📊 Measuring SSR Performance...');

    const ssrMetrics = {
      homepage: {},
      agentsPage: {},
      average: {}
    };

    // Test Homepage SSR Performance
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await page.goto(`${this.baseURL}/?run=${i}`, { waitUntil: 'load' });
      const loadTime = Date.now() - startTime;

      // Get browser performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintMetrics = performance.getEntriesByType('paint');

        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paintMetrics.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintMetrics.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          responseStart: navigation.responseStart - navigation.fetchStart,
          responseEnd: navigation.responseEnd - navigation.fetchStart
        };
      });

      if (!ssrMetrics.homepage.runs) ssrMetrics.homepage.runs = [];
      ssrMetrics.homepage.runs.push({
        totalLoadTime: loadTime,
        ...metrics
      });
    }

    // Test Agents Page SSR Performance
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await page.goto(`${this.baseURL}/agents?run=${i}`, { waitUntil: 'load' });
      const loadTime = Date.now() - startTime;

      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          responseStart: navigation.responseStart - navigation.fetchStart,
          responseEnd: navigation.responseEnd - navigation.fetchStart
        };
      });

      if (!ssrMetrics.agentsPage.runs) ssrMetrics.agentsPage.runs = [];
      ssrMetrics.agentsPage.runs.push({
        totalLoadTime: loadTime,
        ...metrics
      });
    }

    // Calculate averages
    ssrMetrics.homepage.average = this.calculateAverages(ssrMetrics.homepage.runs);
    ssrMetrics.agentsPage.average = this.calculateAverages(ssrMetrics.agentsPage.runs);

    this.results.ssr = ssrMetrics;
    return ssrMetrics;
  }

  /**
   * Measure CSR Performance (Client-Side Navigation)
   */
  async measureCSRPerformance(page) {
    console.log('📊 Measuring CSR Performance...');

    const csrMetrics = {
      navigation: {},
      hydration: {},
      routeChanges: {}
    };

    // Start with fresh page load to ensure clean state
    await page.goto(this.baseURL);
    await page.waitForLoadState('load');

    // Measure hydration time
    const hydrationRuns = [];
    for (let i = 0; i < 3; i++) {
      await page.reload();

      const hydrationStart = Date.now();
      await page.waitForFunction(() => {
        return window.React !== undefined ||
               document.querySelector('[data-reactroot]') !== null ||
               document.querySelector('#__next') !== null ||
               document.querySelector('.animate-spin') !== null;
      }, { timeout: 10000 });
      const hydrationTime = Date.now() - hydrationStart;

      hydrationRuns.push({ hydrationTime });
    }

    csrMetrics.hydration.runs = hydrationRuns;
    csrMetrics.hydration.average = this.calculateAverages(hydrationRuns);

    // Measure client-side route navigation performance
    await page.goto(this.baseURL);
    await page.waitForTimeout(2000); // Wait for hydration

    const navigationRuns = [];
    for (let i = 0; i < 3; i++) {
      // Navigate to agents page
      const navStart = Date.now();
      await page.goto(`${this.baseURL}/agents`);
      await page.waitForLoadState('domcontentloaded');
      const agentsNavTime = Date.now() - navStart;

      // Navigate back to homepage
      const homeNavStart = Date.now();
      await page.goto(this.baseURL);
      await page.waitForLoadState('domcontentloaded');
      const homeNavTime = Date.now() - homeNavStart;

      navigationRuns.push({
        toAgentsPage: agentsNavTime,
        toHomepage: homeNavTime,
        average: (agentsNavTime + homeNavTime) / 2
      });
    }

    csrMetrics.navigation.runs = navigationRuns;
    csrMetrics.navigation.average = this.calculateAverages(navigationRuns.map(r => ({ value: r.average })), 'value');

    this.results.csr = csrMetrics;
    return csrMetrics;
  }

  /**
   * Memory Usage Analysis
   */
  async measureMemoryUsage(page) {
    console.log('📊 Measuring Memory Usage...');

    const memoryMetrics = {
      initial: {},
      afterNavigation: {},
      afterMultipleNavigations: {}
    };

    // Initial memory usage
    await page.goto(this.baseURL);
    await page.waitForLoadState('load');

    memoryMetrics.initial = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
          jsMemoryLimit: performance.memory.jsMemoryLimit
        };
      }
      return null;
    });

    // Memory after single navigation
    await page.goto(`${this.baseURL}/agents`);
    await page.waitForLoadState('load');

    memoryMetrics.afterNavigation = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
          jsMemoryLimit: performance.memory.jsMemoryLimit
        };
      }
      return null;
    });

    // Memory after multiple navigations (test for memory leaks)
    for (let i = 0; i < 5; i++) {
      await page.goto(this.baseURL);
      await page.waitForTimeout(500);
      await page.goto(`${this.baseURL}/agents`);
      await page.waitForTimeout(500);
    }

    memoryMetrics.afterMultipleNavigations = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSMemory: performance.memory.usedJSMemory,
          totalJSMemory: performance.memory.totalJSMemory,
          jsMemoryLimit: performance.memory.jsMemoryLimit
        };
      }
      return null;
    });

    return memoryMetrics;
  }

  /**
   * Bundle Size Impact Analysis
   */
  async analyzeBundleImpact(page) {
    console.log('📊 Analyzing Bundle Size Impact...');

    const bundleMetrics = {
      resources: [],
      totalSize: 0,
      javascriptSize: 0,
      cssSize: 0
    };

    await page.goto(this.baseURL);
    await page.waitForLoadState('load');

    // Get all network resources
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries.map(entry => ({
        name: entry.name,
        size: entry.transferSize || 0,
        type: entry.initiatorType,
        duration: entry.duration
      }));
    });

    bundleMetrics.resources = resources;
    bundleMetrics.totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
    bundleMetrics.javascriptSize = resources
      .filter(r => r.name.includes('.js') || r.type === 'script')
      .reduce((sum, resource) => sum + resource.size, 0);
    bundleMetrics.cssSize = resources
      .filter(r => r.name.includes('.css') || r.type === 'link')
      .reduce((sum, resource) => sum + resource.size, 0);

    return bundleMetrics;
  }

  /**
   * Calculate Performance Comparison
   */
  calculatePerformanceComparison() {
    console.log('📊 Calculating Performance Comparison...');

    const comparison = {
      loadTime: {},
      hydrationImpact: {},
      navigationSpeed: {},
      recommendations: []
    };

    // Load time comparison
    if (this.results.ssr.homepage && this.results.csr.hydration) {
      const ssrLoadTime = this.results.ssr.homepage.average.totalLoadTime;
      const csrHydrationTime = this.results.csr.hydration.average.hydrationTime;

      comparison.loadTime = {
        ssrTime: ssrLoadTime,
        csrHydrationTime: csrHydrationTime,
        difference: Math.abs(ssrLoadTime - csrHydrationTime),
        fasterOption: ssrLoadTime < csrHydrationTime ? 'SSR' : 'CSR',
        percentageDifference: Math.abs((ssrLoadTime - csrHydrationTime) / ssrLoadTime) * 100
      };
    }

    // Navigation speed analysis
    if (this.results.csr.navigation) {
      comparison.navigationSpeed = {
        averageCSRNavigation: this.results.csr.navigation.average,
        isAcceptable: this.results.csr.navigation.average < 1000 // Under 1 second
      };
    }

    // Generate recommendations
    if (comparison.loadTime.ssrTime > 3000) {
      comparison.recommendations.push('Consider optimizing SSR performance - load time exceeds 3 seconds');
    }

    if (comparison.loadTime.csrHydrationTime > 2000) {
      comparison.recommendations.push('Consider optimizing hydration performance - takes longer than 2 seconds');
    }

    if (comparison.navigationSpeed && !comparison.navigationSpeed.isAcceptable) {
      comparison.recommendations.push('Optimize client-side navigation speed');
    }

    this.results.comparison = comparison;
    return comparison;
  }

  /**
   * Helper method to calculate averages
   */
  calculateAverages(runs, key = null) {
    if (!runs || runs.length === 0) return {};

    const keys = key ? [key] : Object.keys(runs[0]);
    const averages = {};

    keys.forEach(k => {
      const values = runs.map(run => run[k]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        averages[k] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return averages;
  }

  /**
   * Generate Performance Report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        ssrPerformance: 'UNKNOWN',
        csrPerformance: 'UNKNOWN',
        overallRecommendation: 'UNKNOWN'
      },
      metrics: this.results,
      analysis: {
        strengths: [],
        weaknesses: [],
        recommendations: []
      }
    };

    // Analyze SSR performance
    if (this.results.ssr.homepage?.average?.totalLoadTime) {
      const ssrTime = this.results.ssr.homepage.average.totalLoadTime;
      report.summary.ssrPerformance = ssrTime < 2000 ? 'EXCELLENT' :
                                     ssrTime < 3000 ? 'GOOD' :
                                     ssrTime < 5000 ? 'ACCEPTABLE' : 'POOR';
    }

    // Analyze CSR performance
    if (this.results.csr.hydration?.average?.hydrationTime) {
      const csrTime = this.results.csr.hydration.average.hydrationTime;
      report.summary.csrPerformance = csrTime < 1000 ? 'EXCELLENT' :
                                     csrTime < 2000 ? 'GOOD' :
                                     csrTime < 3000 ? 'ACCEPTABLE' : 'POOR';
    }

    // Overall recommendation
    if (report.summary.ssrPerformance === 'EXCELLENT' && report.summary.csrPerformance === 'EXCELLENT') {
      report.summary.overallRecommendation = 'OPTIMAL_SETUP';
    } else if (report.summary.ssrPerformance === 'POOR' || report.summary.csrPerformance === 'POOR') {
      report.summary.overallRecommendation = 'NEEDS_OPTIMIZATION';
    } else {
      report.summary.overallRecommendation = 'ACCEPTABLE_PERFORMANCE';
    }

    // Add analysis
    if (this.results.comparison?.recommendations) {
      report.analysis.recommendations = this.results.comparison.recommendations;
    }

    return report;
  }

  /**
   * Run Complete Performance Test Suite
   */
  async runPerformanceTests() {
    console.log('🚀 Starting Performance Comparison Tests...');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await this.measureSSRPerformance(page);
      await this.measureCSRPerformance(page);

      const memoryMetrics = await this.measureMemoryUsage(page);
      const bundleMetrics = await this.analyzeBundleImpact(page);

      this.results.memory = memoryMetrics;
      this.results.bundle = bundleMetrics;

      this.calculatePerformanceComparison();

      const report = this.generateReport();

      console.log('\n📊 Performance Test Complete!');
      console.log(`🚀 SSR Performance: ${report.summary.ssrPerformance}`);
      console.log(`⚡ CSR Performance: ${report.summary.csrPerformance}`);
      console.log(`🎯 Overall: ${report.summary.overallRecommendation}`);

      return report;

    } finally {
      await browser.close();
    }
  }
}

// Export for use in other test files
module.exports = PerformanceComparisonTest;

// Run if called directly
if (require.main === module) {
  (async () => {
    const perfTest = new PerformanceComparisonTest();
    const report = await perfTest.runPerformanceTests();

    // Save report
    const fs = require('fs');
    const path = require('path');

    const reportPath = path.join(__dirname, 'performance-comparison-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Performance report saved to: ${reportPath}`);

    process.exit(0);
  })();
}