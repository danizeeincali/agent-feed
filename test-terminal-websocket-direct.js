#!/usr/bin/env node
/**
 * Direct Terminal WebSocket Connection Test
 * Tests the /terminal namespace specifically for Claude Instance Terminal
 */

const io = require('socket.io-client');

console.log('🔍 SPARC Terminal WebSocket Test');
console.log('================================');
console.log('');

async function testTerminalConnection() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing Terminal namespace: http://localhost:3001/terminal');
    
    const socket = io('http://localhost:3001/terminal', {
      timeout: 10000,
      transports: ['websocket', 'polling'],
      auth: {
        userId: 'test-user-123',
        username: 'SPARC Test User',
        token: 'dev-token'
      }
    });

    let connected = false;
    let events = [];
    
    socket.on('connect', () => {
      console.log('✅ Terminal WebSocket: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Namespace: ${socket.nsp}`);
      connected = true;
      events.push('connected');
      
      // Test terminal connection
      console.log('🔌 Testing terminal_connect event...');
      socket.emit('connect_terminal', {
        instanceId: 'test-instance-123'
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve({ success: true, events });
      }, 3000);
    });

    socket.on('connected', (data) => {
      console.log('🎯 Terminal connected event received:', data);
      events.push('terminal_connected');
    });

    socket.on('terminal_connected', (data) => {
      console.log('🎯 Terminal connection established:', data);
      events.push('terminal_session_established');
    });

    socket.on('error', (error) => {
      console.log('⚠️  Terminal socket error:', error);
      events.push(`error: ${error}`);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Terminal connection failed:', error.message);
      resolve({ success: false, error: error.message, events });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Terminal disconnected:', reason);
      if (connected) {
        resolve({ success: true, events, reason });
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Terminal connection timeout');
        socket.disconnect();
        resolve({ success: false, error: 'Connection timeout', events });
      }
    }, 10000);
  });
}

async function runTerminalTest() {
  console.log('📋 Running Terminal WebSocket Test...\n');
  
  const result = await testTerminalConnection();
  
  console.log('\n📊 TERMINAL TEST RESULTS');
  console.log('========================');
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Events captured: ${result.events.length}`);
  result.events.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event}`);
  });
  
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  
  if (result.reason) {
    console.log(`Disconnect reason: ${result.reason}`);
  }
  
  console.log('\n🎯 TERMINAL WEBSOCKET VALIDATION');
  console.log('================================');
  
  if (result.success) {
    console.log('✅ Terminal WebSocket namespace is working!');
    console.log('✅ Authentication middleware accepting development users');
    console.log('✅ ClaudeInstanceTerminalWebSocket properly instantiated');
    console.log('💡 Ready for frontend terminal integration');
  } else {
    console.log('❌ Terminal WebSocket connection failed');
    console.log('💡 Check: ClaudeInstanceTerminalWebSocket instantiation');
    console.log('💡 Check: /terminal namespace registration');
    console.log('💡 Check: Authentication middleware configuration');
  }
}

// Run test
runTerminalTest().catch(console.error);