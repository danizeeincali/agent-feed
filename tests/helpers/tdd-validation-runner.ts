/**
 * TDD Validation Runner
 * Comprehensive test execution and reporting
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface TestResult {
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
  warnings: string[];
  status: 'passed' | 'failed' | 'error';
}

export interface ValidationReport {
  timestamp: string;
  environment: {
    frontendRunning: boolean;
    backendRunning: boolean;
    frontendUrl: string;
    backendUrl: string;
  };
  testResults: TestResult[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    overallStatus: 'passed' | 'failed' | 'partial';
  };
  userIssueAnalysis: {
    issueReported: string;
    testFindings: string[];
    rootCause: string;
    recommendations: string[];
  };
}

export class TDDValidationRunner {
  private frontendUrl = 'http://localhost:5173';
  private backendUrl = 'http://localhost:3000';
  
  async runComprehensiveValidation(): Promise<ValidationReport> {
    console.log('🚀 Starting Comprehensive TDD Validation...');
    
    const startTime = Date.now();
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      environment: await this.checkEnvironment(),
      testResults: [],
      summary: {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        overallStatus: 'passed'
      },
      userIssueAnalysis: {
        issueReported: 'HTTP 404: Not Found errors and no posts displaying',
        testFindings: [],
        rootCause: '',
        recommendations: []
      }
    };
    
    // Run test suites
    const testSuites = [
      {
        name: 'E2E Route Validation',
        command: 'npx playwright test tests/e2e/comprehensive-route-validation.spec.ts',
        type: 'e2e'
      },
      {
        name: 'API Proxy Integration',
        command: 'npx jest tests/integration/api-proxy-validation.test.ts',
        type: 'integration'
      },
      {
        name: 'Frontend Route Resolution',
        command: 'npx jest tests/unit/frontend-route-resolution.test.ts',
        type: 'unit'
      }
    ];
    
    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      report.testResults.push(result);
    }
    
    // Calculate summary
    report.summary = this.calculateSummary(report.testResults);
    
    // Analyze user issues
    report.userIssueAnalysis = await this.analyzeUserIssues(report);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Validation completed in ${duration}ms`);
    
    // Generate report
    await this.generateReport(report);
    
    return report;
  }
  
  private async checkEnvironment(): Promise<ValidationReport['environment']> {
    console.log('🔍 Checking environment...');
    
    const frontendRunning = await this.checkUrl(this.frontendUrl);
    const backendRunning = await this.checkUrl(this.backendUrl);
    
    console.log(`Frontend (${this.frontendUrl}): ${frontendRunning ? '✅' : '❌'}`);
    console.log(`Backend (${this.backendUrl}): ${backendRunning ? '✅' : '❌'}`);
    
    return {
      frontendRunning,
      backendRunning,
      frontendUrl: this.frontendUrl,
      backendUrl: this.backendUrl
    };
  }
  
  private async checkUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.status < 500;
    } catch {
      return false;
    }
  }
  
  private async runTestSuite(suite: { name: string; command: string; type: string }): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      testSuite: suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
      warnings: [],
      status: 'passed'
    };
    
    try {
      const { stdout, stderr } = await execAsync(suite.command, { 
        timeout: 60000,
        cwd: process.cwd()
      });
      
      // Parse test output
      result.duration = Date.now() - startTime;
      
      if (suite.type === 'e2e') {
        this.parsePlaywrightOutput(stdout, stderr, result);
      } else {
        this.parseJestOutput(stdout, stderr, result);
      }
      
    } catch (error: any) {
      result.status = 'error';
      result.errors.push(error.message || 'Unknown error');
      result.duration = Date.now() - startTime;
      
      // Try to parse partial output
      if (error.stdout) {
        this.parseTestOutput(error.stdout, result, suite.type);
      }
    }
    
    return result;
  }
  
  private parsePlaywrightOutput(stdout: string, stderr: string, result: TestResult): void {
    // Parse Playwright output
    const passedMatch = stdout.match(/(\d+) passed/);
    const failedMatch = stdout.match(/(\d+) failed/);
    const skippedMatch = stdout.match(/(\d+) skipped/);
    
    result.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    result.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    
    if (result.failed > 0) {
      result.status = 'failed';
    }
    
    // Extract errors from stderr
    if (stderr) {
      result.errors.push(...stderr.split('\n').filter(line => line.trim()));
    }
  }
  
  private parseJestOutput(stdout: string, stderr: string, result: TestResult): void {
    // Parse Jest output
    const testMatch = stdout.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      result.failed = parseInt(testMatch[1]);
      result.passed = parseInt(testMatch[2]);
    } else {
      const passedMatch = stdout.match(/(\d+)\s+passed/);
      if (passedMatch) {
        result.passed = parseInt(passedMatch[1]);
      }
    }
    
    if (result.failed > 0) {
      result.status = 'failed';
    }
    
    // Extract errors
    if (stderr) {
      result.errors.push(...stderr.split('\n').filter(line => line.trim()));
    }
  }
  
  private parseTestOutput(output: string, result: TestResult, type: string): void {
    if (type === 'e2e') {
      this.parsePlaywrightOutput(output, '', result);
    } else {
      this.parseJestOutput(output, '', result);
    }
  }
  
  private calculateSummary(results: TestResult[]): ValidationReport['summary'] {
    const totalTests = results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    
    let overallStatus: 'passed' | 'failed' | 'partial' = 'passed';
    if (totalFailed > 0) {
      overallStatus = totalPassed > 0 ? 'partial' : 'failed';
    }
    
    return {
      totalTests,
      totalPassed,
      totalFailed,
      overallStatus
    };
  }
  
  private async analyzeUserIssues(report: ValidationReport): Promise<ValidationReport['userIssueAnalysis']> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let rootCause = '';
    
    // Analyze environment
    if (!report.environment.frontendRunning) {
      findings.push('Frontend server not accessible');
      recommendations.push('Ensure frontend is running on port 5173');
    }
    
    if (!report.environment.backendRunning) {
      findings.push('Backend server not accessible');
      recommendations.push('Ensure backend is running on port 3000');
    }
    
    // Analyze test results
    const e2eResults = report.testResults.find(r => r.testSuite.includes('E2E'));
    const apiResults = report.testResults.find(r => r.testSuite.includes('API'));
    
    if (e2eResults?.failed > 0) {
      findings.push('E2E tests failing - routes may not be accessible');
    }
    
    if (apiResults?.failed > 0) {
      findings.push('API proxy tests failing - backend communication issues');
    }
    
    // Determine root cause
    if (!report.environment.frontendRunning && !report.environment.backendRunning) {
      rootCause = 'Both frontend and backend servers are not running';
    } else if (!report.environment.frontendRunning) {
      rootCause = 'Frontend development server is not accessible';
    } else if (!report.environment.backendRunning) {
      rootCause = 'Backend API server is not accessible';
    } else if (apiResults?.failed > 0) {
      rootCause = 'Vite proxy configuration may not be correctly forwarding API requests';
    } else {
      rootCause = 'Routes are accessible but may have data loading issues';
    }
    
    // Add general recommendations
    recommendations.push('Check server logs for error messages');
    recommendations.push('Verify Vite proxy configuration in vite.config.ts');
    recommendations.push('Test API endpoints directly');
    recommendations.push('Check browser network tab for failed requests');
    
    return {
      issueReported: 'HTTP 404: Not Found errors and no posts displaying',
      testFindings: findings,
      rootCause,
      recommendations
    };
  }
  
  private async generateReport(report: ValidationReport): Promise<void> {
    const reportPath = path.join(process.cwd(), 'tests', 'tdd-validation-report.json');
    
    // Write JSON report
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(process.cwd(), 'docs', 'TDD_VALIDATION_REPORT.md');
    writeFileSync(markdownPath, markdownReport);
    
    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${markdownPath}`);
  }
  
  private generateMarkdownReport(report: ValidationReport): string {
    return `# TDD Validation Report

**Generated:** ${report.timestamp}

## Environment Status

- **Frontend (${report.environment.frontendUrl}):** ${report.environment.frontendRunning ? '✅ Running' : '❌ Not Accessible'}
- **Backend (${report.environment.backendUrl}):** ${report.environment.backendRunning ? '✅ Running' : '❌ Not Accessible'}

## Test Results Summary

- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.totalPassed}
- **Failed:** ${report.summary.totalFailed}
- **Overall Status:** ${report.summary.overallStatus.toUpperCase()}

## Test Suite Results

${report.testResults.map(result => `
### ${result.testSuite}

- **Status:** ${result.status.toUpperCase()}
- **Passed:** ${result.passed}
- **Failed:** ${result.failed}
- **Duration:** ${result.duration}ms
${result.errors.length > 0 ? `
**Errors:**
${result.errors.map(error => `- ${error}`).join('\n')}
` : ''}
`).join('\n')}

## User Issue Analysis

**Reported Issue:** ${report.userIssueAnalysis.issueReported}

**Test Findings:**
${report.userIssueAnalysis.testFindings.map(finding => `- ${finding}`).join('\n')}

**Root Cause:** ${report.userIssueAnalysis.rootCause}

**Recommendations:**
${report.userIssueAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. Address environment issues if any servers are not running
2. Fix failing tests by addressing root causes
3. Verify Vite proxy configuration
4. Test API endpoints independently
5. Check browser developer tools for client-side errors
`;
  }
}

// CLI execution
if (require.main === module) {
  const runner = new TDDValidationRunner();
  runner.runComprehensiveValidation()
    .then(report => {
      console.log('\n🎉 Validation complete!');
      console.log(`Overall status: ${report.summary.overallStatus}`);
      process.exit(report.summary.overallStatus === 'passed' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}