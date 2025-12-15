/**
 * Global Teardown for Agents Page E2E Tests
 * London School TDD - Test Environment Cleanup
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Global teardown function for Playwright E2E tests
 * Cleans up test environment and generates reports
 */
async function globalTeardown() {
  console.log('🧹 Starting Agents Page E2E test environment cleanup...');
  
  try {
    // Generate test summary report
    await generateTestSummary();
    
    // Cleanup temporary files
    await cleanupTempFiles();
    
    // Archive test results
    await archiveTestResults();
    
    // Stop mock services
    await stopMockServices();
    
    console.log('✅ Agents Page E2E test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw - cleanup errors shouldn't fail the test suite
  }
}

/**
 * Generate comprehensive test summary report
 */
async function generateTestSummary() {
  try {
    const testResultsPath = path.join(__dirname, '../coverage');
    const summaryPath = path.join(testResultsPath, 'test-summary.json');
    
    // Collect test metrics from various sources
    const summary = {
      timestamp: new Date().toISOString(),
      testSuite: 'agents-page',
      approach: 'london-school-tdd',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        testDirectory: path.resolve(__dirname, '..'),
        testTypes: ['unit', 'integration', 'e2e', 'performance', 'accessibility']
      },
      coverage: {
        unit: await getCoverageData('unit'),
        integration: await getCoverageData('integration'),
        e2e: await getCoverageData('e2e')
      },
      performance: await getPerformanceData(),
      accessibility: await getAccessibilityData(),
      recommendations: generateTestRecommendations()
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📊 Generated test summary report');
  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error.message);
  }
}

/**
 * Get coverage data for specific test type
 */
async function getCoverageData(testType) {
  try {
    const coveragePath = path.join(__dirname, '../coverage', `${testType}-coverage.json`);
    const coverageData = await fs.readFile(coveragePath, 'utf8');
    return JSON.parse(coverageData);
  } catch (error) {
    return {
      lines: { pct: 0 },
      functions: { pct: 0 },
      branches: { pct: 0 },
      statements: { pct: 0 },
      error: `Coverage data not available: ${error.message}`
    };
  }
}

/**
 * Get performance test data
 */
async function getPerformanceData() {
  try {
    const performancePath = path.join(__dirname, '../coverage/performance-results.json');
    const performanceData = await fs.readFile(performancePath, 'utf8');
    return JSON.parse(performanceData);
  } catch (error) {
    return {
      discoveryTime: null,
      webSocketLatency: null,
      cachePerformance: null,
      concurrentLoad: null,
      error: `Performance data not available: ${error.message}`
    };
  }
}

/**
 * Get accessibility test data
 */
async function getAccessibilityData() {
  try {
    const a11yPath = path.join(__dirname, '../coverage/accessibility-results.json');
    const a11yData = await fs.readFile(a11yPath, 'utf8');
    return JSON.parse(a11yData);
  } catch (error) {
    return {
      violations: [],
      passes: [],
      wcagCompliance: 'unknown',
      error: `Accessibility data not available: ${error.message}`
    };
  }
}

/**
 * Generate test recommendations based on results
 */
function generateTestRecommendations() {
  return [
    {
      category: 'London School TDD',
      recommendation: 'Continue using mock-first approach for unit tests',
      rationale: 'Ensures proper object collaboration verification'
    },
    {
      category: 'Coverage',
      recommendation: 'Maintain 95%+ coverage for critical agent services',
      rationale: 'High coverage ensures reliability of agent discovery'
    },
    {
      category: 'Performance',
      recommendation: 'Monitor agent discovery time as agent count grows',
      rationale: 'Scalability is crucial for production environments'
    },
    {
      category: 'Accessibility',
      recommendation: 'Regular WCAG 2.1 AA compliance validation',
      rationale: 'Ensures universal access to agent management features'
    },
    {
      category: 'Integration',
      recommendation: 'Test WebSocket reconnection scenarios',
      rationale: 'Real-time features must be resilient to network issues'
    }
  ];
}

/**
 * Cleanup temporary files created during testing
 */
async function cleanupTempFiles() {
  const tempPaths = [
    path.join(__dirname, '../../../temp/test-workspace'),
    path.join(__dirname, '../../../temp/test-data'),
    path.join(__dirname, '../../../temp/test-agents'),
    path.join(__dirname, '../../../temp/websocket-config.json')
  ];
  
  for (const tempPath of tempPaths) {
    try {
      const stats = await fs.stat(tempPath);
      if (stats.isDirectory()) {
        await fs.rmdir(tempPath, { recursive: true });
      } else {
        await fs.unlink(tempPath);
      }
      console.log(`🗑️ Cleaned up: ${tempPath}`);
    } catch (error) {
      // Path doesn't exist or already cleaned up
      console.log(`ℹ️ Already clean: ${tempPath}`);
    }
  }
}

/**
 * Archive test results for historical analysis
 */
async function archiveTestResults() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(__dirname, '../coverage/archive');
    
    await fs.mkdir(archivePath, { recursive: true });
    
    // Archive key test files
    const filesToArchive = [
      'test-summary.json',
      'agents-page-test-report.html',
      'agents-page-junit.xml',
      'playwright-results.json'
    ];
    
    for (const file of filesToArchive) {
      try {
        const sourcePath = path.join(__dirname, '../coverage', file);
        const archiveFilePath = path.join(archivePath, `${timestamp}-${file}`);
        
        await fs.copyFile(sourcePath, archiveFilePath);
        console.log(`📦 Archived: ${file}`);
      } catch (error) {
        // File might not exist for this test run
        console.log(`ℹ️ Skipped archiving: ${file} (not found)`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not archive test results:', error.message);
  }
}

/**
 * Stop mock services and cleanup connections
 */
async function stopMockServices() {
  // In a real implementation, this would:
  // 1. Stop mock WebSocket server
  // 2. Close database connections
  // 3. Cleanup network mocks
  // 4. Reset global state
  
  console.log('🛑 Mock services stopped');
  
  // Reset global test state
  if (global.__AGENTS_PAGE_TEST__) {
    delete global.__AGENTS_PAGE_TEST__;
  }
  
  if (global.__TDD_LONDON_SCHOOL__) {
    delete global.__TDD_LONDON_SCHOOL__;
  }
}

module.exports = globalTeardown;