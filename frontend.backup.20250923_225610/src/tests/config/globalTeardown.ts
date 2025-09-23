/**
 * Global Test Teardown
 * 
 * Global teardown for Playwright E2E tests including cleanup,
 * report generation, and resource cleanup.
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export default async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Generate test summary report
    await generateTestSummary();

    // Cleanup test artifacts
    await cleanupTestArtifacts();

    // Archive test results if needed
    if (process.env.ARCHIVE_RESULTS === 'true') {
      await archiveTestResults();
    }

    // Performance analysis
    await analyzePerformanceMetrics();

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  const resultPaths = [
    'test-results/e2e-results.json',
    'test-results/terminal/terminal-junit.xml',
    'coverage/coverage-summary.json'
  ];

  const summary = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results: {
      e2e: null,
      unit: null,
      coverage: null
    }
  };

  // Parse E2E results
  try {
    if (fs.existsSync('test-results/e2e-results.json')) {
      const e2eResults = JSON.parse(
        fs.readFileSync('test-results/e2e-results.json', 'utf8')
      );
      
      summary.results.e2e = {
        total: e2eResults.suites?.reduce((acc: number, suite: any) => 
          acc + suite.specs?.length || 0, 0) || 0,
        passed: e2eResults.suites?.reduce((acc: number, suite: any) => 
          acc + suite.specs?.filter((spec: any) => 
            spec.ok === true).length || 0, 0) || 0,
        failed: e2eResults.suites?.reduce((acc: number, suite: any) => 
          acc + suite.specs?.filter((spec: any) => 
            spec.ok === false).length || 0, 0) || 0,
        duration: e2eResults.stats?.duration || 0
      };
    }
  } catch (error) {
    console.warn('Failed to parse E2E results:', error);
  }

  // Parse coverage data
  try {
    if (fs.existsSync('coverage/coverage-summary.json')) {
      const coverageData = JSON.parse(
        fs.readFileSync('coverage/coverage-summary.json', 'utf8')
      );
      
      summary.results.coverage = {
        lines: coverageData.total?.lines?.pct || 0,
        branches: coverageData.total?.branches?.pct || 0,
        functions: coverageData.total?.functions?.pct || 0,
        statements: coverageData.total?.statements?.pct || 0
      };
    }
  } catch (error) {
    console.warn('Failed to parse coverage data:', error);
  }

  // Write summary report
  const summaryPath = 'test-results/test-summary.json';
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('📋 Test summary written to:', summaryPath);
  
  // Log summary to console
  if (summary.results.e2e) {
    console.log(`E2E Tests: ${summary.results.e2e.passed}/${summary.results.e2e.total} passed`);
  }
  
  if (summary.results.coverage) {
    console.log(`Coverage: ${summary.results.coverage.lines}% lines, ${summary.results.coverage.branches}% branches`);
  }
}

async function cleanupTestArtifacts() {
  console.log('🧹 Cleaning up test artifacts...');

  const cleanupPaths = [
    'test-results/.tmp',
    'test-results/screenshots/failed-only',
    'playwright-report/trace-*.zip'
  ];

  for (const cleanupPath of cleanupPaths) {
    try {
      if (fs.existsSync(cleanupPath)) {
        if (fs.statSync(cleanupPath).isDirectory()) {
          fs.rmSync(cleanupPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(cleanupPath);
        }
        console.log(`Cleaned up: ${cleanupPath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup ${cleanupPath}:`, error);
    }
  }

  // Keep only the latest N test runs
  const maxRuns = parseInt(process.env.MAX_TEST_RUNS || '5');
  await cleanupOldTestRuns(maxRuns);
}

async function cleanupOldTestRuns(maxRuns: number) {
  const testResultsDir = 'test-results';
  
  if (!fs.existsSync(testResultsDir)) return;

  try {
    const runs = fs.readdirSync(testResultsDir)
      .filter(name => name.startsWith('run-'))
      .map(name => ({
        name,
        path: path.join(testResultsDir, name),
        mtime: fs.statSync(path.join(testResultsDir, name)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (runs.length > maxRuns) {
      const runsToDelete = runs.slice(maxRuns);
      
      for (const run of runsToDelete) {
        fs.rmSync(run.path, { recursive: true, force: true });
        console.log(`Cleaned up old test run: ${run.name}`);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup old test runs:', error);
  }
}

async function archiveTestResults() {
  console.log('📦 Archiving test results...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = `test-archives/run-${timestamp}`;

  try {
    // Create archive directory
    fs.mkdirSync(archivePath, { recursive: true });

    // Copy key files to archive
    const filesToArchive = [
      'test-results/test-summary.json',
      'test-results/e2e-results.json',
      'coverage/coverage-summary.json',
      'playwright-report/index.html'
    ];

    for (const file of filesToArchive) {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        fs.copyFileSync(file, path.join(archivePath, filename));
      }
    }

    console.log(`Test results archived to: ${archivePath}`);
  } catch (error) {
    console.warn('Failed to archive test results:', error);
  }
}

async function analyzePerformanceMetrics() {
  console.log('⚡ Analyzing performance metrics...');

  try {
    const performanceData = {
      timestamp: new Date().toISOString(),
      metrics: {
        testExecutionTime: 0,
        memoryUsage: process.memoryUsage(),
        browserResourceUsage: null
      }
    };

    // Calculate test execution time from results
    if (fs.existsSync('test-results/e2e-results.json')) {
      const results = JSON.parse(
        fs.readFileSync('test-results/e2e-results.json', 'utf8')
      );
      performanceData.metrics.testExecutionTime = results.stats?.duration || 0;
    }

    // Write performance metrics
    const perfPath = 'test-results/performance-metrics.json';
    fs.writeFileSync(perfPath, JSON.stringify(performanceData, null, 2));

    // Log performance summary
    const memUsageMB = Math.round(performanceData.metrics.memoryUsage.heapUsed / 1024 / 1024);
    console.log(`Memory usage: ${memUsageMB}MB`);
    
    if (performanceData.metrics.testExecutionTime > 0) {
      const duration = Math.round(performanceData.metrics.testExecutionTime / 1000);
      console.log(`Test execution time: ${duration}s`);
    }

    console.log('Performance metrics written to:', perfPath);
  } catch (error) {
    console.warn('Failed to analyze performance metrics:', error);
  }
}