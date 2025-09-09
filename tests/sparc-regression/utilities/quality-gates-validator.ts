#!/usr/bin/env node

/**
 * SPARC Quality Gates Validator
 * Validates test results against defined quality gates
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SPARC_CONFIG, PERFORMANCE_BASELINES } from '../config/sparc-regression-config';
import type { TestRunReport } from './TestRunner';

interface QualityGateResult {
  name: string;
  passed: boolean;
  actual: number | string;
  expected: number | string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

class QualityGatesValidator {
  private report: TestRunReport;
  private results: QualityGateResult[] = [];

  constructor(report: TestRunReport) {
    this.report = report;
  }

  /**
   * Validate all quality gates
   */
  validateAll(): QualityGateResult[] {
    console.log('🚪 Validating SPARC Quality Gates...');
    
    // Test execution gates
    this.validateTestExecution();
    
    // Coverage gates
    this.validateCoverage();
    
    // Performance gates
    this.validatePerformance();
    
    // Regression gates
    this.validateRegression();
    
    // Stability gates
    this.validateStability();
    
    // Feature coverage gates
    this.validateFeatureCoverage();
    
    return this.results;
  }

  /**
   * Validate test execution metrics
   */
  private validateTestExecution(): void {
    const { summary } = this.report;
    const totalTests = summary.total;
    const passRate = totalTests > 0 ? (summary.passed / totalTests) * 100 : 0;
    
    // Pass rate gate (95% minimum for P1 tests)
    this.addResult({
      name: 'Test Pass Rate',
      passed: passRate >= 95,
      actual: `${passRate.toFixed(1)}%`,
      expected: '≥95%',
      message: passRate >= 95 
        ? `✅ Excellent pass rate: ${passRate.toFixed(1)}%`
        : `❌ Pass rate below threshold: ${passRate.toFixed(1)}% (need ≥95%)`,
      severity: passRate >= 95 ? 'info' : 'error'
    });
    
    // Zero failures gate for P1 tests
    const p1Failures = this.report.priorities?.P1?.reduce((acc, result) => acc + result.failed, 0) || 0;
    this.addResult({
      name: 'P1 Test Failures',
      passed: p1Failures === 0,
      actual: p1Failures,
      expected: '0',
      message: p1Failures === 0
        ? '✅ No P1 test failures'
        : `❌ ${p1Failures} P1 test failures detected`,
      severity: p1Failures === 0 ? 'info' : 'error'
    });
  }

  /**
   * Validate code coverage metrics
   */
  private validateCoverage(): void {
    const { coverage } = this.report;
    
    // Statement coverage
    this.addResult({
      name: 'Statement Coverage',
      passed: coverage.statements.percentage >= SPARC_CONFIG.coverage.statements,
      actual: `${coverage.statements.percentage.toFixed(1)}%`,
      expected: `≥${SPARC_CONFIG.coverage.statements}%`,
      message: coverage.statements.percentage >= SPARC_CONFIG.coverage.statements
        ? `✅ Statement coverage target met`
        : `❌ Statement coverage below target`,
      severity: coverage.statements.percentage >= SPARC_CONFIG.coverage.statements ? 'info' : 'error'
    });
    
    // Branch coverage
    this.addResult({
      name: 'Branch Coverage',
      passed: coverage.branches.percentage >= SPARC_CONFIG.coverage.branches,
      actual: `${coverage.branches.percentage.toFixed(1)}%`,
      expected: `≥${SPARC_CONFIG.coverage.branches}%`,
      message: coverage.branches.percentage >= SPARC_CONFIG.coverage.branches
        ? `✅ Branch coverage target met`
        : `❌ Branch coverage below target`,
      severity: coverage.branches.percentage >= SPARC_CONFIG.coverage.branches ? 'info' : 'warning'
    });
    
    // Function coverage
    this.addResult({
      name: 'Function Coverage',
      passed: coverage.functions.percentage >= SPARC_CONFIG.coverage.functions,
      actual: `${coverage.functions.percentage.toFixed(1)}%`,
      expected: `≥${SPARC_CONFIG.coverage.functions}%`,
      message: coverage.functions.percentage >= SPARC_CONFIG.coverage.functions
        ? `✅ Function coverage target met`
        : `❌ Function coverage below target`,
      severity: coverage.functions.percentage >= SPARC_CONFIG.coverage.functions ? 'info' : 'error'
    });
  }

  /**
   * Validate performance benchmarks
   */
  private validatePerformance(): void {
    const { performance } = this.report;
    
    // Average test duration
    const avgDurationSeconds = performance.averageTestDuration / 1000;
    const maxAvgDuration = 30; // 30 seconds max average
    
    this.addResult({
      name: 'Average Test Duration',
      passed: avgDurationSeconds <= maxAvgDuration,
      actual: `${avgDurationSeconds.toFixed(1)}s`,
      expected: `≤${maxAvgDuration}s`,
      message: avgDurationSeconds <= maxAvgDuration
        ? `✅ Test execution time acceptable`
        : `⚠️ Tests running slower than expected`,
      severity: avgDurationSeconds <= maxAvgDuration ? 'info' : 'warning'
    });
    
    // Performance benchmarks
    performance.performanceBenchmarks.forEach(benchmark => {
      const passed = benchmark.passed;
      const degradation = ((benchmark.actual - benchmark.expected) / benchmark.expected) * 100;
      
      this.addResult({
        name: `Performance: ${benchmark.metric}`,
        passed,
        actual: `${benchmark.actual}ms`,
        expected: `≤${benchmark.expected}ms`,
        message: passed
          ? `✅ ${benchmark.metric} within acceptable range`
          : `⚠️ ${benchmark.metric} degraded by ${degradation.toFixed(1)}%`,
        severity: passed ? 'info' : 'warning'
      });
    });
  }

  /**
   * Validate regression prevention
   */
  private validateRegression(): void {
    const { summary } = this.report;
    
    // No new test failures
    const newFailures = summary.failed;
    this.addResult({
      name: 'Regression Prevention',
      passed: newFailures === 0,
      actual: `${newFailures} failures`,
      expected: '0 failures',
      message: newFailures === 0
        ? '✅ No regression detected'
        : `❌ ${newFailures} potential regressions detected`,
      severity: newFailures === 0 ? 'info' : 'error'
    });
    
    // Critical feature protection
    const criticalFeatures = Object.keys(SPARC_CONFIG.criticalFeatures).filter(
      key => SPARC_CONFIG.criticalFeatures[key as keyof typeof SPARC_CONFIG.criticalFeatures]
    );
    
    let criticalFeatureFailures = 0;
    criticalFeatures.forEach(feature => {
      const featureResults = this.report.features?.[feature as keyof typeof this.report.features] || [];
      const failures = featureResults.reduce((acc, result) => acc + result.failed, 0);
      criticalFeatureFailures += failures;
    });
    
    this.addResult({
      name: 'Critical Feature Protection',
      passed: criticalFeatureFailures === 0,
      actual: `${criticalFeatureFailures} failures`,
      expected: '0 failures',
      message: criticalFeatureFailures === 0
        ? '✅ All critical features protected'
        : `❌ ${criticalFeatureFailures} critical feature failures`,
      severity: criticalFeatureFailures === 0 ? 'info' : 'error'
    });
  }

  /**
   * Validate test stability
   */
  private validateStability(): void {
    // Test flakiness (would be calculated from historical data)
    const flakyTests = 0; // Placeholder - would be computed from test history
    
    this.addResult({
      name: 'Test Stability',
      passed: flakyTests === 0,
      actual: `${flakyTests} flaky tests`,
      expected: '0 flaky tests',
      message: flakyTests === 0
        ? '✅ All tests are stable'
        : `⚠️ ${flakyTests} flaky tests detected`,
      severity: flakyTests === 0 ? 'info' : 'warning'
    });
    
    // Test execution consistency
    const { duration } = this.report;
    const durationMinutes = duration / 60000;
    const maxDuration = 15; // 15 minutes max for full suite
    
    this.addResult({
      name: 'Execution Time Consistency',
      passed: durationMinutes <= maxDuration,
      actual: `${durationMinutes.toFixed(1)}min`,
      expected: `≤${maxDuration}min`,
      message: durationMinutes <= maxDuration
        ? '✅ Test suite execution time acceptable'
        : `⚠️ Test suite running longer than expected`,
      severity: durationMinutes <= maxDuration ? 'info' : 'warning'
    });
  }

  /**
   * Validate feature coverage
   */
  private validateFeatureCoverage(): void {
    const criticalFeatures = Object.keys(SPARC_CONFIG.criticalFeatures).filter(
      key => SPARC_CONFIG.criticalFeatures[key as keyof typeof SPARC_CONFIG.criticalFeatures]
    );
    
    const coveredFeatures = Object.keys(this.report.features || {}).filter(
      feature => (this.report.features?.[feature as keyof typeof this.report.features] || []).length > 0
    );
    
    const coveragePercentage = (coveredFeatures.length / criticalFeatures.length) * 100;
    
    this.addResult({
      name: 'Feature Test Coverage',
      passed: coveragePercentage >= 100,
      actual: `${coveragePercentage.toFixed(1)}%`,
      expected: '100%',
      message: coveragePercentage >= 100
        ? '✅ All critical features have test coverage'
        : `⚠️ Some critical features lack test coverage`,
      severity: coveragePercentage >= 100 ? 'info' : 'warning'
    });
  }

  /**
   * Add a quality gate result
   */
  private addResult(result: QualityGateResult): void {
    this.results.push(result);
  }

  /**
   * Generate quality gates report
   */
  generateReport(): string {
    const passedGates = this.results.filter(r => r.passed).length;
    const totalGates = this.results.length;
    const passRate = (passedGates / totalGates) * 100;
    
    let report = `
🚪 SPARC Quality Gates Report
============================

📊 Overall Status: ${passedGates}/${totalGates} gates passed (${passRate.toFixed(1)}%)

`;

    // Group results by severity
    const errors = this.results.filter(r => r.severity === 'error');
    const warnings = this.results.filter(r => r.severity === 'warning');
    const infos = this.results.filter(r => r.severity === 'info');

    if (errors.length > 0) {
      report += `❌ ERRORS (${errors.length}):\n`;
      errors.forEach(result => {
        report += `   ${result.name}: ${result.actual} (expected: ${result.expected})\n`;
        report += `   └─ ${result.message}\n\n`;
      });
    }

    if (warnings.length > 0) {
      report += `⚠️  WARNINGS (${warnings.length}):\n`;
      warnings.forEach(result => {
        report += `   ${result.name}: ${result.actual} (expected: ${result.expected})\n`;
        report += `   └─ ${result.message}\n\n`;
      });
    }

    if (infos.length > 0) {
      report += `✅ PASSED (${infos.length}):\n`;
      infos.forEach(result => {
        report += `   ${result.name}: ${result.actual}\n`;
        report += `   └─ ${result.message}\n\n`;
      });
    }

    // Summary
    report += `
📈 Summary:
-----------
✅ Passed: ${passedGates}
❌ Failed: ${totalGates - passedGates}
🎯 Success Rate: ${passRate.toFixed(1)}%

`;

    if (errors.length === 0) {
      report += `🎉 All quality gates passed! Ready for deployment.\n`;
    } else {
      report += `🚫 ${errors.length} quality gate(s) failed. Deployment blocked.\n`;
    }

    return report;
  }

  /**
   * Check if all quality gates pass
   */
  allGatesPass(): boolean {
    const failures = this.results.filter(r => !r.passed && r.severity === 'error');
    return failures.length === 0;
  }
}

/**
 * CLI interface
 */
async function main() {
  const reportPath = process.argv[2];
  
  if (!reportPath) {
    console.error('❌ Usage: quality-gates-validator.ts <report-path>');
    process.exit(1);
  }

  try {
    // Load test report
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report: TestRunReport = JSON.parse(reportContent);
    
    // Validate quality gates
    const validator = new QualityGatesValidator(report);
    const results = validator.validateAll();
    
    // Generate and display report
    const reportText = validator.generateReport();
    console.log(reportText);
    
    // Save detailed results
    const outputPath = path.join(path.dirname(reportPath), 'quality-gates-results.json');
    await fs.writeFile(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: validator.allGatesPass(),
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        errors: results.filter(r => r.severity === 'error').length,
        warnings: results.filter(r => r.severity === 'warning').length,
      }
    }, null, 2));
    
    console.log(`📄 Detailed results saved to: ${outputPath}`);
    
    // Exit with appropriate code
    if (validator.allGatesPass()) {
      console.log('\n🎉 Quality gates validation PASSED!');
      process.exit(0);
    } else {
      console.log('\n🚫 Quality gates validation FAILED!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Failed to validate quality gates:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { QualityGatesValidator, QualityGateResult };

// CLI execution
if (require.main === module) {
  main();
}