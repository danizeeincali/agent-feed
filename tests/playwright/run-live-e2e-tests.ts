#!/usr/bin/env npx tsx
/**
 * Live E2E Test Runner
 * 
 * Comprehensive test runner that validates live servers before running E2E tests
 * and provides detailed reporting of network errors and test results.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { LiveServerValidator } from './utils/live-server-validator';

interface TestRunResult {
  success: boolean;
  duration: number;
  testsPassed: number;
  testsFailed: number;
  errors: string[];
  screenshots: string[];
}

class LiveE2ETestRunner {
  private static readonly RESULTS_DIR = 'test-results';
  private static readonly SCREENSHOTS_DIR = 'test-results/screenshots';
  private static readonly REPORTS_DIR = 'test-results/reports';

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Main test execution workflow
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Live E2E Test Runner');
    console.log('=====================================');

    try {
      // Step 1: Validate servers are running
      console.log('\n1️⃣  Validating live servers...');
      const isReady = await this.validateServers();
      
      if (!isReady) {
        console.error('❌ Servers are not ready. Please start the required services:');
        console.error('   Frontend: cd frontend && npm run dev');
        console.error('   Backend:  node simple-backend.js');
        process.exit(1);
      }

      // Step 2: Run comprehensive E2E tests
      console.log('\n2️⃣  Running comprehensive E2E tests...');
      const testResult = await this.runPlaywrightTests();

      // Step 3: Generate reports
      console.log('\n3️⃣  Generating test reports...');
      await this.generateReports(testResult);

      // Step 4: Display results
      this.displayResults(testResult);

      // Exit with appropriate code
      process.exit(testResult.success ? 0 : 1);

    } catch (error) {
      console.error('💥 Fatal error during test execution:', error);
      process.exit(1);
    }
  }

  /**
   * Validate that all required servers are running
   */
  private async validateServers(): Promise<boolean> {
    const statuses = await LiveServerValidator.validateServers();
    LiveServerValidator.printStatusReport(statuses);

    const allRunning = statuses.every(status => status.isRunning);

    if (!allRunning) {
      console.log('\n⏳ Waiting for servers to become available...');
      return await LiveServerValidator.waitForServers(30000, 3000);
    }

    // Additional endpoint validation
    console.log('\n🔍 Validating specific endpoints...');
    const frontendOk = await LiveServerValidator.validateFrontendEndpoints();
    const backendOk = await LiveServerValidator.validateBackendEndpoints();

    return allRunning && frontendOk && backendOk;
  }

  /**
   * Run Playwright tests with proper configuration
   */
  private async runPlaywrightTests(): Promise<TestRunResult> {
    const startTime = Date.now();
    
    try {
      // Run the comprehensive E2E test suite
      const command = [
        'npx playwright test',
        'comprehensive-frontend-e2e.spec.ts',
        '--config=playwright.config.ts',
        '--reporter=json,html,list',
        '--output-dir=test-results',
        '--project=chromium', // Focus on Chromium for primary validation
        '--workers=1', // Single worker to avoid resource conflicts
        '--timeout=60000', // 1 minute timeout per test
        '--retries=1' // Retry failed tests once
      ].join(' ');

      console.log(`Executing: ${command}`);
      
      const output = execSync(command, {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      const duration = Date.now() - startTime;

      // Parse results from Playwright JSON output
      const results = this.parsePlaywrightResults();

      return {
        success: true,
        duration,
        testsPassed: results.passed,
        testsFailed: results.failed,
        errors: [],
        screenshots: this.findScreenshots()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Try to extract useful information from the error
      const results = this.parsePlaywrightResults(); // May have partial results

      return {
        success: false,
        duration,
        testsPassed: results.passed,
        testsFailed: results.failed,
        errors: [errorMessage],
        screenshots: this.findScreenshots()
      };
    }
  }

  /**
   * Parse Playwright JSON results
   */
  private parsePlaywrightResults(): { passed: number; failed: number } {
    const jsonPath = join(this.RESULTS_DIR, 'results.json');
    
    if (!existsSync(jsonPath)) {
      return { passed: 0, failed: 0 };
    }

    try {
      const jsonData = require(join(process.cwd(), jsonPath));
      const stats = jsonData.stats || {};
      
      return {
        passed: stats.passed || 0,
        failed: stats.failed || stats.unexpected || 0
      };
    } catch (error) {
      console.warn('Failed to parse test results:', error);
      return { passed: 0, failed: 0 };
    }
  }

  /**
   * Find all screenshots generated during tests
   */
  private findScreenshots(): string[] {
    const screenshots: string[] = [];
    
    if (existsSync(this.SCREENSHOTS_DIR)) {
      try {
        const files = require('fs').readdirSync(this.SCREENSHOTS_DIR);
        screenshots.push(...files.filter((f: string) => f.endsWith('.png')));
      } catch (error) {
        console.warn('Failed to read screenshots directory:', error);
      }
    }
    
    return screenshots;
  }

  /**
   * Generate comprehensive test reports
   */
  private async generateReports(testResult: TestRunResult): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Generate summary report
    const summaryReport = {
      timestamp,
      success: testResult.success,
      duration: testResult.duration,
      testsPassed: testResult.testsPassed,
      testsFailed: testResult.testsFailed,
      errors: testResult.errors,
      screenshots: testResult.screenshots,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      },
      servers: await LiveServerValidator.validateServers()
    };

    // Write JSON report
    const jsonReportPath = join(this.REPORTS_DIR, 'e2e-test-summary.json');
    writeFileSync(jsonReportPath, JSON.stringify(summaryReport, null, 2));

    // Write Markdown report
    const markdownReport = this.generateMarkdownReport(summaryReport);
    const mdReportPath = join(this.REPORTS_DIR, 'E2E_TEST_REPORT.md');
    writeFileSync(mdReportPath, markdownReport);

    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   Markdown: ${mdReportPath}`);
  }

  /**
   * Generate Markdown test report
   */
  private generateMarkdownReport(summary: any): string {
    const statusIcon = summary.success ? '✅' : '❌';
    const durationMinutes = (summary.duration / 1000 / 60).toFixed(2);

    let report = `# E2E Test Report ${statusIcon}\n\n`;
    report += `**Generated:** ${summary.timestamp}\n`;
    report += `**Duration:** ${durationMinutes} minutes\n`;
    report += `**Status:** ${summary.success ? 'PASSED' : 'FAILED'}\n\n`;

    // Test Results Summary
    report += `## Test Results Summary\n\n`;
    report += `- ✅ Tests Passed: ${summary.testsPassed}\n`;
    report += `- ❌ Tests Failed: ${summary.testsFailed}\n`;
    report += `- 📸 Screenshots: ${summary.screenshots.length}\n\n`;

    // Server Status
    report += `## Server Status\n\n`;
    for (const server of summary.servers) {
      const icon = server.isRunning ? '✅' : '❌';
      report += `${icon} **${server.name}** (${server.url}) - ${server.responseTime}ms\n`;
      if (server.error) {
        report += `   Error: ${server.error}\n`;
      }
    }
    report += '\n';

    // Errors
    if (summary.errors.length > 0) {
      report += `## Errors Encountered\n\n`;
      summary.errors.forEach((error: string, index: number) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    // Screenshots
    if (summary.screenshots.length > 0) {
      report += `## Screenshots Captured\n\n`;
      summary.screenshots.forEach((screenshot: string) => {
        report += `- ${screenshot}\n`;
      });
      report += '\n';
    }

    // Environment
    report += `## Environment\n\n`;
    report += `- Node.js: ${summary.environment.node}\n`;
    report += `- Platform: ${summary.environment.platform} (${summary.environment.arch})\n`;
    report += `- Working Directory: ${summary.environment.cwd}\n\n`;

    // Next Steps
    if (!summary.success) {
      report += `## Next Steps\n\n`;
      report += `1. Review the error messages above\n`;
      report += `2. Check the screenshots for visual clues\n`;
      report += `3. Verify that both frontend and backend servers are running\n`;
      report += `4. Check browser console for additional errors\n`;
      report += `5. Run tests individually to isolate issues\n\n`;
    }

    return report;
  }

  /**
   * Display final results to console
   */
  private displayResults(testResult: TestRunResult): void {
    const statusIcon = testResult.success ? '✅' : '❌';
    const durationSeconds = (testResult.duration / 1000).toFixed(1);

    console.log('\n🏁 Test Execution Complete');
    console.log('==========================');
    console.log(`${statusIcon} Overall Status: ${testResult.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`⏱️  Duration: ${durationSeconds} seconds`);
    console.log(`✅ Tests Passed: ${testResult.testsPassed}`);
    console.log(`❌ Tests Failed: ${testResult.testsFailed}`);
    console.log(`📸 Screenshots: ${testResult.screenshots.length}`);

    if (testResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      testResult.errors.forEach(error => {
        console.log(`   ${error}`);
      });
    }

    if (testResult.screenshots.length > 0) {
      console.log('\n📸 Screenshots available in:', this.SCREENSHOTS_DIR);
    }

    console.log('\n📄 Detailed reports available in:', this.REPORTS_DIR);
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.RESULTS_DIR, this.SCREENSHOTS_DIR, this.REPORTS_DIR];
    
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new LiveE2ETestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}