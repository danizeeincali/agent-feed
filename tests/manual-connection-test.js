#!/usr/bin/env node
/**
 * Manual WebSocket Connection Test
 * Direct test of Socket.IO connection to WebSocket Hub
 */

const { io } = require('socket.io-client');

console.log('🔧 Manual WebSocket Connection Test');
console.log('===================================');

// Test configuration
const hubUrl = 'http://localhost:3002';
const timeout = 10000;

console.log(`Connecting to: ${hubUrl}`);
console.log(`Timeout: ${timeout}ms`);
console.log('');

// Create socket connection
const socket = io(hubUrl, {
  transports: ['polling', 'websocket'],
  timeout: timeout,
  reconnection: false
});

// Connection event handlers
socket.on('connect', () => {
  console.log('✅ CONNECTED successfully!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Connected: ${socket.connected}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  
  // Register as frontend client
  console.log('\n📝 Registering as frontend client...');
  socket.emit('registerFrontend', {
    timestamp: new Date().toISOString(),
    userAgent: 'node-test-client',
    url: 'manual-test'
  });
});

socket.on('disconnect', (reason) => {
  console.log(`❌ DISCONNECTED: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.log(`❌ CONNECTION ERROR: ${error.message}`);
  console.log(`   Error type: ${error.type}`);
  console.log(`   Error description: ${error.description}`);
  process.exit(1);
});

socket.on('error', (error) => {
  console.log(`❌ SOCKET ERROR: ${error}`);
});

// Registration confirmation
socket.on('hubRegistered', (data) => {
  console.log('✅ Registration confirmed!');
  console.log(`   Client ID: ${data.clientId}`);
  console.log(`   Type: ${data.type}`);
  console.log(`   Hub Status:`, data.hubStatus);
  
  // Test heartbeat
  console.log('\n💓 Testing heartbeat...');
  socket.emit('heartbeat', { timestamp: Date.now() });
});

socket.on('heartbeatAck', (data) => {
  console.log('✅ Heartbeat acknowledged!', data);
  
  // Test complete - disconnect
  setTimeout(() => {
    console.log('\n🎉 Test completed successfully!');
    console.log('✅ WebSocket Hub is working correctly');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

// Auto-timeout
setTimeout(() => {
  console.log('\n⏰ Test timed out - connection may have failed');
  console.log('❌ Check if WebSocket Hub is running on port 3002');
  socket.disconnect();
  process.exit(1);
}, timeout + 5000);

console.log('⏳ Attempting connection...\n');