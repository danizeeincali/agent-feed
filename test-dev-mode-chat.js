#!/usr/bin/env node
/**
 * Test Development Mode Chat Functionality
 */

const io = require('socket.io-client');

console.log('💬 Development Mode Chat Test');
console.log('==============================');

const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('✅ Frontend connected to WebSocket Hub');
  
  // Register as frontend
  socket.emit('registerFrontend', {
    type: 'frontend',
    capabilities: ['ui', 'chat'],
    userAgent: 'Dev Mode Test Client'
  });
});

socket.on('hubRegistered', (data) => {
  console.log('📱 Frontend registered - hub has', data.hubStatus.claudeClients, 'Claude instances');
  
  // Test chat with dev mode instance
  setTimeout(() => {
    console.log('\n💬 Testing chat with DEV MODE Claude instance...');
    
    socket.emit('toClause', {
      targetInstance: 'production', // Will find the dev mode instance
      type: 'chat',
      payload: {
        message: 'Hello! This is a test of development mode chat functionality. Can you confirm you are running in dev mode?'
      },
      messageId: 'dev_chat_' + Date.now()
    });
  }, 1000);
});

socket.on('claudeInstanceAvailable', (data) => {
  console.log('🤖 Claude instance detected:', {
    instanceType: data.instanceType,
    devMode: data.devMode,
    capabilities: data.capabilities
  });
});

socket.on('fromClaude', (response) => {
  console.log('\n📨 Response from Claude:');
  console.log('   Type:', response.originalType);
  if (response.payload.response) {
    console.log('   Message:', response.payload.response);
    console.log('   Dev Mode:', response.payload.devMode);
  } else if (response.payload.error) {
    console.log('   Error:', response.payload.error);
  }
  
  // Test command functionality
  if (response.originalType === 'chat') {
    setTimeout(() => {
      console.log('\n⚡ Testing command functionality...');
      
      socket.emit('toClause', {
        targetInstance: 'production',
        type: 'command',
        payload: {
          operation: 'list_workspace'
        },
        messageId: 'dev_cmd_' + Date.now()
      });
    }, 2000);
  }
  
  // Finish test after command response
  if (response.originalType === 'command') {
    setTimeout(() => {
      console.log('\n✅ Development mode functionality test complete!');
      console.log('🔌 Disconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 1000);
  }
});

socket.on('routingError', (error) => {
  console.error('❌ Routing error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from WebSocket Hub');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  socket.disconnect();
  process.exit(0);
}, 10000);