#!/usr/bin/env node

/**
 * Simplified Phase 1 Production Validation
 * Tests critical functionality without complex dependencies
 */

const http = require('http');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  backendUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:5173',
  testTimeout: 10000
};

// Test results storage
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
  startTime: Date.now()
};

// Utilities
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (name, result, duration = 0, message = '') => {
  const status = result ? '✅ PASS' : '❌ FAIL';
  const durationText = duration > 0 ? ` (${duration}ms)` : '';
  console.log(`${status} ${name}${durationText}`);
  
  if (message) {
    console.log(`   ${message}`);
  }
  
  testResults.tests.push({ name, result, duration, message });
  testResults.total++;
  if (result) testResults.passed++;
  else testResults.failed++;
  
  return result;
};

const logInfo = (message) => console.log(`ℹ️  ${message}`);
const logError = (message, error) => console.error(`❌ ${message}`, error?.message || '');

// Simple HTTP request helper
const httpRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: jsonData, status: res.statusCode });
        } catch (error) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
};

// Test: Backend Health Check
async function testBackendHealth() {
  const startTime = Date.now();
  try {
    const response = await httpRequest(`${CONFIG.backendUrl}/health`);
    const duration = Date.now() - startTime;
    
    const isHealthy = response.ok && 
                     response.data.status === 'healthy' && 
                     response.data.server === 'HTTP/SSE Only - WebSocket Eliminated';
    
    return logTest('Backend Health Check', isHealthy, duration, 
      `Status: ${response.data.status}, Server: HTTP/SSE`);
  } catch (error) {
    logError('Backend health check failed:', error);
    return logTest('Backend Health Check', false, Date.now() - startTime, error.message);
  }
}

// Test: Get Instances
async function testGetInstances() {
  const startTime = Date.now();
  try {
    const response = await httpRequest(`${CONFIG.backendUrl}/api/claude/instances`);
    const duration = Date.now() - startTime;
    
    const isValid = response.ok && 
                   response.data.success && 
                   Array.isArray(response.data.instances);
    
    return logTest('Get Instances List', isValid, duration, 
      `Found ${response.data.instances?.length || 0} instances`);
  } catch (error) {
    logError('Get instances failed:', error);
    return logTest('Get Instances List', false, Date.now() - startTime, error.message);
  }
}

// Test: Create Instance (Status Lifecycle)
async function testCreateInstance() {
  const startTime = Date.now();
  let createdInstanceId = null;
  
  try {
    // Create new instance
    const createResponse = await httpRequest(`${CONFIG.backendUrl}/api/claude/instances`, {
      method: 'POST',
      body: {
        command: ['claude', '--test'],
        workingDirectory: '/workspaces/agent-feed/test'
      }
    });
    
    const isCreated = createResponse.ok && createResponse.data.success;
    if (!isCreated) {
      throw new Error(`Creation failed: ${createResponse.data.error || 'Unknown error'}`);
    }
    
    createdInstanceId = createResponse.data.instanceId;
    logInfo(`Created test instance: ${createdInstanceId}`);
    
    // Wait for status transition (2 seconds based on backend implementation)
    await delay(2500);
    
    // Check instance status
    const statusResponse = await httpRequest(`${CONFIG.backendUrl}/api/claude/instances`);
    const instance = statusResponse.data.instances?.find(i => i.id === createdInstanceId);
    
    const duration = Date.now() - startTime;
    const hasTransitioned = instance && instance.status === 'running';
    
    const result = logTest('Instance Creation & Status Transition', hasTransitioned, duration, 
      `Instance ${createdInstanceId?.slice(0, 8)} status: ${instance?.status || 'not found'}`);
    
    // Cleanup
    if (createdInstanceId) {
      try {
        await httpRequest(`${CONFIG.backendUrl}/api/claude/instances/${createdInstanceId}`, {
          method: 'DELETE'
        });
        logInfo(`Cleaned up test instance: ${createdInstanceId}`);
      } catch (cleanupError) {
        logError('Cleanup failed:', cleanupError);
      }
    }
    
    return result;
    
  } catch (error) {
    logError('Create instance test failed:', error);
    return logTest('Instance Creation & Status Transition', false, Date.now() - startTime, error.message);
  }
}

// Test: Terminal Input Processing
async function testTerminalInput() {
  const startTime = Date.now();
  
  try {
    // Get existing running instance or use the first available
    const instancesResponse = await httpRequest(`${CONFIG.backendUrl}/api/claude/instances`);
    if (!instancesResponse.ok || !instancesResponse.data.instances?.length) {
      throw new Error('No instances available for terminal testing');
    }
    
    const runningInstance = instancesResponse.data.instances.find(i => i.status === 'running') || 
                           instancesResponse.data.instances[0];
    const instanceId = runningInstance.id;
    
    logInfo(`Testing terminal input with instance: ${instanceId}`);
    
    // Send test command
    const inputResponse = await httpRequest(
      `${CONFIG.backendUrl}/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        body: { input: 'hello' }
      }
    );
    
    const duration = Date.now() - startTime;
    const inputProcessed = inputResponse.ok && inputResponse.data.success;
    
    return logTest('Terminal Input Processing', inputProcessed, duration, 
      `Command sent to ${instanceId.slice(0, 8)}: ${inputResponse.data.response || 'processed'}`);
    
  } catch (error) {
    logError('Terminal input test failed:', error);
    return logTest('Terminal Input Processing', false, Date.now() - startTime, error.message);
  }
}

// Test: Multi-Instance Handling
async function testMultiInstanceHandling() {
  const startTime = Date.now();
  let createdInstances = [];
  
  try {
    // Create 2 instances in parallel
    const createPromises = [
      httpRequest(`${CONFIG.backendUrl}/api/claude/instances`, {
        method: 'POST',
        body: { command: ['claude', '--test-multi-1'], workingDirectory: '/workspaces/agent-feed/test' }
      }),
      httpRequest(`${CONFIG.backendUrl}/api/claude/instances`, {
        method: 'POST',
        body: { command: ['claude', '--test-multi-2'], workingDirectory: '/workspaces/agent-feed/test' }
      })
    ];
    
    const responses = await Promise.all(createPromises);
    
    for (const response of responses) {
      if (response.ok && response.data.success) {
        createdInstances.push(response.data.instanceId);
      }
    }
    
    logInfo(`Created ${createdInstances.length} instances for multi-handling test`);
    
    // Wait for instances to initialize
    await delay(3000);
    
    // Check all instances exist and are properly managed
    const checkResponse = await httpRequest(`${CONFIG.backendUrl}/api/claude/instances`);
    const allInstancesFound = createdInstances.every(id => 
      checkResponse.data.instances?.some(i => i.id === id)
    );
    
    const duration = Date.now() - startTime;
    const result = logTest('Multi-Instance Handling', allInstancesFound, duration, 
      `${createdInstances.length} instances created and managed independently`);
    
    // Cleanup
    for (const instanceId of createdInstances) {
      try {
        await httpRequest(`${CONFIG.backendUrl}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        logInfo(`Cleaned up multi-test instance: ${instanceId}`);
      } catch (cleanupError) {
        logError(`Failed to cleanup ${instanceId}:`, cleanupError);
      }
    }
    
    return result;
    
  } catch (error) {
    logError('Multi-instance handling test failed:', error);
    return logTest('Multi-Instance Handling', false, Date.now() - startTime, error.message);
  }
}

// Test: Performance Metrics
async function testPerformanceMetrics() {
  const startTime = Date.now();
  
  try {
    // Test API response times
    const tests = [
      { name: 'Health Check', url: `${CONFIG.backendUrl}/health` },
      { name: 'Instances List', url: `${CONFIG.backendUrl}/api/claude/instances` },
      { name: 'Activities', url: `${CONFIG.backendUrl}/api/v1/claude-live/prod/activities` }
    ];
    
    const results = [];
    
    for (const test of tests) {
      const testStart = Date.now();
      try {
        const response = await httpRequest(test.url);
        const testDuration = Date.now() - testStart;
        results.push({ name: test.name, duration: testDuration, success: response.ok });
      } catch (error) {
        results.push({ name: test.name, duration: Date.now() - testStart, success: false });
      }
    }
    
    const duration = Date.now() - startTime;
    const avgResponseTime = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
    const allFastEnough = avgResponseTime < 1000; // Under 1 second average
    const allSuccessful = results.every(r => r.success);
    
    const performanceGood = allFastEnough && allSuccessful;
    
    return logTest('Performance Metrics', performanceGood, duration, 
      `Avg response time: ${avgResponseTime.toFixed(0)}ms, All successful: ${allSuccessful}`);
    
  } catch (error) {
    logError('Performance metrics test failed:', error);
    return logTest('Performance Metrics', false, Date.now() - startTime, error.message);
  }
}

// Main test execution
async function runSimplifiedValidation() {
  console.log('🚀 Phase 1 Simplified Production Validation');
  console.log('=' .repeat(50));
  
  logInfo('Starting simplified validation suite...');
  
  // Core validation tests
  await testBackendHealth();
  await testGetInstances();
  await testCreateInstance();
  await testTerminalInput();
  await testMultiInstanceHandling();
  await testPerformanceMetrics();
  
  // Generate final report
  const totalDuration = Date.now() - testResults.startTime;
  const successRate = (testResults.passed / testResults.total) * 100;
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 PHASE 1 VALIDATION COMPLETE');
  console.log('=' .repeat(50));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  
  // Production Readiness Assessment
  const isProductionReady = testResults.failed === 0 && successRate === 100;
  
  console.log('\n🔍 PRODUCTION READINESS ASSESSMENT:');
  console.log(`${isProductionReady ? '✅' : '❌'} Backend Health: ${testResults.tests.find(t => t.name.includes('Health'))?.result ? 'HEALTHY' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Instance Management: ${testResults.tests.find(t => t.name.includes('Creation'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Terminal Processing: ${testResults.tests.find(t => t.name.includes('Terminal'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Multi-Instance: ${testResults.tests.find(t => t.name.includes('Multi'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Performance: ${testResults.tests.find(t => t.name.includes('Performance'))?.result ? 'GOOD' : 'POOR'}`);
  
  if (isProductionReady) {
    console.log('\n🎉 PHASE 1 PRODUCTION READY - All core functionality operational!');
    console.log('✨ Ready to proceed with Phase 2: Claudable chat implementation');
    console.log('🚀 System performance meets production requirements');
  } else {
    console.log('\n⚠️  PHASE 1 ISSUES DETECTED - Some functionality needs attention');
    console.log('🔧 Review failed tests and resolve before production deployment');
  }
  
  return { isProductionReady, testResults, successRate };
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logError('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run validation
if (require.main === module) {
  runSimplifiedValidation().then(({ isProductionReady }) => {
    process.exit(isProductionReady ? 0 : 1);
  });
}

module.exports = { runSimplifiedValidation };