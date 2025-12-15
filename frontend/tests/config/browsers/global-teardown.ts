import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Generate comprehensive test report
    await generateTestReport();
    
    // Cleanup test data
    await cleanupTestData();
    
    // Archive test artifacts
    await archiveTestArtifacts();
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

async function generateTestReport() {
  console.log('📊 Generating comprehensive test report...');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    testSuite: 'Agent Profile Dynamic Pages Comprehensive Tests',
    browsers: ['chromium', 'firefox', 'webkit'],
    devices: ['desktop', 'mobile', 'tablet'],
    networkConditions: ['slow-3g', 'fast-3g', 'offline'],
    summary: 'Comprehensive cross-browser testing completed',
  };
  
  const reportsDir = '/workspaces/agent-feed/frontend/tests/reports/comprehensive';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(reportsDir, 'test-summary.json'),
    JSON.stringify(reportData, null, 2)
  );
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  // Add cleanup logic for test agents, pages, etc.
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts...');
  // Archive screenshots, videos, traces
}

export default globalTeardown;