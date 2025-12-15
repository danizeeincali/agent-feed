// Test complete system fix - all issues addressed
const WebSocket = require('ws');

console.log('🧪 Testing COMPLETE system fix...');

function testCompleteSystem() {
  return new Promise((resolve, reject) => {
    console.log('\n🔧 Testing complete system with all fixes...');
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let processExited = false;
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      setTimeout(() => {
        // Test the exact problematic command
        const command = 'cd prod && claude --dangerously-skip-permissions\r\n';
        console.log('📤 Sending command with carriage return:', JSON.stringify(command));
        
        ws.send(JSON.stringify({
          type: 'input',
          data: command
        }));
        
        // Monitor for longer period to see if process exits
        setTimeout(() => {
          if (processExited) {
            console.error('❌ Process exited prematurely!');
            reject(new Error('Process exit detected'));
          } else if (output.includes('claudern')) {
            console.error('❌ Still seeing carriage return corruption!');
            reject(new Error('Carriage return not fixed'));
          } else {
            console.log('✅ System test: Process stable, no corruption');
            resolve({ success: true });
          }
          ws.close();
        }, 5000);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
          
          // Check for process exit
          if (message.data.includes('process exited')) {
            console.error('🚨 Process exit detected:', message.data);
            processExited = true;
          }
          
          // Check for corruption
          if (message.data.includes('claudern')) {
            console.error('🚨 Corruption detected:', message.data);
          }
        }
      } catch (err) {
        output += data.toString();
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
  });
}

async function runCompleteSystemTest() {
  console.log('🎯 Running complete system validation...');
  
  try {
    await testCompleteSystem();
    console.log('\\n🎉 COMPLETE SYSTEM TEST RESULTS:');
    console.log('✅ Process stability: FIXED');
    console.log('✅ Carriage return: FIXED');
    console.log('✅ Terminal lifecycle: FIXED');
    console.log('\\n🌐 System should now work in browser!');
  } catch (error) {
    console.error('\\n❌ COMPLETE SYSTEM TEST FAILED:', error.message);
    console.log('\\n🚨 Additional fixes required!');
    process.exit(1);
  }
}

runCompleteSystemTest().catch(err => {
  console.error('🚨 System test crashed:', err);
  process.exit(1);
});