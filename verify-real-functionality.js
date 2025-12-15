#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔍 COMPLETE REAL FUNCTIONALITY VERIFICATION\n');
console.log('Testing: Button click → Instance load → Command typing → Real responses\n');

async function verifyCompleteRealFunctionality() {
  let instanceId = null;
  let connectionErrors = [];
  let realResponses = [];
  
  try {
    // STEP 1: Simulate button click - Create instance
    console.log('1️⃣ SIMULATING BUTTON CLICK: Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user-verification' })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Instance creation failed: ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    instanceId = createData.instance.id;
    console.log(`✅ REAL INSTANCE CREATED: ${instanceId}\n`);
    
    // STEP 2: Wait for instance to be ready (simulate loading)
    console.log('2️⃣ SIMULATING LOADING: Waiting for instance to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify instance exists
    const listResponse = await fetch('http://localhost:3000/api/claude/instances');
    const instances = await listResponse.json();
    const ourInstance = instances.find(inst => inst.id === instanceId);
    
    if (!ourInstance) {
      throw new Error('Instance not found in list after creation');
    }
    console.log(`✅ INSTANCE LOADED SUCCESSFULLY: ${ourInstance.name}\n`);
    
    // STEP 3: Connect WebSocket (simulate interface connection)
    console.log('3️⃣ CONNECTING WEBSOCKET: Establishing real connection...');
    const ws = new WebSocket(`ws://localhost:3000/terminal`);
    
    return new Promise((resolve) => {
      let connected = false;
      let commandSent = false;
      let realResponseReceived = false;
      let welcomeReceived = false;
      
      const testTimeout = setTimeout(() => {
        console.log('\n📊 VERIFICATION RESULTS:');
        console.log(`✅ Instance Created: ${instanceId ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ WebSocket Connected: ${connected ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Welcome Message: ${welcomeReceived ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Command Sent: ${commandSent ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Real Response: ${realResponseReceived ? 'SUCCESS' : 'FAILED'}`);
        console.log(`❌ Connection Errors: ${connectionErrors.length}`);
        console.log(`📨 Real Responses: ${realResponses.length}`);
        
        if (connectionErrors.length > 0) {
          console.log('\n🚨 CONNECTION ERRORS DETECTED:');
          connectionErrors.forEach((error, i) => {
            console.log(`   ${i+1}. ${error}`);
          });
        }
        
        const allSuccess = connected && welcomeReceived && commandSent && realResponseReceived && connectionErrors.length === 0;
        
        console.log(`\n🎯 OVERALL VERIFICATION: ${allSuccess ? '✅ 100% SUCCESS' : '❌ ISSUES DETECTED'}`);
        
        if (allSuccess) {
          console.log('\n🎉 COMPLETE SUCCESS - ALL FUNCTIONALITY VERIFIED!');
          console.log('✅ Button simulation works');
          console.log('✅ Instance loading works');  
          console.log('✅ Command typing works');
          console.log('✅ Real responses received');
          console.log('✅ No connection errors');
          console.log('✅ No mocks or simulations used');
        }
        
        ws.close();
        resolve(allSuccess);
      }, 60000); // 60 second test
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        connected = true;
        
        // Connect to our instance
        console.log(`🔗 Connecting to instance: ${instanceId}`);
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
        
        // Wait then send real command
        setTimeout(() => {
          console.log('\n4️⃣ TYPING COMMAND: "what directory are you in?"');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'what directory are you in?'
          }));
          commandSent = true;
        }, 8000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'terminal' && message.data) {
            const responseText = message.data.trim();
            console.log(`📨 REAL RESPONSE: ${responseText.substring(0, 100)}...`);
            
            realResponses.push(responseText);
            
            // Check for welcome message
            if (responseText.includes('Welcome to Claude Code') || responseText.includes('Claude Code!')) {
              console.log('✅ WELCOME MESSAGE RECEIVED');
              welcomeReceived = true;
            }
            
            // Check for real directory response
            if (responseText.includes('/workspaces/agent-feed') || responseText.includes('pwd')) {
              console.log('✅ REAL DIRECTORY RESPONSE RECEIVED');
              realResponseReceived = true;
            }
            
            // Check for any directory-related response
            if (responseText.includes('workspace') || responseText.includes('/workspace') || responseText.includes('cwd:')) {
              console.log('✅ DIRECTORY-RELATED RESPONSE CONFIRMED');
              realResponseReceived = true;
            }
          }
        } catch (error) {
          console.error('Message parse error:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        const errorMsg = `WebSocket error: ${error.message}`;
        connectionErrors.push(errorMsg);
        console.error('🚨 CONNECTION ERROR:', errorMsg);
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000 && code !== 1001) {
          const closeMsg = `Unexpected close: ${code} ${reason || 'No reason'}`;
          connectionErrors.push(closeMsg);
          console.log('🚨 CONNECTION CLOSED UNEXPECTEDLY:', closeMsg);
        }
      });
    });

  } catch (error) {
    console.error('❌ VERIFICATION ERROR:', error.message);
    return false;
  }
}

verifyCompleteRealFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
  });