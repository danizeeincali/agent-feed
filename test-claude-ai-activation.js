#!/usr/bin/env node

/**
 * Test Claude AI Activation Fix
 * Verifies that Claude Code properly engages in AI conversation mode
 */

const WebSocket = require('ws');

async function testClaudeAIActivation() {
  console.log('🤖 Testing Claude AI Activation Fix');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Create a new Claude instance via API
    console.log('1️⃣ Creating new Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        instanceType: 'interactive',
        workingDirectory: '/workspaces/agent-feed'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create instance: ${createResponse.status}`);
    }
    
    const instanceData = await createResponse.json();
    console.log('✅ Claude instance created:', instanceData.instanceId);
    
    // Wait for instance to start
    console.log('2️⃣ Waiting for instance to initialize...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Step 2: Connect via WebSocket
    console.log('3️⃣ Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
    
    console.log('✅ WebSocket connected');
    
    // Step 3: Connect to Claude instance
    console.log('4️⃣ Connecting to Claude instance...');
    ws.send(JSON.stringify({
      type: 'connect',
      terminalId: instanceData.instanceId
    }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Listen for Claude AI responses
    const responses = [];
    let activationResponse = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'output' && message.data) {
          responses.push(message.data);
          console.log('📥 Claude Response:', message.data.substring(0, 150) + '...');
          
          // Check if this looks like the activation response
          if (message.data.includes('Claude AI') && message.data.includes('ready to help')) {
            activationResponse = message.data;
            console.log('🎉 ACTIVATION RESPONSE DETECTED!');
          }
        }
      } catch (e) {
        console.log('📥 Raw data:', data.toString().substring(0, 100));
      }
    });
    
    // Step 5: Send test conversation message
    console.log('5️⃣ Waiting for activation, then sending test message...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('6️⃣ Sending test conversation: "What is 2+2?"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'What is 2+2?',
      terminalId: instanceData.instanceId,
      timestamp: Date.now()
    }));
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 6: Analyze results
    console.log('\\n📊 TEST RESULTS:');
    console.log(`✅ Instance created: ${instanceData.instanceId}`);
    console.log(`✅ WebSocket connected: YES`);
    console.log(`📥 Total responses: ${responses.length}`);
    console.log(`🎯 Activation response found: ${activationResponse ? 'YES' : 'NO'}`);
    
    if (activationResponse) {
      console.log('🎉 SUCCESS: Claude AI activation is working!');
      console.log('   Activation message:', activationResponse.trim());
    } else {
      console.log('❌ ISSUE: No clear Claude AI activation response detected');
    }
    
    // Check if any responses look like AI conversation
    const hasAIResponses = responses.some(r => 
      r.length > 20 && 
      !r.includes('Debug Info') && 
      !r.includes('hello') && 
      (r.includes('Claude') || r.includes('AI') || r.includes('assist'))
    );
    
    console.log(`🤖 AI conversation detected: ${hasAIResponses ? 'YES' : 'NO'}`);
    
    if (hasAIResponses) {
      console.log('🎉 SUCCESS: Claude is engaging in AI conversation!');
    } else {
      console.log('❌ ISSUE: Claude is not engaging in proper AI conversation');
    }
    
    ws.close();
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testClaudeAIActivation();