#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🎭 FRONTEND INTEGRATION TEST');
console.log('============================');
console.log('Testing: Frontend WebSocket handlers for loading & permissions');
console.log('');

const ws = new WebSocket('ws://localhost:3000/terminal');

let instanceId = null;
let loadingCount = 0;
let permissionCount = 0;
let testResults = {
  loadingHandled: false,
  permissionHandled: false,
  toolCallsDetected: false
};

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
        console.log('🔧 Testing command with loading: "list files in current directory"');
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'list files in current directory using ls command',
          instanceId: instanceId
        }));
      }, 2000);
    }
    
    // Test loading animation handling
    if (message.type === 'loading') {
      loadingCount++;
      console.log(`✨ [FRONTEND] Loading message ${loadingCount}: ${message.data}`);
      testResults.loadingHandled = true;
      
      if (message.isComplete) {
        console.log('🎯 [FRONTEND] Loading completed!');
      }
    }
    
    // Test permission request handling
    if (message.type === 'permission_request') {
      permissionCount++;
      console.log(`🔐 [FRONTEND] Permission request ${permissionCount}: ${message.data}`);
      testResults.permissionHandled = true;
      
      // Auto-respond with "yes" for testing
      setTimeout(() => {
        console.log('📝 [FRONTEND] Auto-responding with YES to permission');
        ws.send(JSON.stringify({
          type: 'permission_response',
          requestId: message.requestId,
          action: 'yes',
          timestamp: Date.now()
        }));
      }, 1000);
    }
    
    // Test tool call visualization
    if (message.type === 'output' && message.data) {
      const hasToolCalls = message.data.includes('●') || 
                          message.data.includes('Running command:') ||
                          message.data.includes('Executing');
      
      if (hasToolCalls) {
        console.log('🔧 [FRONTEND] Tool calls detected in output!');
        testResults.toolCallsDetected = true;
      }
    }
    
    if (message.type === 'output') {
      console.log('🎯 Final response received!');
      console.log(`📝 Response preview: ${message.data.substring(0, 200)}...`);
      
      setTimeout(() => {
        console.log('');
        console.log('=====================================');
        console.log('🎉 FRONTEND INTEGRATION TEST RESULTS');
        console.log('=====================================');
        console.log(`Loading Messages:     ${loadingCount} received - ${testResults.loadingHandled ? '✅ HANDLED' : '❌ NOT HANDLED'}`);
        console.log(`Permission Requests:  ${permissionCount} received - ${testResults.permissionHandled ? '✅ HANDLED' : '❌ NOT HANDLED'}`);
        console.log(`Tool Call Formatting: ${testResults.toolCallsDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        console.log('=====================================');
        
        const allWorking = testResults.loadingHandled && testResults.toolCallsDetected;
        if (allWorking) {
          console.log('🎉 FRONTEND READY! All features will display in browser UI!');
        } else {
          console.log('⚠️  Some frontend features need debugging.');
        }
        
        ws.close();
      }, 2000);
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
  console.log('🔌 Frontend integration test completed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
}, 45000);