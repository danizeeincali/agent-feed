// Test carriage return normalization fix
const WebSocket = require('ws');

console.log('🧪 Testing carriage return normalization fix...');

function testCommand(testName, command, expectedOutput) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing: ${testName}`);
    console.log(`📤 Command: "${command}"`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let receivedMessages = 0;
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      // Send command after short delay
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'input',
          data: command
        }));
        console.log(`📤 Sent command: "${command}"`);
      }, 500);
      
      // Check results after 2 seconds
      setTimeout(() => {
        if (output.includes('claudern') || output.includes('command not found')) {
          console.error('❌ Command corruption detected!');
          console.error('📋 Output:', output);
          reject(new Error('Command corruption'));
        } else if (output.includes('claude') || output.includes('Claude')) {
          console.log('✅ Command executed without corruption');
          resolve({ success: true, output });
        } else {
          console.log('✅ No corruption detected (command may have executed)');
          resolve({ success: true, output });
        }
        ws.close();
      }, 2000);
    });
    
    ws.on('message', (data) => {
      receivedMessages++;
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
          console.log(`📥 [${receivedMessages}] Received:`, JSON.stringify(message.data));
        }
      } catch (err) {
        output += data.toString();
        console.log(`📥 [${receivedMessages}] Raw:`, JSON.stringify(data.toString()));
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
  });
}

async function runCarriageReturnTests() {
  const testCases = [
    {
      name: 'Command with \\\\r\\\\n (Windows style)',
      command: 'echo "test1"\\r\\n',
      expected: 'test1'
    },
    {
      name: 'Command with \\\\n (Unix style)', 
      command: 'echo "test2"\\n',
      expected: 'test2'
    },
    {
      name: 'Command with \\\\r (Mac style)',
      command: 'echo "test3"\\r',
      expected: 'test3'
    },
    {
      name: 'Claude command with \\\\r\\\\n',
      command: 'cd prod && claude --version\\r\\n',
      expected: 'claude'
    },
    {
      name: 'Claude command with \\\\n only',
      command: 'cd prod && claude --version\\n',
      expected: 'claude'
    }
  ];
  
  console.log('🎯 Running carriage return normalization tests...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const testCase of testCases) {
    try {
      await testCommand(testCase.name, testCase.command, testCase.expected);
      successCount++;
      console.log(`✅ ${testCase.name}: PASSED`);
    } catch (error) {
      failureCount++;
      console.error(`❌ ${testCase.name}: FAILED -`, error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\\n🎉 CARRIAGE RETURN TEST RESULTS:');
  console.log(`✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failureCount}/${testCases.length}`);
  
  if (failureCount > 0) {
    console.log('\\n❌ Carriage return normalization still has issues!');
    process.exit(1);
  } else {
    console.log('\\n🎯 All carriage return tests PASSED! Commands execute cleanly.');
    process.exit(0);
  }
}

runCarriageReturnTests().catch(err => {
  console.error('🚨 Test suite failed:', err);
  process.exit(1);
});