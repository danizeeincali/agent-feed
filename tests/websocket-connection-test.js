const io = require('socket.io-client');

console.log('Testing WebSocket connection...');

// Test connection with the same configuration as the frontend
const socket = io('http://localhost:3000', {
  transports: ['polling', 'websocket'],
  timeout: 20000,
  auth: {
    userId: 'test-user',
    username: 'Test User',
    token: 'debug-token'
  },
  forceNew: true,
  debug: true
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('Connection ID:', socket.id);
  
  // Test comment events
  socket.emit('join_comment_room', 'test-post-123');
  console.log('📡 Sent join_comment_room event');
  
  // Test claude agent events
  socket.emit('join_claude_agent_room', 'test-session');
  console.log('📡 Sent join_claude_agent_room event');
  
  setTimeout(() => {
    console.log('✅ All tests completed successfully');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ WebSocket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('❌ WebSocket connection error:', error.message);
  console.log('Error details:', error);
});

socket.on('error', (error) => {
  console.log('❌ WebSocket error:', error);
});

// Test timeout
setTimeout(() => {
  console.log('❌ Connection timeout - test failed');
  process.exit(1);
}, 25000);