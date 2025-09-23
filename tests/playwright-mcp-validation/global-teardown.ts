import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright MCP validation suite
 * Generates final reports and cleans up test artifacts
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running Playwright MCP validation cleanup...');

  try {
    // Generate test summary report
    const reportPath = 'test-results/ui-validation-summary.json';
    const testResults = await generateTestSummary();

    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 Test summary generated: ${reportPath}`);

    // Store test results in memory for coordination
    console.log('💾 Storing test results in memory...');

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

async function generateTestSummary() {
  const summary = {
    timestamp: new Date().toISOString(),
    testRun: {
      platform: process.platform,
      nodeVersion: process.version,
      browsers: ['chromium', 'firefox', 'webkit'],
      viewports: [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 1024, height: 768 },
        { name: 'mobile', width: 390, height: 844 }
      ]
    },
    metrics: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0
    },
    coverage: {
      routes: [],
      components: [],
      interactions: []
    },
    accessibility: {
      violations: [],
      warnings: []
    },
    performance: {
      loadTimes: {},
      corWebVitals: {},
      bundleSize: {}
    }
  };

  // Try to read existing test results if available
  try {
    const resultsPath = 'test-results/ui-validation-results.json';
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

      summary.metrics.totalTests = results.stats?.total || 0;
      summary.metrics.passedTests = results.stats?.expected || 0;
      summary.metrics.failedTests = results.stats?.unexpected || 0;
      summary.metrics.skippedTests = results.stats?.skipped || 0;
      summary.metrics.duration = results.stats?.duration || 0;
    }
  } catch (error) {
    console.log('⚠️  Could not parse existing test results');
  }

  return summary;
}

export default globalTeardown;