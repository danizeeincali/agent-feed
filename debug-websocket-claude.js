#!/usr/bin/env node

/**
 * EMERGENCY WebSocket Claude Diagnostic
 * Tests the exact message flow that should happen when user types "hello"
 */

const WebSocket = require('ws');

async function testClaudeWebSocketFlow() {
  console.log('🔧 EMERGENCY DIAGNOSTIC: Testing Claude WebSocket Flow');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Connect to WebSocket
    console.log('1️⃣ Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Step 2: Send connect message for Claude instance
    console.log('2️⃣ Sending connect message...');
    const connectMessage = {
      type: 'connect',
      terminalId: 'claude-5309' // Using the instance from backend logs
    };
    
    ws.send(JSON.stringify(connectMessage));
    console.log('📤 Sent connect:', connectMessage);
    
    // Wait a moment for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Send user input message
    console.log('3️⃣ Sending user input message...');
    const inputMessage = {
      type: 'input',
      data: 'hello\n',
      terminalId: 'claude-5309',
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(inputMessage));
    console.log('📤 Sent input:', inputMessage);
    
    // Step 4: Listen for responses
    console.log('4️⃣ Listening for Claude response...');
    
    const responses = [];
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        responses.push(message);
        console.log('📥 Received response:', {
          type: message.type,
          hasOutput: !!message.output,
          outputLength: message.output?.length || 0,
          preview: message.output?.substring(0, 100) || 'no output'
        });
      } catch (e) {
        console.log('📥 Received raw data:', data.toString().substring(0, 100));
      }
    });
    
    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log(`✅ WebSocket connection: WORKING`);
    console.log(`✅ Connect message sent: WORKING`);
    console.log(`✅ Input message sent: WORKING`);
    console.log(`📥 Total responses received: ${responses.length}`);
    
    if (responses.length === 0) {
      console.log('❌ PROBLEM: No responses received from Claude');
      console.log('🔍 This indicates the backend is not processing the input message');
    } else {
      console.log('✅ Claude responses received successfully');
      responses.forEach((r, i) => {
        console.log(`   Response ${i + 1}: ${r.type} (${r.output?.length || 0} chars)`);
      });
    }
    
    ws.close();
    
  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run the diagnostic
testClaudeWebSocketFlow();