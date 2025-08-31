#!/usr/bin/env node
/**
 * DEBUG WebSocket Message Flow
 * Check exactly what messages are being sent/received
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔍 DEBUGGING WebSocket Message Flow...');

async function createInstance() {
  const response = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/claude/instances',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.write(JSON.stringify({ command: 'cd prod && claude', instanceType: 'prod', usePty: true }));
    req.end();
  });
  
  return response.data.instance?.id;
}

async function testWebSocketFlow() {
  const instanceId = await createInstance();
  console.log(`📋 Created instance: ${instanceId}`);
  
  const ws = new WebSocket('ws://localhost:3000/terminal');
  
  ws.on('open', () => {
    console.log('🔗 WebSocket connected');
    
    // Connect to instance  
    const connectMsg = {
      type: 'connect',
      terminalId: `${instanceId} (prod/claude)`
    };
    console.log(`📤 Sending connect: ${JSON.stringify(connectMsg)}`);
    ws.send(JSON.stringify(connectMsg));
    
    // Send hello after connection
    setTimeout(() => {
      const inputMsg = {
        type: 'input',
        terminalId: `${instanceId} (prod/claude)`,
        data: 'hello'
      };
      console.log(`📤 Sending input: ${JSON.stringify(inputMsg)}`);
      ws.send(JSON.stringify(inputMsg));
    }, 3000);
    
    // Close after testing
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 15000);
  });
  
  ws.on('message', (data) => {
    console.log(`📨 RAW WebSocket message received (${data.length} bytes):`);
    console.log(`   Type: ${typeof data}`);
    console.log(`   Content: ${data.toString().substring(0, 200)}...`);
    
    try {
      const parsed = JSON.parse(data);
      console.log(`📨 PARSED message:`);
      console.log(`   Type: ${parsed.type}`);
      console.log(`   Terminal ID: ${parsed.terminalId}`);
      console.log(`   Data length: ${(parsed.data || '').length}`);
      console.log(`   Data preview: "${(parsed.data || '').substring(0, 100)}..."`);
    } catch (e) {
      console.log(`❌ Failed to parse as JSON: ${e.message}`);
    }
    console.log('---');
  });
  
  ws.on('error', (error) => {
    console.log(`❌ WebSocket error: ${error.message}`);
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket closed');
  });
}

testWebSocketFlow().catch(console.error);