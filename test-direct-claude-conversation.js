#!/usr/bin/env node

/**
 * Test Direct Claude Conversation
 * Send a user message directly to Claude and see if it responds as AI
 */

const WebSocket = require('ws');

async function testDirectConversation() {
  console.log('🗣️ Testing Direct Claude Conversation');
  console.log('=' .repeat(50));
  
  try {
    // Connect to existing instance claude-2426
    const instanceId = 'claude-2426';
    
    console.log(`1️⃣ Connecting to existing Claude instance: ${instanceId}`);
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
    
    console.log('✅ WebSocket connected');
    
    // Connect to instance
    console.log(`2️⃣ Connecting to Claude instance...`);
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId
    }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Listen for responses
    let receivedAIResponse = false;
    const responses = [];
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'output' && message.data) {
          responses.push(message.data);
          console.log('📥 Claude Response:', message.data.substring(0, 200) + '...');
          
          // Check for AI-like responses (not just echo)
          if (message.data.includes('Hello') && 
              message.data.includes('Claude') && 
              !message.data.includes('What is your name') &&
              message.data.length > 50) {
            receivedAIResponse = true;
            console.log('🎉 DETECTED REAL AI RESPONSE!');
          }
        }
      } catch (e) {
        console.log('📥 Raw data:', data.toString().substring(0, 100));
      }
    });
    
    // Send a simple conversational message that expects an AI response
    console.log(`3️⃣ Sending conversational message: "What is your name?"`);
    ws.send(JSON.stringify({
      type: 'input',
      data: 'What is your name?',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Send another test
    console.log(`4️⃣ Sending another test: "Can you help me with coding?"`);
    ws.send(JSON.stringify({
      type: 'input',
      data: 'Can you help me with coding?',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log(`\\n📊 TEST RESULTS:`);
    console.log(`✅ WebSocket connected: YES`);
    console.log(`📥 Total responses: ${responses.length}`);
    console.log(`🤖 AI conversation detected: ${receivedAIResponse ? 'YES' : 'NO'}`);
    
    if (!receivedAIResponse) {
      console.log('❌ ISSUE: Claude Code is running in terminal mode, not AI conversation mode');
      console.log('💡 SOLUTION: Need to find how to put Claude Code in interactive AI mode');
    } else {
      console.log('🎉 SUCCESS: Claude Code is responding as AI!');
    }
    
    // Show sample responses
    console.log('\\n📝 RESPONSE SAMPLES:');
    responses.slice(-3).forEach((resp, i) => {
      console.log(`${i + 1}. ${resp.substring(0, 100)}...`);
    });
    
    ws.close();
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testDirectConversation();