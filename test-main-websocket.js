#!/usr/bin/env node
/**
 * Test main WebSocket connection (no namespace)
 */

const io = require('socket.io-client');

async function testMainConnection() {
  return new Promise((resolve) => {
    console.log('🧪 Testing Main WebSocket: http://localhost:3001');
    
    const socket = io('http://localhost:3001', {
      timeout: 10000,
      transports: ['websocket', 'polling'],
      auth: {
        userId: 'test-user-123',
        username: 'SPARC Test User',
        token: 'dev-token'
      }
    });

    let connected = false;
    
    socket.on('connect', () => {
      console.log('✅ Main WebSocket: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      connected = true;
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Main WebSocket: Connection failed:', error.message);
      resolve(false);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Main WebSocket: Disconnected');
      if (connected) {
        resolve(true);
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Main WebSocket: Connection timeout');
        socket.disconnect();
        resolve(false);
      }
    }, 10000);
  });
}

testMainConnection().then(success => {
  console.log('\n📊 MAIN WEBSOCKET TEST RESULT');
  console.log('==============================');
  console.log(`Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (success) {
    console.log('✅ Main WebSocket server is working!');
    console.log('💡 Socket.IO server is properly configured');
    console.log('💡 Authentication middleware is working');
  } else {
    console.log('❌ Main WebSocket connection failed');
    console.log('💡 Check Socket.IO server configuration');
  }
}).catch(console.error);