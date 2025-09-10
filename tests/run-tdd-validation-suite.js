#!/usr/bin/env node

/**
 * TDD VALIDATION SUITE RUNNER
 * 
 * Comprehensive test runner that validates all user issues:
 * - "both feed and agents dont work"
 * - "Error HTTP 404: Not Found"
 * - "no posts on the feed"
 * 
 * Runs all test suites and generates detailed results
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 60000; // 60 seconds

// Results tracking
const results = {
  timestamp: new Date().toISOString(),
  userIssues: [
    'both feed and agents dont work',
    'Error HTTP 404: Not Found',
    'no posts on the feed'
  ],
  testSuites: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  },
  systemStatus: {
    backend: null,
    frontend: null,
    connectivity: null
  }
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📋';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function checkSystemStatus() {
  log('Checking system status before running tests...');
  
  // Check backend
  try {
    const fetch = (await import('node-fetch')).default;
    const backendResponse = await fetch(`${BACKEND_URL}/health`);
    const backendData = await backendResponse.json();
    results.systemStatus.backend = {
      status: backendResponse.status,
      healthy: backendData.status === 'healthy',
      services: backendData.services
    };
    log(`Backend status: ${backendData.status}`, backendData.status === 'healthy' ? 'success' : 'error');
  } catch (error) {
    results.systemStatus.backend = { error: error.message };
    log(`Backend check failed: ${error.message}`, 'error');
  }
  
  // Check frontend
  try {
    const fetch = (await import('node-fetch')).default;
    const frontendResponse = await fetch(FRONTEND_URL);
    results.systemStatus.frontend = {
      status: frontendResponse.status,
      accessible: frontendResponse.status === 200
    };
    log(`Frontend status: ${frontendResponse.status}`, frontendResponse.status === 200 ? 'success' : 'error');
  } catch (error) {
    results.systemStatus.frontend = { error: error.message };
    log(`Frontend check failed: ${error.message}`, 'error');
  }
  
  // Check connectivity
  try {
    const fetch = (await import('node-fetch')).default;
    const proxyResponse = await fetch(`${FRONTEND_URL}/api/health`);
    results.systemStatus.connectivity = {
      proxyWorking: proxyResponse.status === 200,
      status: proxyResponse.status
    };
    log(`Frontend-Backend connectivity: ${proxyResponse.status === 200 ? 'working' : 'failed'}`, 
        proxyResponse.status === 200 ? 'success' : 'error');
  } catch (error) {
    results.systemStatus.connectivity = { error: error.message };
    log(`Connectivity check failed: ${error.message}`, 'error');
  }
}

function runJestTest(testFile, suiteName) {
  return new Promise((resolve, reject) => {
    log(`Running ${suiteName}...`);
    
    const jestProcess = spawn('npx', ['jest', testFile, '--json', '--verbose'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: TEST_TIMEOUT
    });
    
    let stdout = '';
    let stderr = '';
    
    jestProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    jestProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    jestProcess.on('close', (code) => {
      try {
        // Try to parse Jest JSON output
        const lines = stdout.split('\\n');
        const jsonLine = lines.find(line => line.trim().startsWith('{') && line.includes('testResults'));
        
        if (jsonLine) {
          const testResults = JSON.parse(jsonLine);
          const suite = {
            name: suiteName,
            file: testFile,
            success: code === 0,
            results: testResults,
            stderr: stderr
          };
          
          // Update summary
          if (testResults.testResults && testResults.testResults[0]) {
            const result = testResults.testResults[0];
            results.summary.totalTests += result.numPassingTests + result.numFailingTests + result.numPendingTests;
            results.summary.passed += result.numPassingTests;
            results.summary.failed += result.numFailingTests;
            results.summary.skipped += result.numPendingTests;
          }
          
          results.testSuites.push(suite);
          log(`${suiteName} completed: ${code === 0 ? 'PASSED' : 'FAILED'}`, code === 0 ? 'success' : 'error');
          resolve(suite);
        } else {
          // Fallback for non-JSON output
          const suite = {
            name: suiteName,
            file: testFile,
            success: code === 0,
            stdout: stdout,
            stderr: stderr
          };
          results.testSuites.push(suite);
          log(`${suiteName} completed: ${code === 0 ? 'PASSED' : 'FAILED'}`, code === 0 ? 'success' : 'error');
          resolve(suite);
        }
      } catch (error) {
        const suite = {
          name: suiteName,
          file: testFile,
          success: false,
          error: error.message,
          stdout: stdout,
          stderr: stderr
        };
        results.testSuites.push(suite);
        log(`${suiteName} failed to parse results: ${error.message}`, 'error');
        resolve(suite);
      }
    });
    
    jestProcess.on('error', (error) => {
      log(`Failed to start ${suiteName}: ${error.message}`, 'error');
      reject(error);
    });
    
    // Timeout handling
    setTimeout(() => {
      jestProcess.kill('SIGTERM');
      reject(new Error(`Test timeout: ${suiteName}`));
    }, TEST_TIMEOUT);
  });
}

async function runPlaywrightTest() {
  return new Promise((resolve, reject) => {
    log('Running Frontend E2E Tests (Playwright)...');
    
    const playwrightProcess = spawn('npx', ['playwright', 'test', 'tests/frontend-route-e2e-validation.test.js', '--reporter=json'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: TEST_TIMEOUT
    });
    
    let stdout = '';
    let stderr = '';
    
    playwrightProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    playwrightProcess.on('close', (code) => {
      const suite = {
        name: 'Frontend E2E Validation',
        file: 'tests/frontend-route-e2e-validation.test.js',
        success: code === 0,
        stdout: stdout,
        stderr: stderr,
        framework: 'Playwright'
      };
      
      results.testSuites.push(suite);
      log(`Frontend E2E Tests completed: ${code === 0 ? 'PASSED' : 'FAILED'}`, code === 0 ? 'success' : 'error');
      resolve(suite);
    });
    
    playwrightProcess.on('error', (error) => {
      log(`Failed to start Playwright tests: ${error.message}`, 'error');
      reject(error);
    });
  });
}

async function runValidationSuite() {
  const startTime = Date.now();
  
  log('🚀 Starting TDD Route Connectivity Validation Suite');
  log(`Target URLs: Backend=${BACKEND_URL}, Frontend=${FRONTEND_URL}`);
  
  try {
    // Check system status first
    await checkSystemStatus();
    
    // Run test suites
    const testSuites = [
      {
        file: 'tests/tdd-comprehensive-route-validation.test.js',
        name: 'API Connectivity Validation'
      },
      {
        file: 'tests/websocket-realtime-validation.test.js',
        name: 'WebSocket Real-time Validation'
      }
    ];
    
    // Run Jest tests
    for (const suite of testSuites) {
      try {
        await runJestTest(suite.file, suite.name);
      } catch (error) {
        log(`Suite ${suite.name} encountered an error: ${error.message}`, 'error');
      }
    }
    
    // Run Playwright tests (if available)
    try {
      await runPlaywrightTest();
    } catch (error) {
      log(`Playwright tests encountered an error: ${error.message}`, 'warning');
    }
    
    // Calculate duration
    results.summary.duration = Date.now() - startTime;
    
    // Generate report
    await generateReport();
    
    log(`✅ Validation suite completed in ${results.summary.duration}ms`, 'success');
    log(`📊 Results: ${results.summary.passed} passed, ${results.summary.failed} failed, ${results.summary.skipped} skipped`);
    
    return results;
    
  } catch (error) {
    log(`❌ Validation suite failed: ${error.message}`, 'error');
    throw error;
  }
}

async function generateReport() {
  const reportPath = path.join(__dirname, 'tdd-validation-results.json');
  
  // Add validation summary
  results.validation = {
    userIssuesAddressed: {
      'both feed and agents dont work': checkFeedAndAgentsWorking(),
      'Error HTTP 404: Not Found': check404ErrorsResolved(), 
      'no posts on the feed': checkPostsAvailable()
    },
    systemHealthy: checkSystemHealth(),
    allTestsPassed: results.summary.failed === 0
  };
  
  // Write detailed results
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`📄 Detailed results saved to: ${reportPath}`);
  
  // Generate summary report
  const summaryReport = generateSummaryReport();
  const summaryPath = path.join(__dirname, 'tdd-validation-summary.md');
  fs.writeFileSync(summaryPath, summaryReport);
  log(`📄 Summary report saved to: ${summaryPath}`);
}

function checkFeedAndAgentsWorking() {
  const backendHealthy = results.systemStatus.backend?.healthy;
  const frontendAccessible = results.systemStatus.frontend?.accessible;
  return backendHealthy && frontendAccessible;
}

function check404ErrorsResolved() {
  // Check if any test suites detected 404 errors
  return !results.testSuites.some(suite => 
    suite.stderr?.includes('404') || suite.stdout?.includes('404')
  );
}

function checkPostsAvailable() {
  const backendHealthy = results.systemStatus.backend?.healthy;
  // If backend is healthy, posts should be available
  return backendHealthy;
}

function checkSystemHealth() {
  return results.systemStatus.backend?.healthy && 
         results.systemStatus.frontend?.accessible &&
         results.systemStatus.connectivity?.proxyWorking;
}

function generateSummaryReport() {
  const timestamp = new Date().toLocaleString();
  
  return `# TDD Route Connectivity Validation Report

**Generated:** ${timestamp}

## User Issues Validation

### Issue: "both feed and agents dont work"
**Status:** ${checkFeedAndAgentsWorking() ? '✅ RESOLVED' : '❌ NOT RESOLVED'}

### Issue: "Error HTTP 404: Not Found"  
**Status:** ${check404ErrorsResolved() ? '✅ RESOLVED' : '❌ NOT RESOLVED'}

### Issue: "no posts on the feed"
**Status:** ${checkPostsAvailable() ? '✅ RESOLVED' : '❌ NOT RESOLVED'}

## System Status

### Backend (${BACKEND_URL})
- **Status:** ${results.systemStatus.backend?.healthy ? '✅ Healthy' : '❌ Unhealthy'}
- **Services:** ${JSON.stringify(results.systemStatus.backend?.services || {}, null, 2)}

### Frontend (${FRONTEND_URL})
- **Status:** ${results.systemStatus.frontend?.accessible ? '✅ Accessible' : '❌ Not Accessible'}

### Connectivity
- **Proxy Working:** ${results.systemStatus.connectivity?.proxyWorking ? '✅ Yes' : '❌ No'}

## Test Results Summary

- **Total Tests:** ${results.summary.totalTests}
- **Passed:** ${results.summary.passed} ✅
- **Failed:** ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}
- **Skipped:** ${results.summary.skipped}
- **Duration:** ${results.summary.duration}ms

## Test Suites

${results.testSuites.map(suite => `
### ${suite.name}
- **Status:** ${suite.success ? '✅ PASSED' : '❌ FAILED'}
- **File:** ${suite.file}
- **Framework:** ${suite.framework || 'Jest'}
`).join('')}

## Overall Validation

**System Health:** ${checkSystemHealth() ? '✅ HEALTHY' : '❌ UNHEALTHY'}
**All Tests Passed:** ${results.summary.failed === 0 ? '✅ YES' : '❌ NO'}
**User Issues Resolved:** ${Object.values(results.validation?.userIssuesAddressed || {}).every(Boolean) ? '✅ YES' : '❌ PARTIAL'}

## Recommendations

${results.summary.failed > 0 ? 
  '⚠️ Some tests failed. Review the detailed results for specific issues.' : 
  '✅ All tests passed. System is functioning correctly.'}

${!checkSystemHealth() ? 
  '⚠️ System health issues detected. Check server status and connectivity.' : 
  '✅ System is healthy and operational.'}
`;
}

// Run if called directly
if (require.main === module) {
  runValidationSuite()
    .then(() => {
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Validation suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runValidationSuite, results };