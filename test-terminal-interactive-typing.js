// Test interactive typing in terminal (simulating user keystrokes)
const WebSocket = require('ws');

console.log('🧪 Testing interactive terminal typing simulation...');

function simulateUserTyping(command, withEnter = true) {
  return new Promise((resolve, reject) => {
    console.log(`\n⌨️ Simulating user typing: "${command}"`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let hasCorruption = false;
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      setTimeout(() => {
        // Simulate typing each character individually (like a real user)
        const chars = command.split('');
        let charIndex = 0;
        
        const typeNextChar = () => {
          if (charIndex < chars.length) {
            const char = chars[charIndex];
            ws.send(JSON.stringify({
              type: 'input',
              data: char
            }));
            console.log(`⌨️ Typed: "${char}"`);
            charIndex++;
            setTimeout(typeNextChar, 50); // 50ms between keystrokes
          } else if (withEnter) {
            // Send Enter key
            ws.send(JSON.stringify({
              type: 'input',
              data: '\r'  // Simulate Enter key (carriage return)
            }));
            console.log('⌨️ Pressed Enter (\\r)');
          }
        };
        
        typeNextChar();
        
        // Check results after typing is complete
        setTimeout(() => {
          if (output.includes('claudern') || output.includes('command not found')) {
            hasCorruption = true;
            console.error('❌ Command corruption detected in output!');
          } else {
            console.log('✅ No command corruption detected');
          }
          
          ws.close();
          if (hasCorruption) {
            reject(new Error('Command corruption detected'));
          } else {
            resolve({ success: true, output });
          }
        }, 3000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
          // Check each message for corruption
          if (message.data.includes('claudern')) {
            console.error('🚨 CORRUPTION DETECTED in message:', JSON.stringify(message.data));
            hasCorruption = true;
          }
        }
      } catch (err) {
        output += data.toString();
        if (data.toString().includes('claudern')) {
          console.error('🚨 CORRUPTION DETECTED in raw data:', JSON.stringify(data.toString()));
          hasCorruption = true;
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
  });
}

async function testInteractiveTyping() {
  const testCases = [
    {
      name: 'Simple echo command',
      command: 'echo hello',
      withEnter: true
    },
    {
      name: 'Claude command (main issue)',
      command: 'claude',
      withEnter: true
    },
    {
      name: 'cd prod && claude (full command)',
      command: 'cd prod && claude',
      withEnter: true
    },
    {
      name: 'Claude with flags',
      command: 'claude --version',
      withEnter: true
    }
  ];
  
  console.log('🎯 Testing interactive terminal typing...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const testCase of testCases) {
    try {
      await simulateUserTyping(testCase.command, testCase.withEnter);
      successCount++;
      console.log(`✅ ${testCase.name}: PASSED - No corruption`);
    } catch (error) {
      failureCount++;
      console.error(`❌ ${testCase.name}: FAILED -`, error.message);
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\\n🎉 INTERACTIVE TYPING TEST RESULTS:');
  console.log(`✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failureCount}/${testCases.length}`);
  
  if (failureCount > 0) {
    console.log('\\n❌ Interactive typing still has corruption issues!');
    console.log('The "claudern" bug is NOT fully fixed.');
    process.exit(1);
  } else {
    console.log('\\n🎯 ALL INTERACTIVE TYPING TESTS PASSED!');
    console.log('Users can type commands without corruption.');
    process.exit(0);
  }
}

testInteractiveTyping().catch(err => {
  console.error('🚨 Interactive typing test failed:', err);
  process.exit(1);
});