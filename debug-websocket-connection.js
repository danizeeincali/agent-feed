#!/usr/bin/env node
/**
 * SPARC Debug: WebSocket Connection Diagnostic Tool
 * Tests and debugs WebSocket connectivity issues
 */

const io = require('socket.io-client');

console.log('🔍 SPARC WebSocket Connection Diagnostic');
console.log('========================================');
console.log('');

async function testConnection(url, name) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Testing ${name}: ${url}`);
    
    const socket = io(url, {
      timeout: 5000,
      transports: ['websocket', 'polling']
    });

    let connected = false;
    
    socket.on('connect', () => {
      console.log(`✅ ${name}: Connected successfully!`);
      console.log(`   Socket ID: ${socket.id}`);
      connected = true;
      
      // Test registration
      socket.emit('registerFrontend', {
        type: 'frontend',
        userAgent: 'SPARC Debug Tool',
        debugMode: true
      });
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 2000);
    });

    socket.on('hubRegistered', (data) => {
      console.log(`🎯 ${name}: Registration successful:`, data);
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ ${name}: Connection failed:`, error.message);
      resolve(false);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 ${name}: Disconnected`);
      if (connected) {
        resolve(true);
      }
    });

    setTimeout(() => {
      if (!connected) {
        console.log(`⏰ ${name}: Connection timeout`);
        socket.disconnect();
        resolve(false);
      }
    }, 5000);
  });
}

async function runDiagnostics() {
  console.log('📋 Running WebSocket Connection Diagnostics...\n');
  
  const tests = [
    ['http://localhost:3002', 'WebSocket Hub (Original)'],
    ['http://localhost:3003', 'Robust WebSocket Server'],
    ['http://localhost:3001', 'Frontend Dev Server'],
    ['ws://localhost:3002', 'Direct WebSocket (should fail)']
  ];

  const results = [];
  
  for (const [url, name] of tests) {
    try {
      const success = await testConnection(url, name);
      results.push({ url, name, success });
      console.log('');
    } catch (error) {
      console.log(`💥 ${name}: Test failed with error:`, error.message);
      results.push({ url, name, success: false, error: error.message });
      console.log('');
    }
  }

  console.log('📊 DIAGNOSTIC RESULTS');
  console.log('=====================');
  results.forEach(({ url, name, success, error }) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    console.log(`     URL: ${url}`);
    if (error) {
      console.log(`     Error: ${error}`);
    }
  });

  const passCount = results.filter(r => r.success).length;
  console.log('');
  console.log(`🎯 Summary: ${passCount}/${results.length} tests passed`);
  
  if (passCount > 0) {
    console.log('✅ WebSocket connectivity is working!');
    const working = results.find(r => r.success);
    console.log(`💡 Recommendation: Configure frontend to use ${working.url}`);
  } else {
    console.log('❌ No WebSocket connections successful');
    console.log('💡 Recommendation: Check if services are running and ports are available');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);