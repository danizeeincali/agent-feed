#!/usr/bin/env ts-node

/**
 * TDD London School Validation Runner
 * 
 * Executes comprehensive validation of the React application using
 * London School TDD principles:
 * - Outside-in testing from user perspective
 * - Real vs mock data detection
 * - Behavior verification over state testing
 * - Component collaboration testing
 */

import { LondonSchoolTDDValidator, AgentFeedUserJourneys, ValidationResult } from './london-school-framework';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

class ValidationRunner {
  private validator: LondonSchoolTDDValidator;
  private results: ValidationResult[] = [];

  constructor() {
    this.validator = new LondonSchoolTDDValidator();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting TDD London School Comprehensive Validation');
    console.log('═'.repeat(60));

    try {
      // Initialize browser automation
      await this.validator.setup();
      
      // Wait for application to be ready
      await this.waitForApplication();
      
      // Execute all user journeys
      console.log('🎯 Executing User Journey Tests...');
      for (const journey of AgentFeedUserJourneys) {
        console.log(`\n📋 Testing: ${journey.name}`);
        console.log(`   ${journey.description}`);
        
        const result = await this.validator.validateUserJourney(journey);
        this.results.push(result);
        
        const statusIcon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`   ${statusIcon} ${result.status}: ${result.details}`);
        
        if (result.mockDetection) {
          const { mockDetection } = result;
          console.log(`   🔍 Mock Detection:`);
          console.log(`      Real Data: ${mockDetection.hasRealData ? '✅' : '❌'}`);
          console.log(`      Mock Data: ${mockDetection.hasMockData ? '⚠️' : '✅'}`);
        }
        
        if (result.networkCalls?.length) {
          console.log(`   📡 Network Calls: ${result.networkCalls.length}`);
          for (const call of result.networkCalls) {
            const typeIcon = call.responseType === 'real' ? '✅' : 
                            call.responseType === 'mock' ? '⚠️' : '❌';
            console.log(`      ${typeIcon} ${call.method} ${call.url} (${call.status})`);
          }
        }
      }
      
      // Generate comprehensive report
      await this.generateReports();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    } finally {
      await this.validator.teardown();
    }
  }

  private async waitForApplication(): Promise<void> {
    console.log('⏳ Waiting for application to be ready...');
    
    // Simple check to ensure the dev server is responding
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:5173/');
        if (response.ok) {
          console.log('✅ Application is ready');
          return;
        }
      } catch (error) {
        // Application not ready yet
      }
      
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts} - waiting 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Application failed to start within timeout');
  }

  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating Validation Reports...');
    
    // Ensure reports directory exists
    const reportsDir = '/workspaces/agent-feed/frontend/tests/tdd-london-school/reports';
    try {
      mkdirSync(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Generate detailed markdown report
    const detailedReport = await this.validator.generateValidationReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportsDir, `tdd-validation-${timestamp}.md`);
    
    writeFileSync(reportPath, detailedReport);
    console.log(`✅ Detailed report saved: ${reportPath}`);
    
    // Generate summary report
    const summaryReport = this.generateSummaryReport();
    const summaryPath = join(reportsDir, `tdd-summary-${timestamp}.md`);
    
    writeFileSync(summaryPath, summaryReport);
    console.log(`✅ Summary report saved: ${summaryPath}`);
    
    // Generate JSON report for CI/CD
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: this.getSummaryStats(),
      results: this.results
    };
    
    const jsonPath = join(reportsDir, `tdd-results-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✅ JSON report saved: ${jsonPath}`);
    
    // Print final summary
    this.printFinalSummary();
  }

  private generateSummaryReport(): string {
    const stats = this.getSummaryStats();
    
    return `# TDD London School Validation Summary

**Generated:** ${new Date().toISOString()}

## 🎯 Overall Results

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | ${stats.totalTests} | - |
| **Passed** | ${stats.passedTests} | ${stats.passedTests === stats.totalTests ? '✅' : '⚠️'} |
| **Failed** | ${stats.failedTests} | ${stats.failedTests === 0 ? '✅' : '❌'} |
| **Success Rate** | ${stats.successRate}% | ${stats.successRate >= 90 ? '✅' : stats.successRate >= 70 ? '⚠️' : '❌'} |

## 🔍 Mock vs Real Data Analysis

| Component | Real Data | Mock Data | Status |
|-----------|-----------|-----------|---------|
${this.results.map(r => {
  if (r.mockDetection) {
    const real = r.mockDetection.hasRealData ? '✅' : '❌';
    const mock = r.mockDetection.hasMockData ? '⚠️' : '✅';
    const status = r.mockDetection.hasRealData && !r.mockDetection.hasMockData ? '✅ PRODUCTION READY' : '⚠️ USING MOCKS';
    return `| ${r.testName} | ${real} | ${mock} | ${status} |`;
  }
  return `| ${r.testName} | ❓ | ❓ | ❓ NOT ANALYZED |`;
}).join('\n')}

## 📡 API Integration Status

${this.results
  .filter(r => r.networkCalls?.length)
  .map(r => {
    const calls = r.networkCalls!;
    const realCalls = calls.filter(c => c.responseType === 'real').length;
    const mockCalls = calls.filter(c => c.responseType === 'mock').length;
    const errorCalls = calls.filter(c => c.responseType === 'error').length;
    
    return `### ${r.testName}
- **Real API Calls:** ${realCalls} ✅
- **Mock Responses:** ${mockCalls} ⚠️  
- **Failed Calls:** ${errorCalls} ❌`;
  }).join('\n\n')}

## 🚨 Critical Issues

${this.results
  .filter(r => r.status === 'FAIL' || (r.errors && r.errors.length > 0))
  .map(r => `### ${r.testName} - ❌ FAILED
${r.errors?.map(e => `- ${e}`).join('\n') || r.details}`)
  .join('\n\n') || '✅ No critical issues found!'}

## 📈 Recommendations

${this.generateRecommendations()}

---
*Generated by TDD London School Validator*
`;
  }

  private getSummaryStats() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    return { totalTests, passedTests, failedTests, successRate };
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];
    
    // Check for mock data issues
    const mockIssues = this.results.filter(r => 
      r.mockDetection?.hasMockData && !r.mockDetection?.hasRealData
    );
    
    if (mockIssues.length > 0) {
      recommendations.push(`🔄 **Replace Mock Data**: ${mockIssues.length} components are using mock data instead of real API integration`);
    }
    
    // Check for API failures
    const apiFailures = this.results.filter(r => 
      r.networkCalls?.some(call => call.responseType === 'error')
    );
    
    if (apiFailures.length > 0) {
      recommendations.push(`🔧 **Fix API Integration**: ${apiFailures.length} components have failing API calls`);
    }
    
    // Check for test failures
    const testFailures = this.results.filter(r => r.status === 'FAIL');
    
    if (testFailures.length > 0) {
      recommendations.push(`🐛 **Fix Failing Tests**: ${testFailures.length} user journeys are failing`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ **All Systems Operational**: Application passes all TDD London School validations');
    }
    
    return recommendations.join('\n');
  }

  private printFinalSummary(): void {
    const stats = this.getSummaryStats();
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 TDD LONDON SCHOOL VALIDATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`🎯 Total Tests: ${stats.totalTests}`);
    console.log(`✅ Passed: ${stats.passedTests}`);
    console.log(`❌ Failed: ${stats.failedTests}`);
    console.log(`📊 Success Rate: ${stats.successRate}%`);
    
    const overallStatus = stats.successRate >= 90 ? '🎉 EXCELLENT' : 
                         stats.successRate >= 70 ? '⚠️  NEEDS IMPROVEMENT' : 
                         '🚨 CRITICAL ISSUES';
    
    console.log(`🏆 Overall Status: ${overallStatus}`);
    console.log('═'.repeat(60));
  }
}

// Run validation if called directly
if (require.main === module) {
  const runner = new ValidationRunner();
  runner.run().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export { ValidationRunner };