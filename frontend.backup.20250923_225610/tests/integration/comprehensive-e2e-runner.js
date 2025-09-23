#!/usr/bin/env node

/**
 * Comprehensive E2E Test Runner for Agent Feed Application
 * Tests critical functionality: agents page, backend API, WebSocket connections, database operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

console.log('🚀 Starting Comprehensive E2E Test Suite');
console.log('===============================================');

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    backend_url: BACKEND_URL,
    frontend_url: FRONTEND_URL
  },
  tests: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Utility functions
function runTest(testName, testFunction) {
  testResults.summary.total++;
  console.log(`\n🧪 Running: ${testName}`);
  console.log('----------------------------------------');
  
  try {
    const result = testFunction();
    testResults.tests[testName] = {
      status: 'PASSED',
      duration: result.duration || 0,
      details: result.details || 'Test completed successfully'
    };
    testResults.summary.passed++;
    console.log(`✅ PASSED: ${testName}`);
    return true;
  } catch (error) {
    testResults.tests[testName] = {
      status: 'FAILED',
      error: error.message,
      details: error.details || 'Test failed with error'
    };
    testResults.summary.failed++;
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test implementations
const tests = {
  // 1. Backend Health and API Tests
  'Backend Server Health Check': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${BACKEND_URL}/health`, { timeout: 5000 });
      const healthData = JSON.parse(response.toString());
      
      if (!healthData.success || healthData.status !== 'healthy') {
        throw new Error('Backend health check failed');
      }
      
      return {
        duration: Date.now() - start,
        details: `Backend healthy: ${JSON.stringify(healthData)}`
      };
    } catch (error) {
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  },

  'Agents API Endpoint': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${BACKEND_URL}/api/agents`, { timeout: 5000 });
      const agentsData = JSON.parse(response.toString());
      
      if (!agentsData.success || !Array.isArray(agentsData.data)) {
        throw new Error('Agents API returned invalid data structure');
      }
      
      return {
        duration: Date.now() - start,
        details: `Found ${agentsData.data.length} agents`
      };
    } catch (error) {
      throw new Error(`Agents API failed: ${error.message}`);
    }
  },

  'Database Operations': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${BACKEND_URL}/api/v1/health`, { timeout: 5000 });
      const dbHealth = JSON.parse(response.toString());
      
      if (!dbHealth.database || !dbHealth.database.initialized) {
        throw new Error('Database not initialized');
      }
      
      return {
        duration: Date.now() - start,
        details: `Database type: ${dbHealth.database.type}, initialized: ${dbHealth.database.initialized}`
      };
    } catch (error) {
      throw new Error(`Database operations failed: ${error.message}`);
    }
  },

  // 2. Frontend Page Loading Tests
  'Frontend Server Response': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${FRONTEND_URL}`, { timeout: 5000 });
      const html = response.toString();
      
      if (!html.includes('Agent Feed') || html.length < 100) {
        throw new Error('Frontend page content invalid');
      }
      
      return {
        duration: Date.now() - start,
        details: `Page loaded, size: ${html.length} characters`
      };
    } catch (error) {
      throw new Error(`Frontend loading failed: ${error.message}`);
    }
  },

  'Agents Page Route': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${FRONTEND_URL}/agents`, { timeout: 5000 });
      const html = response.toString();
      
      if (!html.includes('Agent Feed') || html.length < 100) {
        throw new Error('Agents page content invalid');
      }
      
      return {
        duration: Date.now() - start,
        details: `Agents page loaded, size: ${html.length} characters`
      };
    } catch (error) {
      throw new Error(`Agents page loading failed: ${error.message}`);
    }
  },

  // 3. WebSocket Connection Tests
  'WebSocket Endpoint Availability': () => {
    const start = Date.now();
    try {
      // Test if WebSocket endpoint is accessible (basic connection test)
      const response = execSync(`curl -s -I ${BACKEND_URL}/terminal`, { timeout: 5000 });
      const headers = response.toString();
      
      if (headers.includes('404') || headers.includes('500')) {
        throw new Error('WebSocket endpoint not available');
      }
      
      return {
        duration: Date.now() - start,
        details: 'WebSocket endpoint accessible'
      };
    } catch (error) {
      throw new Error(`WebSocket endpoint test failed: ${error.message}`);
    }
  },

  // 4. Error Boundary Tests
  'Error Boundary Components': () => {
    const start = Date.now();
    try {
      // Check if error boundary components exist
      const errorBoundaryFiles = [
        'src/components/ErrorBoundary.jsx',
        'src/components/GlobalErrorBoundary.tsx',
        'src/components/RouteErrorBoundary.tsx'
      ];
      
      let foundBoundaries = 0;
      errorBoundaryFiles.forEach(file => {
        const fullPath = path.join(__dirname, '../../', file);
        if (fs.existsSync(fullPath)) {
          foundBoundaries++;
        }
      });
      
      if (foundBoundaries === 0) {
        throw new Error('No error boundary components found');
      }
      
      return {
        duration: Date.now() - start,
        details: `Found ${foundBoundaries} error boundary components`
      };
    } catch (error) {
      throw new Error(`Error boundary test failed: ${error.message}`);
    }
  },

  // 5. Real-time Features Test
  'Real-time API Endpoints': () => {
    const start = Date.now();
    try {
      const response = execSync(`curl -s -f ${BACKEND_URL}/api/v1/activities`, { timeout: 5000 });
      const activitiesData = JSON.parse(response.toString());
      
      if (!Array.isArray(activitiesData)) {
        throw new Error('Activities endpoint returned invalid data');
      }
      
      return {
        duration: Date.now() - start,
        details: `Activities endpoint working, ${activitiesData.length} activities`
      };
    } catch (error) {
      throw new Error(`Real-time features test failed: ${error.message}`);
    }
  }
};

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive E2E test execution...\n');
  
  // Run each test
  Object.entries(tests).forEach(([testName, testFunction]) => {
    runTest(testName, testFunction);
  });
  
  // Generate final report
  console.log('\n🏁 Test Execution Complete');
  console.log('===============================================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⏭️ Skipped: ${testResults.summary.skipped}`);
  
  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  // Save detailed results
  const resultsPath = path.join(__dirname, '../test-results/comprehensive-e2e-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
  
  // Generate HTML report
  generateHTMLReport(testResults);
  
  return testResults;
}

function generateHTMLReport(results) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Agent Feed E2E Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-item { margin: 10px 0; padding: 15px; border-radius: 6px; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .details { margin-top: 10px; font-size: 0.9em; color: #666; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Agent Feed E2E Test Results</h1>
            <p>Comprehensive integration testing for agents page and backend functionality</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${results.summary.total}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${results.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${results.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Pass Rate</h3>
                <div class="value">${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%</div>
            </div>
        </div>
        
        <h2>Test Details</h2>
        ${Object.entries(results.tests).map(([name, result]) => `
            <div class="test-item test-${result.status.toLowerCase()}">
                <h3>${result.status === 'PASSED' ? '✅' : '❌'} ${name}</h3>
                <div><strong>Status:</strong> ${result.status}</div>
                ${result.duration ? `<div><strong>Duration:</strong> ${result.duration}ms</div>` : ''}
                <div class="details">${result.details || result.error || ''}</div>
            </div>
        `).join('')}
        
        <div class="timestamp">
            Report generated at: ${results.timestamp}
        </div>
    </div>
</body>
</html>`;

  const reportPath = path.join(__dirname, '../test-results/comprehensive-e2e-report.html');
  fs.writeFileSync(reportPath, htmlContent);
  console.log(`📊 HTML report saved to: ${reportPath}`);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };