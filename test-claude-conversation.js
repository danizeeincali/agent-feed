#!/usr/bin/env node

/**
 * Test proper Claude Code conversation initiation
 */

const WebSocket = require('ws');

async function testClaudeConversation() {
  console.log('🤖 Testing Claude Code Conversation Mode');
  console.log('=' .repeat(50));
  
  const ws = new WebSocket('ws://localhost:3000/terminal');
  
  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ Connected to WebSocket');
      resolve();
    });
    
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
  
  // Connect to Claude instance
  ws.send(JSON.stringify({
    type: 'connect',
    terminalId: 'claude-5309'
  }));
  
  console.log('📤 Sent connect message');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try different conversation messages to trigger AI mode
  const conversationTests = [
    "What is your name?",
    "Can you help me with some code?", 
    "Please explain how React hooks work",
    "I need assistance with JavaScript",
    "/help"
  ];
  
  for (const message of conversationTests) {
    console.log(`\n🗣️  Testing: "${message}"`);
    
    ws.send(JSON.stringify({
      type: 'input',
      data: message + '\n',
      terminalId: 'claude-5309',
      timestamp: Date.now()
    }));
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Listen for responses
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      if (response.type === 'output' && response.output && response.output.length > 10) {
        console.log('📥 Claude Response:', response.output.substring(0, 150) + '...');
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  ws.close();
  console.log('\n✅ Test completed');
}

testClaudeConversation().catch(console.error);