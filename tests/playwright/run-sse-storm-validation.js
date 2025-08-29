#!/usr/bin/env node

/**
 * SSE Buffer Accumulation Storm Validation Test Runner
 * 
 * This script runs comprehensive SSE validation tests that:
 * 1. Create real Claude instances via browser automation
 * 2. Monitor SSE connections directly
 * 3. Detect message duplication and buffer storms
 * 4. Validate incremental output behavior
 * 5. Test connection recovery scenarios
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  testFile: 'live-sse-validation.spec.ts',
  outputDir: 'test-results/sse-validation',
  reportDir: 'playwright-report/sse-validation',
  timeout: 300000, // 5 minutes per test
  retries: 2,
  workers: 1 // Single worker to avoid resource conflicts
};

// Ensure output directories exist
function ensureDirectories() {
  const dirs = [config.outputDir, config.reportDir, 'test-results'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Check if backend is running
function checkBackend() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('curl -s http://localhost:3000/api/claude/instances', (error, stdout) => {
      if (error) {
        console.error('❌ Backend not running on port 3000');
        console.log('💡 Please start the backend first: cd /workspaces/agent-feed && node simple-backend.js');
        process.exit(1);
      }
      console.log('✅ Backend is running');
      resolve();
    });
  });
}

// Check if frontend is running
function checkFrontend() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('curl -s http://localhost:5173', (error) => {
      if (error) {
        console.error('❌ Frontend not running on port 5173');
        console.log('💡 Please start the frontend first: cd /workspaces/agent-feed/frontend && npm run dev');
        process.exit(1);
      }
      console.log('✅ Frontend is running');
      resolve();
    });
  });
}

// Run the tests
function runTests() {
  console.log('🚀 Starting SSE Buffer Accumulation Storm Validation Tests...');
  
  const args = [
    'test',
    config.testFile,
    `--timeout=${config.timeout}`,
    `--retries=${config.retries}`,
    `--workers=${config.workers}`,
    `--output-dir=${config.outputDir}`,
    `--reporter=list`,
    `--reporter=json:${config.outputDir}/results.json`,
    `--reporter=html:${config.reportDir}/index.html`,
    '--headed', // Run in headed mode to see browser interaction
    '--project=chromium' // Use Chromium for consistent results
  ];
  
  console.log(`📋 Running: npx playwright ${args.join(' ')}`);
  
  const playwright = spawn('npx', ['playwright', ...args], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  playwright.on('close', (code) => {
    console.log(`\n📊 Tests completed with exit code: ${code}`);
    
    // Generate summary report
    generateSummaryReport(code === 0);
    
    if (code === 0) {
      console.log('\n✅ All SSE validation tests passed!');
      console.log('🔍 No buffer accumulation storms detected');
      console.log('📈 SSE incremental output working correctly');
    } else {
      console.log('\n❌ Some tests failed - buffer accumulation storms may be present');
      console.log('📋 Check the detailed report for analysis');
    }
    
    console.log(`\n📄 Detailed report: ${config.reportDir}/index.html`);
    console.log(`📊 JSON results: ${config.outputDir}/results.json`);
    
    process.exit(code);
  });
  
  playwright.on('error', (error) => {
    console.error('❌ Failed to start Playwright tests:', error);
    process.exit(1);
  });
}

// Generate summary report
function generateSummaryReport(allPassed) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    testSuite: 'SSE Buffer Accumulation Storm Validation',
    status: allPassed ? 'PASSED' : 'FAILED',
    summary: {
      bufferStormDetection: allPassed,
      incrementalOutputValidation: allPassed,
      connectionRecoveryTesting: allPassed,
      memoryUsageMonitoring: allPassed,
      messageDeduplication: allPassed
    },
    recommendations: allPassed ? [
      'SSE implementation is working correctly',
      'No buffer accumulation storms detected',
      'Incremental output positioning maintained',
      'Connection recovery working properly',
      'Memory usage within acceptable bounds'
    ] : [
      'Review SSE implementation for buffer storms',
      'Check incremental output positioning logic',
      'Validate message deduplication mechanisms',
      'Monitor connection recovery behavior',
      'Investigate memory usage patterns'
    ],
    detailedReportPath: `${config.reportDir}/index.html`,
    jsonResultsPath: `${config.outputDir}/results.json`
  };
  
  const summaryPath = path.join(config.outputDir, 'validation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📋 Validation Summary:`);
  console.log(`   Status: ${report.status}`);
  console.log(`   Buffer Storm Detection: ${report.summary.bufferStormDetection ? '✅' : '❌'}`);
  console.log(`   Incremental Output: ${report.summary.incrementalOutputValidation ? '✅' : '❌'}`);
  console.log(`   Connection Recovery: ${report.summary.connectionRecoveryTesting ? '✅' : '❌'}`);
  console.log(`   Memory Monitoring: ${report.summary.memoryUsageMonitoring ? '✅' : '❌'}`);
  console.log(`   Message Deduplication: ${report.summary.messageDeduplication ? '✅' : '❌'}`);
  console.log(`\n📄 Summary saved: ${summaryPath}`);
}

// Main execution
async function main() {
  console.log('🔍 SSE Buffer Accumulation Storm Validation Test Runner');
  console.log('=' .repeat(60));
  
  try {
    ensureDirectories();
    await checkBackend();
    await checkFrontend();
    
    console.log('\n🎯 Prerequisites met - starting validation tests...');
    runTests();
  } catch (error) {
    console.error('❌ Validation setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { config, runTests, generateSummaryReport };
