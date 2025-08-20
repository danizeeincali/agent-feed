/**
 * Test Documentation Manager
 * Generates comprehensive technical documentation for test results and analysis
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  TestExecution,
  TestResult,
  TestStatus,
  Coverage,
  TestMetrics,
  LogEntry
} from '../types';

interface DocumentationConfig {
  outputDir: string;
  includeScreenshots: boolean;
  includeLogs: boolean;
  includeMetrics: boolean;
  generateHTML: boolean;
  generateMarkdown: boolean;
  generateJSON: boolean;
}

export class TestDocumentationManager {
  private config: DocumentationConfig;

  constructor(config?: Partial<DocumentationConfig>) {
    this.config = {
      outputDir: '/workspaces/agent-feed/frontend/docs/regression',
      includeScreenshots: true,
      includeLogs: true,
      includeMetrics: true,
      generateHTML: true,
      generateMarkdown: true,
      generateJSON: true,
      ...config
    };
  }

  /**
   * Initialize the documentation manager
   */
  async initialize(): Promise<void> {
    // Ensure output directories exist
    await this.ensureDirectoriesExist();
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(execution: TestExecution): Promise<string> {
    const reportData = await this.compileReportData(execution);
    
    // Generate in multiple formats
    const reports: string[] = [];

    if (this.config.generateMarkdown) {
      const markdownPath = await this.generateMarkdownReport(reportData);
      reports.push(markdownPath);
    }

    if (this.config.generateHTML) {
      const htmlPath = await this.generateHTMLReport(reportData);
      reports.push(htmlPath);
    }

    if (this.config.generateJSON) {
      const jsonPath = await this.generateJSONReport(reportData);
      reports.push(jsonPath);
    }

    // Generate failure analysis if there are failures
    if (reportData.summary.failed > 0) {
      const failureReportPath = await this.generateFailureAnalysisReport(reportData);
      reports.push(failureReportPath);
    }

    // Generate performance report if metrics are available
    if (this.hasPerformanceMetrics(reportData)) {
      const perfReportPath = await this.generatePerformanceReport(reportData);
      reports.push(perfReportPath);
    }

    return reports[0]; // Return primary report path
  }

  /**
   * Generate detailed report for specific execution
   */
  async generateDetailedReport(execution: TestExecution): Promise<string> {
    const reportData = await this.compileReportData(execution);
    return this.generateMarkdownReport(reportData, true);
  }

  /**
   * Generate failure analysis report
   */
  async generateFailureAnalysisReport(reportData: any): Promise<string> {
    const failedTests = reportData.results.filter((r: TestResult) => 
      r.status === TestStatus.FAILED || r.status === TestStatus.ERROR
    );

    const content = this.buildFailureAnalysisContent(failedTests, reportData);
    const filename = `failure-analysis-${reportData.execution.id}.md`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Generate performance analysis report
   */
  async generatePerformanceReport(reportData: any): Promise<string> {
    const content = this.buildPerformanceAnalysisContent(reportData);
    const filename = `performance-analysis-${reportData.execution.id}.md`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Generate trend analysis documentation
   */
  async generateTrendAnalysis(executions: TestExecution[]): Promise<string> {
    const content = this.buildTrendAnalysisContent(executions);
    const filename = `trend-analysis-${Date.now()}.md`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Generate test suite documentation
   */
  async generateSuiteDocumentation(suiteId: string, results: TestResult[]): Promise<string> {
    const content = this.buildSuiteDocumentationContent(suiteId, results);
    const filename = `suite-${suiteId}-documentation.md`;
    const filePath = path.join(this.config.outputDir, 'suites', filename);

    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Archive old reports
   */
  async archiveReports(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const archiveDir = path.join(this.config.outputDir, 'archive');
    await this.ensureDirectoryExists(archiveDir);

    let archivedCount = 0;
    const files = await fs.readdir(this.config.outputDir);

    for (const file of files) {
      const filePath = path.join(this.config.outputDir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile() && stats.mtime < cutoffDate) {
        const archivePath = path.join(archiveDir, file);
        await fs.rename(filePath, archivePath);
        archivedCount++;
      }
    }

    return archivedCount;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Archive old reports
    await this.archiveReports();
  }

  // Private methods
  private async compileReportData(execution: TestExecution): Promise<any> {
    const summary = execution.summary;
    const results = execution.results;

    // Categorize results
    const passed = results.filter(r => r.status === TestStatus.PASSED);
    const failed = results.filter(r => r.status === TestStatus.FAILED);
    const skipped = results.filter(r => r.status === TestStatus.SKIPPED);
    const errors = results.filter(r => r.status === TestStatus.ERROR);
    const timeouts = results.filter(r => r.status === TestStatus.TIMEOUT);

    // Calculate metrics
    const averageDuration = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

    const longestTest = results.reduce((longest, current) => 
      current.duration > longest.duration ? current : longest, results[0] || { duration: 0 });

    return {
      execution,
      summary,
      results,
      categories: { passed, failed, skipped, errors, timeouts },
      metrics: {
        averageDuration,
        longestTest,
        totalDuration: summary.duration
      },
      timestamp: new Date().toISOString()
    };
  }

  private async generateMarkdownReport(reportData: any, detailed = false): Promise<string> {
    const content = this.buildMarkdownContent(reportData, detailed);
    const filename = `test-report-${reportData.execution.id}.md`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  private async generateHTMLReport(reportData: any): Promise<string> {
    const htmlContent = this.buildHTMLContent(reportData);
    const filename = `test-report-${reportData.execution.id}.html`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, htmlContent, 'utf8');
    return filePath;
  }

  private async generateJSONReport(reportData: any): Promise<string> {
    const jsonContent = JSON.stringify(reportData, null, 2);
    const filename = `test-report-${reportData.execution.id}.json`;
    const filePath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filePath, jsonContent, 'utf8');
    return filePath;
  }

  private buildMarkdownContent(reportData: any, detailed: boolean): string {
    const { execution, summary, categories, metrics } = reportData;
    const successRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : '0';

    let content = `# Test Execution Report

**Execution ID:** ${execution.id}
**Generated:** ${new Date().toISOString()}
**Duration:** ${this.formatDuration(summary.duration)}
**Success Rate:** ${successRate}%

## Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Tests** | ${summary.total} | 100% |
| **Passed** | ${summary.passed} | ${summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : '0'}% |
| **Failed** | ${summary.failed} | ${summary.total > 0 ? (summary.failed / summary.total * 100).toFixed(1) : '0'}% |
| **Skipped** | ${summary.skipped} | ${summary.total > 0 ? (summary.skipped / summary.total * 100).toFixed(1) : '0'}% |

## Environment

- **Platform:** ${execution.environment.platform}
- **Node Version:** ${execution.environment.nodeVersion}
- **Configuration:** ${execution.configuration.parallel ? 'Parallel' : 'Sequential'} execution
- **Max Workers:** ${execution.configuration.maxWorkers}

`;

    // Coverage information
    if (summary.coverage) {
      content += `## Code Coverage

| Type | Coverage |
|------|----------|
| **Lines** | ${summary.coverage.lines}% |
| **Functions** | ${summary.coverage.functions}% |
| **Branches** | ${summary.coverage.branches}% |
| **Statements** | ${summary.coverage.statements}% |

`;
    }

    // Performance metrics
    content += `## Performance Metrics

- **Average Test Duration:** ${this.formatDuration(metrics.averageDuration)}
- **Longest Test:** ${metrics.longestTest?.testId || 'N/A'} (${this.formatDuration(metrics.longestTest?.duration || 0)})
- **Total Execution Time:** ${this.formatDuration(metrics.totalDuration)}

`;

    // Detailed results if requested
    if (detailed) {
      content += this.buildDetailedResultsSection(categories);
    } else if (categories.failed.length > 0) {
      content += this.buildFailureSummarySection(categories.failed);
    }

    return content;
  }

  private buildHTMLContent(reportData: any): string {
    const { execution, summary } = reportData;
    const successRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : '0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Execution Report - ${execution.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .test-list { margin: 20px 0; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-skipped { background: #fff3cd; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Execution Report</h1>
        <p><strong>Execution ID:</strong> ${execution.id}</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        <p><strong>Success Rate:</strong> <span class="${parseFloat(successRate) >= 95 ? 'success' : parseFloat(successRate) >= 80 ? 'warning' : 'failure'}">${successRate}%</span></p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value success">${summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value failure">${summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value warning">${summary.skipped}</div>
            <div>Skipped</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${this.formatDuration(summary.duration)}</div>
            <div>Duration</div>
        </div>
    </div>

    ${this.buildHTMLTestList(reportData.categories)}
</body>
</html>`;
  }

  private buildHTMLTestList(categories: any): string {
    let html = '<div class="test-list">';

    if (categories.failed.length > 0) {
      html += '<h2>Failed Tests</h2>';
      for (const test of categories.failed) {
        html += `<div class="test-item test-failed">
            <strong>${test.testId}</strong> - ${this.formatDuration(test.duration)}
            ${test.error ? `<br><small>${this.escapeHtml(test.error.message)}</small>` : ''}
        </div>`;
      }
    }

    if (categories.passed.length > 0 && categories.passed.length <= 20) {
      html += '<h2>Passed Tests</h2>';
      for (const test of categories.passed) {
        html += `<div class="test-item test-passed">
            <strong>${test.testId}</strong> - ${this.formatDuration(test.duration)}
        </div>`;
      }
    }

    html += '</div>';
    return html;
  }

  private buildFailureAnalysisContent(failedTests: TestResult[], reportData: any): string {
    let content = `# Failure Analysis Report

**Execution ID:** ${reportData.execution.id}
**Generated:** ${new Date().toISOString()}
**Failed Tests:** ${failedTests.length}

## Summary

This report provides detailed analysis of test failures to help identify patterns and root causes.

## Failed Tests Overview

| Test ID | Status | Duration | Error Type |
|---------|--------|----------|------------|
`;

    for (const test of failedTests) {
      const errorType = this.categorizeError(test.error);
      content += `| ${test.testId} | ${test.status} | ${this.formatDuration(test.duration)} | ${errorType} |\n`;
    }

    // Group by error patterns
    const errorGroups = this.groupErrorsByPattern(failedTests);
    
    content += `\n## Error Pattern Analysis\n\n`;

    for (const [pattern, tests] of errorGroups.entries()) {
      content += `### ${pattern} (${tests.length} tests)\n\n`;
      content += `**Affected Tests:**\n`;
      for (const test of tests) {
        content += `- ${test.testId}\n`;
      }
      content += `\n**Sample Error:**\n\`\`\`\n${tests[0].error?.message || 'No error message'}\n\`\`\`\n\n`;
      content += `**Recommended Actions:**\n${this.getRecommendedActions(pattern)}\n\n`;
    }

    return content;
  }

  private buildPerformanceAnalysisContent(reportData: any): string {
    const { results, metrics } = reportData;
    
    // Sort by duration
    const sortedByDuration = [...results].sort((a, b) => b.duration - a.duration);
    const slowTests = sortedByDuration.slice(0, 10);

    let content = `# Performance Analysis Report

**Execution ID:** ${reportData.execution.id}
**Generated:** ${new Date().toISOString()}

## Performance Summary

- **Total Execution Time:** ${this.formatDuration(metrics.totalDuration)}
- **Average Test Duration:** ${this.formatDuration(metrics.averageDuration)}
- **Slowest Test:** ${metrics.longestTest?.testId || 'N/A'} (${this.formatDuration(metrics.longestTest?.duration || 0)})

## Slowest Tests

| Rank | Test ID | Duration | Performance Impact |
|------|---------|----------|-------------------|
`;

    slowTests.forEach((test, index) => {
      const impact = test.duration > 30000 ? 'High' : test.duration > 10000 ? 'Medium' : 'Low';
      content += `| ${index + 1} | ${test.testId} | ${this.formatDuration(test.duration)} | ${impact} |\n`;
    });

    // Performance recommendations
    content += `\n## Performance Recommendations\n\n`;
    
    const verySlowTests = results.filter((r: TestResult) => r.duration > 30000);
    if (verySlowTests.length > 0) {
      content += `### High Priority\n- **${verySlowTests.length} tests** taking over 30 seconds should be optimized or split\n\n`;
    }

    const slowTests30 = results.filter((r: TestResult) => r.duration > 10000);
    if (slowTests30.length > 0) {
      content += `### Medium Priority\n- **${slowTests30.length} tests** taking over 10 seconds could benefit from optimization\n\n`;
    }

    content += `### General Recommendations\n`;
    content += `- Consider parallel execution if not already enabled\n`;
    content += `- Review test data setup and teardown procedures\n`;
    content += `- Implement test result caching where appropriate\n`;
    content += `- Consider splitting long integration tests into smaller units\n\n`;

    return content;
  }

  private buildTrendAnalysisContent(executions: TestExecution[]): string {
    if (executions.length < 2) {
      return '# Trend Analysis Report\n\nInsufficient data for trend analysis. At least 2 executions required.';
    }

    let content = `# Trend Analysis Report

**Generated:** ${new Date().toISOString()}
**Executions Analyzed:** ${executions.length}

## Success Rate Trends

| Execution | Date | Success Rate | Change |
|-----------|------|--------------|--------|
`;

    for (let i = 0; i < executions.length; i++) {
      const execution = executions[i];
      const successRate = execution.summary.total > 0 ? 
        (execution.summary.passed / execution.summary.total * 100).toFixed(1) : '0';
      
      let change = 'N/A';
      if (i > 0) {
        const prevRate = executions[i - 1].summary.total > 0 ?
          (executions[i - 1].summary.passed / executions[i - 1].summary.total * 100) : 0;
        const currentRate = parseFloat(successRate);
        const changeValue = (currentRate - prevRate).toFixed(1);
        change = changeValue >= 0 ? `+${changeValue}%` : `${changeValue}%`;
      }

      content += `| ${execution.id.slice(-8)} | ${execution.startTime.toISOString().split('T')[0]} | ${successRate}% | ${change} |\n`;
    }

    return content;
  }

  private buildDetailedResultsSection(categories: any): string {
    let content = '';

    if (categories.failed.length > 0) {
      content += `## Failed Tests (${categories.failed.length})\n\n`;
      for (const test of categories.failed) {
        content += `### ${test.testId}\n`;
        content += `- **Status:** ${test.status}\n`;
        content += `- **Duration:** ${this.formatDuration(test.duration)}\n`;
        if (test.error) {
          content += `- **Error:** ${test.error.message}\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  private buildFailureSummarySection(failedTests: TestResult[]): string {
    return `## Failed Tests (${failedTests.length})

${failedTests.map(test => `- **${test.testId}**: ${test.error?.message || 'No error message'}`).join('\n')}

`;
  }

  private categorizeError(error: Error | undefined): string {
    if (!error) return 'Unknown';
    
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) return 'Timeout';
    if (message.includes('network') || message.includes('connection')) return 'Network';
    if (message.includes('assertion') || message.includes('expect')) return 'Assertion';
    if (message.includes('element') || message.includes('selector')) return 'Element';
    return 'Runtime Error';
  }

  private groupErrorsByPattern(tests: TestResult[]): Map<string, TestResult[]> {
    const groups = new Map<string, TestResult[]>();
    
    for (const test of tests) {
      const pattern = this.categorizeError(test.error);
      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }
      groups.get(pattern)!.push(test);
    }

    return groups;
  }

  private getRecommendedActions(errorPattern: string): string {
    const actions: Record<string, string> = {
      'Timeout': '- Increase test timeout values\n- Optimize slow operations\n- Check for infinite loops or blocking operations',
      'Network': '- Verify network connectivity\n- Implement retry mechanisms\n- Check API endpoints and services',
      'Assertion': '- Review test expectations\n- Check for timing issues\n- Verify test data setup',
      'Element': '- Update element selectors\n- Add explicit waits for elements\n- Check for UI changes',
      'Runtime Error': '- Review application logs\n- Check for unhandled exceptions\n- Verify environment setup'
    };

    return actions[errorPattern] || '- Review error details and application logs\n- Contact development team for assistance';
  }

  private hasPerformanceMetrics(reportData: any): boolean {
    return reportData.results.some((r: TestResult) => r.metrics);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
  }

  private escapeHtml(text: string): string {
    const div = { innerHTML: '' } as any;
    div.textContent = text;
    return div.innerHTML;
  }

  private async ensureDirectoriesExist(): Promise<void> {
    const dirs = [
      this.config.outputDir,
      path.join(this.config.outputDir, 'suites'),
      path.join(this.config.outputDir, 'archive'),
      path.join(this.config.outputDir, 'screenshots'),
      path.join(this.config.outputDir, 'logs')
    ];

    for (const dir of dirs) {
      await this.ensureDirectoryExists(dir);
    }
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }
}