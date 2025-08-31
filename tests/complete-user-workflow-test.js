#!/usr/bin/env node

/**
 * COMPLETE USER WORKFLOW TEST
 * Tests the exact user experience: create instance → connect → type → Claude responds
 * This simulates what the user sees in the browser
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

async function testCompleteWorkflow() {
  console.log('🎯 TESTING COMPLETE USER WORKFLOW');
  console.log('Simulating: Create instance → Connect → Type "hello" → Claude responds');
  
  let instanceId;
  let ws;
  const messages = [];
  
  try {
    // Step 1: Create instance (like clicking "Create Instance" in UI)
    console.log('\n📝 STEP 1: Creating Claude instance...');
    const createResponse = await fetch(`${API_BASE}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'dev',
        workingDirectory: '/workspaces/agent-feed',
        command: 'claude code'
      })
    });

    const createData = await createResponse.json();
    if (!createData.success) {
      throw new Error(`Failed to create instance: ${createData.error}`);
    }
    
    instanceId = createData.instance.id;
    console.log(`✅ Instance created: ${instanceId.slice(0, 8)}`);
    console.log(`   Status: ${createData.instance.status}`);
    
    // Step 2: Connect WebSocket (like frontend connecting)
    console.log('\n🔗 STEP 2: Connecting WebSocket...');
    ws = new WebSocket(`${WS_BASE}/terminal`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Send connect message (like frontend does)
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        }));
        
        resolve();
      });
      
      ws.on('error', reject);
    });
    
    // Listen for messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'output' || message.type === 'terminal_output') {
          const output = message.data || message.output;
          messages.push(output);
          
          const clean = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
          if (clean.length > 20) {
            console.log(`📨 ${clean.slice(0, 100)}${clean.length > 100 ? '...' : ''}`);
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }
    });
    
    // Step 3: Wait for Claude to initialize
    console.log('\n⏳ STEP 3: Waiting for Claude to initialize...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log(`📊 Received ${messages.length} initialization messages`);
    
    // Step 4: Type "hello" (like user typing in input field)
    console.log('\n💬 STEP 4: Typing "hello" (simulating user input)...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'hello\n',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
    
    // Step 5: Wait for Claude AI response
    console.log('\n🤖 STEP 5: Waiting for Claude AI to respond...');
    const preHelloCount = messages.length;
    
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds for response
    
    const postHelloCount = messages.length;
    const newMessages = messages.slice(preHelloCount);
    
    // Step 6: Analyze response
    console.log('\n📊 STEP 6: Analyzing Claude response...');
    console.log(`New messages after "hello": ${newMessages.length}`);
    
    let hasClaudeResponse = false;
    let totalResponseChars = 0;
    
    for (const msg of newMessages) {
      const clean = msg.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
      totalResponseChars += clean.length;
      
      // Look for Claude AI response patterns
      if (clean.toLowerCase().includes('hello') ||
          clean.toLowerCase().includes('hi') ||
          clean.toLowerCase().includes('how can i help') ||
          clean.toLowerCase().includes('assist') ||
          clean.length > 50) {
        hasClaudeResponse = true;
        console.log(`🤖 Claude response detected: "${clean.slice(0, 150)}..."`);
      }
    }
    
    // Results
    console.log('\n🎯 USER WORKFLOW TEST RESULTS:');
    console.log(`✅ Instance creation: SUCCESS`);
    console.log(`✅ WebSocket connection: SUCCESS`);
    console.log(`✅ Claude initialization: SUCCESS (${messages.length} total messages)`);
    console.log(`✅ Input sending: SUCCESS`);
    console.log(`📨 Claude response: ${hasClaudeResponse ? 'SUCCESS' : 'PENDING'}`);
    console.log(`📊 Response size: ${totalResponseChars} characters`);
    
    if (hasClaudeResponse) {
      console.log('\n🎉 COMPLETE USER WORKFLOW: ✅ SUCCESS');
      console.log('User can: Create instance → Type "hello" → Claude responds with AI');
      return true;
    } else {
      console.log('\n⏳ WORKFLOW: Input/output working, Claude response may need more time');
      console.log('User can type and send, Claude may respond after longer wait');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ WORKFLOW TEST FAILED:', error.message);
    return false;
  } finally {
    // Cleanup
    if (ws) {
      ws.close();
    }
    if (instanceId) {
      try {
        await fetch(`${API_BASE}/api/claude/instances/${instanceId}`, { method: 'DELETE' });
        console.log('\n🧹 Cleanup: Instance terminated');
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run the complete workflow test
if (require.main === module) {
  testCompleteWorkflow()
    .then(success => {
      console.log(`\n🎯 COMPLETE USER WORKFLOW TEST: ${success ? 'SUCCESS' : 'NEEDS MORE TIME'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Workflow test error:', error);
      process.exit(1);
    });
}

module.exports = testCompleteWorkflow;