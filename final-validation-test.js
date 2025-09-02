#!/usr/bin/env node

/**
 * FINAL COMPREHENSIVE VALIDATION TEST
 * Tests the complete user workflow:
 * 1. Create instance via API
 * 2. Connect WebSocket
 * 3. Send "what directory are you in" command
 * 4. Verify real response
 * 5. Confirm no connection errors
 */

const WebSocket = require('ws');

async function finalValidationTest() {
  console.log('🎯 FINAL COMPREHENSIVE VALIDATION TEST\n');

  try {
    // Step 1: Create Claude instance
    console.log('🔘 Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'final-validation' })
    });
    
    const createData = await createResponse.json();
    const instanceId = createData.instance.id;
    console.log(`✅ Instance created: ${instanceId}`);
    
    // Step 2: Wait for Claude to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Connect WebSocket
    console.log('🔗 Connecting WebSocket...');
    const ws = new WebSocket(`ws://localhost:3000/terminal`);
    
    return new Promise((resolve) => {
      let messagesReceived = [];
      let connectionErrors = [];
      let realResponse = false;
      
      const timeout = setTimeout(() => {
        console.log('\n📊 FINAL VALIDATION RESULTS:');
        console.log(`Messages received: ${messagesReceived.length}`);
        console.log(`Connection errors: ${connectionErrors.length}`);
        
        // Check for real Claude response to "what directory are you in"
        const hasDirectoryResponse = messagesReceived.some(m => 
          m.type === 'terminal' && m.data && 
          m.data.includes('/workspaces/agent-feed')
        );
        
        const hasWelcomeMessage = messagesReceived.some(m =>
          m.type === 'terminal' && m.data &&
          m.data.includes('Welcome to Claude Code')
        );
        
        const hasNoConnectionErrors = connectionErrors.length === 0;
        const hasStableConnection = messagesReceived.length > 0;
        
        console.log(`✅ Welcome message: ${hasWelcomeMessage ? 'Working' : 'Missing'}`);
        console.log(`✅ Directory response: ${hasDirectoryResponse ? 'Working' : 'Missing'}`);
        console.log(`✅ No connection errors: ${hasNoConnectionErrors ? 'Working' : 'Failed'}`);
        console.log(`✅ Stable connection: ${hasStableConnection ? 'Working' : 'Failed'}`);
        
        const allTestsPassed = hasWelcomeMessage && hasDirectoryResponse && hasNoConnectionErrors && hasStableConnection;
        
        if (allTestsPassed) {
          console.log('\n🎉 FINAL VALIDATION PASSED!');
          console.log('✅ All functionality working');
          console.log('✅ No connection errors detected');
          console.log('✅ Real Claude responses confirmed');
          console.log('✅ System ready for production use');
        } else {
          console.log('\n❌ FINAL VALIDATION FAILED!');
          if (connectionErrors.length > 0) {
            console.log('❌ Connection errors detected:', connectionErrors);
          }
        }
        
        ws.close();
        resolve(allTestsPassed);
      }, 20000);
      
      ws.on('open', () => {
        console.log('🤝 WebSocket connected');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        // Wait a moment then send command
        setTimeout(() => {
          console.log('📤 Sending command: "what directory are you in?"');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'what directory are you in?'
          }));
        }, 3000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          messagesReceived.push(message);
          
          if (message.type === 'terminal' && message.data) {
            // Log real responses for verification
            if (message.data.includes('/workspaces/agent-feed')) {
              console.log('✅ Got real directory response:', message.data.trim());
              realResponse = true;
            }
            if (message.data.includes('Welcome to Claude Code')) {
              console.log('✅ Got welcome message');
            }
          }
        } catch (error) {
          console.error('Parse error:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        connectionErrors.push(error.message);
        console.error('🚨 WebSocket error:', error.message);
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          connectionErrors.push(`Connection closed unexpectedly: ${code} ${reason}`);
          console.log(`🔌 WebSocket closed: ${code} ${reason || 'No reason'}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

// Run the test
finalValidationTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });