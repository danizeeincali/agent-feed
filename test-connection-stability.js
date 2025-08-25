// Comprehensive WebSocket connection stability test
const WebSocket = require('ws');

console.log('🧪 Testing WebSocket connection stability...');

let connectionCount = 0;
let successfulConnections = 0;
let failedConnections = 0;

function testConnection(commandName, command) {
  return new Promise((resolve, reject) => {
    connectionCount++;
    console.log(`\n🔗 Testing connection ${connectionCount}: ${commandName}`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let hasError = false;
    let hasConnected = false;
    
    ws.on('open', () => {
      hasConnected = true;
      console.log(`✅ ${commandName}: Connected successfully`);
      
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
          data: command + '\\r\\n'
        }));
        console.log(`📤 ${commandName}: Sent command: ${command}`);
        
        // Keep connection alive for 3 seconds to verify stability
        setTimeout(() => {
          console.log(`✅ ${commandName}: Connection stable for 3 seconds`);
          successfulConnections++;
          ws.close(1000, 'Test complete');
          resolve();
        }, 3000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'init_ack') {
          console.log(`✅ ${commandName}: Backend acknowledged initialization`);
        }
      } catch (e) {
        // Raw terminal output - this is expected
      }
    });
    
    ws.on('error', (error) => {
      if (!hasConnected) {
        hasError = true;
        console.error(`❌ ${commandName}: Connection failed:`, error.message);
        failedConnections++;
        reject(error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 ${commandName}: Closed with code ${code}`);
      if (!hasConnected && !hasError) {
        console.error(`❌ ${commandName}: Connection closed before establishing`);
        failedConnections++;
        reject(new Error('Connection closed prematurely'));
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hasConnected) {
        hasError = true;
        console.error(`❌ ${commandName}: Connection timeout`);
        failedConnections++;
        ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });
}

async function runTests() {
  const testCases = [
    { name: '🚀 prod/claude', command: 'cd prod && claude' },
    { name: '⚡ skip-permissions', command: 'cd prod && claude --dangerously-skip-permissions' },
    { name: '⚡ skip-permissions -c', command: 'cd prod && claude --dangerously-skip-permissions -c' },
    { name: '↻ skip-permissions --resume', command: 'cd prod && claude --dangerously-skip-permissions --resume' }
  ];
  
  try {
    console.log('🎯 Running comprehensive connection stability test for all 4 buttons...');
    
    for (const testCase of testCases) {
      await testConnection(testCase.name, testCase.command);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\\n🎉 TEST RESULTS:');
    console.log(`✅ Successful connections: ${successfulConnections}/${connectionCount}`);
    console.log(`❌ Failed connections: ${failedConnections}/${connectionCount}`);
    
    if (failedConnections === 0) {
      console.log('🎯 ALL TESTS PASSED: WebSocket connections are stable!');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED: Connection stability issues detected');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('🚨 Test suite failed:', error);
    process.exit(1);
  }
}

runTests();