#!/usr/bin/env node

/**
 * Test Send Button Functionality
 */

const WebSocket = require('ws');
const http = require('http');

async function createInstance() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/claude/instances',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result.instance.id);
      });
    });
    req.write(JSON.stringify({ instanceType: 'prod' }));
    req.end();
  });
}

async function testWebSocketSend() {
  console.log('Creating Claude instance...');
  const instanceId = await createInstance();
  console.log(`Instance created: ${instanceId}`);
  
  console.log('\nConnecting WebSocket...');
  const ws = new WebSocket(`ws://localhost:3000/terminal`);
  
  return new Promise((resolve) => {
    let connected = false;
    const outputs = [];
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      connected = true;
      
      // Don't send connect message first, just send input directly with terminalId
      console.log(`\n📤 Sending input to ${instanceId}: "echo test"`);
      ws.send(JSON.stringify({
        type: 'input',
        data: 'echo test\n',
        terminalId: instanceId
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log(`📥 Received: ${msg.type}`, msg.error ? `- ERROR: ${msg.error}` : '');
      
      if (msg.type === 'output' && msg.data) {
        outputs.push(msg.data);
        console.log(`   Output: "${msg.data.substring(0, 50)}..."`);
      }
      
      if (msg.type === 'error') {
        console.log(`   ❌ Error: ${msg.error}`);
      }
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
    
    // Check after 5 seconds
    setTimeout(() => {
      ws.close();
      
      console.log('\n=== Results ===');
      console.log(`Connected: ${connected ? 'YES' : 'NO'}`);
      console.log(`Outputs received: ${outputs.length}`);
      
      if (outputs.length > 0) {
        console.log('✅ Send button functionality WORKING!');
        console.log('Sample output:', outputs[0].substring(0, 100));
      } else {
        console.log('❌ No output received - check backend logs');
      }
      
      resolve();
    }, 5000);
  });
}

testWebSocketSend().catch(console.error);