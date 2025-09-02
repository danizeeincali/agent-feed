#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Testing Backend Claude API Integration...');

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

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received:', message.type, message.instanceId ? `(${message.instanceId})` : '');
    
    if (message.type === 'instance_created') {
      instanceId = message.instanceId;
      console.log(`✅ Instance created: ${instanceId}`);
      
      // Test a simple command
      setTimeout(() => {
        console.log('🔬 Testing simple command: "what files are in the current directory?"');
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'what files are in the current directory?',
          instanceId: instanceId
        }));
      }, 2000);
    }
    
    if (message.type === 'output') {
      console.log('🎯 Claude Response:', message.data.substring(0, 200) + '...');
      
      // Test another command with tool usage
      setTimeout(() => {
        console.log('🔬 Testing tool command: "search for any .tsx files"');
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'search for any .tsx files',
          instanceId: instanceId
        }));
      }, 3000);
    }
    
    if (message.type === 'error') {
      console.error('❌ Error:', message.data);
    }
    
  } catch (e) {
    console.log('📝 Raw message:', data.toString().substring(0, 200));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Auto-close after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing');
  ws.close();
}, 30000);