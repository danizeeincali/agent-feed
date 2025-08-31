#!/usr/bin/env node

/**
 * Test Claude Code Commands vs Conversation
 * Compare sending commands vs conversation prompts
 */

const WebSocket = require('ws');

async function testCommandVsConversation() {
  console.log('🔬 Testing Claude Code Commands vs Conversation');
  console.log('=' .repeat(60));
  
  try {
    const instanceId = 'claude-2426';
    
    console.log(`🔗 Connecting to Claude instance: ${instanceId}`);
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
    
    console.log('✅ WebSocket connected');
    
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceId
    }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responses = [];
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'output' && message.data) {
          responses.push({
            data: message.data,
            timestamp: new Date()
          });
          console.log('📥 Response:', message.data.substring(0, 150) + '...');
        }
      } catch (e) {
        console.log('📥 Raw:', data.toString().substring(0, 100));
      }
    });
    
    // Test 1: Try a Claude Code command
    console.log('\\n1️⃣ Testing Claude Code Command: "/help"');
    ws.send(JSON.stringify({
      type: 'input',
      data: '/help',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Try a conversational approach 
    console.log('\\n2️⃣ Testing Conversation: "Hello, can you introduce yourself?"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'Hello, can you introduce yourself?',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 3: Try asking Claude to switch modes
    console.log('\\n3️⃣ Testing Mode Request: "Please switch to conversational mode"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'Please switch to conversational mode and chat with me',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 4: Try asking a coding question (Claude's specialty)
    console.log('\\n4️⃣ Testing Coding Question: "How do I create a React component?"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'How do I create a React component?',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\\n📊 ANALYSIS:');
    console.log(`Total responses received: ${responses.length}`);
    
    // Analyze each response type
    responses.forEach((resp, i) => {
      const isCommand = resp.data.includes('/help') || resp.data.includes('Commands:');
      const isConversation = resp.data.length > 100 && 
        (resp.data.includes('I am') || resp.data.includes('Claude') || 
         resp.data.includes('assistant') || resp.data.includes('help you'));
      const isEcho = resp.data.includes('Please respond with') || 
        resp.data.includes('I am a user connecting');
      
      console.log(`Response ${i + 1}:`);
      console.log(`  Command response: ${isCommand ? 'YES' : 'NO'}`);
      console.log(`  Conversation response: ${isConversation ? 'YES' : 'NO'}`);
      console.log(`  Echo/Mock behavior: ${isEcho ? 'YES' : 'NO'}`);
      console.log(`  Length: ${resp.data.length} chars`);
      console.log('');
    });
    
    ws.close();
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testCommandVsConversation();