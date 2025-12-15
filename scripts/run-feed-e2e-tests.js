#!/usr/bin/env node

/**
 * E2E Test Runner for Persistent Feed Data System
 * This script runs the E2E tests and generates comprehensive reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseURL: 'http://localhost:5173',
  apiURL: 'http://localhost:3000',
  timeout: 300000, // 5 minutes
  retries: 2,
  browsers: ['chromium', 'firefox', 'webkit'],
  testFiles: [
    'tests/e2e/persistent-feed-system.test.js',
    'tests/e2e/performance-validation.test.js',
    'tests/e2e/accessibility-compliance.test.js'
  ]
};

// Ensure directories exist
const reportsDir = 'tests/reports';
const dirs = [
  reportsDir,
  `${reportsDir}/e2e-html`,
  `${reportsDir}/screenshots`,
  `${reportsDir}/videos`
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Helper function to run command
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Health check function
async function healthCheck() {
  console.log('🔍 Performing health checks...');
  
  try {
    const fetch = require('node-fetch');
    
    // Check frontend
    try {
      const frontendResponse = await fetch(config.baseURL, { timeout: 5000 });
      console.log(`✅ Frontend (${config.baseURL}): ${frontendResponse.status}`);
    } catch (error) {
      console.log(`❌ Frontend (${config.baseURL}): ${error.message}`);
      throw new Error('Frontend not available');
    }
    
    // Check backend
    try {
      const backendResponse = await fetch(config.apiURL + '/health', { timeout: 5000 });
      console.log(`✅ Backend (${config.apiURL}): ${backendResponse.status}`);
    } catch (error) {
      console.log(`⚠️  Backend (${config.apiURL}): ${error.message} - may be in fallback mode`);
    }
    
    return true;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// Main test execution function
async function runTests() {
  console.log('🚀 Starting E2E Test Execution for Persistent Feed Data System');
  console.log('=' .repeat(70));
  
  // Health check
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.error('❌ Health check failed - aborting tests');
    process.exit(1);
  }
  
  console.log('✅ Health checks passed - proceeding with tests');
  console.log('');
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    browserResults: {},
    startTime: new Date(),
    testSuites: []
  };
  
  // Test each browser
  for (const browser of config.browsers) {
    console.log(`📱 Testing on ${browser.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    try {
      // Run main feed system tests
      console.log('🔄 Running persistent feed system tests...');
      await runCommand('npx', [
        'playwright',
        'test',
        'tests/e2e/persistent-feed-system.test.js',
        '--project=' + browser,
        '--reporter=json',
        '--output=' + path.join(reportsDir, `${browser}-results.json`),
        '--timeout=' + config.timeout
      ]);
      
      results.browserResults[browser] = 'passed';
      console.log(`✅ ${browser} tests completed successfully`);
      
    } catch (error) {
      console.log(`⚠️  ${browser} tests had issues: ${error.message}`);
      results.browserResults[browser] = 'failed';
      
      // Continue with other browsers
    }
    
    console.log('');
  }
  
  // Run performance tests (Chrome only for consistency)
  console.log('⚡ Running Performance Validation Tests');
  console.log('-'.repeat(40));
  
  try {
    await runCommand('npx', [
      'playwright',
      'test',
      'tests/e2e/performance-validation.test.js',
      '--project=chromium',
      '--reporter=json',
      '--timeout=' + config.timeout
    ]);
    
    console.log('✅ Performance tests completed');
    results.testSuites.push({ name: 'Performance', status: 'passed' });
    
  } catch (error) {
    console.log(`⚠️  Performance tests had issues: ${error.message}`);
    results.testSuites.push({ name: 'Performance', status: 'failed' });
  }
  
  // Run accessibility tests
  console.log('♿ Running Accessibility Compliance Tests');
  console.log('-'.repeat(40));
  
  try {
    await runCommand('npx', [
      'playwright',
      'test',
      'tests/e2e/accessibility-compliance.test.js',
      '--project=chromium',
      '--reporter=json',
      '--timeout=' + config.timeout
    ]);
    
    console.log('✅ Accessibility tests completed');
    results.testSuites.push({ name: 'Accessibility', status: 'passed' });
    
  } catch (error) {
    console.log(`⚠️  Accessibility tests had issues: ${error.message}`);
    results.testSuites.push({ name: 'Accessibility', status: 'failed' });
  }
  
  // Generate HTML report
  console.log('📊 Generating HTML Report...');
  try {
    await runCommand('npx', ['playwright', 'show-report', '--host=0.0.0.0']);
  } catch (error) {
    console.log('⚠️  Could not generate HTML report:', error.message);
  }
  
  // Summary
  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;
  
  console.log('');
  console.log('📋 TEST EXECUTION SUMMARY');
  console.log('=' .repeat(70));
  console.log(`⏱️  Total Duration: ${Math.round(results.duration / 1000)}s`);
  console.log(`🌐 Browsers Tested: ${config.browsers.join(', ')}`);
  
  Object.entries(results.browserResults).forEach(([browser, status]) => {
    const icon = status === 'passed' ? '✅' : '⚠️ ';
    console.log(`${icon} ${browser}: ${status}`);
  });
  
  results.testSuites.forEach(suite => {
    const icon = suite.status === 'passed' ? '✅' : '⚠️ ';
    console.log(`${icon} ${suite.name}: ${suite.status}`);
  });
  
  console.log('');
  console.log('📄 Reports Generated:');
  console.log(`   - HTML Report: playwright-report/index.html`);
  console.log(`   - Screenshots: ${reportsDir}/screenshots/`);
  console.log(`   - Videos: ${reportsDir}/videos/`);
  console.log('');
  
  // Save results summary
  const summaryPath = path.join(reportsDir, 'e2e-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`📊 Summary saved: ${summaryPath}`);
  
  console.log('🎉 E2E Test Execution Complete!');
  
  // Exit with appropriate code
  const hasFailures = Object.values(results.browserResults).includes('failed') || 
                      results.testSuites.some(suite => suite.status === 'failed');
  
  process.exit(hasFailures ? 1 : 0);
}

// Install node-fetch if not available
async function installDependencies() {
  try {
    require.resolve('node-fetch');
  } catch (error) {
    console.log('Installing node-fetch for health checks...');
    try {
      await runCommand('npm', ['install', 'node-fetch@^2.7.0', '--no-save']);
      console.log('✅ Dependencies installed');
    } catch (installError) {
      console.log('⚠️  Could not install node-fetch - skipping health checks');
    }
  }
}

// Run the tests
if (require.main === module) {
  installDependencies()
    .then(() => runTests())
    .catch((error) => {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runTests, healthCheck };