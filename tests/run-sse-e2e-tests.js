#!/usr/bin/env node

/**
 * SSE Status Terminal E2E Test Runner
 * 
 * This script runs comprehensive E2E tests to validate the complete SSE flow
 * and ensure all backend fixes are working correctly.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 SSE Status Terminal E2E Test Runner');
console.log('=====================================\n');

// Test configuration
const testConfig = {
  testFile: 'sse-status-terminal-e2e.test.js',
  timeout: 60000,
  retries: 2,
  headless: true,
  baseURL: 'http://localhost:3000'
};

// Validation checklist
const validationChecklist = {
  'Backend running on port 3000': false,
  'Frontend running on port 5173': false,
  'SSE endpoints accessible': false,
  'Playwright installed': false,
  'Test file exists': false
};

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');
  
  // Check if test file exists
  const testPath = path.join(__dirname, testConfig.testFile);
  if (fs.existsSync(testPath)) {
    validationChecklist['Test file exists'] = true;
    console.log('✅ Test file exists:', testPath);
  } else {
    console.log('❌ Test file not found:', testPath);
    process.exit(1);
  }
  
  // Check if Playwright is installed
  try {
    execSync('npx playwright --version', { stdio: 'ignore' });
    validationChecklist['Playwright installed'] = true;
    console.log('✅ Playwright is installed');
  } catch (error) {
    console.log('❌ Playwright not installed. Installing...');
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      validationChecklist['Playwright installed'] = true;
      console.log('✅ Playwright installed successfully');
    } catch (installError) {
      console.log('❌ Failed to install Playwright:', installError.message);
      process.exit(1);
    }
  }
  
  // Check backend (port 3000)
  try {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000"`, 
      { encoding: 'utf8', timeout: 5000 });
    
    if (response.trim() === '200' || response.includes('Cannot GET')) {
      validationChecklist['Backend running on port 3000'] = true;
      console.log('✅ Backend is running on port 3000');
    } else {
      console.log('⚠️  Backend may not be running on port 3000 (will attempt to start)');
    }
  } catch (error) {
    console.log('⚠️  Unable to check backend status (will attempt to start)');
  }
  
  // Check frontend (port 5173)  
  try {
    const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || echo "000"`, 
      { encoding: 'utf8', timeout: 5000 });
    
    if (response.trim() === '200') {
      validationChecklist['Frontend running on port 5173'] = true;
      console.log('✅ Frontend is running on port 5173');
    } else {
      console.log('⚠️  Frontend may not be running on port 5173 (will attempt to start)');
    }
  } catch (error) {
    console.log('⚠️  Unable to check frontend status (will attempt to start)');
  }
  
  console.log('\n📋 Prerequisites Summary:');
  Object.entries(validationChecklist).forEach(([check, status]) => {
    console.log(`  ${status ? '✅' : '❌'} ${check}`);
  });
  console.log();
}

function startServices() {
  console.log('🚀 Starting required services...\n');
  
  // Start backend if not running
  if (!validationChecklist['Backend running on port 3000']) {
    console.log('🔧 Starting backend server...');
    try {
      spawn('node', ['simple-backend.js'], {
        cwd: '/workspaces/agent-feed',
        detached: true,
        stdio: 'ignore'
      });
      console.log('✅ Backend server started');
      
      // Wait for backend to be ready
      console.log('⏳ Waiting for backend to be ready...');
      let retries = 10;
      while (retries > 0) {
        try {
          execSync('sleep 2');
          const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000"`, 
            { encoding: 'utf8', timeout: 3000 });
          
          if (response.trim() === '200' || response.includes('Cannot GET')) {
            console.log('✅ Backend is ready');
            validationChecklist['Backend running on port 3000'] = true;
            break;
          }
        } catch (error) {
          // Continue trying
        }
        retries--;
      }
      
      if (retries === 0) {
        console.log('⚠️  Backend may not be fully ready, but continuing with tests');
      }
    } catch (error) {
      console.log('❌ Failed to start backend:', error.message);
    }
  }
  
  // Start frontend if not running
  if (!validationChecklist['Frontend running on port 5173']) {
    console.log('🔧 Starting frontend server...');
    try {
      spawn('npm', ['run', 'dev'], {
        cwd: '/workspaces/agent-feed/frontend',
        detached: true,
        stdio: 'ignore'
      });
      console.log('✅ Frontend server started');
      
      // Wait for frontend to be ready
      console.log('⏳ Waiting for frontend to be ready...');
      let retries = 15;
      while (retries > 0) {
        try {
          execSync('sleep 3');
          const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || echo "000"`, 
            { encoding: 'utf8', timeout: 3000 });
          
          if (response.trim() === '200') {
            console.log('✅ Frontend is ready');
            validationChecklist['Frontend running on port 5173'] = true;
            break;
          }
        } catch (error) {
          // Continue trying
        }
        retries--;
      }
      
      if (retries === 0) {
        console.log('⚠️  Frontend may not be fully ready, but continuing with tests');
      }
    } catch (error) {
      console.log('❌ Failed to start frontend:', error.message);
    }
  }
}

function runTests() {
  console.log('🧪 Running SSE Status Terminal E2E Tests...\n');
  
  const testCommand = [
    'npx', 'playwright', 'test',
    testConfig.testFile,
    '--config=playwright.config.ts',
    `--timeout=${testConfig.timeout}`,
    `--retries=${testConfig.retries}`,
    testConfig.headless ? '--headed=false' : '--headed=true',
    '--reporter=list,html,json,junit'
  ];
  
  console.log('🔧 Test command:', testCommand.join(' '));
  console.log('📁 Test directory:', __dirname);
  console.log('🌐 Base URL:', testConfig.baseURL);
  console.log();
  
  try {
    execSync(testCommand.join(' '), {
      cwd: __dirname,
      stdio: 'inherit',
      timeout: testConfig.timeout * 2 // Allow extra time for multiple test runs
    });
    
    console.log('\n✅ All SSE E2E tests completed successfully!');
    
    // Display test results summary
    displayTestResults();
    
  } catch (error) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    console.log('📊 Test Report: Open playwright-report/index.html for detailed results');
    
    // Still try to display results
    displayTestResults();
    
    process.exit(1);
  }
}

function displayTestResults() {
  console.log('\n📊 Test Results Summary');
  console.log('======================\n');
  
  // Try to read test results
  const resultsPath = path.join(__dirname, 'test-results', 'results.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      console.log(`📈 Tests Run: ${results.stats?.expected || 'N/A'}`);
      console.log(`✅ Passed: ${results.stats?.passed || 'N/A'}`);
      console.log(`❌ Failed: ${results.stats?.failed || 'N/A'}`);
      console.log(`⏭️  Skipped: ${results.stats?.skipped || 'N/A'}`);
      console.log(`⏱️  Duration: ${results.stats?.duration ? (results.stats.duration / 1000).toFixed(2) + 's' : 'N/A'}`);
      
    } catch (error) {
      console.log('⚠️  Could not parse test results file');
    }
  }
  
  console.log('\n🔍 What was tested:');
  console.log('  ✓ Button click → Instance creation');
  console.log('  ✓ Status progression: starting → running');
  console.log('  ✓ Terminal input acceptance');
  console.log('  ✓ Backend command forwarding');
  console.log('  ✓ SSE connection establishment');
  console.log('  ✓ Status broadcasting to connections');
  console.log('  ✓ All 4 buttons functionality');
  console.log('  ✓ SSE connection recovery');
  
  console.log('\n🎯 Expected backend logs to validate:');
  console.log('  • "Broadcasting status running for instance claude-XXXX to 1 connections"');
  console.log('  • "⌨️ Forwarding input to Claude claude-XXXX: [command]"');
  console.log('  • "SSE connection established for instance: claude-XXXX"');
  console.log('  • "Status SSE connections: > 0"');
  
  console.log('\n📁 Report files:');
  console.log('  • HTML Report: tests/playwright-report/index.html');
  console.log('  • JSON Results: tests/test-results/results.json');
  console.log('  • JUnit XML: tests/test-results/results.xml');
}

// Main execution
async function main() {
  try {
    console.log('🎯 Target: Validate complete SSE flow fixes');
    console.log('📋 Issues being tested:');
    console.log('  • Instances stuck on "starting" → Should show "running"');
    console.log('  • Terminal input not working → Should send commands');
    console.log('  • Status SSE has 0 connections → Should have 1+');
    console.log();
    
    checkPrerequisites();
    startServices();
    
    // Give services a moment to stabilize
    console.log('⏳ Allowing services to stabilize...');
    execSync('sleep 5');
    
    runTests();
    
    console.log('\n🎉 SSE E2E Test execution completed!');
    console.log('📝 Review the test report for detailed validation results.');
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runSSEE2ETests: main,
  testConfig,
  validationChecklist
};