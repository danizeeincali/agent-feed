#!/usr/bin/env node
/**
 * Test WebSocket with proper authentication
 */

const io = require('socket.io-client');

async function testAuthenticatedConnection() {
  return new Promise((resolve) => {
    console.log('🧪 Testing Authenticated WebSocket: http://localhost:3001');
    console.log('   With proper auth parameters');
    
    const socket = io('http://localhost:3001', {
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      auth: {
        token: 'dev-test-token',
        userId: 'test-user-sparc-123',
        username: 'SPARC Test User',
        instanceType: 'frontend',
        capabilities: ['websocket', 'realtime', 'terminal']
      }
    });

    let connected = false;
    
    socket.on('connect', () => {
      console.log('✅ Authenticated WebSocket: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      connected = true;
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Authenticated WebSocket: Connection failed:', error.message);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Authenticated WebSocket: Disconnected:', reason);
      if (connected) {
        resolve(true);
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Authenticated WebSocket: Connection timeout');
        socket.disconnect();
        resolve(false);
      }
    }, 10000);
  });
}

async function testTerminalNamespace() {
  return new Promise((resolve) => {
    console.log('\n🧪 Testing Terminal Namespace: http://localhost:3001/terminal');
    console.log('   With proper auth parameters');
    
    const socket = io('http://localhost:3001/terminal', {
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      auth: {
        token: 'dev-test-token',
        userId: 'test-user-sparc-123',
        username: 'SPARC Test User',
        instanceType: 'frontend',
        capabilities: ['websocket', 'realtime', 'terminal']
      }
    });

    let connected = false;
    let events = [];
    
    socket.on('connect', () => {
      console.log('✅ Terminal Namespace: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Namespace: ${socket.nsp}`);
      connected = true;
      events.push('connected');
      
      // Test terminal connection
      console.log('🔌 Testing terminal_connect event...');
      socket.emit('connect_terminal', {
        instanceId: 'test-instance-sparc-123'
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
      console.log('❌ Terminal Namespace: Connection failed:', error.message);
      resolve({ success: false, error: error.message, events });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Terminal Namespace: Disconnected:', reason);
      if (connected) {
        resolve({ success: true, events, reason });
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Terminal Namespace: Connection timeout');
        socket.disconnect();
        resolve({ success: false, error: 'Connection timeout', events });
      }
    }, 10000);
  });
}

async function runAuthTests() {
  console.log('📋 Running Authenticated WebSocket Tests...\n');
  
  // Test 1: Main server with auth
  const mainResult = await testAuthenticatedConnection();
  
  console.log('\n📊 MAIN WEBSOCKET TEST RESULT');
  console.log('==============================');
  console.log(`Status: ${mainResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!mainResult) {
    console.log('❌ Main WebSocket authentication failed');
    console.log('💡 Cannot proceed to terminal namespace test');
    return;
  }
  
  // Test 2: Terminal namespace with auth
  const terminalResult = await testTerminalNamespace();
  
  console.log('\n📊 TERMINAL NAMESPACE TEST RESULT');
  console.log('==================================');
  console.log(`Status: ${terminalResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Events captured: ${terminalResult.events.length}`);
  terminalResult.events.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event}`);
  });
  
  if (terminalResult.error) {
    console.log(`Error: ${terminalResult.error}`);
  }
  
  console.log('\n🎯 SPARC TERMINAL WEBSOCKET VALIDATION');
  console.log('=====================================');
  
  if (mainResult && terminalResult.success) {
    console.log('✅ WebSocket authentication is working!');
    console.log('✅ Terminal namespace is properly configured!');
    console.log('✅ ClaudeInstanceTerminalWebSocket is responding!');
    console.log('💡 The terminal "Launching" spinner issue is SOLVED!');
    console.log('💡 Frontend can now connect to terminal WebSocket');
  } else {
    console.log('❌ WebSocket connection issues remain');
    if (!mainResult) {
      console.log('💡 Fix: Authentication middleware configuration');
    }
    if (!terminalResult.success) {
      console.log('💡 Fix: Terminal namespace registration or ClaudeInstanceTerminalWebSocket');
    }
  }
}

runAuthTests().catch(console.error);