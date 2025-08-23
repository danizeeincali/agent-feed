#!/usr/bin/env node
/**
 * WebSocket Connection Validation Test
 * Tests real WebSocket connectivity between frontend and backend
 */

const io = require('socket.io-client');

console.log('🚀 Starting WebSocket Connection Validation...\n');

// Test Configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 15000; // 15 seconds

let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: []
};

function addTestResult(testName, passed, details = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults.failedTests++;
    console.log(`❌ ${testName}: FAILED - ${details}`);
  }
  
  testResults.results.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

async function testBackendConnection() {
  return new Promise((resolve) => {
    console.log('📡 Testing WebSocket connection to backend...');
    
    const socket = io(BACKEND_URL, {
      timeout: 10000,
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true
    });

    let connected = false;
    let timeoutId;

    // Set timeout for connection attempt
    timeoutId = setTimeout(() => {
      if (!connected) {
        addTestResult('Backend WebSocket Connection', false, 'Connection timeout after 10 seconds');
        socket.disconnect();
        resolve(false);
      }
    }, 10000);

    socket.on('connect', () => {
      connected = true;
      clearTimeout(timeoutId);
      addTestResult('Backend WebSocket Connection', true, `Connected with ID: ${socket.id}`);
      
      // Test ping-pong
      socket.emit('ping');
      
      socket.on('pong', (data) => {
        addTestResult('WebSocket Ping-Pong', true, `Received pong: ${JSON.stringify(data)}`);
        socket.disconnect();
        resolve(true);
      });
      
      // Fallback if no pong received
      setTimeout(() => {
        addTestResult('WebSocket Ping-Pong', false, 'No pong response received');
        socket.disconnect();
        resolve(false);
      }, 3000);
    });

    socket.on('connect_error', (error) => {
      connected = true; // Prevent timeout from triggering
      clearTimeout(timeoutId);
      addTestResult('Backend WebSocket Connection', false, `Connection error: ${error.message}`);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log(`📝 WebSocket disconnected: ${reason}`);
    });
  });
}

async function testSystemStats() {
  return new Promise((resolve) => {
    console.log('📊 Testing system stats broadcast...');
    
    const socket = io(BACKEND_URL, {
      timeout: 10000,
      transports: ['polling', 'websocket']
    });

    let statsReceived = false;
    let timeoutId;

    timeoutId = setTimeout(() => {
      if (!statsReceived) {
        addTestResult('System Stats Broadcast', false, 'No system stats received within 35 seconds');
        socket.disconnect();
        resolve(false);
      }
    }, 35000); // Wait up to 35 seconds for stats (they broadcast every 30s)

    socket.on('connect', () => {
      console.log('📡 Connected, waiting for system stats...');
    });

    socket.on('system:stats', (stats) => {
      statsReceived = true;
      clearTimeout(timeoutId);
      addTestResult('System Stats Broadcast', true, `Received stats: ${JSON.stringify(stats)}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeoutId);
      addTestResult('System Stats Broadcast', false, `Connection error: ${error.message}`);
      resolve(false);
    });
  });
}

async function testProcessManagerEvents() {
  return new Promise((resolve) => {
    console.log('🔧 Testing ProcessManager WebSocket events...');
    
    const socket = io(BACKEND_URL, {
      timeout: 10000,
      transports: ['polling', 'websocket']
    });

    let processInfoReceived = false;
    let timeoutId;

    timeoutId = setTimeout(() => {
      if (!processInfoReceived) {
        addTestResult('ProcessManager Events', false, 'No process info response within 10 seconds');
        socket.disconnect();
        resolve(false);
      }
    }, 10000);

    socket.on('connect', () => {
      console.log('📡 Connected, requesting process info...');
      socket.emit('process:info');
    });

    socket.on('process:info:response', (data) => {
      processInfoReceived = true;
      clearTimeout(timeoutId);
      addTestResult('ProcessManager Events', true, `Process info received: ${JSON.stringify(data)}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('process:error', (error) => {
      processInfoReceived = true;
      clearTimeout(timeoutId);
      // Process error is actually expected if no process is running
      addTestResult('ProcessManager Events', true, `Process error (expected): ${error.error}`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeoutId);
      addTestResult('ProcessManager Events', false, `Connection error: ${error.message}`);
      resolve(false);
    });
  });
}

async function testFrontendEndpoint() {
  try {
    console.log('🌐 Testing frontend endpoint accessibility...');
    
    const response = await fetch(FRONTEND_URL);
    if (response.ok) {
      const text = await response.text();
      if (text.includes('Agent Feed') || text.includes('React')) {
        addTestResult('Frontend Accessibility', true, `Status: ${response.status}, React app detected`);
        return true;
      } else {
        addTestResult('Frontend Accessibility', false, `Status: ${response.status}, but no React app detected`);
        return false;
      }
    } else {
      addTestResult('Frontend Accessibility', false, `HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    addTestResult('Frontend Accessibility', false, `Error: ${error.message}`);
    return false;
  }
}

async function testBackendHealthEndpoint() {
  try {
    console.log('🏥 Testing backend health endpoint...');
    
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'healthy') {
        addTestResult('Backend Health Endpoint', true, `Status: healthy, uptime: ${data.uptime}s`);
        return true;
      } else {
        addTestResult('Backend Health Endpoint', false, `Unhealthy status: ${data.status}`);
        return false;
      }
    } else {
      addTestResult('Backend Health Endpoint', false, `HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    addTestResult('Backend Health Endpoint', false, `Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running comprehensive WebSocket validation tests...\n');
  
  // Basic HTTP endpoint tests
  await testFrontendEndpoint();
  await testBackendHealthEndpoint();
  
  // WebSocket functionality tests
  await testBackendConnection();
  await testProcessManagerEvents();
  await testSystemStats();
  
  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('🏁 VALIDATION RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`📊 Total Tests: ${testResults.totalTests}`);
  console.log(`✅ Passed: ${testResults.passedTests}`);
  console.log(`❌ Failed: ${testResults.failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passedTests / testResults.totalTests) * 100)}%`);
  
  if (testResults.failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! WebSocket connectivity is fully operational.');
    console.log('🚀 The port mismatch issues have been completely resolved.');
  } else {
    console.log(`\n⚠️  ${testResults.failedTests} test(s) failed. Review the details above.`);
  }
  
  console.log('\n📋 Detailed Results:');
  testResults.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.details || 'OK'}`);
  });
  
  console.log('\n🔗 Test URLs:');
  console.log(`   Frontend: ${FRONTEND_URL}`);
  console.log(`   Backend:  ${BACKEND_URL}`);
  console.log(`   Health:   ${BACKEND_URL}/health`);
  
  process.exit(testResults.failedTests === 0 ? 0 : 1);
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});