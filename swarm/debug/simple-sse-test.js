#!/usr/bin/env node
/**
 * Simple SSE Test - No external dependencies
 * SWARM TESTER: Basic SSE connection validation
 */

import http from 'http';

function testSSEConnection(instanceId = 'claude-3959') {
  console.log('🧪 SWARM TESTER: Simple SSE Connection Test');
  console.log(`   Testing instance: ${instanceId}`);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/claude/instances/${instanceId}/terminal/stream`,
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ SWARM TESTER: Connected to SSE stream (Status: ${res.statusCode})`);
    
    let messageCount = 0;
    let buffer = '';
    
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete SSE messages
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep incomplete message in buffer
      
      messages.forEach(message => {
        if (message.startsWith('data: ')) {
          messageCount++;
          const jsonStr = message.replace('data: ', '').trim();
          
          try {
            const data = JSON.parse(jsonStr);
            console.log(`📨 SWARM TESTER: Message #${messageCount}`);
            console.log(`   Type: ${data.type}`);
            console.log(`   Data: ${data.data ? data.data.substring(0, 100) + '...' : 'null'}`);
            console.log(`   Instance: ${data.instanceId}`);
            console.log(`   Real: ${data.isReal}`);
          } catch (e) {
            console.log(`📨 SWARM TESTER: Raw message #${messageCount}: ${jsonStr.substring(0, 100)}`);
          }
        }
      });
    });
    
    res.on('end', () => {
      console.log(`🏁 SWARM TESTER: SSE stream ended (${messageCount} messages received)`);
    });
    
    res.on('error', (error) => {
      console.error('❌ SWARM TESTER: SSE stream error:', error.message);
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ SWARM TESTER: Connection error:', error.message);
  });
  
  req.end();
  
  // Keep test running for 10 seconds
  setTimeout(() => {
    console.log('⏰ SWARM TESTER: Test completed');
    process.exit(0);
  }, 10000);
}

// Send a test command to trigger Claude response
function sendTestCommand(instanceId = 'claude-3959') {
  console.log('📤 SWARM TESTER: Sending test command...');
  
  const data = JSON.stringify({ input: 'Hello from SWARM test\n' });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/claude/instances/${instanceId}/terminal/input`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ SWARM TESTER: Command sent (Status: ${res.statusCode})`);
    
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      console.log(`📋 SWARM TESTER: Response: ${responseData}`);
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ SWARM TESTER: Command error:', error.message);
  });
  
  req.write(data);
  req.end();
}

// Run both tests
setTimeout(() => sendTestCommand(), 2000);
testSSEConnection();