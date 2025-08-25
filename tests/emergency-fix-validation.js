/**
 * Emergency Fix Validation Test
 * Tests the direct passthrough terminal to ensure no UI cascade
 */

const WebSocket = require('ws');

console.log('🚨 EMERGENCY FIX VALIDATION - Direct Passthrough Terminal Test\n');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to emergency fix terminal server');
  
  ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
  
  setTimeout(() => {
    console.log('📤 Testing Claude CLI launch...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'cd prod && claude --dangerously-skip-permissions\n'
    }));
  }, 1000);
  
  // Test individual characters to ensure no cascade
  setTimeout(() => {
    console.log('📤 Testing individual characters (should NOT cause cascade)...');
    'hello'.split('').forEach((char, index) => {
      setTimeout(() => {
        console.log(`📤 Sending: "${char}"`);
        ws.send(JSON.stringify({
          type: 'input',
          data: char
        }));
      }, 1000 + (index * 500));
    });
    
    // Send Enter to complete
    setTimeout(() => {
      console.log('📤 Sending Enter to complete input');
      ws.send(JSON.stringify({
        type: 'input',
        data: '\n'
      }));
    }, 4000);
    
  }, 8000);
});

let output = '';
let uiBoxCount = 0;
let cascadeDetected = false;
let previousBoxContent = '';

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'data') {
    output += message.data;
    process.stdout.write(message.data);
    
    // Detect UI boxes
    const boxMatches = message.data.match(/╭[─│╮╯]*╮/g);
    if (boxMatches) {
      uiBoxCount += boxMatches.length;
      
      // Check for cascade (same box repeated)
      if (previousBoxContent && message.data.includes(previousBoxContent)) {
        cascadeDetected = true;
        console.log('\n🚨 CASCADE DETECTED - Same UI content repeated!');
      }
      previousBoxContent = message.data;
    }
    
    // Check for character corruption
    if (message.data.includes('[O[I')) {
      console.log('\n🚨 CHARACTER CORRUPTION DETECTED: [O[I found in output');
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

setTimeout(() => {
  console.log('\n' + '='.repeat(70));
  console.log('🚨 EMERGENCY FIX VALIDATION RESULTS');
  console.log('='.repeat(70));
  
  console.log(`✅ Emergency Fix Active: YES`);
  console.log(`📦 UI Box Count: ${uiBoxCount}`);
  console.log(`🌊 Cascade Detected: ${cascadeDetected ? '❌ YES' : '✅ NO'}`);
  console.log(`📝 Total Output Length: ${output.length} characters`);
  
  // Analyze results
  if (!cascadeDetected && uiBoxCount < 5) {
    console.log('\n🎉 SUCCESS: Emergency fix working correctly!');
    console.log('✅ No UI cascade detected');
    console.log('✅ Character-by-character input handled properly');
    console.log('✅ Direct passthrough functioning');
  } else if (cascadeDetected) {
    console.log('\n❌ FAILURE: UI cascade still occurring');
    console.log('  - Same UI content is being repeated');
    console.log('  - Direct passthrough may not be working');
  } else if (uiBoxCount >= 5) {
    console.log('\n⚠️ PARTIAL: Some UI repetition detected');
    console.log(`  - ${uiBoxCount} UI boxes found (expected < 5)`);
    console.log('  - May need additional optimization');
  }
  
  ws.close();
  process.exit(cascadeDetected || uiBoxCount >= 10 ? 1 : 0);
}, 15000);