import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global Teardown for Agent Feed E2E Testing
 * Cleans up test environment and generates final reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Agent Feed E2E Test Suite Global Teardown...');

  try {
    // Generate test summary report
    await generateTestSummary();
    
    // Cleanup temporary files
    await cleanupTempFiles();
    
    // Archive test artifacts
    await archiveTestArtifacts();
    
    // Generate performance metrics
    await generatePerformanceReport();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown encountered errors:', error);
    // Don't throw to avoid masking test failures
  }
}

async function generateTestSummary() {
  console.log('📋 Generating test summary report...');
  
  const reportPath = path.join(__dirname, '..', 'reports', 'json', 'results.json');
  
  try {
    const rawReport = await fs.readFile(reportPath, 'utf-8');
    const testResults = JSON.parse(rawReport);
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.stats?.total || 0,
      passed: testResults.stats?.passed || 0,
      failed: testResults.stats?.failed || 0,
      skipped: testResults.stats?.skipped || 0,
      duration: testResults.stats?.duration || 0,
      suites: testResults.suites?.map((suite: any) => ({
        title: suite.title,
        tests: suite.tests?.length || 0,
        passed: suite.tests?.filter((t: any) => t.outcome === 'passed').length || 0,
        failed: suite.tests?.filter((t: any) => t.outcome === 'failed').length || 0
      })) || []
    };

    await fs.writeFile(
      path.join(__dirname, '..', 'reports', 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log(`📊 Test Summary: ${summary.passed}/${summary.totalTests} passed`);
  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  const tempDirs = [
    path.join(__dirname, '..', 'fixtures', 'temp'),
    path.join(__dirname, '..', 'test-results', 'temp')
  ];

  for (const tempDir of tempDirs) {
    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        await fs.unlink(path.join(tempDir, file));
      }
    } catch (error) {
      // Directory might not exist, that's fine
    }
  }
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = path.join(__dirname, '..', 'reports', 'archives', timestamp);
  
  try {
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Archive important files
    const filesToArchive = [
      'reports/test-summary.json',
      'reports/json/results.json',
      'reports/junit/results.xml'
    ];

    for (const filePath of filesToArchive) {
      try {
        const fullPath = path.join(__dirname, '..', filePath);
        const fileName = path.basename(filePath);
        await fs.copyFile(fullPath, path.join(archiveDir, fileName));
      } catch (error) {
        // File might not exist, continue
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not archive test artifacts:', error.message);
  }
}

async function generatePerformanceReport() {
  console.log('⚡ Generating performance report...');
  
  // Collect performance metrics from test results
  const performanceMetrics = {
    timestamp: new Date().toISOString(),
    averageTestDuration: 0,
    slowestTests: [],
    memoryUsage: process.memoryUsage(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  await fs.writeFile(
    path.join(__dirname, '..', 'reports', 'performance-metrics.json'),
    JSON.stringify(performanceMetrics, null, 2)
  );
}

export default globalTeardown;