#!/usr/bin/env node
/**
 * WebSocket Proxy Test
 * Tests the updated WebSocket proxy configuration
 */

import { WebSocket } from 'ws';

console.log('🔌 Testing WebSocket Proxy Configuration\n');

async function testWebSocketEndpoints() {
  const endpoints = [
    { name: 'Backend Direct /ws', url: 'ws://localhost:3000/ws' },
    { name: 'Frontend Proxy /ws', url: 'ws://localhost:5173/ws' },
    { name: 'Backend Direct /terminal', url: 'ws://localhost:3000/terminal' },
    { name: 'Frontend Proxy /terminal', url: 'ws://localhost:5173/terminal' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`);

    const result = await new Promise((resolve) => {
      try {
        const ws = new WebSocket(endpoint.url);
        let connected = false;

        const timeout = setTimeout(() => {
          if (!connected) {
            console.log(`   ⚠️ ${endpoint.name}: Timeout`);
            ws.close();
            resolve({ name: endpoint.name, status: 'timeout', connected: false });
          }
        }, 5000);

        ws.on('open', () => {
          connected = true;
          console.log(`   ✅ ${endpoint.name}: Connected`);
          clearTimeout(timeout);

          // Send a test message
          ws.send(JSON.stringify({
            type: 'test',
            message: 'proxy connectivity test'
          }));

          setTimeout(() => {
            ws.close();
            resolve({ name: endpoint.name, status: 'success', connected: true });
          }, 1000);
        });

        ws.on('message', (data) => {
          console.log(`   📨 ${endpoint.name}: Received message`);
        });

        ws.on('error', (error) => {
          console.log(`   ❌ ${endpoint.name}: Error - ${error.message}`);
          clearTimeout(timeout);
          resolve({ name: endpoint.name, status: 'error', connected: false, error: error.message });
        });

        ws.on('close', () => {
          console.log(`   🔌 ${endpoint.name}: Connection closed`);
        });

      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: Setup failed - ${error.message}`);
        resolve({ name: endpoint.name, status: 'setup_error', connected: false, error: error.message });
      }
    });

    results.push(result);
    console.log(''); // Empty line for readability
  }

  return results;
}

// Run test
testWebSocketEndpoints().then(results => {
  console.log('📊 WebSocket Test Results:');
  console.log('='.repeat(50));

  let successCount = 0;
  results.forEach(result => {
    const icon = result.connected ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status}`);
    if (result.connected) successCount++;
  });

  console.log(`\n🎯 Success Rate: ${successCount}/${results.length}`);

  if (successCount === results.length) {
    console.log('✨ All WebSocket endpoints working!');
  } else if (successCount >= 2) {
    console.log('⚠️ Some WebSocket endpoints working, proxy configuration partially successful');
  } else {
    console.log('❌ WebSocket connectivity issues detected');
  }

  process.exit(successCount > 0 ? 0 : 1);
});