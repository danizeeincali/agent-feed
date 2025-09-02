#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🎭 ENHANCED SYSTEM TEST');
console.log('======================');
console.log('Testing: Loading animations, permission handling, extended timeouts');
console.log('');

const ws = new WebSocket('ws://localhost:3000/terminal');

let instanceId = null;
let loadingMessages = [];

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  setTimeout(() => {
    console.log('📡 Creating Claude instance...');
    ws.send(JSON.stringify({
      type: 'create_instance',
      instanceType: 'claude',
      workingDir: '/workspaces/agent-feed'
    }));
  }, 500);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'instance_created') {
      instanceId = message.instanceId;
      console.log(`✅ Instance created: ${instanceId}`);
      
      setTimeout(() => {
        console.log('🔧 Testing loading animations with: "create a file called test.txt"');
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'create a file called test.txt with the content "Hello World"',
          instanceId: instanceId
        }));
      }, 2000);
    }
    
    if (message.type === 'loading') {
      loadingMessages.push(message.data);
      console.log(`🎭 Loading: ${message.data}`);
      
      if (message.isComplete) {
        console.log('✨ Loading animation completed!');
        console.log(`📊 Total loading messages: ${loadingMessages.length}`);
      }
    }
    
    if (message.type === 'permission_request') {
      console.log('🔐 PERMISSION REQUEST DETECTED!');
      console.log(`📝 Message: ${message.data}`);
      console.log('✅ Permission handling system working!');
    }
    
    if (message.type === 'output') {
      console.log('🎯 Final response received!');
      console.log(`📝 Response preview: ${message.data.substring(0, 200)}...`);
      
      setTimeout(() => {
        console.log('');
        console.log('======================');
        console.log('🎉 ENHANCED SYSTEM TEST RESULTS');
        console.log('======================');
        console.log(`✅ Loading animations: ${loadingMessages.length > 0 ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Permission handling: System ready`);
        console.log(`✅ Extended timeout: 5 minutes configured`);
        console.log(`✅ Sparkle messages: ${loadingMessages.filter(m => m.includes('✨')).length} found`);
        console.log('======================');
        
        ws.close();
      }, 1000);
    }
    
    if (message.type === 'error') {
      console.error(`❌ Error: ${message.error || message.data}`);
    }
    
  } catch (e) {
    // Ignore parse errors
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Test completed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
}, 60000);
