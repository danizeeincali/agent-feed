#!/usr/bin/env node

const { io } = require('socket.io-client');

console.log('🧪 Testing Terminal Streaming Connection...');

// Test 1: Connect to unified terminal namespace
const terminalSocket = io('http://localhost:3000/terminal', {
  auth: {
    userId: 'test-user-123',
    username: 'Terminal Tester'
  },
  transports: ['websocket']
});

terminalSocket.on('connect', () => {
  console.log('✅ Connected to /terminal namespace');
  console.log('   Socket ID:', terminalSocket.id);
  
  // Test streaming capabilities
  terminalSocket.emit('streaming:instances');
  
  setTimeout(() => {
    terminalSocket.disconnect();
  }, 3000);
});

terminalSocket.on('terminal:connected', (data) => {
  console.log('✅ Terminal service connected:', data.message);
  console.log('   Supported features:', data.supportedFeatures);
});

terminalSocket.on('streaming:instances_response', (data) => {
  console.log('✅ Instance list received:');
  console.log('   Total instances:', data.total);
  console.log('   Instances:', data.instances?.map(i => ({ id: i.id, name: i.name, status: i.status })));
});

terminalSocket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected from terminal:', reason);
});

terminalSocket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});

// Test 2: Connect to Claude terminal namespace (should work)
const claudeTerminalSocket = io('http://localhost:3000/claude-terminal', {
  auth: {
    userId: 'test-user-456',
    username: 'Claude Terminal Tester'
  },
  transports: ['websocket']
});

claudeTerminalSocket.on('connect', () => {
  console.log('✅ Connected to /claude-terminal namespace');
  console.log('   Socket ID:', claudeTerminalSocket.id);
  
  // Test terminal capabilities
  claudeTerminalSocket.emit('list_instances');
  
  setTimeout(() => {
    claudeTerminalSocket.disconnect();
  }, 3000);
});

claudeTerminalSocket.on('terminal:connected', (data) => {
  console.log('✅ Claude terminal service connected:', data.message);
  console.log('   Supported events:', data.supportedEvents);
});

claudeTerminalSocket.on('terminal:instances_list', (data) => {
  console.log('✅ Claude instance list received:');
  console.log('   Total instances:', data.total);
  console.log('   Instances:', data.instances?.map(i => ({ id: i.id, name: i.name, status: i.status })));
});

claudeTerminalSocket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected from claude-terminal:', reason);
});

claudeTerminalSocket.on('connect_error', (error) => {
  console.error('❌ Claude terminal connection failed:', error.message);
});

// Cleanup after tests
setTimeout(() => {
  console.log('🧪 Test completed - cleaning up...');
  terminalSocket.disconnect();
  claudeTerminalSocket.disconnect();
  process.exit(0);
}, 5000);