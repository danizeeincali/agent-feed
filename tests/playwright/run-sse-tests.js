#!/usr/bin/env node

/**
 * SSE Streaming Tests Runner
 * 
 * Utility script to run SSE streaming validation tests with proper setup.
 * Ensures backend and frontend are running before executing tests.
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;
const TEST_TIMEOUT = 300000; // 5 minutes

// Color output utilities
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

// Check if a service is running on a port
async function checkServiceHealth(port, serviceName) {
  return new Promise((resolve) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: port,
      path: port === BACKEND_PORT ? '/health' : '/',
      timeout: 5000
    };

    const req = http.get(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        logSuccess(`${serviceName} is running on port ${port}`);
        resolve(true);
      } else {
        logError(`${serviceName} returned status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      logError(`${serviceName} not accessible: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      logError(`${serviceName} health check timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for services to be ready
async function waitForServices() {
  logHeader('Checking Service Health');
  
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    const backendHealthy = await checkServiceHealth(BACKEND_PORT, 'Backend');
    const frontendHealthy = await checkServiceHealth(FRONTEND_PORT, 'Frontend');
    
    if (backendHealthy && frontendHealthy) {
      logSuccess('All services are ready!');
      return true;
    }
    
    retries++;
    if (retries < maxRetries) {
      log(`Retry ${retries}/${maxRetries} - waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  logError('Services failed to start within timeout');
  return false;
}

// Run Playwright tests
async function runPlaywrightTests(testFile = null) {
  return new Promise((resolve) => {
    logHeader(`Running Playwright Tests${testFile ? ` - ${testFile}` : ''}`);
    
    const playwrightCmd = testFile 
      ? `npx playwright test ${testFile}` 
      : 'npx playwright test sse-*.spec.js claude-instance-*.spec.js';
    
    log(`Executing: ${playwrightCmd}`);
    
    const testProcess = spawn('npx', [
      'playwright', 'test', 
      ...(testFile ? [testFile] : ['sse-streaming-validation.spec.js', 'claude-instance-sse.spec.js']),
      '--reporter=list',
      '--reporter=json:test-results/results.json',
      '--reporter=html:playwright-report/index.html'
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_TIMEOUT: TEST_TIMEOUT.toString()
      }
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('All tests passed!');
        resolve(true);
      } else {
        logError(`Tests failed with exit code ${code}`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      logError(`Failed to run tests: ${error.message}`);
      resolve(false);
    });
  });
}

// Generate test report
function generateTestReport() {
  logHeader('Generating Test Report');
  
  const reportPath = path.join(__dirname, 'test-results', 'results.json');
  
  if (fs.existsSync(reportPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      log(`\n${colors.bold}Test Results Summary:${colors.reset}`);
      log(`Total Tests: ${results.stats?.total || 'N/A'}`);
      log(`Passed: ${colors.green}${results.stats?.expected || 0}${colors.reset}`);
      log(`Failed: ${colors.red}${results.stats?.failed || 0}${colors.reset}`);
      log(`Skipped: ${colors.yellow}${results.stats?.skipped || 0}${colors.reset}`);
      
      if (results.stats?.failed > 0) {
        log(`\n${colors.bold}Failed Tests:${colors.reset}`);
        results.suites?.forEach(suite => {
          suite.specs?.forEach(spec => {
            if (spec.tests?.some(test => test.status === 'failed')) {
              logError(`  - ${spec.title}`);
            }
          });
        });
      }
      
      logSuccess('Test report generated');
      
    } catch (error) {
      logWarning(`Could not parse test results: ${error.message}`);
    }
  } else {
    logWarning('Test results file not found');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testFile = args[0]; // Optional specific test file
  
  log(`${colors.bold}${colors.blue}SSE Streaming Tests Runner${colors.reset}`);
  log(`Testing SSE incremental output validation and Claude instance integration\n`);
  
  // Check if services are running
  const servicesReady = await waitForServices();
  if (!servicesReady) {
    logError('Services not ready. Please start the backend and frontend:');
    log('Backend: cd /workspaces/agent-feed && node simple-backend.js');
    log('Frontend: cd /workspaces/agent-feed/frontend && npm run dev');
    process.exit(1);
  }
  
  // Ensure test results directory exists
  const testResultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Run tests
  const testsPassed = await runPlaywrightTests(testFile);
  
  // Generate report
  generateTestReport();
  
  // Show HTML report info
  const reportPath = path.join(__dirname, 'playwright-report', 'index.html');
  if (fs.existsSync(reportPath)) {
    log(`\n${colors.bold}HTML Report Available:${colors.reset}`);
    log(`file://${reportPath}`);
  }
  
  // Exit with appropriate code
  process.exit(testsPassed ? 0 : 1);
}

// Handle process signals
process.on('SIGINT', () => {
  log('\nTest execution interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\nTest execution terminated');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkServiceHealth,
  waitForServices,
  runPlaywrightTests,
  generateTestReport
};