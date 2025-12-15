/**
 * PM Report Generator
 * Generates executive-level reports for project managers with business insights
 */

import {
  TestExecution,
  PMReport,
  ExecutiveSummary,
  RiskAssessment,
  Recommendation,
  TrendAnalysis,
  OverallStatus,
  HealthStatus,
  RiskLevel,
  RiskFactor,
  TestStatus
} from '../types';

export class PMReportGenerator {
  constructor() {}

  /**
   * Initialize the report generator
   */
  async initialize(): Promise<void> {
    // Setup any required resources
  }

  /**
   * Generate a comprehensive PM report
   */
  async generateReport(
    execution: TestExecution,
    historicalData: TestExecution[] = []
  ): Promise<PMReport> {
    const reportId = this.generateReportId();
    const generatedAt = new Date();

    // Generate all report sections
    const [
      status,
      summary,
      riskAssessment,
      recommendations,
      trends
    ] = await Promise.all([
      this.determineOverallStatus(execution),
      this.generateExecutiveSummary(execution, historicalData),
      this.assessRisk(execution, historicalData),
      this.generateRecommendations(execution, historicalData),
      this.analyzeTrends(execution, historicalData)
    ]);

    const nextSteps = this.generateNextSteps(execution, riskAssessment, recommendations);

    return {
      id: reportId,
      title: `Test Execution Report - ${this.formatDate(generatedAt)}`,
      executionId: execution.id,
      generatedAt,
      status,
      summary,
      riskAssessment,
      recommendations,
      trends,
      nextSteps
    };
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    execution: TestExecution,
    historicalData: TestExecution[]
  ): Promise<ExecutiveSummary> {
    const { summary } = execution;
    const successRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    
    // Calculate regression count by comparing with previous execution
    let regressionCount = 0;
    if (historicalData.length > 0) {
      const previousExecution = historicalData[0];
      regressionCount = this.calculateRegressions(execution, previousExecution);
    }

    // Assess critical issues
    const criticalIssues = this.identifyCriticalIssues(execution);

    return {
      overallHealth: this.determineHealthStatus(successRate, regressionCount),
      testCoverage: execution.summary.coverage?.lines || 0,
      criticalIssues: criticalIssues.length,
      regressionCount,
      performanceImpact: this.assessPerformanceImpact(execution, historicalData),
      deliveryRisk: this.assessDeliveryRisk(successRate, regressionCount, criticalIssues.length)
    };
  }

  /**
   * Assess overall risk
   */
  private async assessRisk(
    execution: TestExecution,
    historicalData: TestExecution[]
  ): Promise<RiskAssessment> {
    const riskFactors = await this.identifyRiskFactors(execution, historicalData);
    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      level: overallRisk,
      factors: riskFactors,
      mitigation: this.generateMitigationStrategies(riskFactors),
      timeline: this.estimateResolutionTimeline(overallRisk, riskFactors)
    };
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    execution: TestExecution,
    historicalData: TestExecution[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const { summary } = execution;
    const failureRate = summary.total > 0 ? (summary.failed / summary.total) * 100 : 0;

    // High failure rate recommendation
    if (failureRate > 20) {
      recommendations.push({
        id: 'high-failure-rate',
        priority: 'high',
        category: 'Quality',
        description: `Current failure rate of ${failureRate.toFixed(1)}% exceeds acceptable threshold`,
        action: 'Implement immediate failure analysis and remediation workflow',
        effort: '2-3 days',
        timeline: 'This week'
      });
    }

    // Coverage recommendation
    const coverage = summary.coverage?.lines || 0;
    if (coverage < 80) {
      recommendations.push({
        id: 'low-coverage',
        priority: 'medium',
        category: 'Coverage',
        description: `Code coverage at ${coverage}% is below target of 80%`,
        action: 'Increase test coverage for critical paths',
        effort: '1-2 weeks',
        timeline: 'Next sprint'
      });
    }

    // Performance recommendation
    if (this.hasPerformanceIssues(execution)) {
      recommendations.push({
        id: 'performance-degradation',
        priority: 'high',
        category: 'Performance',
        description: 'Test execution time has increased significantly',
        action: 'Optimize slow tests and implement parallel execution',
        effort: '3-5 days',
        timeline: 'This sprint'
      });
    }

    // Flaky tests recommendation
    const flakyTests = this.identifyFlakyTests(execution);
    if (flakyTests.length > 0) {
      recommendations.push({
        id: 'flaky-tests',
        priority: 'medium',
        category: 'Reliability',
        description: `${flakyTests.length} potentially flaky tests detected`,
        action: 'Investigate and fix flaky test patterns',
        effort: '1 week',
        timeline: 'Next 2 weeks'
      });
    }

    // Infrastructure recommendation
    if (this.hasInfrastructureIssues(execution)) {
      recommendations.push({
        id: 'infrastructure-stability',
        priority: 'critical',
        category: 'Infrastructure',
        description: 'Test environment instability detected',
        action: 'Review and stabilize test infrastructure',
        effort: '1-2 weeks',
        timeline: 'Immediate'
      });
    }

    return recommendations.sort((a, b) => this.priorityOrder(a.priority) - this.priorityOrder(b.priority));
  }

  /**
   * Analyze trends from historical data
   */
  private async analyzeTrends(
    execution: TestExecution,
    historicalData: TestExecution[]
  ): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    if (historicalData.length === 0) {
      return trends;
    }

    const current = execution.summary;
    const previous = historicalData[0].summary;

    // Success rate trend
    const currentSuccessRate = current.total > 0 ? (current.passed / current.total) * 100 : 0;
    const previousSuccessRate = previous.total > 0 ? (previous.passed / previous.total) * 100 : 0;
    
    trends.push({
      metric: 'Success Rate',
      current: currentSuccessRate,
      previous: previousSuccessRate,
      change: currentSuccessRate - previousSuccessRate,
      direction: currentSuccessRate > previousSuccessRate ? 'improving' : 
                currentSuccessRate < previousSuccessRate ? 'degrading' : 'stable',
      analysis: this.generateSuccessRateAnalysis(currentSuccessRate, previousSuccessRate)
    });

    // Duration trend
    const durationChange = previous.duration > 0 ? 
      ((current.duration - previous.duration) / previous.duration) * 100 : 0;

    trends.push({
      metric: 'Execution Time',
      current: current.duration,
      previous: previous.duration,
      change: durationChange,
      direction: durationChange < -5 ? 'improving' : 
                durationChange > 5 ? 'degrading' : 'stable',
      analysis: this.generateDurationAnalysis(current.duration, previous.duration, durationChange)
    });

    // Coverage trend
    if (current.coverage && previous.coverage) {
      const coverageChange = current.coverage.lines - previous.coverage.lines;
      
      trends.push({
        metric: 'Code Coverage',
        current: current.coverage.lines,
        previous: previous.coverage.lines,
        change: coverageChange,
        direction: coverageChange > 1 ? 'improving' : 
                  coverageChange < -1 ? 'degrading' : 'stable',
        analysis: this.generateCoverageAnalysis(current.coverage.lines, previous.coverage.lines, coverageChange)
      });
    }

    return trends;
  }

  /**
   * Generate next steps based on analysis
   */
  private generateNextSteps(
    execution: TestExecution,
    riskAssessment: RiskAssessment,
    recommendations: Recommendation[]
  ): string[] {
    const nextSteps: string[] = [];

    // Based on risk level
    if (riskAssessment.level === RiskLevel.CRITICAL) {
      nextSteps.push('🚨 IMMEDIATE ACTION: Address critical test failures before any deployments');
      nextSteps.push('Schedule emergency team meeting to review failures and create action plan');
    } else if (riskAssessment.level === RiskLevel.HIGH) {
      nextSteps.push('⚠️ HIGH PRIORITY: Review and address failing tests within 24 hours');
    }

    // Based on top recommendations
    const criticalRecs = recommendations.filter(r => r.priority === 'critical');
    const highRecs = recommendations.filter(r => r.priority === 'high');

    if (criticalRecs.length > 0) {
      nextSteps.push(`Address ${criticalRecs.length} critical issue(s): ${criticalRecs[0].action}`);
    }

    if (highRecs.length > 0) {
      nextSteps.push(`Plan for ${highRecs.length} high-priority improvement(s) in next sprint planning`);
    }

    // General next steps
    const successRate = execution.summary.total > 0 ? 
      (execution.summary.passed / execution.summary.total) * 100 : 0;

    if (successRate > 95) {
      nextSteps.push('✅ Test suite is healthy - continue monitoring and maintain current practices');
    } else if (successRate > 85) {
      nextSteps.push('Monitor remaining failures and plan incremental improvements');
    } else {
      nextSteps.push('Implement comprehensive test improvement strategy');
    }

    nextSteps.push('Review this report with development team in next standup');
    nextSteps.push('Schedule follow-up regression analysis for next major release');

    return nextSteps;
  }

  // Helper methods for status determination
  private determineOverallStatus(execution: TestExecution): OverallStatus {
    const { summary } = execution;
    const successRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    
    if (successRate >= 95 && summary.failed === 0) return OverallStatus.GREEN;
    if (successRate >= 85 && summary.failed <= 5) return OverallStatus.YELLOW;
    return OverallStatus.RED;
  }

  private determineHealthStatus(successRate: number, regressionCount: number): HealthStatus {
    if (successRate >= 98 && regressionCount === 0) return HealthStatus.EXCELLENT;
    if (successRate >= 90 && regressionCount <= 2) return HealthStatus.GOOD;
    if (successRate >= 80 && regressionCount <= 5) return HealthStatus.FAIR;
    return HealthStatus.POOR;
  }

  private assessDeliveryRisk(successRate: number, regressionCount: number, criticalIssues: number): RiskLevel {
    if (criticalIssues > 0 || successRate < 70) return RiskLevel.CRITICAL;
    if (regressionCount > 5 || successRate < 85) return RiskLevel.HIGH;
    if (regressionCount > 2 || successRate < 95) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private calculateRegressions(current: TestExecution, previous: TestExecution): number {
    // Compare test results to identify new failures
    const currentPassed = new Set(
      current.results
        .filter(r => r.status === TestStatus.PASSED)
        .map(r => r.testId)
    );
    
    const previousPassed = new Set(
      previous.results
        .filter(r => r.status === TestStatus.PASSED)
        .map(r => r.testId)
    );

    let regressions = 0;
    for (const testId of previousPassed) {
      if (!currentPassed.has(testId)) {
        // Test that passed before but is now failing
        const currentResult = current.results.find(r => r.testId === testId);
        if (currentResult && currentResult.status === TestStatus.FAILED) {
          regressions++;
        }
      }
    }

    return regressions;
  }

  private identifyCriticalIssues(execution: TestExecution): string[] {
    const criticalIssues: string[] = [];
    
    // Look for critical test failures
    const criticalFailures = execution.results.filter(r => 
      r.status === TestStatus.FAILED && 
      r.error?.message.toLowerCase().includes('critical')
    );

    if (criticalFailures.length > 0) {
      criticalIssues.push(`${criticalFailures.length} critical test failures`);
    }

    // Check for timeout issues
    const timeouts = execution.results.filter(r => r.status === TestStatus.TIMEOUT);
    if (timeouts.length > execution.results.length * 0.1) {
      criticalIssues.push('High timeout rate indicates infrastructure issues');
    }

    // Check for error patterns
    const errorResults = execution.results.filter(r => r.status === TestStatus.ERROR);
    if (errorResults.length > 0) {
      criticalIssues.push(`${errorResults.length} tests failed with errors`);
    }

    return criticalIssues;
  }

  private assessPerformanceImpact(execution: TestExecution, historicalData: TestExecution[]): string {
    if (historicalData.length === 0) return 'No historical data available';

    const currentDuration = execution.summary.duration;
    const previousDuration = historicalData[0].summary.duration;
    
    if (previousDuration === 0) return 'No comparison available';

    const percentChange = ((currentDuration - previousDuration) / previousDuration) * 100;

    if (percentChange > 20) return 'Significant performance degradation detected';
    if (percentChange > 10) return 'Minor performance impact observed';
    if (percentChange < -10) return 'Performance improvement detected';
    return 'Performance remains stable';
  }

  private async identifyRiskFactors(execution: TestExecution, historicalData: TestExecution[]): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];
    const { summary } = execution;
    const failureRate = summary.total > 0 ? (summary.failed / summary.total) * 100 : 0;

    // High failure rate risk
    if (failureRate > 15) {
      factors.push({
        category: 'Quality',
        description: 'High test failure rate compromises release confidence',
        impact: failureRate > 25 ? 'critical' : 'high',
        probability: 0.9
      });
    }

    // Infrastructure stability risk
    const timeoutRate = summary.total > 0 ? 
      (execution.results.filter(r => r.status === TestStatus.TIMEOUT).length / summary.total) * 100 : 0;
    
    if (timeoutRate > 5) {
      factors.push({
        category: 'Infrastructure',
        description: 'Test environment instability affecting reliability',
        impact: 'medium',
        probability: 0.7
      });
    }

    // Regression risk
    if (historicalData.length > 0) {
      const regressionCount = this.calculateRegressions(execution, historicalData[0]);
      if (regressionCount > 3) {
        factors.push({
          category: 'Regression',
          description: 'Multiple regressions indicate unstable codebase',
          impact: 'high',
          probability: 0.8
        });
      }
    }

    return factors;
  }

  private calculateOverallRisk(factors: RiskFactor[]): RiskLevel {
    if (factors.length === 0) return RiskLevel.LOW;

    const criticalFactors = factors.filter(f => f.impact === 'critical');
    const highFactors = factors.filter(f => f.impact === 'high');

    if (criticalFactors.length > 0) return RiskLevel.CRITICAL;
    if (highFactors.length > 2) return RiskLevel.HIGH;
    if (highFactors.length > 0) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private generateMitigationStrategies(factors: RiskFactor[]): string[] {
    const strategies: string[] = [];
    const categories = new Set(factors.map(f => f.category));

    if (categories.has('Quality')) {
      strategies.push('Implement immediate code review for failing tests');
      strategies.push('Add additional test coverage for critical paths');
    }

    if (categories.has('Infrastructure')) {
      strategies.push('Review test environment configuration and stability');
      strategies.push('Implement retry mechanisms for flaky infrastructure');
    }

    if (categories.has('Regression')) {
      strategies.push('Enhance pre-commit testing and validation');
      strategies.push('Implement stricter code review policies');
    }

    return strategies;
  }

  private estimateResolutionTimeline(risk: RiskLevel, factors: RiskFactor[]): string {
    switch (risk) {
      case RiskLevel.CRITICAL:
        return 'Immediate action required - within 24 hours';
      case RiskLevel.HIGH:
        return 'Address within current sprint - 1-2 weeks';
      case RiskLevel.MEDIUM:
        return 'Plan for next sprint - 2-4 weeks';
      case RiskLevel.LOW:
        return 'Monitor and address in regular maintenance - 1-2 months';
      default:
        return 'Timeline assessment not available';
    }
  }

  private hasPerformanceIssues(execution: TestExecution): boolean {
    const longRunningTests = execution.results.filter(r => r.duration > 30000); // 30 seconds
    return longRunningTests.length > execution.results.length * 0.1;
  }

  private identifyFlakyTests(execution: TestExecution): string[] {
    // This would typically require historical data to identify patterns
    // For now, identify tests with timeout or intermittent failures
    return execution.results
      .filter(r => r.status === TestStatus.TIMEOUT)
      .map(r => r.testId);
  }

  private hasInfrastructureIssues(execution: TestExecution): boolean {
    const errorTests = execution.results.filter(r => 
      r.status === TestStatus.ERROR && 
      (r.error?.message.includes('network') || 
       r.error?.message.includes('connection') ||
       r.error?.message.includes('timeout'))
    );
    return errorTests.length > execution.results.length * 0.05;
  }

  private priorityOrder(priority: string): number {
    switch (priority) {
      case 'critical': return 0;
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 4;
    }
  }

  private generateSuccessRateAnalysis(current: number, previous: number): string {
    const change = current - previous;
    if (Math.abs(change) < 1) return 'Success rate remains stable';
    if (change > 0) return `Success rate improved by ${change.toFixed(1)}%`;
    return `Success rate decreased by ${Math.abs(change).toFixed(1)}%`;
  }

  private generateDurationAnalysis(current: number, previous: number, changePercent: number): string {
    if (Math.abs(changePercent) < 5) return 'Execution time remains consistent';
    if (changePercent < 0) return `Execution time improved by ${Math.abs(changePercent).toFixed(1)}%`;
    return `Execution time increased by ${changePercent.toFixed(1)}%`;
  }

  private generateCoverageAnalysis(current: number, previous: number, change: number): string {
    if (Math.abs(change) < 1) return 'Code coverage remains stable';
    if (change > 0) return `Coverage increased by ${change.toFixed(1)}%`;
    return `Coverage decreased by ${Math.abs(change).toFixed(1)}%`;
  }

  private generateReportId(): string {
    return `pm_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}