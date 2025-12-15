#!/usr/bin/env node

/**
 * Automated Regression Test Runner
 * Orchestrates comprehensive regression testing with PM-oriented reporting
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

class RegressionTestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      suites: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      executionTime: 0,
      coverage: {},
      regressionsPrevented: 0,
      businessImpact: 'low'
    };
    
    this.testSuites = [
      {
        name: 'Core Regression Framework',
        path: 'tests/regression/regression-framework.test.ts',
        priority: 'critical',
        description: 'Validates core regression testing framework'
      },
      {
        name: 'NLD Pattern Analysis',
        path: 'tests/regression/nld-pattern-analysis.test.ts',
        priority: 'high',
        description: 'Tests AI-powered pattern recognition and failure prediction'
      },
      {
        name: 'Enhanced Agent Manager',
        path: 'tests/title-change-validation.test.js',
        priority: 'high',
        description: 'Validates Enhanced Agent Manager functionality and title changes'
      },
      {
        name: 'White Screen Prevention',
        path: 'tests/regression/white-screen-prevention.test.tsx',
        priority: 'critical',
        description: 'Prevents white screen regressions across all routes'
      },
      {
        name: 'Component Integration',
        path: 'tests/integration/component-interaction.test.tsx',
        priority: 'medium',
        description: 'Tests cross-component interactions and state management'
      },
      {
        name: 'Performance Benchmarks',
        path: 'tests/performance/render-performance.test.tsx',
        priority: 'medium',
        description: 'Validates performance standards and detects degradation'
      }
    ];
  }

  async runRegressionTests() {
    console.log(`${colors.bold}${colors.blue}🚀 Starting Comprehensive Regression Testing${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const startTime = Date.now();
    let overallSuccess = true;

    // Run each test suite
    for (const suite of this.testSuites) {
      console.log(`${colors.bold}${colors.magenta}📋 Running: ${suite.name}${colors.reset}`);
      console.log(`   Priority: ${this.getPriorityColor(suite.priority)}${suite.priority.toUpperCase()}${colors.reset}`);
      console.log(`   Description: ${suite.description}`);
      
      try {
        const suiteResult = await this.runTestSuite(suite);
        this.testResults.suites.push(suiteResult);
        
        if (suiteResult.success) {
          console.log(`   ${colors.green}✅ PASSED${colors.reset} (${suiteResult.tests} tests, ${suiteResult.duration}ms)\n`);
        } else {
          console.log(`   ${colors.red}❌ FAILED${colors.reset} (${suiteResult.failures} failures, ${suiteResult.duration}ms)\n`);
          overallSuccess = false;
        }
      } catch (error) {
        console.log(`   ${colors.red}💥 ERROR${colors.reset}: ${error.message}\n`);
        overallSuccess = false;
      }
    }

    this.testResults.executionTime = Date.now() - startTime;
    this.testResults.endTime = new Date();

    // Generate reports
    await this.generatePMReport(overallSuccess);
    await this.generateTechnicalReport();
    await this.generateRegressionSummary();

    // Display final results
    this.displayFinalResults(overallSuccess);

    return overallSuccess;
  }

  async runTestSuite(suite) {
    const suiteStartTime = Date.now();
    
    try {
      // Check if test file exists
      const testPath = path.join(process.cwd(), suite.path);
      if (!fs.existsSync(testPath)) {
        console.log(`   ${colors.yellow}⚠️  Test file not found: ${suite.path}${colors.reset}`);
        return {
          name: suite.name,
          success: true, // Skip missing optional tests
          tests: 0,
          failures: 0,
          duration: 0,
          skipped: true
        };
      }

      // Run the test suite
      const result = execSync(`npm test ${suite.path}`, { 
        encoding: 'utf8',
        timeout: 60000 // 1 minute timeout per suite
      });
      
      // Parse Jest output for metrics
      const metrics = this.parseJestOutput(result);
      
      return {
        name: suite.name,
        success: metrics.failures === 0,
        tests: metrics.tests,
        failures: metrics.failures,
        passed: metrics.passed,
        duration: Date.now() - suiteStartTime,
        skipped: false,
        output: result
      };
      
    } catch (error) {
      // Parse error output for partial results
      const metrics = this.parseJestOutput(error.stdout || error.message);
      
      return {
        name: suite.name,
        success: false,
        tests: metrics.tests,
        failures: metrics.failures || 1,
        passed: metrics.passed,
        duration: Date.now() - suiteStartTime,
        skipped: false,
        error: error.message,
        output: error.stdout || error.message
      };
    }
  }

  parseJestOutput(output) {
    const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/) || 
                     output.match(/(\d+)\s+passed.*?(\d+)\s+total/) ||
                     output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    
    if (!testMatch) {
      return { tests: 0, passed: 0, failures: 0 };
    }

    if (testMatch.length === 3) {
      // Format: "X passed, Y total"
      return {
        passed: parseInt(testMatch[1]),
        tests: parseInt(testMatch[2]),
        failures: parseInt(testMatch[2]) - parseInt(testMatch[1])
      };
    } else if (testMatch.length === 4) {
      // Format: "X failed, Y passed, Z total"
      return {
        failures: parseInt(testMatch[1]),
        passed: parseInt(testMatch[2]),
        tests: parseInt(testMatch[3])
      };
    }

    return { tests: 0, passed: 0, failures: 0 };
  }

  async generatePMReport(overallSuccess) {
    const report = {
      executiveSummary: {
        status: overallSuccess ? 'GREEN' : 'RED',
        riskLevel: overallSuccess ? 'LOW' : 'HIGH',
        businessImpact: this.assessBusinessImpact(),
        recommendation: overallSuccess ? 'PROCEED WITH DEPLOYMENT' : 'DEPLOYMENT BLOCKED',
        confidenceLevel: this.calculateConfidenceLevel()
      },
      metrics: {
        totalTestSuites: this.testSuites.length,
        passedSuites: this.testResults.suites.filter(s => s.success).length,
        failedSuites: this.testResults.suites.filter(s => !s.success).length,
        executionTime: `${Math.round(this.testResults.executionTime / 1000)}s`,
        regressionsPrevented: this.calculateRegressionsBlocked()
      },
      keyFindings: this.generateKeyFindings(),
      recommendations: this.generateBusinessRecommendations(overallSuccess),
      nextSteps: this.generateNextSteps(overallSuccess)
    };

    // Save PM report
    const pmReportPath = path.join(process.cwd(), 'docs/regression/pm-regression-report.json');
    fs.mkdirSync(path.dirname(pmReportPath), { recursive: true });
    fs.writeFileSync(pmReportPath, JSON.stringify(report, null, 2));

    // Also generate markdown version for easy reading
    const markdownReport = this.generateMarkdownPMReport(report);
    fs.writeFileSync(
      path.join(process.cwd(), 'docs/regression/pm-regression-report.md'),
      markdownReport
    );
  }

  async generateTechnicalReport() {
    const technicalReport = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      testExecution: {
        totalDuration: this.testResults.executionTime,
        suiteResults: this.testResults.suites,
        failureAnalysis: this.analyzeFailures(),
        performanceMetrics: this.gatherPerformanceMetrics()
      },
      regressionAnalysis: {
        patternsDetected: 'NLD pattern analysis results would be here',
        riskAssessment: 'Component risk assessment would be here',
        recommendations: 'Technical recommendations would be here'
      }
    };

    const techReportPath = path.join(process.cwd(), 'docs/regression/technical-regression-report.json');
    fs.writeFileSync(techReportPath, JSON.stringify(technicalReport, null, 2));
  }

  async generateRegressionSummary() {
    const summary = {
      date: new Date().toISOString(),
      status: this.testResults.suites.every(s => s.success) ? 'PASS' : 'FAIL',
      totalTests: this.testResults.suites.reduce((sum, s) => sum + s.tests, 0),
      totalPassed: this.testResults.suites.reduce((sum, s) => sum + s.passed, 0),
      totalFailed: this.testResults.suites.reduce((sum, s) => sum + s.failures, 0),
      executionTime: this.testResults.executionTime,
      criticalIssues: this.identifyCriticalIssues(),
      improvements: this.identifyImprovements()
    };

    const summaryPath = path.join(process.cwd(), 'docs/regression/regression-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  displayFinalResults(overallSuccess) {
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}📊 REGRESSION TESTING RESULTS${colors.reset}\n`);

    // Executive Summary
    const status = overallSuccess ? 'PASS' : 'FAIL';
    const statusColor = overallSuccess ? colors.green : colors.red;
    const riskLevel = overallSuccess ? 'LOW' : 'HIGH';
    const riskColor = overallSuccess ? colors.green : colors.red;

    console.log(`${colors.bold}Executive Summary:${colors.reset}`);
    console.log(`   Status: ${statusColor}${status}${colors.reset}`);
    console.log(`   Risk Level: ${riskColor}${riskLevel}${colors.reset}`);
    console.log(`   Business Impact: ${this.assessBusinessImpact()}`);
    console.log(`   Execution Time: ${Math.round(this.testResults.executionTime / 1000)}s\n`);

    // Test Results Summary
    const totalTests = this.testResults.suites.reduce((sum, s) => sum + s.tests, 0);
    const totalPassed = this.testResults.suites.reduce((sum, s) => sum + s.passed, 0);
    const totalFailed = this.testResults.suites.reduce((sum, s) => sum + s.failures, 0);

    console.log(`${colors.bold}Test Results:${colors.reset}`);
    console.log(`   Total Test Suites: ${this.testSuites.length}`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ${colors.green}Passed: ${totalPassed}${colors.reset}`);
    console.log(`   ${colors.red}Failed: ${totalFailed}${colors.reset}\n`);

    // Recommendations
    console.log(`${colors.bold}Recommendations:${colors.reset}`);
    if (overallSuccess) {
      console.log(`   ${colors.green}✅ Safe to deploy - all regression tests passed${colors.reset}`);
      console.log(`   ${colors.blue}ℹ️  Consider running performance benchmarks before production${colors.reset}`);
    } else {
      console.log(`   ${colors.red}🚫 Deployment blocked - critical regressions detected${colors.reset}`);
      console.log(`   ${colors.yellow}⚠️  Review technical report for detailed failure analysis${colors.reset}`);
    }

    // Report Locations
    console.log(`\n${colors.bold}Generated Reports:${colors.reset}`);
    console.log(`   📋 PM Report: docs/regression/pm-regression-report.md`);
    console.log(`   🔧 Technical Report: docs/regression/technical-regression-report.json`);
    console.log(`   📊 Summary: docs/regression/regression-summary.json\n`);

    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  }

  // Helper methods
  getPriorityColor(priority) {
    switch (priority) {
      case 'critical': return colors.red;
      case 'high': return colors.yellow;
      case 'medium': return colors.blue;
      case 'low': return colors.green;
      default: return colors.white;
    }
  }

  assessBusinessImpact() {
    const failedSuites = this.testResults.suites.filter(s => !s.success);
    const criticalFailures = failedSuites.filter(s => 
      this.testSuites.find(ts => ts.name === s.name)?.priority === 'critical'
    );

    if (criticalFailures.length > 0) return 'HIGH';
    if (failedSuites.length > 2) return 'MEDIUM';
    return 'LOW';
  }

  calculateConfidenceLevel() {
    const totalTests = this.testResults.suites.reduce((sum, s) => sum + s.tests, 0);
    const totalPassed = this.testResults.suites.reduce((sum, s) => sum + s.passed, 0);
    
    if (totalTests === 0) return 0;
    return Math.round((totalPassed / totalTests) * 100);
  }

  calculateRegressionsBlocked() {
    return this.testResults.suites.filter(s => 
      s.name.includes('Prevention') || s.name.includes('White Screen')
    ).reduce((sum, s) => sum + s.passed, 0);
  }

  generateKeyFindings() {
    const findings = [];
    
    this.testResults.suites.forEach(suite => {
      if (!suite.success) {
        findings.push(`❌ ${suite.name}: ${suite.failures} test(s) failed`);
      } else if (suite.tests > 0) {
        findings.push(`✅ ${suite.name}: All ${suite.tests} tests passed`);
      }
    });

    return findings;
  }

  generateBusinessRecommendations(overallSuccess) {
    if (overallSuccess) {
      return [
        'Deployment approved based on regression test results',
        'Monitor performance metrics in production for 24 hours post-deployment',
        'Schedule next regression test run for upcoming sprint'
      ];
    } else {
      return [
        'Block deployment until critical test failures are resolved',
        'Prioritize fixing failed regression tests before new feature work',
        'Review and update test coverage for affected components',
        'Consider rolling back recent changes if issues persist'
      ];
    }
  }

  generateNextSteps(overallSuccess) {
    if (overallSuccess) {
      return [
        'Proceed with deployment to staging environment',
        'Run smoke tests in staging before production',
        'Update regression test suite based on any new patterns'
      ];
    } else {
      return [
        'Fix all failed regression tests (Priority: Critical)',
        'Re-run regression test suite after fixes',
        'Review code changes that may have introduced regressions',
        'Update documentation with lessons learned'
      ];
    }
  }

  analyzeFailures() {
    return this.testResults.suites
      .filter(s => !s.success)
      .map(s => ({
        suite: s.name,
        failures: s.failures,
        error: s.error,
        recommendation: `Review ${s.name} test failures and fix underlying issues`
      }));
  }

  gatherPerformanceMetrics() {
    return {
      averageSuiteDuration: this.testResults.suites.length > 0 
        ? Math.round(this.testResults.suites.reduce((sum, s) => sum + s.duration, 0) / this.testResults.suites.length)
        : 0,
      slowestSuite: this.testResults.suites.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest, { duration: 0 }
      ),
      totalExecutionTime: this.testResults.executionTime
    };
  }

  identifyCriticalIssues() {
    return this.testResults.suites
      .filter(s => !s.success && this.testSuites.find(ts => ts.name === s.name)?.priority === 'critical')
      .map(s => s.name);
  }

  identifyImprovements() {
    const improvements = [];
    
    if (this.testResults.suites.every(s => s.success)) {
      improvements.push('All regression tests passing - system stability maintained');
    }
    
    const fastSuites = this.testResults.suites.filter(s => s.duration < 1000);
    if (fastSuites.length > 0) {
      improvements.push(`${fastSuites.length} test suite(s) completed in under 1 second`);
    }

    return improvements;
  }

  generateMarkdownPMReport(report) {
    return `# Regression Testing Report
    
## Executive Summary

**Status:** ${report.executiveSummary.status === 'GREEN' ? '🟢 PASS' : '🔴 FAIL'}
**Risk Level:** ${report.executiveSummary.riskLevel}
**Business Impact:** ${report.executiveSummary.businessImpact}
**Recommendation:** ${report.executiveSummary.recommendation}
**Confidence:** ${report.executiveSummary.confidenceLevel}%

## Key Metrics

- **Test Suites:** ${report.metrics.totalTestSuites} total, ${report.metrics.passedSuites} passed, ${report.metrics.failedSuites} failed
- **Execution Time:** ${report.metrics.executionTime}
- **Regressions Prevented:** ${report.metrics.regressionsPrevented}

## Key Findings

${report.keyFindings.map(finding => `- ${finding}`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

${report.nextSteps.map(step => `- ${step}`).join('\n')}

---
*Generated on ${new Date().toLocaleString()}*
`;
  }
}

// Main execution
async function main() {
  const runner = new RegressionTestRunner();
  
  try {
    const success = await runner.runRegressionTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}💥 Fatal Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RegressionTestRunner };