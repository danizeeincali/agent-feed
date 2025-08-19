// Simple debug script to test WebSocket from browser context
console.log('Testing WebSocket connection from frontend context...');

// Create WebSocket connection like the frontend would
const io = require('socket.io-client');

const testConnection = () => {
  const socket = io('http://localhost:3000', {
    transports: ['polling', 'websocket'],
    timeout: 20000,
    auth: {
      userId: 'debug-frontend-test',
      username: 'Debug Frontend Test',
      token: 'debug-token'
    },
    forceNew: true
  });

  socket.on('connect', () => {
    console.log('✅ Frontend-style WebSocket connected successfully');
    console.log('Socket ID:', socket.id);
    
    // Test the functionality the frontend needs
    socket.emit('agent:status:request');
    console.log('📡 Sent agent status request');
    
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 3000);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Frontend WebSocket connection failed:', error.message);
    console.log('❌ This explains why the frontend shows "Disconnected"');
    process.exit(1);
  });

  socket.on('agent:status:response', (data) => {
    console.log('✅ Received agent status response:', data);
  });
};

console.log('Attempting WebSocket connection to localhost:3000...');
testConnection();