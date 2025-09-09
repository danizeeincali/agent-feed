/**
 * SPARC Test Runner
 * Orchestrates all regression test execution with reporting and metrics
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { SPARC_CONFIG, TestCategory, TestPriority, FeatureTag } from '../config/sparc-regression-config';

export interface TestResult {
  category: TestCategory;
  priority: TestPriority;
  features: FeatureTag[];
  testFile: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: TestError[];
  coverage?: CoverageReport;
}

export interface TestError {
  test: string;
  error: string;
  stackTrace?: string;
  screenshot?: string;
}

export interface CoverageReport {
  statements: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  lines: { covered: number; total: number; percentage: number };
}

export interface TestRunReport {
  startTime: string;
  endTime: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  categories: Record<TestCategory, TestResult[]>;
  priorities: Record<TestPriority, TestResult[]>;
  features: Record<FeatureTag, TestResult[]>;
  coverage: CoverageReport;
  performance: PerformanceMetrics;
  qualityGates: QualityGateResults;
}

export interface PerformanceMetrics {
  averageTestDuration: number;
  slowestTests: Array<{ testFile: string; duration: number }>;
  performanceBenchmarks: Array<{
    metric: string;
    actual: number;
    expected: number;
    passed: boolean;
  }>;
}

export interface QualityGateResults {
  coverageGate: { passed: boolean; actual: number; required: number };
  performanceGate: { passed: boolean; degradation: number; threshold: number };
  regressionGate: { passed: boolean; newFailures: number };
  stabilityGate: { passed: boolean; flakyTests: number };
}

/**
 * SPARC Test Runner Class
 */
export class SPARCTestRunner {
  private results: TestResult[] = [];
  private startTime: Date;
  private endTime: Date;
  private reportDir: string;

  constructor() {
    this.reportDir = path.join(__dirname, '..', 'reports');
    this.startTime = new Date();
    this.endTime = new Date();
  }

  /**
   * Run all SPARC regression tests
   */
  async runAllTests(options: {
    categories?: TestCategory[];
    priorities?: TestPriority[];
    features?: FeatureTag[];
    parallel?: boolean;
    coverage?: boolean;
  } = {}): Promise<TestRunReport> {
    
    console.log('🚀 Starting SPARC Regression Test Suite...');
    this.startTime = new Date();
    
    try {
      // Ensure report directories exist
      await this.ensureDirectories();
      
      // Run tests by category
      const categoriesToRun = options.categories || Object.values(TestCategory);
      
      for (const category of categoriesToRun) {
        console.log(`\n📁 Running ${category.toUpperCase()} tests...`);
        await this.runCategoryTests(category, options);
      }
      
      this.endTime = new Date();
      
      // Generate comprehensive report
      const report = await this.generateReport();
      
      // Save report
      await this.saveReport(report);
      
      // Check quality gates
      const qualityGatesPassed = this.checkQualityGates(report);
      
      if (!qualityGatesPassed) {
        throw new Error('Quality gates failed - see report for details');
      }
      
      console.log('✅ SPARC Regression Tests completed successfully!');
      return report;
      
    } catch (error) {
      console.error('❌ SPARC Regression Tests failed:', error);
      throw error;
    }
  }

  /**
   * Run tests for specific category
   */
  private async runCategoryTests(category: TestCategory, options: any): Promise<void> {
    const testDir = path.join(__dirname, '..', category);
    
    switch (category) {
      case TestCategory.UNIT:
        await this.runUnitTests(testDir, options);
        break;
      case TestCategory.INTEGRATION:
        await this.runIntegrationTests(testDir, options);
        break;
      case TestCategory.E2E:
        await this.runE2ETests(testDir, options);
        break;
      case TestCategory.PERFORMANCE:
        await this.runPerformanceTests(testDir, options);
        break;
    }
  }

  /**
   * Run unit tests with Jest/Vitest
   */
  private async runUnitTests(testDir: string, options: any): Promise<void> {
    const command = 'npm';
    const args = [
      'run', 'test:unit',
      '--', 
      `${testDir}/**/*.test.{ts,tsx}`,
      '--reporter=json',
      '--outputFile=' + path.join(this.reportDir, 'unit-results.json')
    ];

    if (options.coverage) {
      args.push('--coverage');
    }

    await this.executeTest(command, args, TestCategory.UNIT);
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(testDir: string, options: any): Promise<void> {
    const command = 'npm';
    const args = [
      'run', 'test:integration',
      '--',
      `${testDir}/**/*.test.{ts,tsx}`,
      '--reporter=json'
    ];

    await this.executeTest(command, args, TestCategory.INTEGRATION);
  }

  /**
   * Run E2E tests with Playwright
   */
  private async runE2ETests(testDir: string, options: any): Promise<void> {
    const command = 'npx';
    const args = [
      'playwright', 'test',
      '--config=' + path.join(__dirname, '..', 'config', 'playwright.config.ts'),
      '--reporter=json'
    ];

    if (options.parallel) {
      args.push('--workers=4');
    }

    await this.executeTest(command, args, TestCategory.E2E);
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(testDir: string, options: any): Promise<void> {
    const command = 'npm';
    const args = [
      'run', 'test:performance',
      '--',
      `${testDir}/**/*.test.{ts,tsx}`
    ];

    await this.executeTest(command, args, TestCategory.PERFORMANCE);
  }

  /**
   * Execute test command
   */
  private async executeTest(command: string, args: string[], category: TestCategory): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..', '..', '..', 'frontend')
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString());
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.error(data.toString());
      });

      process.on('close', (code) => {
        // Parse test results
        try {
          this.parseTestResults(stdout, stderr, category);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse test results from command output
   */
  private parseTestResults(stdout: string, stderr: string, category: TestCategory): void {
    // Implementation would parse JSON output from test runners
    // This is a simplified version
    
    const result: TestResult = {
      category,
      priority: TestPriority.P1, // Would be parsed from test metadata
      features: [], // Would be parsed from test metadata
      testFile: 'parsed-from-output',
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    // Parse stdout for test results
    try {
      if (stdout.includes('{"numTotalTests"')) {
        // Jest/Vitest JSON output
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const testResult = JSON.parse(jsonMatch[0]);
          result.passed = testResult.numPassedTests || 0;
          result.failed = testResult.numFailedTests || 0;
          result.skipped = testResult.numPendingTests || 0;
          result.duration = testResult.testResults?.reduce((acc: number, test: any) => 
            acc + (test.perfStats?.end - test.perfStats?.start || 0), 0) || 0;
        }
      }
    } catch (error) {
      console.warn('Failed to parse test results:', error);
    }

    this.results.push(result);
  }

  /**
   * Generate comprehensive test report
   */
  private async generateReport(): Promise<TestRunReport> {
    const duration = this.endTime.getTime() - this.startTime.getTime();
    
    // Aggregate results by category, priority, and feature
    const categories = this.aggregateByCategory();
    const priorities = this.aggregateByPriority();
    const features = this.aggregateByFeature();
    
    // Calculate summary
    const summary = {
      total: this.results.reduce((acc, r) => acc + r.passed + r.failed + r.skipped, 0),
      passed: this.results.reduce((acc, r) => acc + r.passed, 0),
      failed: this.results.reduce((acc, r) => acc + r.failed, 0),
      skipped: this.results.reduce((acc, r) => acc + r.skipped, 0),
    };

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics();
    
    // Generate coverage report
    const coverage = await this.generateCoverageReport();
    
    // Check quality gates
    const qualityGates = this.calculateQualityGates(summary, coverage, performance);

    return {
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      duration,
      summary,
      categories,
      priorities,
      features,
      coverage,
      performance,
      qualityGates,
    };
  }

  /**
   * Aggregate results by category
   */
  private aggregateByCategory(): Record<TestCategory, TestResult[]> {
    const categories = {} as Record<TestCategory, TestResult[]>;
    
    for (const category of Object.values(TestCategory)) {
      categories[category] = this.results.filter(r => r.category === category);
    }
    
    return categories;
  }

  /**
   * Aggregate results by priority
   */
  private aggregateByPriority(): Record<TestPriority, TestResult[]> {
    const priorities = {} as Record<TestPriority, TestResult[]>;
    
    for (const priority of Object.values(TestPriority)) {
      priorities[priority] = this.results.filter(r => r.priority === priority);
    }
    
    return priorities;
  }

  /**
   * Aggregate results by feature
   */
  private aggregateByFeature(): Record<FeatureTag, TestResult[]> {
    const features = {} as Record<FeatureTag, TestResult[]>;
    
    for (const feature of Object.values(FeatureTag)) {
      features[feature] = this.results.filter(r => r.features.includes(feature));
    }
    
    return features;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    const durations = this.results.map(r => r.duration);
    const averageTestDuration = durations.reduce((acc, d) => acc + d, 0) / durations.length;
    
    const slowestTests = this.results
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(r => ({ testFile: r.testFile, duration: r.duration }));

    return {
      averageTestDuration,
      slowestTests,
      performanceBenchmarks: [], // Would be populated from actual performance tests
    };
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<CoverageReport> {
    // Default coverage - would be loaded from actual coverage tools
    return {
      statements: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      lines: { covered: 0, total: 0, percentage: 0 },
    };
  }

  /**
   * Calculate quality gate results
   */
  private calculateQualityGates(
    summary: TestRunReport['summary'], 
    coverage: CoverageReport, 
    performance: PerformanceMetrics
  ): QualityGateResults {
    return {
      coverageGate: {
        passed: coverage.statements.percentage >= SPARC_CONFIG.coverage.statements,
        actual: coverage.statements.percentage,
        required: SPARC_CONFIG.coverage.statements,
      },
      performanceGate: {
        passed: performance.averageTestDuration <= 30000, // 30s max average
        degradation: 0,
        threshold: 5,
      },
      regressionGate: {
        passed: summary.failed === 0,
        newFailures: summary.failed,
      },
      stabilityGate: {
        passed: true, // Would check for flaky tests
        flakyTests: 0,
      },
    };
  }

  /**
   * Check if all quality gates pass
   */
  private checkQualityGates(report: TestRunReport): boolean {
    const gates = report.qualityGates;
    return gates.coverageGate.passed && 
           gates.performanceGate.passed && 
           gates.regressionGate.passed && 
           gates.stabilityGate.passed;
  }

  /**
   * Save test report
   */
  private async saveReport(report: TestRunReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `sparc-regression-report-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Also save as latest report
    const latestPath = path.join(this.reportDir, 'latest-report.json');
    await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Test report saved to: ${reportPath}`);
  }

  /**
   * Ensure report directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.reportDir,
      path.join(this.reportDir, 'coverage'),
      path.join(this.reportDir, 'regression-reports'),
      path.join(this.reportDir, 'performance-metrics'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new SPARCTestRunner();
  
  const options = {
    categories: process.argv.includes('--unit') ? [TestCategory.UNIT] : undefined,
    coverage: process.argv.includes('--coverage'),
    parallel: process.argv.includes('--parallel'),
  };
  
  runner.runAllTests(options)
    .then((report) => {
      console.log('\n📊 Final Report Summary:');
      console.log(`✅ Passed: ${report.summary.passed}`);
      console.log(`❌ Failed: ${report.summary.failed}`);
      console.log(`⏭️  Skipped: ${report.summary.skipped}`);
      console.log(`⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`);
      
      if (report.qualityGates.regressionGate.passed) {
        console.log('🎉 All quality gates passed!');
        process.exit(0);
      } else {
        console.log('🚫 Quality gates failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}