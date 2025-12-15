#!/usr/bin/env node
/**
 * Minimal WebSocket test - no auth, no namespace
 */

const io = require('socket.io-client');

async function testMinimalConnection() {
  return new Promise((resolve) => {
    console.log('🧪 Testing Minimal WebSocket: http://localhost:3001');
    console.log('   No auth, no namespace, minimal config');
    
    const socket = io('http://localhost:3001', {
      timeout: 5000,
      forceNew: true,
      autoConnect: true,
      auth: {
        instanceType: 'frontend',
        capabilities: ['websocket', 'realtime']
      }
    });

    let connected = false;
    
    socket.on('connect', () => {
      console.log('✅ Minimal WebSocket: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      console.log(`   Upgraded: ${socket.io.engine.upgraded}`);
      connected = true;
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Minimal WebSocket: Connection failed:', error.message);
      console.log('   Error details:', error);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Minimal WebSocket: Disconnected:', reason);
      if (connected) {
        resolve(true);
      }
    });

    // Debug events
    socket.io.on('error', (error) => {
      console.log('🔥 Socket.IO Engine Error:', error);
    });

    socket.io.engine.on('upgrade', () => {
      console.log('⬆️  Socket.IO: Upgraded to', socket.io.engine.transport.name);
    });

    socket.io.engine.on('upgradeError', (error) => {
      console.log('⬆️❌ Socket.IO: Upgrade error:', error);
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Minimal WebSocket: Connection timeout');
        console.log(`   Ready state: ${socket.io.readyState}`);
        console.log(`   Transport: ${socket.io.engine?.transport?.name || 'none'}`);
        socket.disconnect();
        resolve(false);
      }
    }, 5000);
  });
}

testMinimalConnection().then(success => {
  console.log('\n📊 MINIMAL WEBSOCKET TEST RESULT');
  console.log('=================================');
  console.log(`Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (success) {
    console.log('✅ Basic WebSocket connection is working!');
    console.log('💡 Issue is likely with authentication or namespace configuration');
  } else {
    console.log('❌ Basic WebSocket connection failed');
    console.log('💡 Fundamental Socket.IO issue - check server configuration');
  }
}).catch(console.error);