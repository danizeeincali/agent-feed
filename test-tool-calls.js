#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔧 Testing Tool Call Visualization...');

const ws = new WebSocket('ws://localhost:3000/terminal');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
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
    console.log(`📥 Received: ${message.type}`);
    
    if (message.type === 'instance_created') {
      instanceId = message.instanceId;
      console.log(`✅ Instance created: ${instanceId}`);
      
      setTimeout(() => {
        console.log('🔧 Testing command that should use tools: "create a file called hello.txt with content Hello World"');
        testPhase = 'testing_write';
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'create a file called hello.txt with content Hello World',
          instanceId: instanceId
        }));
      }, 3000);
    }
    
    if (message.type === 'output' && testPhase === 'testing_write') {
      console.log('🎯 Response received!');
      console.log('📝 Full response:', message.data);
      
      // Check for tool call bullets and patterns
      const hasToolBullets = message.data.includes('●');
      const hasToolCalls = message.data.includes('<function_calls>') || message.data.includes('● Write(');
      const hasWriteTool = message.data.includes('Write') || message.data.includes('write');
      
      if (hasToolBullets) {
        console.log('🎉 SUCCESS: Tool call bullets (●) detected!');
      }
      if (hasToolCalls) {
        console.log('🎉 SUCCESS: Tool call patterns detected!');
      }
      if (hasWriteTool) {
        console.log('🎉 SUCCESS: Write tool usage detected!');
      }
      
      if (!hasToolBullets && !hasToolCalls) {
        console.log('⚠️ No obvious tool call visualization found');
        console.log('🔍 This might be because Claude answered without using tools or tool formatting needs adjustment');
      }
      
      setTimeout(() => {
        console.log('✅ Tool call test completed!');
        ws.close();
      }, 2000);
    }
    
    if (message.type === 'error') {
      console.error('❌ Error:', message.error || message.data);
    }
    
  } catch (e) {
    console.log('📝 Raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
}, 60000);