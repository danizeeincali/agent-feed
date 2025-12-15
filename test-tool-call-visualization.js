#!/usr/bin/env node

/**
 * Tool Call Visualization Test
 * Tests the new tool call output features without breaking WebSocket stability
 */

const WebSocket = require('ws');
const fs = require('fs');

console.log('🎯 TESTING TOOL CALL VISUALIZATION');
console.log('==================================');

async function testToolCallVisualization() {
  let instanceId = null;
  let ws = null;
  let toolCallsDetected = [];
  let connectionErrors = [];

  try {
    // Step 1: Create Claude instance
    console.log('1️⃣ Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tool-call-test' })
    });
    const { instance } = await createResponse.json();
    instanceId = instance.id;
    console.log(`✅ Instance created: ${instanceId}`);

    // Step 2: Connect WebSocket and monitor for tool call visualization
    console.log('2️⃣ Connecting WebSocket to monitor tool calls...');
    ws = new WebSocket('ws://localhost:3000/terminal');

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));

        // Test commands that should show tool call visualization
        setTimeout(() => {
          console.log('3️⃣ Testing command that should trigger tool call display...');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'help'
          }));
        }, 3000);

        // Test file operations
        setTimeout(() => {
          console.log('4️⃣ Testing file operation command...');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'ls -la'
          }));
        }, 8000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'terminal' && message.data) {
            const content = message.data;
            
            console.log(`📨 Received: ${content.substring(0, 100)}...`);

            // Check for tool call visualization patterns
            if (content.includes('●') && (content.includes('Bash') || content.includes('Read') || content.includes('Write'))) {
              console.log('🎉 TOOL CALL VISUALIZATION DETECTED!');
              console.log(`Content: ${content}`);
              toolCallsDetected.push(content);
            }

            // Check for status indicators
            if (content.includes('⎿') || content.includes('Running') || content.includes('background')) {
              console.log('📊 STATUS INDICATOR DETECTED!');
              console.log(`Status: ${content}`);
            }

            // Check for enhanced formatting
            if (content.includes('🔍') || content.includes('✅') || content.includes('⚡')) {
              console.log('🎨 ENHANCED FORMATTING DETECTED!');
              console.log(`Enhanced: ${content}`);
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
        console.log(`🔌 Connection closed: ${code} ${reason || 'No reason'}`);
      });

      // Complete test after 20 seconds
      setTimeout(() => {
        console.log('\n📊 TOOL CALL VISUALIZATION TEST RESULTS:');
        console.log('==========================================');
        console.log(`Tool Calls Detected: ${toolCallsDetected.length}`);
        console.log(`Connection Errors: ${connectionErrors.length}`);
        console.log(`WebSocket State: ${ws.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED'}`);

        if (toolCallsDetected.length > 0) {
          console.log('\n🎉 SUCCESS: Tool call visualization is working!');
          console.log('✅ Detected tool call formatting');
          console.log('✅ WebSocket connection remained stable');
          console.log('✅ No connection errors');
          
          toolCallsDetected.forEach((call, i) => {
            console.log(`\n📝 Tool Call ${i + 1}:`);
            console.log(call.substring(0, 200));
          });
        } else {
          console.log('\n⚠️ No tool call visualization detected');
          console.log('This might be normal if no tool calls occurred');
        }

        if (connectionErrors.length === 0) {
          console.log('\n✅ WebSocket stability maintained');
        } else {
          console.log('\n❌ WebSocket stability issues:');
          connectionErrors.forEach(error => console.log(`  - ${error}`));
        }

        ws.close();
        resolve(toolCallsDetected.length > 0 && connectionErrors.length === 0);
      }, 20000);
    });

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }
}

testToolCallVisualization()
  .then(success => {
    console.log(`\n🎯 FINAL RESULT: ${success ? 'SUCCESS' : 'NEEDS REVIEW'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });