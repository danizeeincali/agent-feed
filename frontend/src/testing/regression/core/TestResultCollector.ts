/**
 * Test Result Collector
 * Collects, analyzes, and stores test results with detailed metrics
 */

import { EventEmitter } from 'events';
import {
  TestResult,
  TestExecution,
  ExecutionSummary,
  TestStatus,
  TestMetrics,
  Coverage,
  TrendAnalysis
} from '../types';

interface ScheduleInfo {
  id: string;
  cronExpression: string;
  suiteIds: string[];
  active: boolean;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export class TestResultCollector extends EventEmitter {
  private results = new Map<string, TestResult>();
  private executions = new Map<string, TestExecution>();
  private schedules = new Map<string, ScheduleInfo>();
  private metrics = new Map<string, TestMetrics>();
  
  constructor() {
    super();
  }

  /**
   * Initialize the collector
   */
  async initialize(): Promise<void> {
    // Load existing data from persistent storage if available
    await this.loadPersistedData();
    this.emit('initialized');
  }

  /**
   * Add a test result
   */
  addResult(result: TestResult): void {
    this.results.set(result.testId, result);
    
    // Extract metrics if available
    if (result.metrics) {
      this.metrics.set(result.testId, result.metrics);
    }

    this.emit('resultAdded', result);
  }

  /**
   * Add multiple results
   */
  addResults(results: TestResult[]): void {
    for (const result of results) {
      this.addResult(result);
    }
  }

  /**
   * Store a complete test execution
   */
  storeExecution(execution: TestExecution): void {
    this.executions.set(execution.id, execution);
    
    // Store individual results
    for (const result of execution.results) {
      this.addResult(result);
    }

    this.emit('executionStored', execution);
  }

  /**
   * Generate summary from results
   */
  generateSummary(results: TestResult[]): ExecutionSummary {
    const summary: ExecutionSummary = {
      total: results.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    let totalCoverage: Coverage | undefined;
    let coverageCount = 0;

    for (const result of results) {
      // Count by status
      switch (result.status) {
        case TestStatus.PASSED:
          summary.passed++;
          break;
        case TestStatus.FAILED:
        case TestStatus.ERROR:
        case TestStatus.TIMEOUT:
          summary.failed++;
          break;
        case TestStatus.SKIPPED:
          summary.skipped++;
          break;
      }

      summary.duration += result.duration;

      // Aggregate coverage
      if (result.metrics?.coverage) {
        if (!totalCoverage) {
          totalCoverage = {
            lines: 0,
            functions: 0,
            branches: 0,
            statements: 0
          };
        }

        totalCoverage.lines += result.metrics.coverage.lines;
        totalCoverage.functions += result.metrics.coverage.functions;
        totalCoverage.branches += result.metrics.coverage.branches;
        totalCoverage.statements += result.metrics.coverage.statements;
        coverageCount++;
      }
    }

    // Calculate average coverage
    if (totalCoverage && coverageCount > 0) {
      summary.coverage = {
        lines: Math.round(totalCoverage.lines / coverageCount),
        functions: Math.round(totalCoverage.functions / coverageCount),
        branches: Math.round(totalCoverage.branches / coverageCount),
        statements: Math.round(totalCoverage.statements / coverageCount)
      };
    }

    return summary;
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(limit = 10): Promise<TestExecution[]> {
    const executions = Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);

    return executions;
  }

  /**
   * Get results by test ID
   */
  getResultsByTestId(testId: string): TestResult[] {
    return Array.from(this.results.values()).filter(r => r.testId === testId);
  }

  /**
   * Get results by status
   */
  getResultsByStatus(status: TestStatus): TestResult[] {
    return Array.from(this.results.values()).filter(r => r.status === status);
  }

  /**
   * Get failed tests with error analysis
   */
  getFailureAnalysis(): {
    totalFailures: number;
    uniqueErrors: Map<string, { count: number; testIds: string[]; firstSeen: Date; lastSeen: Date }>;
    flakyCandidates: string[];
    consistentFailures: string[];
  } {
    const failedResults = this.getResultsByStatus(TestStatus.FAILED);
    const errorCounts = new Map<string, { count: number; testIds: string[]; firstSeen: Date; lastSeen: Date }>();
    const testFailureCounts = new Map<string, number>();

    for (const result of failedResults) {
      const errorMessage = result.error?.message || 'Unknown error';
      const errorKey = this.normalizeErrorMessage(errorMessage);

      // Track error patterns
      if (!errorCounts.has(errorKey)) {
        errorCounts.set(errorKey, {
          count: 0,
          testIds: [],
          firstSeen: result.startTime,
          lastSeen: result.startTime
        });
      }

      const errorInfo = errorCounts.get(errorKey)!;
      errorInfo.count++;
      errorInfo.testIds.push(result.testId);
      if (result.startTime < errorInfo.firstSeen) {
        errorInfo.firstSeen = result.startTime;
      }
      if (result.startTime > errorInfo.lastSeen) {
        errorInfo.lastSeen = result.startTime;
      }

      // Track test failure counts
      testFailureCounts.set(result.testId, (testFailureCounts.get(result.testId) || 0) + 1);
    }

    // Identify flaky vs consistent failures
    const allResults = Array.from(this.results.values());
    const testRunCounts = new Map<string, number>();
    
    for (const result of allResults) {
      testRunCounts.set(result.testId, (testRunCounts.get(result.testId) || 0) + 1);
    }

    const flakyCandidates: string[] = [];
    const consistentFailures: string[] = [];

    for (const [testId, failureCount] of testFailureCounts.entries()) {
      const totalRuns = testRunCounts.get(testId) || 0;
      const failureRate = failureCount / totalRuns;

      if (failureRate > 0 && failureRate < 1) {
        flakyCandidates.push(testId);
      } else if (failureRate === 1 && totalRuns > 1) {
        consistentFailures.push(testId);
      }
    }

    return {
      totalFailures: failedResults.length,
      uniqueErrors: errorCounts,
      flakyCandidates,
      consistentFailures
    };
  }

  /**
   * Calculate performance trends
   */
  calculateTrends(metric: string, timeframe = '24h'): TrendAnalysis[] {
    const cutoffTime = this.getCutoffTime(timeframe);
    const recentExecutions = Array.from(this.executions.values())
      .filter(exec => exec.startTime >= cutoffTime)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (recentExecutions.length < 2) {
      return [];
    }

    const trends: TrendAnalysis[] = [];

    // Analyze different metrics
    switch (metric) {
      case 'success_rate':
        trends.push(this.calculateSuccessRateTrend(recentExecutions));
        break;
      case 'duration':
        trends.push(this.calculateDurationTrend(recentExecutions));
        break;
      case 'coverage':
        trends.push(this.calculateCoverageTrend(recentExecutions));
        break;
      default:
        // Calculate all trends
        trends.push(
          this.calculateSuccessRateTrend(recentExecutions),
          this.calculateDurationTrend(recentExecutions),
          this.calculateCoverageTrend(recentExecutions)
        );
    }

    return trends.filter(trend => trend !== null) as TrendAnalysis[];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(testId?: string): {
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    memoryUsage: number;
    cpuUsage: number;
  } {
    const results = testId 
      ? this.getResultsByTestId(testId)
      : Array.from(this.results.values());

    const durations = results.map(r => r.duration).sort((a, b) => a - b);
    const memoryUsages = results
      .map(r => r.metrics?.memoryUsage)
      .filter((m): m is number => m !== undefined);
    const cpuUsages = results
      .map(r => r.metrics?.cpuUsage)
      .filter((c): c is number => c !== undefined);

    return {
      averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      medianDuration: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
      p95Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      memoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length : 0,
      cpuUsage: cpuUsages.length > 0 ? cpuUsages.reduce((sum, c) => sum + c, 0) / cpuUsages.length : 0
    };
  }

  /**
   * Store schedule information
   */
  async storeSchedule(schedule: ScheduleInfo): Promise<void> {
    this.schedules.set(schedule.id, schedule);
    this.emit('scheduleStored', schedule);
  }

  /**
   * Get all schedules
   */
  async getSchedules(): Promise<ScheduleInfo[]> {
    return Array.from(this.schedules.values());
  }

  /**
   * Clean up old data
   */
  async cleanup(retentionDays = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old results
    const oldResults = Array.from(this.results.entries())
      .filter(([_, result]) => result.startTime < cutoffDate);

    for (const [testId, _] of oldResults) {
      this.results.delete(testId);
      this.metrics.delete(testId);
    }

    // Clean up old executions
    const oldExecutions = Array.from(this.executions.entries())
      .filter(([_, execution]) => execution.startTime < cutoffDate);

    for (const [execId, _] of oldExecutions) {
      this.executions.delete(execId);
    }

    this.emit('cleanupComplete', { 
      removedResults: oldResults.length, 
      removedExecutions: oldExecutions.length 
    });
  }

  // Private helper methods
  private normalizeErrorMessage(errorMessage: string): string {
    // Remove timestamps, line numbers, and other variable parts
    return errorMessage
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
      .replace(/:\d+:\d+/g, ':[LINE]:[COL]')
      .replace(/\d+ms/g, '[DURATION]ms')
      .replace(/\b\d+\b/g, '[NUMBER]');
  }

  private getCutoffTime(timeframe: string): Date {
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateSuccessRateTrend(executions: TestExecution[]): TrendAnalysis {
    const rates = executions.map(exec => 
      exec.summary.total > 0 ? exec.summary.passed / exec.summary.total * 100 : 0
    );

    const current = rates[rates.length - 1] || 0;
    const previous = rates[rates.length - 2] || current;
    const change = current - previous;

    return {
      metric: 'Success Rate',
      current,
      previous,
      change,
      direction: change > 0 ? 'improving' : change < 0 ? 'degrading' : 'stable',
      analysis: this.generateTrendAnalysis('success rate', change, current)
    };
  }

  private calculateDurationTrend(executions: TestExecution[]): TrendAnalysis {
    const durations = executions.map(exec => exec.summary.duration);
    
    const current = durations[durations.length - 1] || 0;
    const previous = durations[durations.length - 2] || current;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      metric: 'Execution Duration',
      current,
      previous,
      change,
      direction: change < 0 ? 'improving' : change > 0 ? 'degrading' : 'stable',
      analysis: this.generateTrendAnalysis('execution duration', change, current)
    };
  }

  private calculateCoverageTrend(executions: TestExecution[]): TrendAnalysis {
    const coverages = executions
      .map(exec => exec.summary.coverage?.lines || 0)
      .filter(c => c > 0);

    if (coverages.length < 2) {
      return {
        metric: 'Code Coverage',
        current: coverages[0] || 0,
        previous: coverages[0] || 0,
        change: 0,
        direction: 'stable',
        analysis: 'Insufficient data for coverage trend analysis'
      };
    }

    const current = coverages[coverages.length - 1];
    const previous = coverages[coverages.length - 2];
    const change = current - previous;

    return {
      metric: 'Code Coverage',
      current,
      previous,
      change,
      direction: change > 0 ? 'improving' : change < 0 ? 'degrading' : 'stable',
      analysis: this.generateTrendAnalysis('code coverage', change, current)
    };
  }

  private generateTrendAnalysis(metric: string, change: number, current: number): string {
    const absChange = Math.abs(change);
    
    if (absChange < 0.1) {
      return `${metric} remains stable at ${current.toFixed(1)}`;
    } else if (change > 0) {
      return `${metric} improved by ${absChange.toFixed(1)} to ${current.toFixed(1)}`;
    } else {
      return `${metric} decreased by ${absChange.toFixed(1)} to ${current.toFixed(1)}`;
    }
  }

  private async loadPersistedData(): Promise<void> {
    // Implementation would load from persistent storage
    // For now, this is a placeholder
  }
}