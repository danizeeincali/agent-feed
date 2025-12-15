/**
 * FINAL TOOL CALL VISUALIZATION TEST
 * Test with real Claude session to confirm tool calls are visible in WebSocket
 */

const WebSocket = require('ws');

async function finalTest() {
  console.log('🎯 FINAL TOOL CALL VISUALIZATION TEST');
  
  try {
    // Create Claude instance
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'claude', instanceType: 'interactive' })
    });
    const { instance } = await response.json();
    const instanceId = instance.id;
    console.log(`📋 Instance ID: ${instanceId}`);
    
    // Connect WebSocket
    const ws = new WebSocket(`ws://localhost:3000/terminal?instanceId=${instanceId}`);
    
    let toolCallsFound = [];
    let messagesReceived = 0;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messagesReceived++;
        
        // Check for our enhanced tool call formatting
        if (message.data && (message.data.includes('●') || message.data.includes('⎿'))) {
          toolCallsFound.push({
            type: message.type,
            enhanced: message.enhanced,
            data: message.data.substring(0, 100),
            source: message.source
          });
          console.log(`✅ TOOL CALL DETECTED!`);
          console.log(`   Type: ${message.type}`);
          console.log(`   Enhanced: ${message.enhanced}`);
          console.log(`   Content: ${message.data.substring(0, 150)}...`);
          console.log('');
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    await new Promise(resolve => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected, sending test commands...\n');
        
        // Send commands that should trigger tool detection
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'what is in the package.json file?\n'
          }));
        }, 2000);
        
        setTimeout(() => {
          console.log('\n📊 FINAL RESULTS:');
          console.log(`💬 Messages received: ${messagesReceived}`);
          console.log(`🎯 Tool calls found: ${toolCallsFound.length}`);
          
          if (toolCallsFound.length > 0) {
            console.log('\n🎉 SUCCESS: Tool call visualization is working!');
            console.log('✅ Claude Code style formatting detected in WebSocket stream');
            console.log('✅ ToolCallFormatter is properly enhancing Claude responses');
            
            toolCallsFound.forEach((call, i) => {
              console.log(`\nTool Call ${i+1}:`);
              console.log(`  Type: ${call.type}`);
              console.log(`  Enhanced: ${call.enhanced}`);
              console.log(`  Source: ${call.source}`);
              console.log(`  Preview: ${call.data}...`);
            });
          } else {
            console.log('\n⚠️  No tool calls detected in WebSocket stream');
            console.log('This could mean:');
            console.log('- Claude responses don\'t contain detectable patterns');
            console.log('- ToolCallFormatter is not being called on broadcast');
            console.log('- WebSocket messages are not being enhanced');
          }
          
          ws.close();
          resolve();
        }, 15000); // Wait 15 seconds for Claude response
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

finalTest();