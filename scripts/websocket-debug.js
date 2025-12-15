#!/usr/bin/env node

/**
 * WebSocket Connection Debug Script
 * Tests WebSocket connectivity between frontend and backend
 */

const { io } = require('socket.io-client');

const BACKEND_URL = 'http://localhost:3001';
const TEST_DURATION = 10000; // 10 seconds

console.log('🔌 WebSocket Connection Debug Tool');
console.log('==================================');
console.log(`Testing connection to: ${BACKEND_URL}`);

// Test basic HTTP connectivity first
async function testHTTPConnectivity() {
  console.log('\n1. Testing HTTP connectivity...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    console.log('✅ HTTP connection successful');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ HTTP connection failed:', error.message);
    return false;
  }
}

// Test WebSocket connectivity
function testWebSocketConnectivity() {
  return new Promise((resolve) => {
    console.log('\n2. Testing WebSocket connectivity...');
    
    let resolved = false;
    const results = {
      connected: false,
      authenticated: false,
      events: [],
      errors: []
    };

    const socket = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('   Socket ID:', socket.id);
      console.log('   Transport:', socket.io.engine.transport.name);
      
      results.connected = true;
      results.events.push({ event: 'connect', timestamp: new Date(), socketId: socket.id });
      
      // Test registering as frontend client
      socket.emit('registerFrontend', {
        timestamp: new Date().toISOString(),
        userAgent: 'debug-script',
        url: 'debug-tool'
      });
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      results.errors.push({ event: 'connect_error', error: error.message, timestamp: new Date() });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      results.events.push({ event: 'disconnect', reason, timestamp: new Date() });
    });

    // Test ping/pong
    socket.on('pong', (data) => {
      console.log('📡 Pong received:', data);
      results.events.push({ event: 'pong', data, timestamp: new Date() });
    });

    // Test system stats
    socket.on('system:stats', (stats) => {
      console.log('📊 System stats received:', stats);
      results.events.push({ event: 'system:stats', data: stats, timestamp: new Date() });
    });

    // Generic event listener
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Event received: ${eventName}`, args);
      results.events.push({ event: eventName, data: args, timestamp: new Date() });
    });

    // Send test ping after connection
    setTimeout(() => {
      if (socket.connected) {
        console.log('📡 Sending test ping...');
        socket.emit('ping');
      }
    }, 2000);

    // Resolve after test duration
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.disconnect();
        resolve(results);
      }
    }, TEST_DURATION);
  });
}

// Test frontend environment variables
function testEnvironmentConfig() {
  console.log('\n3. Checking environment configuration...');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(__dirname, '../frontend/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ Frontend .env found:');
      console.log(envContent);
    } else {
      console.log('⚠️  Frontend .env not found');
    }
  } catch (error) {
    console.log('❌ Error reading .env:', error.message);
  }
}

// Main test function
async function runDiagnostics() {
  console.log(`\nRunning diagnostics for ${TEST_DURATION}ms...\n`);

  // Test HTTP connectivity
  const httpSuccess = await testHTTPConnectivity();
  if (!httpSuccess) {
    console.log('\n❌ HTTP connectivity failed - aborting WebSocket test');
    return;
  }

  // Test environment config
  testEnvironmentConfig();

  // Test WebSocket connectivity
  const wsResults = await testWebSocketConnectivity();

  // Summary
  console.log('\n🎯 DIAGNOSTIC SUMMARY');
  console.log('====================');
  console.log('WebSocket Connected:', wsResults.connected ? '✅' : '❌');
  console.log('Total Events Received:', wsResults.events.length);
  console.log('Total Errors:', wsResults.errors.length);
  
  if (wsResults.events.length > 0) {
    console.log('\nEvents:');
    wsResults.events.forEach(event => {
      console.log(`  - ${event.event} at ${event.timestamp.toISOString()}`);
    });
  }
  
  if (wsResults.errors.length > 0) {
    console.log('\nErrors:');
    wsResults.errors.forEach(error => {
      console.log(`  - ${error.event}: ${error.error} at ${error.timestamp.toISOString()}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');
  
  if (!wsResults.connected) {
    console.log('❌ WebSocket connection failed:');
    console.log('   1. Check if backend server is running on port 3001');
    console.log('   2. Verify WEBSOCKET_ENABLED=true in .env');
    console.log('   3. Check firewall/network connectivity');
    console.log('   4. Review backend logs for connection errors');
  } else {
    console.log('✅ WebSocket connection successful:');
    console.log('   1. Check frontend code for proper event handling');
    console.log('   2. Verify connection status updates in UI');
    console.log('   3. Test real-time event subscriptions');
  }

  console.log('\n🔚 Diagnostics completed');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason);
  process.exit(1);
});

// Run diagnostics
runDiagnostics().catch(console.error);