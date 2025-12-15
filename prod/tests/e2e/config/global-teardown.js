/**
 * Global Test Teardown
 * Handles cleanup of test resources, database cleanup, and service shutdown
 */

import { TestDatabase } from '../utils/test-database.js';
import { MockServices } from '../utils/mock-services.js';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Stop mock services
    const mockServices = new MockServices();
    await mockServices.stop();
    console.log('✅ Mock services stopped');

    // Cleanup test database
    const testDb = new TestDatabase();
    await testDb.cleanup();
    console.log('✅ Test database cleaned up');

    // Generate test report summary
    await generateTestSummary();
    console.log('✅ Test summary generated');

    // Cleanup temporary files
    await cleanupTempFiles();
    console.log('✅ Temporary files cleaned up');

  } catch (error) {
    console.error('❌ Error during teardown:', error);
  }

  console.log('✅ Global teardown completed');
}

async function generateTestSummary() {
  try {
    const testResultsPath = 'test-results/results.json';
    const summaryPath = 'test-results/summary.json';
    
    const results = JSON.parse(await fs.readFile(testResultsPath, 'utf8'));
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.suites?.reduce((acc, suite) => acc + suite.specs?.length || 0, 0) || 0,
      passed: results.suites?.reduce((acc, suite) => 
        acc + (suite.specs?.filter(spec => spec.tests?.[0]?.results?.[0]?.status === 'passed').length || 0), 0) || 0,
      failed: results.suites?.reduce((acc, suite) => 
        acc + (suite.specs?.filter(spec => spec.tests?.[0]?.results?.[0]?.status === 'failed').length || 0), 0) || 0,
      skipped: results.suites?.reduce((acc, suite) => 
        acc + (suite.specs?.filter(spec => spec.tests?.[0]?.results?.[0]?.status === 'skipped').length || 0), 0) || 0,
      duration: results.stats?.duration || 0
    };

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  } catch (error) {
    console.warn('Warning: Could not generate test summary:', error.message);
  }
}

async function cleanupTempFiles() {
  const tempPaths = [
    'test-results/auth-state.json',
    'test-results/temp'
  ];

  for (const tempPath of tempPaths) {
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

export default globalTeardown;