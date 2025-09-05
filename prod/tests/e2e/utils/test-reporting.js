/**
 * Test Reporting Utilities
 * Handles test result aggregation, report generation, and metrics collection
 */

import fs from 'fs/promises';
import path from 'path';

export class TestReporter {
  constructor() {
    this.results = [];
    this.metrics = {
      performance: {},
      coverage: {},
      errors: []
    };
    this.startTime = Date.now();
  }

  /**
   * Record test result
   * @param {Object} testResult - Test execution result
   */
  recordTestResult(testResult) {
    this.results.push({
      ...testResult,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metadata
   */
  recordPerformanceMetric(metric, value, metadata = {}) {
    if (!this.metrics.performance[metric]) {
      this.metrics.performance[metric] = [];
    }
    
    this.metrics.performance[metric].push({
      value,
      timestamp: Date.now(),
      ...metadata
    });
  }

  /**
   * Record coverage data
   * @param {string} area - Coverage area (workflow, coordination, etc.)
   * @param {number} percentage - Coverage percentage
   */
  recordCoverage(area, percentage) {
    this.metrics.coverage[area] = percentage;
  }

  /**
   * Record error
   * @param {Object} error - Error details
   */
  recordError(error) {
    this.metrics.errors.push({
      ...error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const summary = this.generateSummary(duration);
    const detailed = this.generateDetailedReport();
    const performance = this.generatePerformanceReport();
    const coverage = this.generateCoverageReport();
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        testSuite: 'Agent Feed Enhancement System E2E Tests',
        version: '1.0.0',
        duration: duration
      },
      summary,
      detailed,
      performance,
      coverage,
      errors: this.metrics.errors
    };
    
    return report;
  }

  /**
   * Generate test summary
   */
  generateSummary(duration) {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const passRate = totalTests > 0 ? (passed / totalTests * 100).toFixed(2) : 0;
    
    return {
      totalTests,
      passed,
      failed,
      skipped,
      passRate: parseFloat(passRate),
      duration,
      status: failed === 0 ? 'PASSED' : 'FAILED'
    };
  }

  /**
   * Generate detailed test report
   */
  generateDetailedReport() {
    const testsByCategory = this.groupResultsByCategory();
    const failureAnalysis = this.analyzeFailures();
    const slowestTests = this.getSlowests();
    
    return {
      testsByCategory,
      failureAnalysis,
      slowestTests,
      testHistory: this.results
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const performanceMetrics = {};
    
    for (const [metric, values] of Object.entries(this.metrics.performance)) {
      const numericValues = values.map(v => v.value);
      
      performanceMetrics[metric] = {
        count: numericValues.length,
        average: this.calculateAverage(numericValues),
        median: this.calculateMedian(numericValues),
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        p95: this.calculatePercentile(numericValues, 95),
        p99: this.calculatePercentile(numericValues, 99)
      };
    }
    
    return {
      metrics: performanceMetrics,
      thresholds: this.checkPerformanceThresholds(performanceMetrics),
      trends: this.calculatePerformanceTrends()
    };
  }

  /**
   * Generate coverage report
   */
  generateCoverageReport() {
    const totalCoverage = this.calculateTotalCoverage();
    const coverageByArea = this.metrics.coverage;
    const gaps = this.identifyCoverageGaps();
    
    return {
      total: totalCoverage,
      byArea: coverageByArea,
      gaps,
      recommendations: this.generateCoverageRecommendations(gaps)
    };
  }

  /**
   * Group test results by category
   */
  groupResultsByCategory() {
    const categories = {};
    
    for (const result of this.results) {
      const category = result.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          tests: []
        };
      }
      
      categories[category].total++;
      categories[category][result.status]++;
      categories[category].tests.push(result);
    }
    
    return categories;
  }

  /**
   * Analyze test failures
   */
  analyzeFailures() {
    const failures = this.results.filter(r => r.status === 'failed');
    const errorPatterns = {};
    const commonIssues = [];
    
    for (const failure of failures) {
      if (failure.error) {
        const errorType = this.categorizeError(failure.error);
        errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
      }
    }
    
    // Identify common failure patterns
    const sortedPatterns = Object.entries(errorPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    for (const [pattern, count] of sortedPatterns) {
      commonIssues.push({
        pattern,
        count,
        percentage: (count / failures.length * 100).toFixed(2),
        recommendation: this.getFailureRecommendation(pattern)
      });
    }
    
    return {
      totalFailures: failures.length,
      errorPatterns,
      commonIssues,
      failuresByTest: failures.map(f => ({
        testName: f.testName,
        error: f.error,
        duration: f.duration,
        retries: f.retries || 0
      }))
    };
  }

  /**
   * Get slowest tests
   */
  getSlowests(count = 10) {
    return this.results
      .filter(r => r.duration)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map(r => ({
        testName: r.testName,
        duration: r.duration,
        category: r.category,
        status: r.status
      }));
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends() {
    const trends = {};
    
    for (const [metric, values] of Object.entries(this.metrics.performance)) {
      if (values.length < 2) continue;
      
      const recent = values.slice(-10); // Last 10 measurements
      const older = values.slice(0, -10);
      
      if (older.length === 0) continue;
      
      const recentAvg = this.calculateAverage(recent.map(v => v.value));
      const olderAvg = this.calculateAverage(older.map(v => v.value));
      
      const trend = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(2);
      
      trends[metric] = {
        direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        percentage: Math.abs(parseFloat(trend)),
        recentAverage: recentAvg,
        historicalAverage: olderAvg
      };
    }
    
    return trends;
  }

  /**
   * Check performance against thresholds
   */
  checkPerformanceThresholds(performanceMetrics) {
    const thresholds = {
      pageLoadTime: 5000, // 5 seconds
      memoryUsage: 200, // 200MB
      errorRate: 5, // 5%
      apiResponseTime: 2000 // 2 seconds
    };
    
    const results = {};
    
    for (const [threshold, limit] of Object.entries(thresholds)) {
      const metric = performanceMetrics[threshold];
      if (metric) {
        results[threshold] = {
          limit,
          actual: metric.average,
          status: metric.average <= limit ? 'PASS' : 'FAIL',
          margin: ((metric.average - limit) / limit * 100).toFixed(2)
        };
      }
    }
    
    return results;
  }

  /**
   * Calculate total test coverage
   */
  calculateTotalCoverage() {
    const coverageValues = Object.values(this.metrics.coverage);
    return coverageValues.length > 0 ? 
      this.calculateAverage(coverageValues) : 0;
  }

  /**
   * Identify coverage gaps
   */
  identifyCoverageGaps() {
    const minimumThresholds = {
      workflow: 90,
      coordination: 85,
      performance: 80,
      visual: 75,
      error_scenarios: 80
    };
    
    const gaps = [];
    
    for (const [area, threshold] of Object.entries(minimumThresholds)) {
      const actual = this.metrics.coverage[area] || 0;
      if (actual < threshold) {
        gaps.push({
          area,
          threshold,
          actual,
          gap: threshold - actual
        });
      }
    }
    
    return gaps.sort((a, b) => b.gap - a.gap);
  }

  /**
   * Generate coverage recommendations
   */
  generateCoverageRecommendations(gaps) {
    const recommendations = [];
    
    for (const gap of gaps) {
      let recommendation;
      switch (gap.area) {
        case 'workflow':
          recommendation = 'Add more end-to-end workflow tests covering edge cases';
          break;
        case 'coordination':
          recommendation = 'Increase multi-agent coordination test scenarios';
          break;
        case 'performance':
          recommendation = 'Add more load and stress testing scenarios';
          break;
        case 'visual':
          recommendation = 'Expand visual regression testing across components';
          break;
        case 'error_scenarios':
          recommendation = 'Test more failure conditions and recovery scenarios';
          break;
        default:
          recommendation = `Increase test coverage for ${gap.area}`;
      }
      
      recommendations.push({
        area: gap.area,
        priority: gap.gap > 20 ? 'HIGH' : gap.gap > 10 ? 'MEDIUM' : 'LOW',
        recommendation
      });
    }
    
    return recommendations;
  }

  /**
   * Categorize error type
   */
  categorizeError(error) {
    const message = error.message || error;
    
    if (message.includes('timeout') || message.includes('Timeout')) {
      return 'timeout';
    } else if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    } else if (message.includes('element not found') || message.includes('selector')) {
      return 'element_not_found';
    } else if (message.includes('assertion') || message.includes('expect')) {
      return 'assertion_failure';
    } else if (message.includes('authentication') || message.includes('auth')) {
      return 'authentication';
    } else {
      return 'unknown';
    }
  }

  /**
   * Get failure recommendation
   */
  getFailureRecommendation(errorPattern) {
    const recommendations = {
      timeout: 'Consider increasing test timeouts or optimizing performance',
      network: 'Check network stability and API endpoints',
      element_not_found: 'Verify selectors and wait conditions',
      assertion_failure: 'Review test expectations and application behavior',
      authentication: 'Check authentication flow and session management',
      unknown: 'Review error details and add specific error handling'
    };
    
    return recommendations[errorPattern] || recommendations.unknown;
  }

  /**
   * Utility functions
   */
  calculateAverage(values) {
    return values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ?
      (sorted[middle - 1] + sorted[middle]) / 2 :
      sorted[middle];
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  /**
   * Save report to file
   */
  async saveReport(report, filePath) {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`Report saved to ${filePath}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px 20px; }
        .status-passed { color: green; }
        .status-failed { color: red; }
        .chart { margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>E2E Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Status:</strong> 
            <span class="status-${report.summary.status.toLowerCase()}">${report.summary.status}</span>
        </div>
        <div class="metric"><strong>Total Tests:</strong> ${report.summary.totalTests}</div>
        <div class="metric"><strong>Passed:</strong> ${report.summary.passed}</div>
        <div class="metric"><strong>Failed:</strong> ${report.summary.failed}</div>
        <div class="metric"><strong>Pass Rate:</strong> ${report.summary.passRate}%</div>
        <div class="metric"><strong>Duration:</strong> ${Math.round(report.summary.duration / 1000)}s</div>
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>P95</th></tr>
        ${Object.entries(report.performance.metrics).map(([name, data]) => `
            <tr>
                <td>${name}</td>
                <td>${data.average.toFixed(2)}</td>
                <td>${data.min}</td>
                <td>${data.max}</td>
                <td>${data.p95}</td>
            </tr>
        `).join('')}
    </table>
    
    <h2>Coverage</h2>
    <ul>
        ${Object.entries(report.coverage.byArea).map(([area, percentage]) => `
            <li>${area}: ${percentage}%</li>
        `).join('')}
    </ul>
    
    ${report.detailed.failureAnalysis.totalFailures > 0 ? `
    <h2>Failures</h2>
    <table>
        <tr><th>Test</th><th>Error</th><th>Duration</th></tr>
        ${report.detailed.failureAnalysis.failuresByTest.map(failure => `
            <tr>
                <td>${failure.testName}</td>
                <td>${failure.error}</td>
                <td>${failure.duration}ms</td>
            </tr>
        `).join('')}
    </table>
    ` : ''}
    
    <footer>
        <p>Generated at: ${report.metadata.generatedAt}</p>
    </footer>
</body>
</html>`;
    
    return html;
  }
}