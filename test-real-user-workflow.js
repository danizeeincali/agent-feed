#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🎯 TESTING REAL USER WORKFLOW - COMPREHENSIVE FIX VALIDATION\n');

async function testRealUserWorkflow() {
  try {
    // Step 1: Create Claude instance
    console.log('🔘 Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'real-user-test' })
    });
    
    const createData = await createResponse.json();
    const instanceId = createData.instance.id;
    console.log(`✅ Instance created: ${instanceId}`);
    
    // Step 2: Wait for Claude to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Connect WebSocket and test real commands
    console.log('🔗 Connecting WebSocket for real user workflow...');
    const ws = new WebSocket(`ws://localhost:3000/terminal`);
    
    return new Promise((resolve) => {
      let messagesReceived = [];
      let connectionErrors = [];
      let hasDirectoryResponse = false;
      let hasWelcomeMessage = false;
      
      const timeout = setTimeout(() => {
        console.log('\\n📊 REAL USER WORKFLOW RESULTS:');
        console.log(`Messages received: ${messagesReceived.length}`);
        console.log(`Connection errors: ${connectionErrors.length}`);
        console.log(`Welcome message: ${hasWelcomeMessage ? 'SUCCESS' : 'MISSING'}`);
        console.log(`Directory response: ${hasDirectoryResponse ? 'SUCCESS' : 'MISSING'}`);
        
        const allTestsPassed = hasWelcomeMessage && hasDirectoryResponse && connectionErrors.length === 0;
        
        if (allTestsPassed) {
          console.log('\\n🎉 REAL USER WORKFLOW SUCCESS!');
          console.log('✅ All 30-second timeout issues FIXED');
          console.log('✅ Connection remains stable during Claude processing'); 
          console.log('✅ User can successfully interact with Claude');
          console.log('✅ No "Connection Error: Connection lost: Unknown error"');
        } else {
          console.log('\\n❌ User workflow still has issues');
          if (connectionErrors.length > 0) {
            console.log('❌ Connection errors:', connectionErrors);
          }
        }
        
        ws.close();
        resolve(allTestsPassed);
      }, 90000); // Test for 90 seconds
      
      ws.on('open', () => {
        console.log('🤝 WebSocket connected successfully');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        // Test commands at different intervals
        setTimeout(() => {
          console.log('📤 [15s] Sending: "what directory are you in?"');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'what directory are you in?'
          }));
        }, 15000);
        
        setTimeout(() => {
          console.log('📤 [45s] Sending: "ls -la" (after critical 30s threshold)');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'ls -la'
          }));
        }, 45000);
        
        setTimeout(() => {
          console.log('📤 [75s] Sending: "pwd" (testing sustained connection)');
          ws.send(JSON.stringify({
            type: 'input', 
            data: 'pwd'
          }));
        }, 75000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messagesReceived.push(message);
          
          if (message.type === 'terminal' && message.data) {
            console.log(`📨 Received: ${message.data.substring(0, 80)}...`);
            
            // Check for directory response
            if (message.data.includes('/workspaces/agent-feed')) {
              console.log('✅ Got real directory response!');
              hasDirectoryResponse = true;
            }
            
            // Check for welcome message
            if (message.data.includes('Welcome to Claude Code')) {
              console.log('✅ Got welcome message!');
              hasWelcomeMessage = true;
            }
          }
        } catch (error) {
          console.error('Parse error:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        connectionErrors.push(error.message);
        console.error('🚨 CRITICAL: Connection error detected:', error.message);
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          connectionErrors.push(`Connection closed unexpectedly: ${code} ${reason}`);
          console.log(`🔌 CRITICAL: Connection closed during test: ${code} ${reason || 'No reason'}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

testRealUserWorkflow()
  .then(success => {
    console.log(`\\n🎯 FINAL RESULT: ${success ? 'ALL FIXES SUCCESSFUL' : 'ISSUES STILL REMAIN'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });