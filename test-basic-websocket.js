#!/usr/bin/env node

const { io } = require('socket.io-client');

console.log('🧪 Testing Basic WebSocket Connection (Root Namespace)...');

// Test root namespace connection first
const socket = io('http://localhost:3000', {
  auth: {
    userId: 'test-user-999',
    username: 'Basic Tester'
  },
  transports: ['websocket'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Connected to root namespace successfully!');
  console.log('   Socket ID:', socket.id);
  
  // Test basic functionality
  socket.emit('ping');
  
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
  }, 2000);
});

socket.on('pong', (data) => {
  console.log('✅ Ping/Pong successful:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection to root namespace failed:', error.message);
  console.error('   Error details:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected from root namespace:', reason);
  process.exit(0);
});

// Timeout to prevent hanging
setTimeout(() => {
  console.log('⏰ Test timed out - exiting');
  socket.disconnect();
  process.exit(1);
}, 8000);