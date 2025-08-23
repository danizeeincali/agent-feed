/**
 * Validation Test Runner
 * 
 * Orchestrates and runs all validation tests with reporting
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suiteName: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: Array<{
    test: string;
    error: string;
  }>;
}

interface ValidationReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  suites: TestResult[];
  summary: {
    statsValidation: 'PASS' | 'FAIL';
    terminalNavigation: 'PASS' | 'FAIL';
    instanceIdStability: 'PASS' | 'FAIL';
    timestampConsistency: 'PASS' | 'FAIL';
    terminalButton: 'PASS' | 'FAIL';
    endToEndIntegration: 'PASS' | 'FAIL';
    regressionPrevention: 'PASS' | 'FAIL';
    productionReadiness: 'PASS' | 'FAIL';
  };
  recommendations: string[];
}

class ValidationRunner {
  private results: TestResult[] = [];
  
  async runValidationSuite(): Promise<ValidationReport> {
    console.log('🚀 Starting Instance State Consistency Validation...');
    
    const testSuites = [
      {
        name: 'Comprehensive Validation',
        pattern: 'comprehensive-validation.test.ts',
        focus: ['stats', 'navigation', 'ids', 'timestamps', 'buttons']
      },
      {
        name: 'Regression Tests',
        pattern: 'regression-validation.test.ts',
        focus: ['bug-prevention', 'error-recovery', 'memory-leaks']
      },
      {
        name: 'End-to-End Tests',
        pattern: 'end-to-end-validation.test.ts',
        focus: ['user-workflows', 'integration', 'performance']
      },
      {
        name: 'Production Validation',
        pattern: 'production-validation.test.ts',
        focus: ['real-websockets', 'performance', 'security']
      }
    ];
    
    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite.pattern);
      this.results.push({
        suiteName: suite.name,
        ...result
      });
    }
    
    return this.generateReport();
  }
  
  private async runTestSuite(pattern: string): Promise<Omit<TestResult, 'suiteName'>> {
    const startTime = Date.now();
    
    try {
      const output = execSync(
        `npm test -- --testPathPattern="${pattern}" --json --coverage=false --silent`,
        { 
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 60000 // 1 minute timeout per suite
        }
      );
      
      const testResult = JSON.parse(output);
      const duration = Date.now() - startTime;
      
      return {
        passed: testResult.numPassedTests || 0,
        failed: testResult.numFailedTests || 0,
        skipped: testResult.numPendingTests || 0,
        duration,
        failures: (testResult.testResults?.[0]?.assertionResults || [])
          .filter((test: any) => test.status === 'failed')
          .map((test: any) => ({
            test: test.title,
            error: test.failureMessages?.[0] || 'Unknown error'
          }))
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error(`❌ Test suite failed: ${error.message}`);
      
      return {
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        failures: [{
          test: pattern,
          error: error.message
        }]
      };
    }
  }
  
  private generateReport(): ValidationReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    const summary = this.analyzeSummary();
    const recommendations = this.generateRecommendations(summary);
    
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      suites: this.results,
      summary,
      recommendations
    };
    
    this.saveReport(report);
    this.printReport(report);
    
    return report;
  }
  
  private analyzeSummary(): ValidationReport['summary'] {
    const getStatus = (suiteNames: string[]): 'PASS' | 'FAIL' => {
      const relevantSuites = this.results.filter(r => 
        suiteNames.some(name => r.suiteName.toLowerCase().includes(name.toLowerCase()))
      );
      
      return relevantSuites.every(suite => suite.failed === 0) ? 'PASS' : 'FAIL';
    };
    
    return {
      statsValidation: getStatus(['Comprehensive']),
      terminalNavigation: getStatus(['Comprehensive', 'Regression']),
      instanceIdStability: getStatus(['Comprehensive', 'Regression']),
      timestampConsistency: getStatus(['Comprehensive', 'Regression']),
      terminalButton: getStatus(['Comprehensive', 'End-to-End']),
      endToEndIntegration: getStatus(['End-to-End']),
      regressionPrevention: getStatus(['Regression']),
      productionReadiness: getStatus(['Production'])
    };
  }
  
  private generateRecommendations(summary: ValidationReport['summary']): string[] {
    const recommendations: string[] = [];
    
    if (summary.statsValidation === 'FAIL') {
      recommendations.push('🔧 Fix stats calculation to use instances array instead of processInfo');
    }
    
    if (summary.terminalNavigation === 'FAIL') {
      recommendations.push('🔧 Implement fallback logic for terminal navigation when instance lookup fails');
    }
    
    if (summary.instanceIdStability === 'FAIL') {
      recommendations.push('🔧 Ensure instance IDs remain stable across component re-renders and process restarts');
    }
    
    if (summary.timestampConsistency === 'FAIL') {
      recommendations.push('🔧 Fix timestamp consistency - start times should not change on status updates');
    }
    
    if (summary.terminalButton === 'FAIL') {
      recommendations.push('🔧 Ensure terminal buttons are clickable and properly handle instance navigation');
    }
    
    if (summary.endToEndIntegration === 'FAIL') {
      recommendations.push('🔧 Fix integration issues in complete user workflows');
    }
    
    if (summary.regressionPrevention === 'FAIL') {
      recommendations.push('🔧 Address regression test failures - previous bugs may be reappearing');
    }
    
    if (summary.productionReadiness === 'FAIL') {
      recommendations.push('🔧 Fix production readiness issues - WebSocket connections, performance, or security');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All validation tests passed! Instance state consistency is working correctly.');
      recommendations.push('🚀 Application is ready for production deployment.');
      recommendations.push('📊 Consider implementing additional monitoring for ongoing state consistency.');
    }
    
    return recommendations;
  }
  
  private saveReport(report: ValidationReport): void {
    const reportsDir = join(process.cwd(), 'docs', 'validation');
    mkdirSync(reportsDir, { recursive: true });
    
    const reportPath = join(reportsDir, `instance-state-validation-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
  
  private printReport(report: ValidationReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 INSTANCE STATE CONSISTENCY VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.totalPassed} ✅`);
    console.log(`   Failed: ${report.totalFailed} ${report.totalFailed > 0 ? '❌' : '✅'}`);
    console.log(`   Skipped: ${report.totalSkipped}`);
    console.log(`   Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    
    console.log(`\n🎯 Validation Summary:`);
    Object.entries(report.summary).forEach(([key, status]) => {
      const emoji = status === 'PASS' ? '✅' : '❌';
      const formatted = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${emoji} ${formatted}: ${status}`);
    });
    
    if (report.totalFailed > 0) {
      console.log(`\n❌ Test Failures:`);
      report.suites.forEach(suite => {
        if (suite.failures.length > 0) {
          console.log(`\n   ${suite.suiteName}:`);
          suite.failures.forEach(failure => {
            console.log(`     • ${failure.test}`);
            console.log(`       ${failure.error.split('\n')[0]}`);
          });
        }
      });
    }
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    const overallStatus = report.totalFailed === 0 ? 'PASSED' : 'FAILED';
    const statusEmoji = overallStatus === 'PASSED' ? '✅' : '❌';
    
    console.log('\n' + '='.repeat(80));
    console.log(`${statusEmoji} VALIDATION ${overallStatus} - ${report.timestamp}`);
    console.log('='.repeat(80));
  }
}

// Export for use in other modules
export { ValidationRunner, ValidationReport };

// CLI execution
if (require.main === module) {
  const runner = new ValidationRunner();
  runner.runValidationSuite()
    .then(report => {
      process.exit(report.totalFailed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation runner failed:', error);
      process.exit(1);
    });
}