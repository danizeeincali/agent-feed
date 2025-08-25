/**
 * Critical Test: UI Redraw Issue Validation
 * Tests character-by-character input causing excessive UI redraws
 */

const WebSocket = require('ws');

console.log('🚨 CRITICAL: Testing UI redraw issue with character-by-character input...');

function testCharacterByCharacterInput() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputCount = 0;
    const expectedText = 'hello';
    const outputs = [];
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      // Wait for terminal ready
      setTimeout(() => {
        console.log('🔥 PROBLEM: Sending character-by-character input (causes UI redraws)');
        
        // Send each character separately - THIS IS THE PROBLEM
        const chars = ['h', 'e', 'l', 'l', 'o'];
        chars.forEach((char, index) => {
          setTimeout(() => {
            console.log(`📤 Sending character ${index + 1}: "${char}"`);
            ws.send(JSON.stringify({
              type: 'input',
              data: char
            }));
          }, index * 100);
        });
        
        // Send Enter after characters
        setTimeout(() => {
          console.log('📤 Sending Enter');
          ws.send(JSON.stringify({
            type: 'input',
            data: '\n'
          }));
        }, chars.length * 100 + 200);
        
        // Analyze results after delay
        setTimeout(() => {
          console.log(`\n📊 RESULTS:`);
          console.log(`📋 Total outputs received: ${outputCount}`);
          console.log(`🎯 Expected: 1 complete line output`);
          console.log(`🚨 Problem: ${outputCount > 1 ? 'MULTIPLE UI REDRAWS DETECTED' : 'No issue detected'}`);
          
          if (outputCount > 5) {
            console.log('❌ CRITICAL: Excessive UI redraws confirmed');
            console.log('📝 Each character caused separate output/redraw');
          }
          
          ws.close();
          resolve({ outputCount, outputs });
        }, 2000);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          outputCount++;
          outputs.push(message.data);
          console.log(`📥 Output ${outputCount}: ${JSON.stringify(message.data)}`);
        }
      } catch (err) {
        // Raw data
        outputCount++;
        const rawData = data.toString();
        outputs.push(rawData);
        console.log(`📥 Raw Output ${outputCount}: ${JSON.stringify(rawData)}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

function testLineBasedInput() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputCount = 0;
    const outputs = [];
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server for line-based test');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      // Wait for terminal ready
      setTimeout(() => {
        console.log('✨ SOLUTION: Sending complete line input (should reduce UI redraws)');
        
        // Send complete line - THIS IS THE SOLUTION
        console.log('📤 Sending complete line: "hello\\n"');
        ws.send(JSON.stringify({
          type: 'input',
          data: 'hello\n'
        }));
        
        // Analyze results after delay
        setTimeout(() => {
          console.log(`\n📊 LINE-BASED RESULTS:`);
          console.log(`📋 Total outputs received: ${outputCount}`);
          console.log(`🎯 Expected: 1-2 outputs maximum`);
          console.log(`✅ Success: ${outputCount <= 2 ? 'MINIMAL UI REDRAWS' : 'Still too many redraws'}`);
          
          ws.close();
          resolve({ outputCount, outputs });
        }, 1500);
      }, 500);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          outputCount++;
          outputs.push(message.data);
          console.log(`📥 Output ${outputCount}: ${JSON.stringify(message.data)}`);
        }
      } catch (err) {
        // Raw data
        outputCount++;
        const rawData = data.toString();
        outputs.push(rawData);
        console.log(`📥 Raw Output ${outputCount}: ${JSON.stringify(rawData)}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

async function runTests() {
  console.log('🧪 Starting UI Redraw Issue Tests...\n');
  
  try {
    // Test 1: Character-by-character (problematic)
    console.log('='.repeat(60));
    console.log('TEST 1: Character-by-Character Input (PROBLEM)');
    console.log('='.repeat(60));
    
    const charByCharResult = await testCharacterByCharacterInput();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Line-based (solution)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Line-Based Input (SOLUTION)');
    console.log('='.repeat(60));
    
    const lineBasedResult = await testLineBasedInput();
    
    // Compare results
    console.log('\n' + '='.repeat(60));
    console.log('COMPARISON RESULTS');
    console.log('='.repeat(60));
    console.log(`Character-by-character outputs: ${charByCharResult.outputCount}`);
    console.log(`Line-based outputs: ${lineBasedResult.outputCount}`);
    console.log(`Improvement: ${charByCharResult.outputCount - lineBasedResult.outputCount} fewer redraws`);
    
    if (charByCharResult.outputCount > lineBasedResult.outputCount) {
      console.log('✅ Line-based input reduces UI redraws');
    } else {
      console.log('❌ No improvement detected');
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('🚨 Test suite failed:', err);
  process.exit(1);
});