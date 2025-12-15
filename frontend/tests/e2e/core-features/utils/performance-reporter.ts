import fs from 'fs';
import path from 'path';

export interface PerformanceMetric {
  testName: string;
  duration: number;
  timestamp: number;
  browser: string;
  viewport: { width: number; height: number };
  url: string;
  success: boolean;
  errors?: string[];
  memoryUsage?: number;
  apiCalls?: ApiCallMetric[];
}

export interface ApiCallMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  size?: number;
}

export interface PerformanceReport {
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageLoadTime: number;
    maxLoadTime: number;
    minLoadTime: number;
    timeoutErrors: number;
  };
  metrics: PerformanceMetric[];
  recommendations: string[];
  generatedAt: string;
}

class PerformanceReporter {
  private metrics: PerformanceMetric[] = [];
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'test-results', 'performance-reports');
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
  }

  generateReport(): PerformanceReport {
    const totalTests = this.metrics.length;
    const passedTests = this.metrics.filter(m => m.success).length;
    const failedTests = totalTests - passedTests;

    const loadTimes = this.metrics.map(m => m.duration);
    const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    const minLoadTime = Math.min(...loadTimes);

    const timeoutErrors = this.metrics.filter(m =>
      m.errors?.some(error => error.toLowerCase().includes('timeout'))
    ).length;

    const recommendations = this.generateRecommendations();

    const report: PerformanceReport = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageLoadTime: Math.round(averageLoadTime),
        maxLoadTime,
        minLoadTime,
        timeoutErrors
      },
      metrics: this.metrics,
      recommendations,
      generatedAt: new Date().toISOString()
    };

    this.saveReport(report);
    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const avgLoadTime = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;

    if (avgLoadTime > 5000) {
      recommendations.push('Average load time exceeds 5 seconds. Consider implementing lazy loading or data caching.');
    }

    const timeoutCount = this.metrics.filter(m =>
      m.errors?.some(error => error.toLowerCase().includes('timeout'))
    ).length;

    if (timeoutCount > 0) {
      recommendations.push(`${timeoutCount} timeout errors detected. Review timeout configurations and loading strategies.`);
    }

    const failedTests = this.metrics.filter(m => !m.success).length;
    if (failedTests > totalTests * 0.1) { // More than 10% failure rate
      recommendations.push('High failure rate detected. Review test stability and error handling.');
    }

    const slowApiCalls = this.metrics.flatMap(m => m.apiCalls || [])
      .filter(api => api.duration > 3000);

    if (slowApiCalls.length > 0) {
      recommendations.push(`${slowApiCalls.length} slow API calls detected (>3s). Consider API optimization.`);
    }

    const memoryMetrics = this.metrics.filter(m => m.memoryUsage);
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / memoryMetrics.length;
      if (avgMemory > 50 * 1024 * 1024) { // 50MB
        recommendations.push('High memory usage detected. Consider memory optimization strategies.');
      }
    }

    return recommendations;
  }

  private saveReport(report: PerformanceReport): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analytics-performance-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Also save as latest report
    const latestPath = path.join(this.reportsDir, 'latest-analytics-performance.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    console.log(`Performance report saved to: ${filepath}`);
  }

  generateHTMLReport(report: PerformanceReport): void {
    const html = this.createHTMLReport(report);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analytics-performance-${timestamp}.html`;
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, html);

    // Also save as latest HTML report
    const latestHTMLPath = path.join(this.reportsDir, 'latest-analytics-performance.html');
    fs.writeFileSync(latestHTMLPath, html);

    console.log(`HTML Performance report saved to: ${filepath}`);
  }

  private createHTMLReport(report: PerformanceReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; }
        .summary-card.warning { border-left-color: #ff9800; }
        .summary-card.error { border-left-color: #f44336; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .summary-card .unit { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .success { color: #4CAF50; }
        .failure { color: #f44336; }
        .warning { color: #ff9800; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .recommendations ul { margin: 10px 0; }
        .chart-container { margin: 20px 0; height: 300px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .metric-details { font-size: 12px; color: #666; }
        .timestamp { color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Analytics Performance Test Report</h1>
        <p class="timestamp">Generated: ${new Date(report.generatedAt).toLocaleString()}</p>

        <h2>Summary</h2>
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card ${report.summary.passedTests === report.summary.totalTests ? '' : 'warning'}">
                <h3>Passed Tests</h3>
                <div class="value">${report.summary.passedTests}</div>
            </div>
            <div class="summary-card ${report.summary.failedTests === 0 ? '' : 'error'}">
                <h3>Failed Tests</h3>
                <div class="value">${report.summary.failedTests}</div>
            </div>
            <div class="summary-card ${report.summary.averageLoadTime < 5000 ? '' : 'warning'}">
                <h3>Avg Load Time</h3>
                <div class="value">${report.summary.averageLoadTime}<span class="unit">ms</span></div>
            </div>
            <div class="summary-card ${report.summary.maxLoadTime < 8000 ? '' : 'warning'}">
                <h3>Max Load Time</h3>
                <div class="value">${report.summary.maxLoadTime}<span class="unit">ms</span></div>
            </div>
            <div class="summary-card ${report.summary.timeoutErrors === 0 ? '' : 'error'}">
                <h3>Timeout Errors</h3>
                <div class="value">${report.summary.timeoutErrors}</div>
            </div>
        </div>

        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>🔍 Recommendations</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <h2>Detailed Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Browser</th>
                    <th>Duration (ms)</th>
                    <th>Status</th>
                    <th>Memory (MB)</th>
                    <th>API Calls</th>
                    <th>Errors</th>
                </tr>
            </thead>
            <tbody>
                ${report.metrics.map(metric => `
                <tr>
                    <td>${metric.testName}</td>
                    <td>${metric.browser}</td>
                    <td class="${metric.duration > 5000 ? 'warning' : ''}">${metric.duration}</td>
                    <td class="${metric.success ? 'success' : 'failure'}">${metric.success ? '✓ Pass' : '✗ Fail'}</td>
                    <td>${metric.memoryUsage ? Math.round(metric.memoryUsage / 1024 / 1024) : 'N/A'}</td>
                    <td>${metric.apiCalls?.length || 0}</td>
                    <td class="${metric.errors?.length ? 'failure' : ''}">${metric.errors?.join(', ') || 'None'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Performance Analysis</h2>
        <div class="chart-container">
            <p>📊 Load Time Distribution Chart</p>
        </div>

        <div class="metric-details">
            <h3>Performance Thresholds</h3>
            <ul>
                <li>✅ Excellent: &lt; 2 seconds</li>
                <li>⚠️ Good: 2-5 seconds</li>
                <li>❌ Needs Improvement: &gt; 5 seconds</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
  }

  reset(): void {
    this.metrics = [];
  }
}

export const performanceReporter = new PerformanceReporter();