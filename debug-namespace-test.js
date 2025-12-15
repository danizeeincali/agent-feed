#!/usr/bin/env node
/**
 * Debug namespace registration test
 */

const io = require('socket.io-client');

async function testNamespaces() {
  console.log('🔍 Testing WebSocket Namespaces');
  console.log('==============================');
  
  const tests = [
    { url: 'http://localhost:3001', name: 'Main Server' },
    { url: 'http://localhost:3001/terminal', name: 'Terminal Namespace' },
    { url: 'http://localhost:3001/comments', name: 'Comments Namespace' },
    { url: 'http://localhost:3001/claude-agents', name: 'Claude Agents Namespace' }
  ];
  
  for (const test of tests) {
    console.log(`\n🧪 Testing ${test.name}: ${test.url}`);
    
    try {
      const result = await new Promise((resolve) => {
        const socket = io(test.url, {
          timeout: 5000,
          transports: ['websocket', 'polling'],
          auth: {
            userId: 'test-user-123',
            username: 'Test User'
          }
        });
        
        socket.on('connect', () => {
          console.log(`✅ ${test.name}: Connected (${socket.id})`);
          socket.disconnect();
          resolve('success');
        });
        
        socket.on('connect_error', (error) => {
          console.log(`❌ ${test.name}: Failed - ${error.message}`);
          resolve('failed');
        });
        
        setTimeout(() => {
          socket.disconnect();
          console.log(`⏰ ${test.name}: Timeout`);
          resolve('timeout');
        }, 5000);
      });
    } catch (error) {
      console.log(`💥 ${test.name}: Exception - ${error.message}`);
    }
  }
}

testNamespaces().catch(console.error);