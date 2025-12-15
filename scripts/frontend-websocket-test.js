#!/usr/bin/env node

/**
 * Frontend WebSocket Test Script
 * Simulates exactly what the frontend should be doing
 */

const { io } = require('socket.io-client');

// Test both direct connection and through proxy
const TESTS = [
  {
    name: 'Direct Backend Connection (like CLI test)',
    url: 'http://localhost:3001',
    expected: 'Should work (confirmed by CLI test)'
  },
  {
    name: 'Frontend Proxy Connection (what browser uses)',
    url: 'http://localhost:3000', // Vite dev server with proxy
    expected: 'Should proxy to backend'
  }
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`\n🔌 Testing: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Expected: ${config.expected}`);
    
    const startTime = Date.now();
    let resolved = false;
    const results = {
      success: false,
      socketId: null,
      transport: null,
      events: [],
      errors: [],
      duration: 0
    };

    const socket = io(config.url, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: false, // Don't reconnect for test
      forceNew: true
    });

    const finish = (success = false) => {
      if (resolved) return;
      resolved = true;
      results.duration = Date.now() - startTime;
      results.success = success;
      socket.disconnect();
      resolve(results);
    };

    socket.on('connect', () => {
      console.log(`   ✅ Connected! Socket ID: ${socket.id}, Transport: ${socket.io.engine.transport.name}`);
      results.socketId = socket.id;
      results.transport = socket.io.engine.transport.name;
      results.events.push('connect');
      
      // Test ping
      socket.emit('ping');
      
      // Success after short delay to receive pong
      setTimeout(() => finish(true), 2000);
    });

    socket.on('connect_error', (error) => {
      console.log(`   ❌ Connection failed: ${error.message}`);
      results.errors.push(error.message);
      finish(false);
    });

    socket.on('pong', (data) => {
      console.log(`   📡 Pong received: ${JSON.stringify(data)}`);
      results.events.push('pong');
    });

    socket.on('error', (error) => {
      console.log(`   ⚠️  Socket error: ${error}`);
      results.errors.push(error);
    });

    // Timeout
    setTimeout(() => {
      if (!resolved) {
        console.log(`   ⏱️  Test timed out after 10 seconds`);
        finish(false);
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('🚀 Frontend WebSocket Connection Tests');
  console.log('=====================================');
  
  const results = [];
  
  for (const testConfig of TESTS) {
    const result = await testConnection(testConfig);
    results.push({ ...testConfig, ...result });
  }
  
  // Summary
  console.log('\n🎯 TEST RESULTS SUMMARY');
  console.log('=======================');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.name}: ${status} (${result.duration}ms)`);
    
    if (result.success) {
      console.log(`   - Socket ID: ${result.socketId}`);
      console.log(`   - Transport: ${result.transport}`);
      console.log(`   - Events: ${result.events.join(', ')}`);
    } else {
      console.log(`   - Errors: ${result.errors.join(', ')}`);
    }
  });
  
  // Diagnosis
  console.log('\n🔍 DIAGNOSIS');
  console.log('============');
  
  const directSuccess = results[0].success;
  const proxySuccess = results[1].success;
  
  if (directSuccess && proxySuccess) {
    console.log('✅ All connections working - frontend issue is likely in React component state management');
    console.log('   - Check WebSocketSingletonProvider initialization');
    console.log('   - Verify useWebSocketSingleton hook is being called');
    console.log('   - Check if connection state is properly propagated to UI');
  } else if (directSuccess && !proxySuccess) {
    console.log('⚠️  Direct connection works but proxy fails');
    console.log('   - Check Vite proxy configuration in vite.config.ts');
    console.log('   - Verify frontend is using correct WebSocket URL');
    console.log('   - Check if VITE_WEBSOCKET_URL environment variable is correct');
  } else if (!directSuccess && !proxySuccess) {
    console.log('❌ Both connections failed - backend WebSocket server issue');
    console.log('   - Check if WEBSOCKET_ENABLED=true in backend .env');
    console.log('   - Verify backend server is listening on port 3001');
    console.log('   - Check backend logs for WebSocket initialization errors');
  } else {
    console.log('🤔 Unexpected result - proxy works but direct connection fails');
  }
  
  console.log('\n📋 NEXT STEPS');
  console.log('==============');
  
  if (directSuccess && proxySuccess) {
    console.log('1. Check browser developer tools for WebSocket connection attempts');
    console.log('2. Add console.log statements to WebSocketSingletonProvider');
    console.log('3. Verify the connection status is properly updated in React state');
    console.log('4. Check if any error boundaries are interfering');
  }
}

// Run tests
runTests().catch(console.error);