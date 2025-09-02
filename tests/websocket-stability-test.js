#!/usr/bin/env node
/**
 * WebSocket Connection Stability Test
 * Tests that WebSocket connections persist across multiple Claude API calls
 */

const WebSocket = require('ws');
const http = require('http');

const SERVER_URL = 'ws://localhost:3000/terminal';
const API_BASE = 'http://localhost:3000/api';

async function testWebSocketStability() {
  console.log('🧪 Starting WebSocket Stability Test');
  
  // Create WebSocket connection
  const ws = new WebSocket(SERVER_URL);
  let connectionDropped = false;
  let messagesReceived = 0;
  let apiCallsCompleted = 0;
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connection established');
      
      // First, create a Claude instance
      ws.send(JSON.stringify({
        type: 'create_instance',
        data: {
          instanceType: 'claude',
          workingDirectory: '/workspaces/agent-feed'
        }
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messagesReceived++;
        console.log(`📨 Message ${messagesReceived}: ${message.type} (${message.terminalId || 'no-id'})`);
        
        // If we got an instance creation response, start testing
        if (message.type === 'instance_created' || (message.type === 'status' && message.data && message.data.status === 'running')) {
          const instanceId = message.terminalId || message.instanceId;
          if (instanceId) {
            console.log(`🎯 Using instance: ${instanceId}`);
            testMultipleApiCalls(ws, instanceId);
          }
        }
        
        // Count API call completions
        if (message.type === 'output' && message.source === 'claude-api') {
          apiCallsCompleted++;
          console.log(`✅ API Call ${apiCallsCompleted} completed - Connection still active`);
          
          if (apiCallsCompleted >= 3) {
            console.log('🎉 SUCCESS: All API calls completed, connection stable!');
            ws.close();
            resolve({
              success: true,
              messagesReceived,
              apiCallsCompleted,
              connectionDropped
            });
          }
        }
      } catch (error) {
        console.error('❌ Message parsing error:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      if (apiCallsCompleted < 3) {
        connectionDropped = true;
        reject(new Error('Connection dropped before all API calls completed'));
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      connectionDropped = true;
      reject(error);
    });
    
    // Timeout the test after 2 minutes
    setTimeout(() => {
      if (apiCallsCompleted < 3) {
        reject(new Error('Test timeout - not all API calls completed'));
      }
    }, 120000);
  });
}

function testMultipleApiCalls(ws, instanceId) {
  console.log('🚀 Starting multiple API call test...');
  
  const testPrompts = [
    'Hello Claude, please respond with a simple greeting.',
    'What is 2 + 2?',
    'Please write a haiku about technology.'
  ];
  
  let currentPrompt = 0;
  
  function sendNextPrompt() {
    if (currentPrompt < testPrompts.length) {
      const prompt = testPrompts[currentPrompt];
      console.log(`📤 Sending prompt ${currentPrompt + 1}: "${prompt}"`);
      
      ws.send(JSON.stringify({
        type: 'input',
        terminalId: instanceId,
        data: prompt
      }));
      
      currentPrompt++;
      
      // Send next prompt after 5 seconds
      setTimeout(sendNextPrompt, 5000);
    }
  }
  
  // Start sending prompts
  setTimeout(sendNextPrompt, 2000);
}

// Run the test
if (require.main === module) {
  testWebSocketStability()
    .then(result => {
      console.log('📊 Test Results:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWebSocketStability };