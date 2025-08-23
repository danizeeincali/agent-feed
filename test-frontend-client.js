#!/usr/bin/env node
/**
 * Test Frontend Client for WebSocket Hub
 * Simulates frontend connecting and communicating with production Claude
 */

const io = require('socket.io-client');

console.log('🌐 Frontend Test Client - WebSocket Hub Integration');
console.log('===================================================');

const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('✅ Frontend connected to WebSocket Hub!');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Register as frontend
  socket.emit('registerFrontend', {
    type: 'frontend',
    capabilities: ['ui', 'interaction'],
    userAgent: 'Test Frontend Client'
  });
});

socket.on('hubRegistered', (data) => {
  console.log('📱 Frontend registered with hub:', data);
  
  // Wait a moment then send test message to production Claude
  setTimeout(() => {
    console.log('\n📤 Sending test message to production Claude...');
    
    socket.emit('toClause', {
      targetInstance: 'production',
      type: 'chat',
      payload: {
        message: 'Hello from frontend! This is a test of the WebSocket Hub communication.'
      },
      messageId: 'test_msg_' + Date.now()
    });
  }, 1000);
});

socket.on('claudeInstanceAvailable', (data) => {
  console.log('🤖 Claude instance available:', data);
});

socket.on('messageRouted', (data) => {
  console.log('✅ Message routed successfully:', data);
});

socket.on('fromClaude', (response) => {
  console.log('\n📨 Received response from production Claude:');
  console.log('   Response:', response);
  
  // Test command after chat
  setTimeout(() => {
    console.log('\n📤 Sending command to production Claude...');
    
    socket.emit('toClause', {
      targetInstance: 'production',
      type: 'command',
      payload: {
        operation: 'status'
      },
      messageId: 'cmd_msg_' + Date.now()
    });
  }, 2000);
});

socket.on('routingError', (error) => {
  console.error('❌ Routing error:', error);
});

socket.on('hubStatus', (status) => {
  console.log('📊 Hub Status Update:', {
    totalClients: status.totalClients,
    frontendClients: status.frontendClients,
    claudeClients: status.claudeClients,
    claudeInstances: status.claudeInstances?.length || 0
  });
});

socket.on('disconnect', () => {
  console.log('🔌 Frontend disconnected from WebSocket Hub');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});

// Disconnect after 15 seconds
setTimeout(() => {
  console.log('\n🔌 Test complete - disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 15000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down frontend test client...');
  socket.disconnect();
  process.exit(0);
});