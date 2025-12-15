#!/usr/bin/env node
/**
 * Simple test script to verify WebSocket Hub connection
 */

const io = require('socket.io-client');

console.log('🔧 Testing WebSocket Hub Connection...');

const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket Hub!');
  console.log(`   Socket ID: ${socket.id}`);
  
  // Test Claude registration
  socket.emit('registerClaude', {
    instanceType: 'production',
    devMode: false,
    capabilities: ['chat', 'commands'],
    workspacePath: '/workspaces/agent-feed/prod/agent_workspace/'
  });
});

socket.on('hubRegistered', (data) => {
  console.log('🎯 Successfully registered with hub:', data);
  
  // Test heartbeat
  setTimeout(() => {
    socket.emit('heartbeat', { status: 'alive' });
    console.log('💓 Heartbeat sent');
  }, 1000);
  
  // Disconnect after 3 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('heartbeatAck', (data) => {
  console.log('💓 Heartbeat acknowledged:', data);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket Hub');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});

// Timeout if connection takes too long
setTimeout(() => {
  console.error('❌ Connection timeout');
  process.exit(1);
}, 10000);