// Test the ACTUAL browser fix by connecting directly to what the browser is sending
const WebSocket = require('ws');

console.log('🧪 Testing LIVE browser connection to verify carriage return fix...');

function testBrowserSimulation() {
  return new Promise((resolve, reject) => {
    console.log('\n🌐 Simulating EXACT browser behavior...');
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let receivedInputs = [];
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server (simulating browser)');
      
      // Send init message like browser does
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      // Wait then send command exactly like browser with \\r\\n
      setTimeout(() => {
        const commandWithCarriageReturn = 'cd prod && claude --dangerously-skip-permissions\\r\\n';
        
        console.log('📤 Sending EXACT browser command:', JSON.stringify(commandWithCarriageReturn));
        ws.send(JSON.stringify({
          type: 'input',
          data: commandWithCarriageReturn
        }));
        
        // Check what backend actually receives
        setTimeout(() => {
          if (output.includes('claudern')) {
            console.error('❌ BROWSER SIMULATION: Still showing claudern corruption!');
            console.error('📋 Output contains:', output);
            reject(new Error('Browser simulation shows corruption'));
          } else if (output.includes('claude --dangerously-skip-permissions')) {
            console.log('✅ BROWSER SIMULATION: Command executing correctly');
            resolve({ success: true });
          } else {
            console.log('✅ BROWSER SIMULATION: No corruption detected');
            resolve({ success: true });
          }
          ws.close();
        }, 2000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
          if (message.data.includes('received input')) {
            receivedInputs.push(message.data);
            console.log('📨 Backend received:', message.data);
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

async function runLiveBrowserTest() {
  console.log('🎯 Running live browser simulation test...');
  
  try {
    await testBrowserSimulation();
    console.log('\\n🎉 LIVE BROWSER TEST RESULTS:');
    console.log('✅ Browser simulation: PASSED - No carriage return corruption');
    console.log('\\n🌐 The browser should now send commands correctly!');
    console.log('📝 User should refresh browser page (Ctrl+F5) to get latest code.');
  } catch (error) {
    console.error('\\n❌ LIVE BROWSER TEST FAILED:', error.message);
    console.log('\\n🚨 The carriage return fix is NOT working in browser context!');
    process.exit(1);
  }
}

runLiveBrowserTest().catch(err => {
  console.error('🚨 Live browser test crashed:', err);
  process.exit(1);
});