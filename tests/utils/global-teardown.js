/**
 * Global test teardown for Claude output parsing tests
 * Cleanup and result processing
 */

const fs = require('fs').promises;
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Generate test summary report
    await generateTestSummary();

    // Clean up temporary test files
    await cleanupTempFiles();

    // Archive test results if needed
    await archiveResults();

    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

/**
 * Generate comprehensive test summary
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  const summaryPath = 'test-results/test-summary.json';
  const timestamp = new Date().toISOString();
  
  const summary = {
    timestamp,
    testRun: {
      environment: process.env.NODE_ENV || 'test',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    results: {
      // These will be populated by individual test results
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    },
    coverage: {
      // Placeholder for coverage information
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    performance: {
      avgParseTime: 0,
      maxParseTime: 0,
      memoryUsage: process.memoryUsage(),
    },
  };

  try {
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📝 Test summary written to ${summaryPath}`);
  } catch (error) {
    console.error('Failed to write test summary:', error);
  }
}

/**
 * Clean up temporary files created during testing
 */
async function cleanupTempFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  const tempFiles = [
    'test-results/temp',
    'test-results/*.tmp',
  ];

  for (const pattern of tempFiles) {
    try {
      // Simple cleanup - remove temp directories
      if (pattern.includes('temp')) {
        await fs.rmdir(pattern, { recursive: true }).catch(() => {});
      }
    } catch (error) {
      // Ignore cleanup errors
      console.log(`Note: Could not clean ${pattern}`);
    }
  }
}

/**
 * Archive test results for historical analysis
 */
async function archiveResults() {
  if (!process.env.ARCHIVE_RESULTS) {
    return;
  }

  console.log('📦 Archiving test results...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = `test-results/archive/run-${timestamp}`;
  
  try {
    await fs.mkdir(archivePath, { recursive: true });
    
    // Copy important results
    const filesToArchive = [
      'test-results/json-results.json',
      'test-results/junit-results.xml',
      'test-results/test-summary.json',
    ];

    for (const file of filesToArchive) {
      try {
        const fileName = path.basename(file);
        await fs.copyFile(file, path.join(archivePath, fileName));
      } catch (error) {
        // File might not exist, that's okay
      }
    }
    
    console.log(`📁 Results archived to ${archivePath}`);
  } catch (error) {
    console.error('Failed to archive results:', error);
  }
}

module.exports = globalTeardown;