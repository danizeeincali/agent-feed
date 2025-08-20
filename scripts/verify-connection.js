#!/usr/bin/env node

/**
 * Connection Verification Script
 * Tests WebSocket connectivity without Redis dependency
 */

const { io } = require('socket.io-client');

console.log('🔍 Testing Enhanced AgentLink Connection...\n');

// Test backend health
async function testBackendHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    const health = await response.json();
    
    console.log('✅ Backend Health Check:');
    console.log(`   Status: ${health.status}`);
    console.log(`   API: ${health.services.api}`);
    console.log(`   Redis: ${health.services.redis}`);
    console.log(`   Uptime: ${Math.floor(health.uptime)}s\n`);
    
    return health.status === 'healthy';
  } catch (error) {
    console.log('❌ Backend Health Check Failed:', error.message);
    return false;
  }
}

// Test frontend accessibility
async function testFrontendAccess() {
  try {
    const response = await fetch('http://localhost:3001/');
    const isAccessible = response.status === 200;
    
    console.log(`${isAccessible ? '✅' : '❌'} Frontend Access: ${response.status}\n`);
    return isAccessible;
  } catch (error) {
    console.log('❌ Frontend Access Failed:', error.message);
    return false;
  }
}

// Test WebSocket connection
function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('🔌 Testing WebSocket Connection...');
    
    const socket = io('http://localhost:3000', {
      transports: ['polling', 'websocket'],
      timeout: 5000,
      forceNew: true,
      auth: {
        userId: 'test-user',
        username: 'Test User',
        token: 'test-token'
      }
    });

    const timeout = setTimeout(() => {
      console.log('⏰ WebSocket connection timeout');
      socket.disconnect();
      resolve(false);
    }, 10000);

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected:', socket.id);
      console.log('   Transport:', socket.io.engine.transport.name);
      clearTimeout(timeout);
      
      // Test basic emit/response
      socket.emit('test-message', { test: true });
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 1000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket Connection Error:', error.message);
      clearTimeout(timeout);
      socket.disconnect();
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket Disconnected:', reason);
    });
  });
}

// Main verification function
async function main() {
  console.log('Enhanced AgentLink Connection Verification\n');
  console.log('==========================================\n');
  
  const results = {
    backend: await testBackendHealth(),
    frontend: await testFrontendAccess(),
    websocket: await testWebSocketConnection()
  };
  
  console.log('\n📊 Final Results:');
  console.log('==================');
  console.log(`Backend Health: ${results.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Access: ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Connection: ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️  SOME ISSUES DETECTED'}`);
  
  if (allPassed) {
    console.log('\n🚀 Enhanced AgentLink is ready for use!');
    console.log('   Frontend: http://localhost:3001/');
    console.log('   Backend API: http://localhost:3000/');
  } else {
    console.log('\n🔧 Please check the failed components above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
main().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});