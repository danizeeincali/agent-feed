#!/usr/bin/env node

/**
 * TDD API Validation Suite Runner
 * 
 * Executes comprehensive API endpoint validation to verify
 * frontend fixes have eliminated all 404 errors
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🚀 Starting TDD API Validation Suite...');
console.log(`📍 Backend URL: ${BACKEND_URL}`);
console.log(`📍 Frontend URL: ${FRONTEND_URL}`);

// Health check function
async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        console.log(`✅ Server at ${url} is ready`);
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} failed to start within ${timeout}ms`);
}

// Run Jest tests
function runJestTests(testFile, timeout = 60000) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Running tests: ${testFile}`);
    
    const jest = spawn('npx', ['jest', testFile, '--verbose', '--forceExit'], {
      stdio: 'inherit',
      cwd: '/workspaces/agent-feed',
      timeout
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Tests passed: ${testFile}`);
        resolve(code);
      } else {
        console.log(`❌ Tests failed: ${testFile} (exit code: ${code})`);
        resolve(code); // Don't reject, continue with other tests
      }
    });
    
    jest.on('error', (error) => {
      console.error(`🚨 Test execution error: ${error.message}`);
      reject(error);
    });
  });
}

// Manual API endpoint validation
async function validateCriticalEndpoints() {
  console.log('🔍 Validating critical API endpoints...');
  
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/agents', method: 'GET' },
    { path: '/api/agent-posts', method: 'GET' },
    { path: '/api/filter-data', method: 'GET' },
    { path: '/api/filter-stats', method: 'GET' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${BACKEND_URL}${endpoint.path}`);
      const responseTime = Date.now() - startTime;
      
      const result = {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        responseTime,
        success: response.status >= 200 && response.status < 400,
        is404: response.status === 404
      };
      
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${endpoint.path}: ${response.status} (${responseTime}ms)`);
      } else {
        console.log(`❌ ${endpoint.path}: ${response.status} (${responseTime}ms)`);
      }
      
    } catch (error) {
      console.log(`🚨 ${endpoint.path}: Error - ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Validate no v1 endpoints work (they should 404)
async function validateV1EndpointsReturn404() {
  console.log('🔍 Validating old v1 endpoints return 404...');
  
  const v1Endpoints = [
    '/api/v1/agent-posts',
    '/api/v1/agents',
    '/api/v1/activities'
  ];
  
  const results = [];
  
  for (const endpoint of v1Endpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`);
      
      const result = {
        endpoint,
        status: response.status,
        correctlyReturns404: response.status === 404
      };
      
      results.push(result);
      
      if (result.correctlyReturns404) {
        console.log(`✅ ${endpoint}: Correctly returns 404`);
      } else {
        console.log(`❌ ${endpoint}: Should return 404, got ${response.status}`);
      }
      
    } catch (error) {
      console.log(`🚨 ${endpoint}: Error - ${error.message}`);
      results.push({
        endpoint,
        error: error.message,
        correctlyReturns404: false
      });
    }
  }
  
  return results;
}

// Main validation function
async function runFullValidationSuite() {
  const suiteStartTime = Date.now();
  const overallResults = {
    timestamp: new Date().toISOString(),
    duration: 0,
    serverHealthChecks: {},
    endpointValidation: {},
    v1EndpointValidation: {},
    testResults: {},
    summary: {
      allTestsPassed: false,
      criticalEndpointsWorking: false,
      v1EndpointsCorrectly404: false,
      no404Errors: false
    },
    conclusions: []
  };
  
  try {
    // 1. Health checks
    console.log('\n📋 Step 1: Server Health Checks');
    try {
      await waitForServer(BACKEND_URL);
      overallResults.serverHealthChecks.backend = { status: 'healthy', url: BACKEND_URL };
    } catch (error) {
      overallResults.serverHealthChecks.backend = { status: 'unhealthy', error: error.message };
      throw error;
    }
    
    // 2. Critical endpoint validation
    console.log('\n📋 Step 2: Critical Endpoint Validation');
    const endpointResults = await validateCriticalEndpoints();
    overallResults.endpointValidation = {
      results: endpointResults,
      allSuccessful: endpointResults.every(r => r.success),
      any404Errors: endpointResults.some(r => r.is404)
    };
    
    // 3. V1 endpoint validation (should 404)
    console.log('\n📋 Step 3: V1 Endpoint Validation');
    const v1Results = await validateV1EndpointsReturn404();
    overallResults.v1EndpointValidation = {
      results: v1Results,
      allCorrectly404: v1Results.every(r => r.correctlyReturns404)
    };
    
    // 4. Run Jest tests
    console.log('\n📋 Step 4: Jest Test Suite');
    
    // API endpoint tests
    const apiTestResult = await runJestTests('tests/api-endpoint-validation.test.js');
    overallResults.testResults.apiEndpointTests = {
      exitCode: apiTestResult,
      passed: apiTestResult === 0
    };
    
    // Frontend component tests
    const componentTestResult = await runJestTests('tests/frontend-component-validation.test.js');
    overallResults.testResults.frontendComponentTests = {
      exitCode: componentTestResult,
      passed: componentTestResult === 0
    };
    
    // 5. Generate summary
    const duration = Date.now() - suiteStartTime;
    overallResults.duration = duration;
    
    overallResults.summary = {
      allTestsPassed: Object.values(overallResults.testResults).every(t => t.passed),
      criticalEndpointsWorking: overallResults.endpointValidation.allSuccessful,
      v1EndpointsCorrectly404: overallResults.v1EndpointValidation.allCorrectly404,
      no404Errors: !overallResults.endpointValidation.any404Errors
    };
    
    // Generate conclusions
    if (overallResults.summary.allTestsPassed) {
      overallResults.conclusions.push('✅ All tests passed - API endpoint fixes are working correctly');
    } else {
      overallResults.conclusions.push('❌ Some tests failed - API endpoint fixes need additional work');
    }
    
    if (overallResults.summary.no404Errors) {
      overallResults.conclusions.push('✅ No 404 errors found on critical endpoints');
    } else {
      overallResults.conclusions.push('❌ 404 errors still present on some endpoints');
    }
    
    if (overallResults.summary.v1EndpointsCorrectly404) {
      overallResults.conclusions.push('✅ Old v1 endpoints correctly return 404');
    } else {
      overallResults.conclusions.push('❌ Some v1 endpoints are not returning 404 as expected');
    }
    
  } catch (error) {
    console.error('🚨 Validation suite failed:', error.message);
    overallResults.error = error.message;
    overallResults.conclusions.push(`🚨 Validation suite failed: ${error.message}`);
  }
  
  // Save results
  const reportPath = '/workspaces/agent-feed/tests/tdd-api-validation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(overallResults, null, 2));
  
  // Display final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TDD API VALIDATION SUITE RESULTS');
  console.log('='.repeat(80));
  console.log(`⏱️  Duration: ${(overallResults.duration / 1000).toFixed(2)}s`);
  console.log(`📊 Critical Endpoints Working: ${overallResults.summary.criticalEndpointsWorking ? '✅' : '❌'}`);
  console.log(`🚫 No 404 Errors: ${overallResults.summary.no404Errors ? '✅' : '❌'}`);
  console.log(`📝 V1 Endpoints Correctly 404: ${overallResults.summary.v1EndpointsCorrectly404 ? '✅' : '❌'}`);
  console.log(`🧪 All Tests Passed: ${overallResults.summary.allTestsPassed ? '✅' : '❌'}`);
  console.log('\n📋 CONCLUSIONS:');
  overallResults.conclusions.forEach(conclusion => console.log(`   ${conclusion}`));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  console.log('='.repeat(80));
  
  return overallResults;
}

// Run if called directly
if (require.main === module) {
  runFullValidationSuite()
    .then(results => {
      const success = results.summary?.allTestsPassed && 
                     results.summary?.criticalEndpointsWorking && 
                     results.summary?.no404Errors;
      
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error running validation suite:', error);
      process.exit(1);
    });
}

module.exports = {
  runFullValidationSuite,
  validateCriticalEndpoints,
  validateV1EndpointsReturn404,
  waitForServer
};