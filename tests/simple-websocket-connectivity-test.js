/**
 * Simple WebSocket Connectivity Test
 * Tests basic Socket.IO connection to validate backend configuration
 */

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const TEST_USER = {
  userId: 'test-websocket-connection',
  username: 'TestUser'
};

console.log('🔌 Starting WebSocket connectivity test...');
console.log('Server URL:', SERVER_URL);

// Test 1: Basic Connection
console.log('\n📡 Test 1: Basic WebSocket Connection');
const socket = io(SERVER_URL, {
  auth: {
    userId: TEST_USER.userId,
    username: TEST_USER.username
  },
  timeout: 10000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('Socket ID:', socket.id);
  console.log('Connected to server:', socket.connected);

  // Test 2: Token Analytics Subscription
  console.log('\n📊 Test 2: Token Analytics Subscription');
  socket.emit('subscribe:token-analytics');
  
  socket.on('token-analytics:subscribed', (data) => {
    console.log('✅ Token analytics subscription confirmed:', data);
    
    // Test 3: Token Usage Emission
    console.log('\n💰 Test 3: Token Usage Emission');
    const testTokenUsage = {
      provider: 'claude',
      model: 'claude-3-sonnet',
      tokensUsed: 1250,
      estimatedCost: 0.0125,
      requestType: 'connectivity-test',
      component: 'SimpleConnectivityTest'
    };
    
    socket.emit('token-usage', testTokenUsage);
    console.log('📤 Sent token usage data:', testTokenUsage);
  });
  
  socket.on('token-usage-update', (data) => {
    console.log('✅ Received token usage update:', data);
    console.log('\n🎉 All WebSocket tests passed successfully!');
    console.log('🔧 The WebSocket connection issue has been resolved.');
    
    // Cleanup
    socket.disconnect();
    process.exit(0);
  });
  
  socket.on('token-usage-ack', (ack) => {
    console.log('✅ Token usage acknowledgment:', ack);
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection error:', error.message);
  console.error('Details:', error);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 WebSocket disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Timeout fallback
setTimeout(() => {
  console.error('❌ Test timeout - connection took too long');
  socket.disconnect();
  process.exit(1);
}, 15000);