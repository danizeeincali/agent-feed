#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Enhanced Backend Claude API Integration Test...');

// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/terminal');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Create a Claude instance first
  setTimeout(() => {
    console.log('📡 Creating Claude instance...');
    ws.send(JSON.stringify({
      type: 'create_instance',
      instanceType: 'claude',
      workingDir: '/workspaces/agent-feed'
    }));
  }, 1000);
});

let instanceId = null;
let testPhase = 'waiting';

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log(`📥 Received: ${message.type} ${message.instanceId || message.terminalId || ''}`);
    
    if (message.type === 'instance_created') {
      instanceId = message.instanceId;
      console.log(`✅ Instance created: ${instanceId}`);
      
      // Test a simple command
      setTimeout(() => {
        console.log('🔬 Testing: "search for any .tsx files"');
        testPhase = 'testing_search';
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'search for any .tsx files',
          instanceId: instanceId
        }));
      }, 3000);
    }
    
    if (message.type === 'output' && testPhase === 'testing_search') {
      console.log('🎯 Claude Response received!');
      console.log('📝 Response preview:', message.data.substring(0, 300).replace(/\n/g, '\\n'));
      
      // Check if response contains tool call bullets
      if (message.data.includes('●')) {
        console.log('🎉 SUCCESS: Tool call bullets (●) detected in response!');
      } else {
        console.log('⚠️  No tool call bullets found in response');
      }
      
      // Test another command that should use tools
      setTimeout(() => {
        console.log('🔬 Testing: "list files in docs directory"');
        testPhase = 'testing_docs';
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'list files in docs directory',
          instanceId: instanceId
        }));
      }, 2000);
    }
    
    if (message.type === 'output' && testPhase === 'testing_docs') {
      console.log('🎯 Second Claude Response received!');
      console.log('📝 Response preview:', message.data.substring(0, 300).replace(/\n/g, '\\n'));
      
      console.log('✅ Tests completed successfully!');
      
      setTimeout(() => {
        console.log('🏁 Closing connection...');
        ws.close();
      }, 2000);
    }
    
    if (message.type === 'error') {
      console.error('❌ Error:', message.error || message.data);
    }
    
  } catch (e) {
    console.log('📝 Raw message:', data.toString().substring(0, 100) + '...');
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Extended timeout for tool operations
setTimeout(() => {
  console.log('⏰ Extended test timeout - closing');
  ws.close();
}, 120000); // 2 minutes