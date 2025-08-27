#!/usr/bin/env node

/**
 * Comprehensive Phase 1 End-to-End Production Validation
 * Tests all critical user workflows for production readiness
 */

const http = require('http');
const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Configuration
const CONFIG = {
  backendUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:5173',
  maxTestTimeout: 30000,
  instanceStatusTimeout: 5000,
  terminalResponseTimeout: 2000
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

const logTest = (name, result, details = {}) => {
  const status = result ? '✅ PASS' : '❌ FAIL';
  const duration = details.duration ? ` (${details.duration}ms)` : '';
  console.log(`${status} ${name}${duration}`);
  
  testResults.tests.push({
    name,
    result,
    duration: details.duration,
    details: details.message || '',
    timestamp: new Date().toISOString()
  });
  
  testResults.total++;
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  return result;
};

const logInfo = (message) => {
  console.log(`ℹ️  ${message}`);
};

const logError = (message, error) => {
  console.error(`❌ ${message}`, error?.message || error || '');
};

// Test: Backend Health Check
async function testBackendHealth() {
  const startTime = Date.now();
  try {
    const response = await fetch(`${CONFIG.backendUrl}/health`);
    const data = await response.json();
    
    const duration = Date.now() - startTime;
    const isHealthy = response.ok && 
                     data.status === 'healthy' && 
                     data.server === 'HTTP/SSE Only - WebSocket Eliminated';
    
    return logTest('Backend Health Check', isHealthy, { 
      duration, 
      message: `Status: ${data.status}, Server: ${data.server}` 
    });
  } catch (error) {
    logError('Backend health check failed:', error);
    return logTest('Backend Health Check', false, { 
      duration: Date.now() - startTime,
      message: error.message 
    });
  }
}

// Test: Get Initial Instances
async function testGetInstances() {
  const startTime = Date.now();
  try {
    const response = await fetch(`${CONFIG.backendUrl}/api/claude/instances`);
    const data = await response.json();
    
    const duration = Date.now() - startTime;
    const isValid = response.ok && 
                   data.success && 
                   Array.isArray(data.instances);
    
    logInfo(`Found ${data.instances?.length || 0} existing instances`);
    
    return logTest('Get Instances List', isValid, { 
      duration,
      message: `Found ${data.instances?.length || 0} instances` 
    });
  } catch (error) {
    logError('Get instances failed:', error);
    return logTest('Get Instances List', false, { 
      duration: Date.now() - startTime,
      message: error.message 
    });
  }
}

// Test: Instance Status Lifecycle (Core Test 1)
async function testInstanceStatusLifecycle() {
  const startTime = Date.now();
  let sseConnection = null;
  let instanceId = null;
  let statusChanges = [];
  
  try {
    // Set up SSE connection to monitor status changes
    return await new Promise((resolve, reject) => {
      let resolveTimeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, CONFIG.instanceStatusTimeout);
      
      // Create SSE connection for status monitoring
      sseConnection = new EventSource(`${CONFIG.backendUrl}/api/status/stream`);
      
      sseConnection.onopen = async () => {
        logInfo('SSE status monitoring connected');
        
        // Create new instance
        try {
          const createResponse = await fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: ['claude', '--test'],
              workingDirectory: '/workspaces/agent-feed/test'
            })
          });
          
          const createData = await createResponse.json();
          if (!createData.success) {
            throw new Error(`Instance creation failed: ${createData.error || 'Unknown error'}`);
          }
          
          instanceId = createData.instanceId;
          logInfo(`Created test instance: ${instanceId}`);
          
          // Instance should start with "starting" status
          statusChanges.push({ status: 'starting', timestamp: Date.now() });
          
        } catch (error) {
          clearTimeout(resolveTimeout);
          reject(error);
        }
      };
      
      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'instance:status' && data.instanceId === instanceId) {
            logInfo(`Status update received: ${data.status} for ${data.instanceId}`);
            statusChanges.push({ 
              status: data.status, 
              timestamp: Date.now(),
              details: data
            });
            
            // Complete test when instance reaches "running" status
            if (data.status === 'running') {
              clearTimeout(resolveTimeout);
              
              const duration = Date.now() - startTime;
              const hasCorrectTransition = statusChanges.length >= 1 && 
                                          statusChanges.some(s => s.status === 'starting') &&
                                          statusChanges.some(s => s.status === 'running');
              
              if (sseConnection) {
                sseConnection.close();
              }
              
              resolve(logTest('Instance Status Lifecycle (starting → running)', hasCorrectTransition, {
                duration,
                message: `Transitions: ${statusChanges.map(s => s.status).join(' → ')}`
              }));
            }
          }
        } catch (parseError) {
          logError('SSE message parsing error:', parseError);
        }
      };
      
      sseConnection.onerror = (error) => {
        clearTimeout(resolveTimeout);
        if (sseConnection) {
          sseConnection.close();
        }
        reject(new Error(`SSE connection error: ${error.message || 'Connection failed'}`));
      };
    });
    
  } catch (error) {
    logError('Instance status lifecycle test failed:', error);
    return logTest('Instance Status Lifecycle (starting → running)', false, {
      duration: Date.now() - startTime,
      message: error.message
    });
  } finally {
    // Cleanup: remove test instance
    if (instanceId) {
      try {
        await fetch(`${CONFIG.backendUrl}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        logInfo(`Cleaned up test instance: ${instanceId}`);
      } catch (cleanupError) {
        logError('Cleanup failed:', cleanupError);
      }
    }
    if (sseConnection) {
      sseConnection.close();
    }
  }
}

// Test: Terminal Command Processing (Core Test 2)
async function testTerminalCommandProcessing() {
  const startTime = Date.now();
  let sseConnection = null;
  let instanceId = null;
  let terminalOutputs = [];
  
  try {
    return await new Promise(async (resolve, reject) => {
      let resolveTimeout = setTimeout(() => {
        reject(new Error('Terminal test timeout'));
      }, CONFIG.terminalResponseTimeout * 3);
      
      // Use existing running instance or create one
      const instancesResponse = await fetch(`${CONFIG.backendUrl}/api/claude/instances`);
      const instancesData = await instancesResponse.json();
      
      let runningInstance = instancesData.instances?.find(i => i.status === 'running');
      
      if (!runningInstance) {
        // Create a new instance if none are running
        const createResponse = await fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: ['claude', '--test-terminal'],
            workingDirectory: '/workspaces/agent-feed/test'
          })
        });
        
        const createData = await createResponse.json();
        if (!createData.success) {
          throw new Error('Failed to create test instance for terminal testing');
        }
        
        instanceId = createData.instanceId;
        // Wait for instance to be running
        await delay(2000);
      } else {
        instanceId = runningInstance.id;
      }
      
      logInfo(`Testing terminal with instance: ${instanceId}`);
      
      // Connect to terminal SSE stream
      sseConnection = new EventSource(
        `${CONFIG.backendUrl}/api/claude/instances/${instanceId}/terminal/stream`
      );
      
      sseConnection.onopen = async () => {
        logInfo('Terminal SSE connected, sending test commands');
        
        // Wait a bit for connection to stabilize
        await delay(500);
        
        // Test command 1: "hello"
        const response1 = await fetch(
          `${CONFIG.backendUrl}/api/claude/instances/${instanceId}/terminal/input`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: 'hello' })
          }
        );
        
        if (!response1.ok) {
          throw new Error('Failed to send hello command');
        }
        
        // Test command 2: "help" (after short delay)
        setTimeout(async () => {
          try {
            const response2 = await fetch(
              `${CONFIG.backendUrl}/api/claude/instances/${instanceId}/terminal/input`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: 'help' })
              }
            );
            
            if (!response2.ok) {
              throw new Error('Failed to send help command');
            }
          } catch (error) {
            clearTimeout(resolveTimeout);
            reject(error);
          }
        }, 1000);
      };
      
      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'terminal:echo' || data.type === 'terminal:output') {
            logInfo(`Terminal output: ${data.data?.substring(0, 50) || 'no data'}...`);
            terminalOutputs.push({
              type: data.type,
              data: data.data,
              timestamp: Date.now()
            });
            
            // Check if we have both echo and response
            const hasEcho = terminalOutputs.some(o => o.type === 'terminal:echo');
            const hasResponse = terminalOutputs.some(o => o.type === 'terminal:output' && 
                                                     o.data && 
                                                     o.data.includes('Hello'));
            
            if (hasEcho && hasResponse && terminalOutputs.length >= 4) {
              clearTimeout(resolveTimeout);
              
              const duration = Date.now() - startTime;
              
              if (sseConnection) {
                sseConnection.close();
              }
              
              resolve(logTest('Terminal Command Processing (echo + response)', true, {
                duration,
                message: `Received ${terminalOutputs.length} terminal outputs with echo and responses`
              }));
            }
          }
        } catch (parseError) {
          logError('Terminal SSE parsing error:', parseError);
        }
      };
      
      sseConnection.onerror = (error) => {
        clearTimeout(resolveTimeout);
        if (sseConnection) {
          sseConnection.close();
        }
        reject(new Error(`Terminal SSE error: ${error.message || 'Connection failed'}`));
      };
    });
    
  } catch (error) {
    logError('Terminal command processing test failed:', error);
    return logTest('Terminal Command Processing (echo + response)', false, {
      duration: Date.now() - startTime,
      message: error.message
    });
  } finally {
    if (sseConnection) {
      sseConnection.close();
    }
    
    // Don't cleanup if we used an existing instance
    if (instanceId) {
      const instancesResponse = await fetch(`${CONFIG.backendUrl}/api/claude/instances`);
      const instancesData = await instancesResponse.json();
      const wasCreatedForTest = !instancesData.instances?.some(i => 
        i.id === instanceId && i.status === 'running'
      );
      
      if (wasCreatedForTest) {
        try {
          await fetch(`${CONFIG.backendUrl}/api/claude/instances/${instanceId}`, {
            method: 'DELETE'
          });
          logInfo(`Cleaned up terminal test instance: ${instanceId}`);
        } catch (cleanupError) {
          logError('Terminal test cleanup failed:', cleanupError);
        }
      }
    }
  }
}

// Test: Multi-Instance Status Management (Core Test 3)
async function testMultiInstanceManagement() {
  const startTime = Date.now();
  let createdInstances = [];
  let sseConnection = null;
  let statusUpdates = new Map();
  
  try {
    return await new Promise(async (resolve, reject) => {
      let resolveTimeout = setTimeout(() => {
        reject(new Error('Multi-instance test timeout'));
      }, CONFIG.maxTestTimeout);
      
      // Set up status monitoring
      sseConnection = new EventSource(`${CONFIG.backendUrl}/api/status/stream`);
      
      sseConnection.onopen = async () => {
        logInfo('Multi-instance status monitoring active');
        
        try {
          // Create 3 test instances rapidly
          const createPromises = [
            fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command: ['claude', '--test-multi-1'],
                workingDirectory: '/workspaces/agent-feed/test'
              })
            }),
            fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command: ['claude', '--test-multi-2'],
                workingDirectory: '/workspaces/agent-feed/test'
              })
            }),
            fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command: ['claude', '--test-multi-3'],
                workingDirectory: '/workspaces/agent-feed/test'
              })
            })
          ];
          
          const responses = await Promise.all(createPromises);
          
          for (const response of responses) {
            const data = await response.json();
            if (data.success) {
              createdInstances.push(data.instanceId);
              statusUpdates.set(data.instanceId, []);
            }
          }
          
          logInfo(`Created ${createdInstances.length} test instances for multi-management test`);
          
        } catch (error) {
          clearTimeout(resolveTimeout);
          reject(error);
        }
      };
      
      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'instance:status' && createdInstances.includes(data.instanceId)) {
            logInfo(`Multi-instance status: ${data.instanceId.slice(0, 8)} → ${data.status}`);
            
            if (!statusUpdates.has(data.instanceId)) {
              statusUpdates.set(data.instanceId, []);
            }
            
            statusUpdates.get(data.instanceId).push({
              status: data.status,
              timestamp: Date.now()
            });
            
            // Check if all instances have transitioned to running
            const allRunning = createdInstances.every(id => {
              const updates = statusUpdates.get(id) || [];
              return updates.some(u => u.status === 'running');
            });
            
            if (allRunning && createdInstances.length >= 3) {
              clearTimeout(resolveTimeout);
              
              const duration = Date.now() - startTime;
              
              if (sseConnection) {
                sseConnection.close();
              }
              
              resolve(logTest('Multi-Instance Status Management', true, {
                duration,
                message: `${createdInstances.length} instances all reached running status independently`
              }));
            }
          }
        } catch (parseError) {
          logError('Multi-instance SSE parsing error:', parseError);
        }
      };
      
      sseConnection.onerror = (error) => {
        clearTimeout(resolveTimeout);
        if (sseConnection) {
          sseConnection.close();
        }
        reject(new Error(`Multi-instance SSE error: ${error.message || 'Connection failed'}`));
      };
    });
    
  } catch (error) {
    logError('Multi-instance management test failed:', error);
    return logTest('Multi-Instance Status Management', false, {
      duration: Date.now() - startTime,
      message: error.message
    });
  } finally {
    if (sseConnection) {
      sseConnection.close();
    }
    
    // Cleanup all created instances
    for (const instanceId of createdInstances) {
      try {
        await fetch(`${CONFIG.backendUrl}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        logInfo(`Cleaned up multi-test instance: ${instanceId}`);
      } catch (cleanupError) {
        logError(`Failed to cleanup instance ${instanceId}:`, cleanupError);
      }
    }
  }
}

// Test: Performance Benchmarks
async function testPerformanceBenchmarks() {
  const startTime = Date.now();
  
  try {
    // Test instance creation time
    const creationStart = Date.now();
    const createResponse = await fetch(`${CONFIG.backendUrl}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--benchmark'],
        workingDirectory: '/workspaces/agent-feed/test'
      })
    });
    
    const createData = await createResponse.json();
    const creationTime = Date.now() - creationStart;
    
    if (!createData.success) {
      throw new Error('Performance benchmark instance creation failed');
    }
    
    const instanceId = createData.instanceId;
    
    // Wait for status transition and measure time
    const statusStart = Date.now();
    let statusTransitionTime = null;
    
    return await new Promise((resolve, reject) => {
      let resolveTimeout = setTimeout(() => {
        reject(new Error('Performance benchmark timeout'));
      }, 10000);
      
      const sseConnection = new EventSource(`${CONFIG.backendUrl}/api/status/stream`);
      
      sseConnection.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'instance:status' && 
              data.instanceId === instanceId && 
              data.status === 'running') {
            
            statusTransitionTime = Date.now() - statusStart;
            
            // Test terminal response time
            const terminalStart = Date.now();
            const terminalResponse = await fetch(
              `${CONFIG.backendUrl}/api/claude/instances/${instanceId}/terminal/input`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: 'echo performance-test' })
              }
            );
            
            const terminalTime = Date.now() - terminalStart;
            
            clearTimeout(resolveTimeout);
            sseConnection.close();
            
            // Cleanup
            try {
              await fetch(`${CONFIG.backendUrl}/api/claude/instances/${instanceId}`, {
                method: 'DELETE'
              });
            } catch (cleanupError) {
              logError('Performance test cleanup failed:', cleanupError);
            }
            
            const duration = Date.now() - startTime;
            const allBenchmarksPassed = creationTime < 3000 && 
                                       statusTransitionTime < 5000 && 
                                       terminalTime < 1000;
            
            resolve(logTest('Performance Benchmarks', allBenchmarksPassed, {
              duration,
              message: `Creation: ${creationTime}ms, Status: ${statusTransitionTime}ms, Terminal: ${terminalTime}ms`
            }));
          }
        } catch (parseError) {
          logError('Performance benchmark parsing error:', parseError);
        }
      };
      
      sseConnection.onerror = (error) => {
        clearTimeout(resolveTimeout);
        sseConnection.close();
        reject(new Error(`Performance benchmark SSE error: ${error.message}`));
      };
    });
    
  } catch (error) {
    logError('Performance benchmarks test failed:', error);
    return logTest('Performance Benchmarks', false, {
      duration: Date.now() - startTime,
      message: error.message
    });
  }
}

// Main test execution
async function runComprehensiveValidation() {
  console.log('🚀 Phase 1 Comprehensive End-to-End Production Validation');
  console.log('=' .repeat(60));
  
  logInfo('Starting comprehensive validation suite...');
  
  // Core validation tests
  await testBackendHealth();
  await testGetInstances();
  
  // Phase 1 critical tests
  await testInstanceStatusLifecycle();
  await testTerminalCommandProcessing();
  await testMultiInstanceManagement();
  
  // Performance validation
  await testPerformanceBenchmarks();
  
  // Generate final report
  const totalDuration = Date.now() - testResults.startTime;
  const successRate = (testResults.passed / testResults.total) * 100;
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 PHASE 1 VALIDATION COMPLETE');
  console.log('=' .repeat(60));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  
  // Phase 1 Production Readiness Assessment
  const isProductionReady = testResults.failed === 0 && successRate === 100;
  
  console.log('\n🔍 PRODUCTION READINESS ASSESSMENT:');
  console.log(`${isProductionReady ? '✅' : '❌'} Instance Status Updates: ${testResults.tests.find(t => t.name.includes('Status Lifecycle'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Terminal Command Processing: ${testResults.tests.find(t => t.name.includes('Terminal Command'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Multi-Instance Management: ${testResults.tests.find(t => t.name.includes('Multi-Instance'))?.result ? 'WORKING' : 'FAILED'}`);
  console.log(`${isProductionReady ? '✅' : '❌'} Performance Benchmarks: ${testResults.tests.find(t => t.name.includes('Performance'))?.result ? 'PASSED' : 'FAILED'}`);
  
  if (isProductionReady) {
    console.log('\n🎉 PHASE 1 PRODUCTION READY - All systems operational!');
    console.log('Ready to proceed with Phase 2: Claudable chat implementation');
  } else {
    console.log('\n⚠️  PHASE 1 NOT READY - Issues detected requiring attention');
    console.log('Failed tests must be resolved before production deployment');
  }
  
  // Exit with appropriate code
  process.exit(isProductionReady ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logError('Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError('Uncaught exception:', error);
  process.exit(1);
});

// Run the validation
if (require.main === module) {
  runComprehensiveValidation();
}

module.exports = { runComprehensiveValidation };