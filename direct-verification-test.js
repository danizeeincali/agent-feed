#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🎯 DIRECT VERIFICATION - REAL USER WORKFLOW');
console.log('='.repeat(50));

let connectionErrors = [];
let responses = [];
let instanceId = null;

async function directTest() {
  try {
    // 1. Create instance
    console.log('1️⃣ Creating Claude instance...');
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'direct-test' })
    });
    const data = await response.json();
    instanceId = data.instance.id;
    console.log(`✅ Instance created: ${instanceId}\n`);
    
    // 2. Connect WebSocket 
    console.log('2️⃣ Connecting WebSocket...');
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    return new Promise((resolve) => {
      let connected = false;
      let welcomeReceived = false;
      let commandSent = false;
      let directoryResponse = false;
      
      setTimeout(() => {
        console.log('\n📊 VERIFICATION RESULTS:');
        console.log(`Instance Created: ${instanceId ? 'SUCCESS' : 'FAILED'}`);
        console.log(`WebSocket Connected: ${connected ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Welcome Received: ${welcomeReceived ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Command Sent: ${commandSent ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Directory Response: ${directoryResponse ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Connection Errors: ${connectionErrors.length}`);
        console.log(`Total Responses: ${responses.length}`);
        
        if (connectionErrors.length > 0) {
          console.log('\n🚨 ERRORS DETECTED:');
          connectionErrors.forEach(err => console.log(`  - ${err}`));
        }
        
        const success = connected && welcomeReceived && commandSent && connectionErrors.length === 0;
        console.log(`\n🎯 OVERALL: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        ws.close();
        resolve(success);
      }, 45000);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected!');
        connected = true;
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        // Send command after connection
        setTimeout(() => {
          console.log('\n3️⃣ Sending command: "what directory are you in?"');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'what directory are you in?'
          }));
          commandSent = true;
        }, 10000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'terminal' && message.data) {
          const text = message.data.trim();
          responses.push(text);
          console.log(`📨 Response: ${text.substring(0, 60)}...`);
          
          if (text.includes('Welcome to Claude Code') || text.includes('Claude Code!')) {
            console.log('✅ Welcome message detected!');
            welcomeReceived = true;
          }
          
          if (text.includes('/workspaces/agent-feed') || text.includes('workspace') || text.includes('cwd:')) {
            console.log('✅ Directory response detected!');
            directoryResponse = true;
          }
        }
      });
      
      ws.on('error', (error) => {
        connectionErrors.push(`WebSocket error: ${error.message}`);
        console.error('🚨 WebSocket error:', error.message);
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          connectionErrors.push(`Unexpected close: ${code} ${reason}`);
          console.log(`🚨 Connection closed: ${code} ${reason || 'No reason'}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

directTest()
  .then(success => {
    console.log(`\nFINAL RESULT: ${success ? 'ALL TESTS PASSED' : 'ISSUES DETECTED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(console.error);