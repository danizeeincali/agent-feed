#!/usr/bin/env node
/**
 * Direct terminal namespace test to bypass WebSocket Hub
 */

const io = require('socket.io-client');

async function testDirectTerminal() {
  return new Promise((resolve) => {
    console.log('🧪 Testing Direct Terminal Connection');
    console.log('   Connecting to: http://localhost:3001/terminal');
    console.log('   Bypassing main WebSocket Hub authentication');
    
    const socket = io('http://localhost:3001/terminal', {
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      transports: ['polling'], // Force polling to bypass WebSocket upgrade issues
      auth: {
        // Use minimal auth for terminal namespace
        token: 'dev-test-token',
        userId: 'terminal-test-user',
        username: 'Terminal Test User'
      }
    });

    let connected = false;
    let events = [];
    
    socket.on('connect', () => {
      console.log('✅ Direct Terminal: Connected successfully!');
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Namespace: ${socket.nsp}`);
      console.log(`   Transport: ${socket.io.engine.transport.name}`);
      connected = true;
      events.push('connected');
      
      // Test terminal functionality
      console.log('🔌 Testing connect_terminal event...');
      socket.emit('connect_terminal', {
        instanceId: 'test-terminal-instance',
        command: 'ls -la'
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve({ success: true, events });
      }, 3000);
    });

    socket.on('terminal_connected', (data) => {
      console.log('✅ Terminal connected event received:', data);
      events.push('terminal_connected');
    });

    socket.on('terminal_output', (data) => {
      console.log('📺 Terminal output received:', data);
      events.push('terminal_output');
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Direct Terminal: Connection failed:', error.message);
      console.log('   Full error:', error);
      resolve({ success: false, error: error.message, events });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Direct Terminal: Disconnected:', reason);
      if (connected) {
        resolve({ success: true, events, reason });
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log('⏰ Direct Terminal: Connection timeout');
        socket.disconnect();
        resolve({ success: false, error: 'Connection timeout', events });
      }
    }, 10000);
  });
}

testDirectTerminal().then(result => {
  console.log('\n📊 DIRECT TERMINAL TEST RESULT');
  console.log('===============================');
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Events captured: ${result.events.length}`);
  result.events.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event}`);
  });
  
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  
  if (result.success) {
    console.log('\n🎯 TERMINAL NAMESPACE VALIDATION');
    console.log('================================');
    console.log('✅ Terminal namespace is working!');
    console.log('✅ Direct namespace connection successful!');
    console.log('💡 Issue may be with WebSocket Hub integration');
  } else {
    console.log('\n❌ Terminal namespace connection failed');
    console.log('💡 Check terminal namespace authentication middleware');
  }
}).catch(console.error);