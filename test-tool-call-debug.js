/**
 * Direct Tool Call Visualization Debug Test
 * Tests if Claude tool calls are actually being detected and formatted
 */

const WebSocket = require('ws');

async function testToolCallVisualization() {
  console.log('🔍 TOOL CALL VISUALIZATION DEBUG TEST');
  
  try {
    // Get instance ID
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'claude', instanceType: 'interactive' })
    });
    const { instance } = await response.json();
    const instanceId = instance.id;
    console.log(`📋 Instance ID: ${instanceId}`);
    
    // Connect WebSocket to capture all output
    const ws = new WebSocket(`ws://localhost:3000/terminal?instanceId=${instanceId}`);
    
    let receivedMessages = [];
    let toolCallsDetected = 0;
    let rawOutputCaptured = [];
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      receivedMessages.push(message);
      rawOutputCaptured.push(message.data || message.output || JSON.stringify(message));
      
      console.log(`📩 Message type: ${message.type}`);
      console.log(`📄 Raw data: ${JSON.stringify(message).substring(0, 200)}...`);
      
      // Check for tool call indicators
      if (message.data && (
        message.data.includes('●') || 
        message.data.includes('⎿') || 
        message.data.includes('Bash(') ||
        message.data.includes('Read(') ||
        message.data.includes('enhanced') ||
        message.data.includes('tool_call') ||
        message.data.includes('toolCall')
      )) {
        toolCallsDetected++;
        console.log(`🎯 TOOL CALL DETECTED! Count: ${toolCallsDetected}`);
        console.log(`🔧 Tool call content: ${message.data}`);
      }
    });
    
    await new Promise(resolve => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Test commands that should trigger tools
        const testCommands = [
          'what is the current working directory?',
          'list the files in this directory', 
          'read the package.json file',
          'run the command "echo hello world"'
        ];
        
        let commandIndex = 0;
        const sendNextCommand = () => {
          if (commandIndex < testCommands.length) {
            const command = testCommands[commandIndex];
            console.log(`🚀 Sending: ${command}`);
            
            ws.send(JSON.stringify({
              type: 'input',
              data: command + '\n'
            }));
            
            commandIndex++;
            setTimeout(sendNextCommand, 8000); // Wait 8 seconds between commands
          } else {
            setTimeout(() => {
              console.log('\n📊 FINAL ANALYSIS:');
              console.log(`💬 Total messages received: ${receivedMessages.length}`);
              console.log(`🎯 Tool calls detected: ${toolCallsDetected}`);
              console.log(`📝 Raw output lines: ${rawOutputCaptured.length}`);
              
              console.log('\n🔍 CHECKING FOR TOOL CALL PATTERNS:');
              const allOutput = rawOutputCaptured.join('\n');
              const hasToolIndicators = [
                { pattern: '●', name: 'Tool bullet point', found: allOutput.includes('●') },
                { pattern: '⎿', name: 'Tool continuation', found: allOutput.includes('⎿') },
                { pattern: 'Bash(', name: 'Bash tool call', found: allOutput.includes('Bash(') },
                { pattern: 'Read(', name: 'Read tool call', found: allOutput.includes('Read(') },
                { pattern: 'enhanced', name: 'Enhanced message', found: allOutput.includes('enhanced') },
                { pattern: 'tool_call', name: 'Tool call type', found: allOutput.includes('tool_call') }
              ];
              
              hasToolIndicators.forEach(indicator => {
                const status = indicator.found ? '✅ FOUND' : '❌ NOT FOUND';
                console.log(`  ${status}: ${indicator.name} (${indicator.pattern})`);
              });
              
              if (toolCallsDetected === 0) {
                console.log('\n🚨 ISSUE: No tool calls detected in output!');
                console.log('This means ToolCallFormatter may not be working or tool calls aren\'t being triggered.');
              } else {
                console.log(`\n✅ SUCCESS: ${toolCallsDetected} tool calls detected!`);
              }
              
              ws.close();
              resolve();
            }, 5000);
          }
        };
        
        setTimeout(sendNextCommand, 2000); // Start first command after 2 seconds
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testToolCallVisualization();